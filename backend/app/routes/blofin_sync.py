"""
Blofin direct sync endpoint - allows users to input credentials and sync trades
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional
import asyncio
from datetime import datetime
import os
import uuid
from sqlalchemy.orm import Session
from supabase import create_client, Client

from app.services.blofin_client import BlofinClient, calculate_trade_fields, aggregate_fills_by_order
from app.db import get_db
from app.models import ExchangeConnection
from app.services.encryption import encrypt_secret, decrypt_secret

router = APIRouter(prefix="/api/blofin", tags=["blofin"])

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None


class BlofinSyncRequest(BaseModel):
    """Request to sync Blofin trades"""
    api_key: str
    api_secret: str
    api_passphrase: str
    user_id: Optional[str] = None
    save_connection: bool = True  # Whether to save credentials for future resyncs
    connection_id: Optional[str] = None  # For resync, provide existing connection ID


class BlofinSyncResponse(BaseModel):
    """Response from Blofin sync"""
    success: bool
    message: str
    trades_count: Optional[int] = None
    trades: Optional[list] = None


def normalize_numeric_value(value: any, max_value: float = 1e9) -> float:
    """
    Normalize numeric values to prevent Supabase overflow errors.
    PostgreSQL numeric type has limits that we need to respect.
    """
    try:
        num = float(value) if value is not None else 0.0

        # Check for invalid values
        if not (-1e15 < num < 1e15):
            return 0.0

        if num is None or str(num).lower() in ['nan', 'inf', '-inf']:
            return 0.0

        # Clamp extreme values
        if abs(num) > max_value:
            return 0.0

        return num
    except (ValueError, TypeError):
        return 0.0


def aggregate_positions(trades: list) -> list:
    """
    Aggregate multiple fills for the same position into one trade.
    A position can have:
    - Multiple entry fills (scale in)
    - Multiple exit fills (scale out)

    We group by symbol and time proximity to combine all fills for one position.
    """
    from collections import defaultdict
    from datetime import datetime

    # Group fills by symbol
    by_symbol = defaultdict(list)
    for trade in trades:
        symbol = trade.get('symbol', '')
        if symbol:
            by_symbol[symbol].append(trade)

    aggregated = []

    for symbol, symbol_trades in by_symbol.items():
        # Sort by timestamp
        symbol_trades.sort(key=lambda x: x.get('date', ''))

        i = 0
        while i < len(symbol_trades):
            current = symbol_trades[i]

            # If this is an exit fill (has PnL), collect all related fills
            if current.get('pnl_usd', 0) != 0:
                # Collect all consecutive exit fills for this position
                exit_fills = [current]
                j = i + 1

                # Look ahead for more exit fills (same symbol, close in time)
                while j < len(symbol_trades):
                    next_trade = symbol_trades[j]
                    if next_trade.get('pnl_usd', 0) != 0:
                        exit_fills.append(next_trade)
                        j += 1
                    else:
                        # Found the entry fill
                        break

                # Now find the matching entry fill(s)
                entry_fills = []
                if j < len(symbol_trades) and symbol_trades[j].get('pnl_usd', 0) == 0:
                    entry_fills.append(symbol_trades[j])
                    j += 1

                # Aggregate all exit fills into one trade
                if exit_fills and entry_fills:
                    total_size = sum(f.get('size', 0) for f in exit_fills + entry_fills) / 2  # Divided by 2 because we have both entry and exit
                    total_pnl = sum(f.get('pnl_usd', 0) for f in exit_fills)
                    total_fees = sum(f.get('fees', 0) for f in exit_fills + entry_fills)

                    # Weighted average exit price
                    total_exit_value = sum(f.get('entry', 0) * f.get('size', 0) for f in exit_fills if f.get('pnl_usd', 0) != 0)
                    total_exit_size = sum(f.get('size', 0) for f in exit_fills if f.get('pnl_usd', 0) != 0)
                    avg_exit = total_exit_value / total_exit_size if total_exit_size > 0 else 0

                    # Entry price from entry fill
                    entry_price = entry_fills[0].get('entry', 0)

                    # Create combined trade
                    combined = {
                        'symbol': symbol,
                        'side': current.get('side'),
                        'entry': entry_price,
                        'exit': avg_exit,
                        'size': total_size,
                        'pnl_usd': total_pnl,
                        'fees': total_fees,
                        'leverage': current.get('leverage', 1),
                        'date': entry_fills[0].get('date'),  # Entry time
                        'exit_date': exit_fills[-1].get('date'),  # Last exit time
                    }

                    # Recalculate PnL%
                    leverage = combined.get('leverage', 1)
                    if entry_price > 0 and total_size > 0 and leverage > 0:
                        position_value = entry_price * total_size
                        margin_used = position_value / leverage
                        pnl_pct = (total_pnl / margin_used) * 100
                        combined['pnl_pct'] = pnl_pct
                    else:
                        combined['pnl_pct'] = 0

                    aggregated.append(combined)
                    i = j
                    continue
                elif exit_fills:
                    # Exit without entry - keep as-is
                    aggregated.append(current)
                    i += 1
                else:
                    i += 1
            else:
                # Entry fill without exit - skip
                i += 1

    return aggregated


def match_entry_exit_pairs(trades: list) -> list:
    """
    Match consecutive entry/exit trade pairs to get correct timestamps.

    Trades come in consecutive pairs:
    - Trade i (exit): entry_time=ACTUALLY EXIT TIME, exit_time=null, pnl>0 (will be kept)
    - Trade i+1 (entry): entry_time=correct entry time, exit_time=null, pnl=0 (will be filtered)

    We need to:
    1. Move Trade i's entry_time → exit_time (since it's actually the exit time)
    2. Copy Trade i+1's entry_time → Trade i's entry_time (the real entry time)
    """
    matched_trades = []
    i = 0

    while i < len(trades):
        current_trade = trades[i]

        # Check if this is an exit trade (pnl>0)
        if current_trade.get('pnl_usd', 0) != 0:
            # Look at the next trade to see if it's the entry trade
            if i + 1 < len(trades):
                next_trade = trades[i + 1]

                # If next trade has no PnL and same symbol, they're a pair
                if (next_trade.get('pnl_usd', 0) == 0 and
                    next_trade.get('symbol') == current_trade.get('symbol')):
                    # Current trade's entry_time is actually the exit time
                    # Move it to exit_date
                    current_trade['exit_date'] = current_trade.get('date')
                    # Copy the next trade's entry_time as the real entry time
                    current_trade['date'] = next_trade.get('date')

                    # CRITICAL: Copy the REAL entry price from the entry fill
                    # Current trade has exit price stored as "entry", next trade has real entry price
                    current_trade['exit'] = current_trade.get('entry')  # Move exit price to exit field
                    current_trade['entry'] = next_trade.get('entry')    # Use real entry price

                    # Recalculate PnL% using: (PnL USD / (Position Value / Leverage)) * 100
                    entry_price = current_trade.get('entry', 0)
                    size = current_trade.get('size', 0)
                    pnl_usd = current_trade.get('pnl_usd', 0)
                    leverage = current_trade.get('leverage', 1)

                    if entry_price > 0 and size > 0 and leverage > 0:
                        position_value = entry_price * size
                        margin_used = position_value / leverage
                        pnl_pct = (pnl_usd / margin_used) * 100
                        current_trade['pnl_pct'] = pnl_pct

                    # Keep the exit trade (current_trade)
                    matched_trades.append(current_trade)
                    # Skip both trades (we've processed the pair)
                    i += 2
                    continue

            # If no matching entry trade after this, keep exit trade as-is
            matched_trades.append(current_trade)
            i += 1
        else:
            # This is an entry trade (pnl=0) without a preceding exit trade
            # Skip it (it will be filtered out anyway)
            i += 1

    return matched_trades


def get_default_leverages(user_id: str, exchange: str = "blofin") -> dict:
    """
    Fetch default leverage settings for a user and exchange from Supabase.
    Returns a dict mapping symbol -> leverage.
    """
    if not supabase or not user_id:
        return {}

    try:
        response = supabase.table("leverage_settings").select("symbol,leverage").eq("user_id", user_id).eq("exchange", exchange).execute()

        if response.data:
            return {row["symbol"]: row["leverage"] for row in response.data}
        return {}
    except Exception as e:
        print(f"⚠️ Error fetching default leverages: {e}")
        return {}


def prepare_trades_for_supabase(trades: list, user_id: str = None, default_leverages: dict = None) -> list:
    """
    Prepare trades for Supabase insertion with proper numeric normalization.
    Maps Blofin trade fields to actual Supabase column names.

    Supabase trades table has these columns:
    - id, user_id, symbol, side, entry_price, exit_price, entry_time, exit_time,
      quantity, leverage, pnl_usd, pnl_percent, fees, notes, exchange, created_at, updated_at
    """
    prepared = []

    for trade in trades:
        # Extract and normalize entry/exit prices
        # BTC can be $100k+, so use higher max_value for prices
        entry_price = round(normalize_numeric_value(trade.get("entry"), max_value=1000000), 8)
        exit_price = round(normalize_numeric_value(trade.get("exit"), max_value=1000000), 8)
        pnl_usd = round(normalize_numeric_value(trade.get("pnl_usd"), max_value=100000), 2) if trade.get("pnl_usd") is not None else 0

        # CRITICAL: Skip invalid or incomplete trades:
        # 1. entry=0 or exit=0 (cancelled/rejected orders)
        # 2. pnl_usd is 0 or None (entry fills without realized PnL - only keep completed trades)
        if entry_price == 0 or exit_price == 0:
            print(f"⏭️ Skipped invalid trade {trade.get('symbol')}: entry={entry_price}, exit={exit_price}")
            continue

        if pnl_usd == 0 or pnl_usd is None:
            print(f"⏭️ Skipped entry fill without PnL {trade.get('symbol')}: pnl={pnl_usd}")
            continue

        # Map Blofin fields to exact Supabase column names
        symbol = str(trade.get("symbol", "")).upper()
        normalized_trade = {
            "symbol": symbol,
            "side": str(trade.get("side", "BUY")).upper(),
            "entry_price": entry_price,
            "quantity": round(normalize_numeric_value(trade.get("size"), max_value=1000000), 8),
            "exchange": "blofin",
        }

        # Only add user_id if it's actually provided
        if user_id:
            normalized_trade["user_id"] = user_id

        # Add optional fields with correct column names
        if trade.get("exit") is not None:
            normalized_trade["exit_price"] = exit_price

        # Handle leverage: use default if trade leverage is missing or invalid
        trade_leverage = trade.get("leverage")
        if trade_leverage is not None and trade_leverage > 0:
            # Use leverage from trade
            normalized_trade["leverage"] = round(normalize_numeric_value(trade_leverage, max_value=100), 2)
        elif default_leverages and symbol in default_leverages:
            # Use default leverage for this symbol
            normalized_trade["leverage"] = default_leverages[symbol]
            print(f"🔧 Applied default leverage {default_leverages[symbol]}x for {symbol}")
        else:
            # Fallback to 1x
            normalized_trade["leverage"] = 1.0

        if trade.get("fees") is not None:
            normalized_trade["fees"] = round(normalize_numeric_value(trade.get("fees"), max_value=100000), 8)

        if pnl_usd != 0:
            normalized_trade["pnl_usd"] = pnl_usd

        # Recalculate PnL percentage using the final leverage (including defaults)
        leverage = normalized_trade.get("leverage", 1.0)
        size = normalized_trade.get("quantity", 0)
        if entry_price > 0 and size > 0 and leverage > 0:
            position_value = entry_price * size
            margin_used = position_value / leverage
            pnl_percent = (pnl_usd / margin_used) * 100
            normalized_trade["pnl_percent"] = round(pnl_percent, 4)
        elif trade.get("pnl_pct") is not None:
            normalized_trade["pnl_percent"] = round(normalize_numeric_value(trade.get("pnl_pct"), max_value=100000), 4)

        # Map date to entry_time (when the trade was entered)
        if trade.get("date"):
            normalized_trade["entry_time"] = trade.get("date")

        # Map exit_date to exit_time (when the trade was closed)
        if trade.get("exit_date"):
            normalized_trade["exit_time"] = trade.get("exit_date")

        prepared.append(normalized_trade)

    return prepared


@router.post("/sync", response_model=BlofinSyncResponse)
async def sync_blofin_trades(request: BlofinSyncRequest, db: Session = Depends(get_db)) -> BlofinSyncResponse:
    """
    Fetch trades directly from Blofin and return them for insertion into Supabase

    This endpoint:
    1. Validates credentials by fetching trades from Blofin API
    2. Calculates all required fields (exit price, PnL %, leverage, etc.)
    3. Returns the processed trades ready for Supabase insertion
    """
    try:
        # Check if this is a resync or new connection
        connection = None
        last_sync_timestamp = None

        if request.connection_id:
            # This is a resync - load existing connection
            connection = db.query(ExchangeConnection).filter(
                ExchangeConnection.id == request.connection_id
            ).first()

            if not connection:
                return BlofinSyncResponse(
                    success=False,
                    message="Connection not found"
                )

            # Get last sync time for incremental sync
            if connection.last_sync_time:
                last_sync_timestamp = int(connection.last_sync_time.timestamp() * 1000)
                print(f"📅 Incremental sync since: {connection.last_sync_time}")

            # Update status to in_progress
            connection.last_sync_status = "in_progress"
            db.commit()

        # Validate credentials and fetch trades
        print(f"Fetching trades from Blofin...")
        client = BlofinClient(
            api_key=request.api_key,
            api_secret=request.api_secret,
            passphrase=request.api_passphrase
        )

        # Fetch contract sizes for all instruments (needed for size conversion)
        print("📏 Fetching contract sizes from Blofin...")
        contract_sizes = client.fetch_contract_sizes()

        # Fetch current leverage settings for all instruments
        print("📊 Fetching leverage settings from account positions...")
        leverage_map = client.fetch_leverage_map()

        # Fetch trades (incremental if we have a last sync time)
        raw_fills = client.fetch_trade_history(
            page_limit=100,
            begin=last_sync_timestamp  # Only fetch trades since last sync
        )

        if not raw_fills:
            return BlofinSyncResponse(
                success=False,
                message="No trades found. Check your credentials and account history."
            )

        print(f"✅ Fetched {len(raw_fills)} raw fills from Blofin")

        # Aggregate fills by orderId to convert into complete trades
        aggregated_fills = aggregate_fills_by_order(raw_fills, leverage_map=leverage_map)
        print(f"✅ Aggregated into {len(aggregated_fills)} complete trades")

        # Calculate fields for all aggregated trades
        calculated_trades = []
        for fill in aggregated_fills:
            try:
                trade = calculate_trade_fields(fill)
                # Skip invalid trades (returns None if entry price == 0)
                if trade is not None:
                    calculated_trades.append(trade)
                else:
                    print(f"⏭️ Skipped invalid trade {fill.get('tradeId')} (entry price == 0)")
            except Exception as e:
                print(f"⚠️ Failed to process trade {fill.get('tradeId')}: {e}")
                continue

        print(f"✅ Successfully calculated fields for {len(calculated_trades)} trades")

        # Log trade breakdown by symbol BEFORE filtering
        print("\n=== Calculated trades breakdown by symbol ===")
        from collections import defaultdict
        symbol_counts = defaultdict(int)
        symbol_pnl = defaultdict(list)
        for t in calculated_trades:
            symbol = t.get('symbol', 'UNKNOWN')
            symbol_counts[symbol] += 1
            symbol_pnl[symbol].append(t.get('pnl_usd', 0))

        for symbol in sorted(symbol_counts.keys()):
            pnl_values = symbol_pnl[symbol]
            zero_pnl = sum(1 for p in pnl_values if p == 0)
            nonzero_pnl = len(pnl_values) - zero_pnl
            print(f"  {symbol}: {symbol_counts[symbol]} trades ({nonzero_pnl} with PnL, {zero_pnl} with PnL=0)")

        # Match entry/exit pairs to get correct timestamps before filtering
        matched_trades = match_entry_exit_pairs(calculated_trades)

        # Fetch default leverage settings for this user
        default_leverages = get_default_leverages(request.user_id, "blofin") if request.user_id else {}
        if default_leverages:
            print(f"📋 Loaded {len(default_leverages)} default leverage settings")

        # Prepare trades for Supabase with numeric normalization
        prepared_trades = prepare_trades_for_supabase(matched_trades, request.user_id, default_leverages)

        # Log trade breakdown by symbol AFTER filtering
        print("\n=== Prepared trades breakdown by symbol ===")
        symbol_counts_after = defaultdict(int)
        for t in prepared_trades:
            symbol = t.get('symbol', 'UNKNOWN')
            symbol_counts_after[symbol] += 1

        for symbol in sorted(symbol_counts_after.keys()):
            print(f"  {symbol}: {symbol_counts_after[symbol]} trades")

        print(f"\n✅ Prepared {len(prepared_trades)} trades for Supabase (filtered out {len(calculated_trades) - len(prepared_trades)} trades with PnL=0)")
        print(f"📝 Sample prepared trade: {prepared_trades[0] if prepared_trades else 'No trades'}")

        # Save or update connection if requested - save to SUPABASE
        if request.save_connection and request.user_id and supabase:
            try:
                now_iso = datetime.utcnow().isoformat()
                # Check if connection exists in Supabase
                existing = supabase.table('exchange_connections').select('id').eq('user_id', request.user_id).eq('exchange_name', 'blofin').execute()

                if existing.data and len(existing.data) > 0:
                    # Update existing connection
                    conn_id = existing.data[0]['id']
                    supabase.table('exchange_connections').update({
                        'last_sync_time': now_iso,
                        'last_sync_status': 'success',
                        'last_error': None
                    }).eq('id', conn_id).execute()
                    print(f"✅ Updated Supabase connection {conn_id}")
                else:
                    # Create new connection in Supabase
                    connection_id = str(uuid.uuid4())
                    supabase.table('exchange_connections').insert({
                        'id': connection_id,
                        'user_id': request.user_id,
                        'exchange_name': 'blofin',
                        'api_key_encrypted': encrypt_secret(request.api_key),
                        'api_secret_encrypted': encrypt_secret(request.api_secret),
                        'api_passphrase_encrypted': encrypt_secret(request.api_passphrase),
                        'api_key_last_4': request.api_key[-4:] if len(request.api_key) >= 4 else '****',
                        'last_sync_time': now_iso,
                        'last_sync_status': 'success'
                    }).execute()
                    print(f"✅ Created new Supabase connection {connection_id}")
            except Exception as conn_err:
                print(f"⚠️ Failed to save connection to Supabase: {conn_err}")

        return BlofinSyncResponse(
            success=True,
            message=f"Successfully fetched and processed {len(prepared_trades)} trades",
            trades_count=len(prepared_trades),
            trades=prepared_trades
        )

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error syncing Blofin trades: {error_msg}")

        # Update connection status if it exists
        if connection:
            connection.last_sync_status = "failed"
            connection.last_error = error_msg[:500]  # Limit error length
            db.commit()

        if "152409" in error_msg:
            error_msg = "Signature verification failed. Check your API credentials."
        elif "401" in error_msg or "403" in error_msg:
            error_msg = "Invalid API credentials. Please check your API key, secret, and passphrase."
        elif "timeout" in error_msg.lower():
            error_msg = "Request timeout. Blofin API is slow or unreachable."

        return BlofinSyncResponse(
            success=False,
            message=f"Failed to sync Blofin trades: {error_msg}"
        )


@router.post("/resync/{connection_id}", response_model=BlofinSyncResponse)
async def resync_blofin_trades(connection_id: str, db: Session = Depends(get_db)) -> BlofinSyncResponse:
    """
    Resync trades for an existing Blofin connection.
    Only fetches NEW trades since the last sync.
    """
    # Load connection
    connection = db.query(ExchangeConnection).filter(
        ExchangeConnection.id == connection_id
    ).first()

    if not connection:
        return BlofinSyncResponse(
            success=False,
            message="Connection not found"
        )

    # Decrypt credentials
    try:
        api_key = decrypt_secret(connection.api_key_encrypted)
        api_secret = decrypt_secret(connection.api_secret_encrypted)
        api_passphrase = decrypt_secret(connection.api_passphrase_encrypted) if connection.api_passphrase_encrypted else ""
    except Exception as e:
        return BlofinSyncResponse(
            success=False,
            message=f"Failed to decrypt credentials: {str(e)}"
        )

    # Call the main sync endpoint with connection_id
    request = BlofinSyncRequest(
        api_key=api_key,
        api_secret=api_secret,
        api_passphrase=api_passphrase,
        user_id=connection.user_id,
        save_connection=True,
        connection_id=connection_id
    )

    return await sync_blofin_trades(request, db)


@router.get("/test-credentials")
async def test_blofin_credentials(api_key: str, api_secret: str, api_passphrase: str):
    """Test if Blofin credentials are valid by attempting to fetch one trade"""
    try:
        client = BlofinClient(api_key, api_secret, api_passphrase)
        trades = client.fetch_trade_history(page_limit=1)

        if trades:
            return {
                "success": True,
                "message": "Credentials are valid! You have trade history.",
                "has_trades": True
            }
        else:
            return {
                "success": True,
                "message": "Credentials are valid but no trades found in history.",
                "has_trades": False
            }
    except Exception as e:
        error_msg = str(e)
        return {
            "success": False,
            "message": f"Invalid credentials: {error_msg}"
        }
