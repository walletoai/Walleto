"""
Hyperliquid sync endpoint - NO API KEYS REQUIRED
Only needs wallet address since all data is onchain
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import uuid
from sqlalchemy.orm import Session
from supabase import create_client, Client

from app.services.hyperliquid_client import (
    HyperliquidClient,
    aggregate_hyperliquid_fills
)
from app.db import get_db
from app.models import ExchangeConnection

router = APIRouter(prefix="/api/hyperliquid", tags=["hyperliquid"])

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None


class HyperliquidSyncRequest(BaseModel):
    """Request to sync Hyperliquid trades"""
    wallet_address: str
    user_id: Optional[str] = None
    save_connection: bool = True
    default_leverage: float = 10.0


class HyperliquidSyncResponse(BaseModel):
    """Response from Hyperliquid sync"""
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


def validate_wallet_address(address: str) -> bool:
    """Validate Ethereum wallet address format."""
    if not address:
        return False
    address = address.strip().lower()
    if not address.startswith("0x"):
        return False
    if len(address) != 42:
        return False
    try:
        int(address[2:], 16)
        return True
    except ValueError:
        return False


def prepare_hyperliquid_trades_for_supabase(trades: list, user_id: str = None) -> list:
    """
    Prepare Hyperliquid trades for Supabase insertion.

    NOTE: Hyperliquid does NOT include leverage in trade data.
    Users can update leverage via Settings > Leverage Settings.
    """
    prepared = []

    for trade in trades:
        entry_price = round(normalize_numeric_value(trade.get("entry_price"), max_value=1000000), 8)
        exit_price = round(normalize_numeric_value(trade.get("exit_price"), max_value=1000000), 8)
        pnl_usd = round(normalize_numeric_value(trade.get("pnl_usd"), max_value=100000), 2)

        # Skip invalid trades
        if entry_price == 0 or exit_price == 0:
            print(f"Skipped invalid trade {trade.get('symbol')}: entry={entry_price}, exit={exit_price}")
            continue

        symbol = str(trade.get("symbol", "")).upper()
        normalized_trade = {
            "symbol": symbol,
            "side": str(trade.get("side", "BUY")).upper(),
            "entry_price": entry_price,
            "exit_price": exit_price,
            "quantity": round(normalize_numeric_value(trade.get("quantity"), max_value=1000000), 8),
            "exchange": "hyperliquid",
            "pnl_usd": pnl_usd,
        }

        if user_id:
            normalized_trade["user_id"] = user_id

        # Hyperliquid doesn't provide leverage - use default
        leverage = trade.get("leverage", 10.0)
        normalized_trade["leverage"] = round(normalize_numeric_value(leverage, max_value=100), 2)

        if trade.get("fees"):
            normalized_trade["fees"] = round(normalize_numeric_value(trade.get("fees"), max_value=100000), 8)

        if trade.get("pnl_percent"):
            normalized_trade["pnl_percent"] = round(normalize_numeric_value(trade.get("pnl_percent"), max_value=100000), 4)

        if trade.get("entry_time"):
            normalized_trade["entry_time"] = trade.get("entry_time")
        if trade.get("exit_time"):
            normalized_trade["exit_time"] = trade.get("exit_time")

        prepared.append(normalized_trade)

    return prepared


@router.post("/sync", response_model=HyperliquidSyncResponse)
async def sync_hyperliquid_trades(request: HyperliquidSyncRequest, db: Session = Depends(get_db)) -> HyperliquidSyncResponse:
    """
    Fetch trades from Hyperliquid using only wallet address.

    NO API KEYS REQUIRED - Hyperliquid is fully onchain, so all trade
    data is publicly accessible via wallet address.

    This endpoint:
    1. Validates wallet address format
    2. Fetches all fills from Hyperliquid API
    3. Aggregates fills into complete trades (open + close pairs)
    4. Returns processed trades ready for Supabase insertion

    NOTE: Hyperliquid does NOT include leverage in fill data.
    Default leverage is applied, and users can update via Settings.
    """
    try:
        # Validate wallet address
        if not validate_wallet_address(request.wallet_address):
            return HyperliquidSyncResponse(
                success=False,
                message="Invalid wallet address. Must be a valid Ethereum address (0x... with 42 characters)"
            )

        wallet = request.wallet_address.strip().lower()
        print(f"Syncing Hyperliquid trades for wallet: {wallet[:10]}...{wallet[-6:]}")

        # Create client and fetch fills
        client = HyperliquidClient(wallet)
        raw_fills = client.fetch_user_fills()

        if not raw_fills:
            return HyperliquidSyncResponse(
                success=False,
                message="No trades found for this wallet address. Make sure you've traded on Hyperliquid Perpetuals."
            )

        print(f"Fetched {len(raw_fills)} fills from Hyperliquid")

        # Aggregate fills into complete trades
        aggregated_trades = aggregate_hyperliquid_fills(raw_fills, request.default_leverage)

        if not aggregated_trades:
            return HyperliquidSyncResponse(
                success=False,
                message=f"Found {len(raw_fills)} fills but couldn't aggregate into complete trades. This may happen if all positions are still open."
            )

        # Prepare for Supabase
        prepared_trades = prepare_hyperliquid_trades_for_supabase(aggregated_trades, request.user_id)

        print(f"Prepared {len(prepared_trades)} trades for Supabase")
        if prepared_trades:
            print(f"Sample trade: {prepared_trades[0]}")

        # Save connection if requested
        if request.save_connection and request.user_id and supabase:
            try:
                now_iso = datetime.utcnow().isoformat()
                existing = supabase.table('exchange_connections').select('id').eq(
                    'user_id', request.user_id
                ).eq('exchange_name', 'hyperliquid').execute()

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
                    # For Hyperliquid, we store wallet address instead of API keys
                    supabase.table('exchange_connections').insert({
                        'id': connection_id,
                        'user_id': request.user_id,
                        'exchange_name': 'hyperliquid',
                        'api_key_encrypted': wallet,  # Store wallet as "api_key"
                        'api_secret_encrypted': '',    # No secret needed
                        'api_key_last_4': wallet[-4:],
                        'last_sync_time': now_iso,
                        'last_sync_status': 'success'
                    }).execute()
                    print(f"Created new Supabase connection {connection_id}")
            except Exception as conn_err:
                print(f"Warning: Failed to save connection to Supabase: {conn_err}")

        return HyperliquidSyncResponse(
            success=True,
            message=f"Successfully fetched and processed {len(prepared_trades)} trades from {len(raw_fills)} fills",
            trades_count=len(prepared_trades),
            trades=prepared_trades
        )

    except Exception as e:
        error_msg = str(e)
        print(f"Error syncing Hyperliquid trades: {error_msg}")

        if "404" in error_msg or "not found" in error_msg.lower():
            error_msg = "Wallet not found or has no trading history on Hyperliquid."
        elif "timeout" in error_msg.lower():
            error_msg = "Request timeout. Hyperliquid API is slow or unreachable."

        return HyperliquidSyncResponse(
            success=False,
            message=f"Failed to sync Hyperliquid trades: {error_msg}"
        )


@router.post("/resync/{connection_id}", response_model=HyperliquidSyncResponse)
async def resync_hyperliquid_trades(connection_id: str, db: Session = Depends(get_db)) -> HyperliquidSyncResponse:
    """Resync trades for an existing Hyperliquid connection."""
    connection = db.query(ExchangeConnection).filter(
        ExchangeConnection.id == connection_id
    ).first()

    if not connection:
        return HyperliquidSyncResponse(
            success=False,
            message="Connection not found"
        )

    # For Hyperliquid, wallet address is stored in api_key_encrypted
    wallet_address = connection.api_key_encrypted

    if not wallet_address or not validate_wallet_address(wallet_address):
        return HyperliquidSyncResponse(
            success=False,
            message="Invalid or missing wallet address in connection"
        )

    request = HyperliquidSyncRequest(
        wallet_address=wallet_address,
        user_id=connection.user_id,
        save_connection=True
    )

    return await sync_hyperliquid_trades(request, db)


@router.get("/validate-wallet")
async def validate_hyperliquid_wallet(wallet_address: str):
    """
    Validate a wallet address and check if it has trades on Hyperliquid.

    No API keys required - just the wallet address!
    """
    try:
        if not validate_wallet_address(wallet_address):
            return {
                "success": False,
                "valid": False,
                "message": "Invalid wallet address format. Must be 0x followed by 40 hex characters."
            }

        client = HyperliquidClient(wallet_address)
        has_trades = client.validate_wallet()

        if has_trades:
            return {
                "success": True,
                "valid": True,
                "message": "Wallet found with trading history!"
            }
        else:
            return {
                "success": True,
                "valid": False,
                "message": "Wallet is valid but has no trades on Hyperliquid Perpetuals."
            }

    except Exception as e:
        return {
            "success": False,
            "valid": False,
            "message": f"Error validating wallet: {str(e)}"
        }
