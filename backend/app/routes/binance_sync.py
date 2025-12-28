"""
Binance Futures direct sync endpoint - allows users to input credentials and sync trades
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import uuid
from sqlalchemy.orm import Session
from supabase import create_client, Client

from app.services.binance_client import (
    BinanceClient,
    aggregate_binance_trades,
    calculate_binance_trade_fields
)
from app.db import get_db
from app.models import ExchangeConnection
from app.services.encryption import encrypt_secret, decrypt_secret

router = APIRouter(prefix="/api/binance", tags=["binance"])

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None


class BinanceSyncRequest(BaseModel):
    """Request to sync Binance trades"""
    api_key: str
    api_secret: str
    user_id: Optional[str] = None
    save_connection: bool = True
    connection_id: Optional[str] = None


class BinanceSyncResponse(BaseModel):
    """Response from Binance sync"""
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


def get_default_leverages(user_id: str, exchange: str = "binance") -> dict:
    """Fetch default leverage settings for a user and exchange from Supabase."""
    if not supabase or not user_id:
        return {}
    try:
        response = supabase.table("leverage_settings").select("symbol,leverage").eq("user_id", user_id).eq("exchange", exchange).execute()
        if response.data:
            return {row["symbol"]: row["leverage"] for row in response.data}
        return {}
    except Exception as e:
        print(f"Warning: Error fetching default leverages: {e}")
        return {}


def prepare_binance_trades_for_supabase(trades: list, user_id: str = None, default_leverages: dict = None) -> list:
    """
    Prepare Binance trades for Supabase insertion.
    Maps Binance trade fields to Supabase column names.
    """
    prepared = []

    for trade in trades:
        # Calculate trade fields
        calculated = calculate_binance_trade_fields(trade)
        if not calculated:
            continue

        entry_price = round(normalize_numeric_value(calculated.get("entry"), max_value=1000000), 8)
        exit_price = round(normalize_numeric_value(calculated.get("exit"), max_value=1000000), 8)
        pnl_usd = round(normalize_numeric_value(calculated.get("pnl_usd"), max_value=100000), 2)

        # Skip invalid trades
        if entry_price == 0 or exit_price == 0:
            print(f"Skipped invalid trade {calculated.get('symbol')}: entry={entry_price}, exit={exit_price}")
            continue

        if pnl_usd == 0:
            print(f"Skipped entry fill without PnL {calculated.get('symbol')}")
            continue

        symbol = str(calculated.get("symbol", "")).upper()
        normalized_trade = {
            "symbol": symbol,
            "side": str(calculated.get("side", "BUY")).upper(),
            "entry_price": entry_price,
            "exit_price": exit_price,
            "quantity": round(normalize_numeric_value(calculated.get("size"), max_value=1000000), 8),
            "exchange": "binance",
            "pnl_usd": pnl_usd,
        }

        if user_id:
            normalized_trade["user_id"] = user_id

        # Handle leverage
        trade_leverage = calculated.get("leverage")
        if trade_leverage and trade_leverage > 0:
            normalized_trade["leverage"] = round(normalize_numeric_value(trade_leverage, max_value=125), 2)
        elif default_leverages and symbol in default_leverages:
            normalized_trade["leverage"] = default_leverages[symbol]
            print(f"Applied default leverage {default_leverages[symbol]}x for {symbol}")
        else:
            normalized_trade["leverage"] = 1.0

        if calculated.get("fees"):
            normalized_trade["fees"] = round(normalize_numeric_value(calculated.get("fees"), max_value=100000), 8)

        # Recalculate PnL percentage
        leverage = normalized_trade.get("leverage", 1.0)
        size = normalized_trade.get("quantity", 0)
        if entry_price > 0 and size > 0 and leverage > 0:
            position_value = entry_price * size
            margin_used = position_value / leverage
            pnl_percent = (pnl_usd / margin_used) * 100
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


@router.post("/sync", response_model=BinanceSyncResponse)
async def sync_binance_trades(request: BinanceSyncRequest, db: Session = Depends(get_db)) -> BinanceSyncResponse:
    """
    Fetch trades directly from Binance Futures and return them for insertion into Supabase

    This endpoint:
    1. Validates credentials by fetching trades from Binance API
    2. Aggregates individual fills into complete positions
    3. Calculates all required fields (exit price, PnL %, etc.)
    4. Returns the processed trades ready for Supabase insertion

    NOTE: Binance does NOT provide historical leverage data in trade history.
    We fetch current leverage settings which may differ from actual historical values.
    Users should set their default leverage in Settings after syncing.
    """
    try:
        connection = None
        last_sync_timestamp = None

        if request.connection_id:
            connection = db.query(ExchangeConnection).filter(
                ExchangeConnection.id == request.connection_id
            ).first()

            if not connection:
                return BinanceSyncResponse(
                    success=False,
                    message="Connection not found"
                )

            if connection.last_sync_time:
                last_sync_timestamp = int(connection.last_sync_time.timestamp() * 1000)
                print(f"Incremental sync since: {connection.last_sync_time}")

            connection.last_sync_status = "in_progress"
            db.commit()

        # Validate credentials and create client
        print("Fetching trades from Binance Futures...")
        client = BinanceClient(
            api_key=request.api_key,
            api_secret=request.api_secret
        )

        # Fetch current leverage settings (NOTE: historical leverage NOT available)
        print("Fetching current leverage settings from Binance...")
        leverage_map = client.fetch_leverage_map()

        # Fetch all trades
        raw_trades = client.fetch_trade_history(
            start_time=last_sync_timestamp
        )

        if not raw_trades:
            return BinanceSyncResponse(
                success=False,
                message="No trades found. Check your credentials and account history. Note: Binance only provides 6 months of trade history."
            )

        print(f"Fetched {len(raw_trades)} raw trades from Binance")

        # Aggregate individual trades into positions
        aggregated_trades = aggregate_binance_trades(raw_trades, leverage_map=leverage_map)
        print(f"Aggregated into {len(aggregated_trades)} complete positions")

        # Fetch default leverage settings for this user
        default_leverages = get_default_leverages(request.user_id, "binance") if request.user_id else {}
        if default_leverages:
            print(f"Loaded {len(default_leverages)} default leverage settings")

        # Prepare trades for Supabase
        prepared_trades = prepare_binance_trades_for_supabase(
            aggregated_trades,
            request.user_id,
            default_leverages
        )

        print(f"Prepared {len(prepared_trades)} trades for Supabase")
        if prepared_trades:
            print(f"Sample prepared trade: {prepared_trades[0]}")

        # Save or update connection if requested
        if request.save_connection and request.user_id and supabase:
            try:
                now_iso = datetime.utcnow().isoformat()
                existing = supabase.table('exchange_connections').select('id').eq('user_id', request.user_id).eq('exchange_name', 'binance').execute()

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
                        'exchange_name': 'binance',
                        'api_key_encrypted': encrypt_secret(request.api_key),
                        'api_secret_encrypted': encrypt_secret(request.api_secret),
                        'api_key_last_4': request.api_key[-4:] if len(request.api_key) >= 4 else '****',
                        'last_sync_time': now_iso,
                        'last_sync_status': 'success'
                    }).execute()
                    print(f"Created new Supabase connection {connection_id}")
            except Exception as conn_err:
                print(f"Warning: Failed to save connection to Supabase: {conn_err}")

        return BinanceSyncResponse(
            success=True,
            message=f"Successfully fetched and processed {len(prepared_trades)} trades",
            trades_count=len(prepared_trades),
            trades=prepared_trades
        )

    except Exception as e:
        error_msg = str(e)
        print(f"Error syncing Binance trades: {error_msg}")

        if connection:
            connection.last_sync_status = "failed"
            connection.last_error = error_msg[:500]
            db.commit()

        if "401" in error_msg or "-2015" in error_msg:
            error_msg = "Invalid API credentials. Please check your API key and secret."
        elif "-1021" in error_msg:
            error_msg = "Timestamp error. Please check your system clock is synchronized."
        elif "timeout" in error_msg.lower():
            error_msg = "Request timeout. Binance API is slow or unreachable."

        return BinanceSyncResponse(
            success=False,
            message=f"Failed to sync Binance trades: {error_msg}"
        )


@router.post("/resync/{connection_id}", response_model=BinanceSyncResponse)
async def resync_binance_trades(connection_id: str, db: Session = Depends(get_db)) -> BinanceSyncResponse:
    """Resync trades for an existing Binance connection."""
    connection = db.query(ExchangeConnection).filter(
        ExchangeConnection.id == connection_id
    ).first()

    if not connection:
        return BinanceSyncResponse(
            success=False,
            message="Connection not found"
        )

    try:
        api_key = decrypt_secret(connection.api_key_encrypted)
        api_secret = decrypt_secret(connection.api_secret_encrypted)
    except Exception as e:
        return BinanceSyncResponse(
            success=False,
            message=f"Failed to decrypt credentials: {str(e)}"
        )

    request = BinanceSyncRequest(
        api_key=api_key,
        api_secret=api_secret,
        user_id=connection.user_id,
        save_connection=True,
        connection_id=connection_id
    )

    return await sync_binance_trades(request, db)


@router.get("/test-credentials")
async def test_binance_credentials(api_key: str, api_secret: str):
    """Test if Binance credentials are valid"""
    try:
        client = BinanceClient(api_key, api_secret)
        # Try to get account info to validate credentials
        account = client.get_account_info()

        return {
            "success": True,
            "message": "Credentials are valid!",
            "total_wallet_balance": account.get("totalWalletBalance", "0")
        }
    except Exception as e:
        error_msg = str(e)
        return {
            "success": False,
            "message": f"Invalid credentials: {error_msg}"
        }
