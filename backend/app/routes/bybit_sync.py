"""
Bybit direct sync endpoint - allows users to input credentials and sync trades
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import uuid
from sqlalchemy.orm import Session
from supabase import create_client, Client

from app.services.bybit_client import BybitClient, calculate_bybit_trade_fields
from app.db import get_db
from app.models import ExchangeConnection
from app.services.encryption import encrypt_secret, decrypt_secret

router = APIRouter(prefix="/api/bybit", tags=["bybit"])

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None


class BybitSyncRequest(BaseModel):
    """Request to sync Bybit trades"""
    api_key: str
    api_secret: str
    user_id: Optional[str] = None
    save_connection: bool = True
    connection_id: Optional[str] = None


class BybitSyncResponse(BaseModel):
    """Response from Bybit sync"""
    success: bool
    message: str
    trades_count: Optional[int] = None
    trades: Optional[list] = None


def normalize_numeric_value(value, max_value: float = 1e9) -> float:
    """Normalize numeric values to prevent Supabase overflow errors."""
    try:
        num = float(value) if value is not None else 0.0
        if not (-1e15 < num < 1e15):
            return 0.0
        if num is None or str(num).lower() in ['nan', 'inf', '-inf']:
            return 0.0
        if abs(num) > max_value:
            return 0.0
        return num
    except (ValueError, TypeError):
        return 0.0


def prepare_bybit_trades_for_supabase(trades: list, user_id: str = None) -> list:
    """
    Prepare Bybit trades for Supabase insertion.
    Maps Bybit trade fields to Supabase column names.

    Note: Bybit INCLUDES leverage in the API response, so we don't need
    to fetch it separately or use defaults!
    """
    prepared = []

    for record in trades:
        # Calculate trade fields
        calculated = calculate_bybit_trade_fields(record)
        if not calculated:
            continue

        entry_price = round(normalize_numeric_value(calculated.get("entry"), max_value=1000000), 8)
        exit_price = round(normalize_numeric_value(calculated.get("exit"), max_value=1000000), 8)
        pnl_usd = round(normalize_numeric_value(calculated.get("pnl_usd"), max_value=100000), 2)

        # Skip invalid trades
        if entry_price == 0 or exit_price == 0:
            print(f"Skipped invalid trade {calculated.get('symbol')}: entry={entry_price}, exit={exit_price}")
            continue

        # For Bybit, we keep trades with pnl=0 if they have valid prices
        # since closed PnL endpoint only returns completed trades

        symbol = str(calculated.get("symbol", "")).upper()
        normalized_trade = {
            "symbol": symbol,
            "side": str(calculated.get("side", "BUY")).upper(),
            "entry_price": entry_price,
            "exit_price": exit_price,
            "quantity": round(normalize_numeric_value(calculated.get("size"), max_value=1000000), 8),
            "exchange": "bybit",
            "pnl_usd": pnl_usd,
        }

        if user_id:
            normalized_trade["user_id"] = user_id

        # Bybit PROVIDES leverage in the response!
        leverage = calculated.get("leverage", 1.0)
        normalized_trade["leverage"] = round(normalize_numeric_value(leverage, max_value=100), 2)

        if calculated.get("fees"):
            normalized_trade["fees"] = round(normalize_numeric_value(calculated.get("fees"), max_value=100000), 8)

        # Calculate PnL percentage
        size = normalized_trade.get("quantity", 0)
        if entry_price > 0 and size > 0 and leverage > 0:
            position_value = entry_price * size
            margin_used = position_value / leverage
            pnl_percent = (pnl_usd / margin_used) * 100 if margin_used > 0 else 0
            normalized_trade["pnl_percent"] = round(pnl_percent, 4)
        elif calculated.get("pnl_pct"):
            normalized_trade["pnl_percent"] = round(normalize_numeric_value(calculated.get("pnl_pct"), max_value=100000), 4)

        # Map timestamps
        if calculated.get("date"):
            normalized_trade["entry_time"] = calculated.get("date")
        if calculated.get("exit_date"):
            normalized_trade["exit_time"] = calculated.get("exit_date")

        prepared.append(normalized_trade)

    return prepared


@router.post("/sync", response_model=BybitSyncResponse)
async def sync_bybit_trades(request: BybitSyncRequest, db: Session = Depends(get_db)) -> BybitSyncResponse:
    """
    Fetch closed PnL records directly from Bybit and return them for insertion into Supabase

    This endpoint:
    1. Validates credentials by fetching closed PnL from Bybit API
    2. Calculates all required fields
    3. Returns the processed trades ready for Supabase insertion

    NOTE: Bybit INCLUDES leverage in the closed PnL response, so leverage
    will be accurate for historical trades (unlike Blofin/Binance).
    """
    try:
        connection = None
        last_sync_timestamp = None

        if request.connection_id:
            connection = db.query(ExchangeConnection).filter(
                ExchangeConnection.id == request.connection_id
            ).first()

            if not connection:
                return BybitSyncResponse(
                    success=False,
                    message="Connection not found"
                )

            if connection.last_sync_time:
                last_sync_timestamp = int(connection.last_sync_time.timestamp() * 1000)
                print(f"Incremental sync since: {connection.last_sync_time}")

            connection.last_sync_status = "in_progress"
            db.commit()

        # Validate credentials and create client
        print("Fetching closed PnL from Bybit...")
        client = BybitClient(
            api_key=request.api_key,
            api_secret=request.api_secret
        )

        # Fetch all closed PnL records
        raw_records = client.fetch_closed_pnl(
            start_time=last_sync_timestamp
        )

        if not raw_records:
            return BybitSyncResponse(
                success=False,
                message="No closed PnL records found. Check your credentials and account history. Note: Bybit provides up to 2 years of history."
            )

        print(f"Fetched {len(raw_records)} closed PnL records from Bybit")

        # Prepare trades for Supabase
        prepared_trades = prepare_bybit_trades_for_supabase(raw_records, request.user_id)

        print(f"Prepared {len(prepared_trades)} trades for Supabase")
        if prepared_trades:
            print(f"Sample prepared trade: {prepared_trades[0]}")

        # Save or update connection if requested
        if request.save_connection and request.user_id and supabase:
            try:
                now_iso = datetime.utcnow().isoformat()
                existing = supabase.table('exchange_connections').select('id').eq('user_id', request.user_id).eq('exchange_name', 'bybit').execute()

                if existing.data and len(existing.data) > 0:
                    conn_id = existing.data[0]['id']
                    supabase.table('exchange_connections').update({
                        'last_sync_time': now_iso,
                        'last_sync_status': 'success',
                        'last_error': None
                    }).eq('id', conn_id).execute()
                    print(f"Updated Supabase connection {conn_id}")
                else:
                    connection_id = str(uuid.uuid4())
                    supabase.table('exchange_connections').insert({
                        'id': connection_id,
                        'user_id': request.user_id,
                        'exchange_name': 'bybit',
                        'api_key_encrypted': encrypt_secret(request.api_key),
                        'api_secret_encrypted': encrypt_secret(request.api_secret),
                        'api_key_last_4': request.api_key[-4:] if len(request.api_key) >= 4 else '****',
                        'last_sync_time': now_iso,
                        'last_sync_status': 'success'
                    }).execute()
                    print(f"Created new Supabase connection {connection_id}")
            except Exception as conn_err:
                print(f"Warning: Failed to save connection to Supabase: {conn_err}")

        return BybitSyncResponse(
            success=True,
            message=f"Successfully fetched and processed {len(prepared_trades)} trades",
            trades_count=len(prepared_trades),
            trades=prepared_trades
        )

    except Exception as e:
        error_msg = str(e)
        print(f"Error syncing Bybit trades: {error_msg}")

        if connection:
            connection.last_sync_status = "failed"
            connection.last_error = error_msg[:500]
            db.commit()

        if "10003" in error_msg or "10004" in error_msg:
            error_msg = "Invalid API credentials. Please check your API key and secret."
        elif "10002" in error_msg:
            error_msg = "Request timestamp error. Please check your system clock is synchronized."
        elif "timeout" in error_msg.lower():
            error_msg = "Request timeout. Bybit API is slow or unreachable."

        return BybitSyncResponse(
            success=False,
            message=f"Failed to sync Bybit trades: {error_msg}"
        )


@router.post("/resync/{connection_id}", response_model=BybitSyncResponse)
async def resync_bybit_trades(connection_id: str, db: Session = Depends(get_db)) -> BybitSyncResponse:
    """Resync trades for an existing Bybit connection."""
    connection = db.query(ExchangeConnection).filter(
        ExchangeConnection.id == connection_id
    ).first()

    if not connection:
        return BybitSyncResponse(
            success=False,
            message="Connection not found"
        )

    try:
        api_key = decrypt_secret(connection.api_key_encrypted)
        api_secret = decrypt_secret(connection.api_secret_encrypted)
    except Exception as e:
        return BybitSyncResponse(
            success=False,
            message=f"Failed to decrypt credentials: {str(e)}"
        )

    request = BybitSyncRequest(
        api_key=api_key,
        api_secret=api_secret,
        user_id=connection.user_id,
        save_connection=True,
        connection_id=connection_id
    )

    return await sync_bybit_trades(request, db)


@router.get("/test-credentials")
async def test_bybit_credentials(api_key: str, api_secret: str):
    """Test if Bybit credentials are valid"""
    try:
        client = BybitClient(api_key, api_secret)
        # Try to get position info to validate credentials
        positions = client.get_position_info()

        return {
            "success": True,
            "message": "Credentials are valid!",
            "positions_count": len(positions)
        }
    except Exception as e:
        error_msg = str(e)
        return {
            "success": False,
            "message": f"Invalid credentials: {error_msg}"
        }
