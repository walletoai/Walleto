from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
import os
from datetime import datetime
from supabase import create_client, Client

from app.db import get_db
from app.models import ExchangeConnection, Trade
from app.services.encryption import encrypt_secret, decrypt_secret
from app.services.exchange_service import ExchangeService
from app.auth import get_current_user, verify_user_access, AuthenticatedUser

router = APIRouter(prefix="/api/exchanges", tags=["exchanges"])
exchange_service = ExchangeService()

# Initialize Supabase client for fetching leverage settings
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None


def get_default_leverages(user_id: str, exchange: str) -> dict:
    """
    Fetch default leverage settings for a user and exchange from Supabase.
    Returns a dict mapping symbol -> leverage.
    """
    if not supabase or not user_id:
        return {}

    try:
        response = supabase.table("leverage_settings").select("symbol,leverage").eq("user_id", user_id).eq("exchange", exchange.lower()).execute()

        if response.data:
            leverages = {row["symbol"]: row["leverage"] for row in response.data}
            print(f"📋 Loaded {len(leverages)} default leverage settings for {exchange}")
            return leverages
        return {}
    except Exception as e:
        print(f"⚠️ Error fetching default leverages: {e}")
        return {}

# --- Schemas ---
class ExchangeConnectionCreate(BaseModel):
    user_id: str
    exchange_name: str
    api_key: str
    api_secret: str
    api_passphrase: Optional[str] = None

class ExchangeConnectionResponse(BaseModel):
    id: str
    user_id: str
    exchange_name: str
    api_key_last_4: str  # Only show last 4 chars for security
    last_sync_time: Optional[str]
    last_sync_status: Optional[str]
    created_at: str

    class Config:
        orm_mode = True

# --- Routes ---

@router.get("/{user_id}", response_model=List[ExchangeConnectionResponse])
def list_connections(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    # Verify the authenticated user can only access their own data
    verify_user_access(user_id, current_user)

    connections = db.query(ExchangeConnection).filter(ExchangeConnection.user_id == user_id).all()

    # Return masked connections (decrypt API key to show last 4 chars only)
    result = []
    for conn in connections:
        try:
            decrypted_key = decrypt_secret(conn.api_key_encrypted)
            api_key_last_4 = decrypted_key[-4:]
        except Exception as e:
            # If decryption fails, use a placeholder (could happen with invalid/old tokens)
            print(f"Warning: Failed to decrypt API key for connection {conn.id}: {e}")
            api_key_last_4 = "****"

        result.append({
            "id": conn.id,
            "user_id": conn.user_id,
            "exchange_name": conn.exchange_name,
            "api_key_last_4": api_key_last_4,
            "last_sync_time": str(conn.last_sync_time) if conn.last_sync_time else None,
            "last_sync_status": conn.last_sync_status,
            "created_at": str(conn.created_at)
        })

    return result

@router.post("/", response_model=ExchangeConnectionResponse)
async def add_connection(
    conn: ExchangeConnectionCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    # Verify the authenticated user can only add connections for themselves
    verify_user_access(conn.user_id, current_user)

    # Validate API credentials are provided
    if not conn.api_key or not conn.api_secret:
        raise HTTPException(status_code=400, detail="API key and secret are required")

    # Validate credentials with the exchange
    try:
        is_valid = await exchange_service.validate_connection(
            conn.exchange_name,
            conn.api_key,
            conn.api_secret,
            conn.api_passphrase
        )
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid API credentials")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate credentials: {str(e)}")

    # Save to database
    connection_id = str(uuid.uuid4())
    try:
        new_connection = ExchangeConnection(
            id=connection_id,
            user_id=conn.user_id,
            exchange_name=conn.exchange_name,
            api_key_encrypted=encrypt_secret(conn.api_key),
            api_secret_encrypted=encrypt_secret(conn.api_secret),
            api_passphrase_encrypted=encrypt_secret(conn.api_passphrase) if conn.api_passphrase else None,
            last_sync_status="pending"
        )
        db.add(new_connection)
        db.commit()
        db.refresh(new_connection)
    except Exception as e:
        db.rollback()
        print(f"ERROR saving connection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save connection: {str(e)}")

    # Return success
    return {
        "id": new_connection.id,
        "user_id": new_connection.user_id,
        "exchange_name": new_connection.exchange_name,
        "api_key_last_4": conn.api_key[-4:],
        "last_sync_time": None,
        "last_sync_status": new_connection.last_sync_status,
        "created_at": str(new_connection.created_at)
    }

@router.delete("/{connection_id}")
def delete_connection(
    connection_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    conn = db.query(ExchangeConnection).filter(ExchangeConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Verify the authenticated user owns this connection
    verify_user_access(conn.user_id, current_user)

    db.delete(conn)
    db.commit()
    return {"status": "deleted"}

@router.post("/{connection_id}/sync")
async def sync_trades(
    connection_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    conn = db.query(ExchangeConnection).filter(ExchangeConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Verify the authenticated user owns this connection
    verify_user_access(conn.user_id, current_user)

    # Decrypt all secrets
    api_key = decrypt_secret(conn.api_key_encrypted)
    secret = decrypt_secret(conn.api_secret_encrypted)
    passphrase = decrypt_secret(conn.api_passphrase_encrypted) if conn.api_passphrase_encrypted else None

    # Fetch trades in background to avoid blocking
    background_tasks.add_task(run_sync_job, conn.id, conn.exchange_name, api_key, secret, passphrase, conn.user_id, db)

    return {"status": "sync_started"}

@router.get("/{connection_id}/sync-status")
def get_sync_status(
    connection_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get the sync status of an exchange connection"""
    conn = db.query(ExchangeConnection).filter(ExchangeConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Verify the authenticated user owns this connection
    verify_user_access(conn.user_id, current_user)

    return {
        "connection_id": conn.id,
        "exchange_name": conn.exchange_name,
        "last_sync_time": str(conn.last_sync_time) if conn.last_sync_time else None,
        "last_sync_status": conn.last_sync_status,
        "last_error": conn.last_error,
        "next_sync_scheduled": "Every 1 hour"  # For now, since APScheduler not yet added
    }

@router.post("/blofin/test-fetch")
async def test_blofin_fetch():
    """
    Test endpoint to fetch and display ALL fields from Blofin.
    This helps verify that the API is working and all data is being fetched correctly.

    IMPORTANT: This endpoint uses a 'Third-Party Application' API key which has LIMITED permissions.
    It can only access public market data, NOT private trade history.

    To fetch trades, you MUST use a REGULAR (non-third-party) API key with READ permissions.
    """
    # API Key for Third-Party Application Connection (LIMITED - cannot access trades)
    api_key = "5356f0a4a5fb4dac87a534424933bd54"
    api_secret = "5ee134f8bc534ba294699852c99c4c158"
    api_passphrase = "1234"

    try:
        trades = await exchange_service.fetch_all_trades(
            exchange_id="blofin",
            api_key=api_key,
            api_secret=api_secret,
            api_passphrase=api_passphrase
        )

        if not trades:
            return {
                "status": "error",
                "message": (
                    "❌ Cannot fetch trades with this API key.\n"
                    "Your API key is a 'Third-Party Application' type with LIMITED permissions.\n"
                    "It can only access PUBLIC market data, not your PRIVATE trade history.\n"
                    "\n"
                    "SOLUTION: Create a REGULAR API key with READ permissions:\n"
                    "1. Go to Blofin account settings → API Management\n"
                    "2. Delete the 'Third-Party Application' key\n"
                    "3. Create a NEW API key with 'Main Account' or 'Sub Account' type\n"
                    "4. Enable 'Read' permission\n"
                    "5. Use the new credentials in this application"
                ),
                "trade_count": 0,
                "api_key_type": "Third-Party Application (insufficient permissions)"
            }

        # Analyze field availability
        field_summary = {}
        critical_fields = ["symbol", "side", "entry", "exit", "size", "leverage", "fees", "pnl_usd", "pnl_pct", "date"]

        for field in critical_fields:
            non_null = sum(1 for t in trades if t.get(field) is not None)
            field_summary[field] = {
                "populated": non_null,
                "total": len(trades),
                "percentage": (non_null / len(trades)) * 100 if trades else 0
            }

        # Return first 3 trades + field summary
        return {
            "status": "success",
            "total_trades_fetched": len(trades),
            "first_3_trades": trades[:3],
            "field_availability": field_summary,
            "all_trades": trades
        }

    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

async def run_sync_job(connection_id: str, exchange_name: str, api_key: str, api_secret: str, api_passphrase: str, user_id: str, db: Session):
    """
    Background task to sync trades from exchange.
    Fetches trades, deduplicates them, saves to database, and updates sync status.
    """
    print(f"Starting sync for {exchange_name} user {user_id}...")
    trades_imported = 0

    try:
        # Mark as in_progress
        conn = db.query(ExchangeConnection).filter(ExchangeConnection.id == connection_id).first()
        if conn:
            conn.last_sync_status = "in_progress"
            db.commit()
        else:
            print(f"Connection {connection_id} not found!")
            return

        # Get last sync time for incremental sync
        since = None
        if conn.last_sync_time:
            # Convert datetime to milliseconds timestamp for CCXT
            since = int(conn.last_sync_time.timestamp() * 1000)
            print(f"Syncing since last sync: {conn.last_sync_time}")
        else:
            print(f"First sync for this connection, fetching all trades from 2020")

        # Fetch trades from exchange
        print(f"Fetching trades from {exchange_name}...")
        fetched_trades = await exchange_service.fetch_all_trades(
            exchange_name, api_key, api_secret, api_passphrase, since=since
        )
        print(f"Fetched {len(fetched_trades)} trades from {exchange_name}")

        if not fetched_trades:
            print("No trades to import")
            # Update status
            conn.last_sync_status = "success"
            conn.last_sync_time = datetime.utcnow()
            conn.last_error = None
            db.commit()
            return

        # Deduplicate trades against database
        unique_trades = exchange_service.deduplicate_trades(fetched_trades, user_id, exchange_name, db)
        print(f"After deduplication: {len(unique_trades)} new trades to import")

        # Fetch default leverage settings for this user and exchange
        default_leverages = get_default_leverages(user_id, exchange_name)

        # Save trades to database
        for idx, trade_data in enumerate(unique_trades):
            try:
                # Ensure all fields are converted to proper types with defaults
                entry_price = float(trade_data.get('entry', 0)) if trade_data.get('entry') is not None else 0
                exit_price = float(trade_data.get('exit', 0)) if trade_data.get('exit') is not None else 0
                size = float(trade_data.get('size', 0)) if trade_data.get('size') is not None else 0
                trade_leverage = float(trade_data.get('leverage', 0)) if trade_data.get('leverage') is not None else 0
                fees = float(trade_data.get('fees', 0)) if trade_data.get('fees') is not None else 0
                pnl_usd = float(trade_data.get('pnl_usd', 0)) if trade_data.get('pnl_usd') is not None else 0
                pnl_pct = float(trade_data.get('pnl_pct', 0)) if trade_data.get('pnl_pct') is not None else 0

                # Apply default leverage if user has configured one for this symbol
                symbol = str(trade_data.get('symbol', '')).upper()
                if trade_leverage <= 0 or trade_leverage == 1:
                    # Trade leverage is missing/invalid or default 1x - check for user's default
                    if symbol in default_leverages:
                        leverage = float(default_leverages[symbol])
                        print(f"🔧 Applied default leverage {leverage}x for {symbol}")
                        # Recalculate PnL% with correct leverage
                        if entry_price > 0 and size > 0 and leverage > 0:
                            position_value = entry_price * size
                            margin_used = position_value / leverage
                            pnl_pct = (pnl_usd / margin_used) * 100
                            print(f"   📊 Recalculated PnL%: {pnl_pct:.4f}%")
                    else:
                        leverage = 1.0  # Fallback to 1x
                else:
                    leverage = trade_leverage

                # CRITICAL: Skip fake/invalid trades with entry and exit price both 0 or equal with no PnL
                # These are often partial fills or system trades that shouldn't be counted
                if entry_price == 0 or exit_price == 0 or (entry_price == exit_price and pnl_usd == 0):
                    continue

                new_trade = Trade(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    date=trade_data.get('date'),
                    symbol=trade_data.get('symbol'),
                    side=trade_data.get('side'),
                    entry=entry_price,
                    exit=exit_price,
                    size=size,
                    leverage=leverage,
                    fees=fees,
                    pnl_usd=pnl_usd,
                    pnl_pct=pnl_pct,
                    exchange=trade_data.get('exchange'),
                    exchange_trade_id=trade_data.get('exchange_trade_id'),
                    notes=trade_data.get('notes')
                )

                db.add(new_trade)
                trades_imported += 1

            except Exception as e:
                print(f"Error saving trade {trade_data.get('exchange_trade_id')}: {e}")
                import traceback
                traceback.print_exc()
                continue

        # Commit all trades
        if trades_imported > 0:
            db.commit()
            print(f"Successfully imported {trades_imported} trades")

        # Update sync status to success
        conn = db.query(ExchangeConnection).filter(ExchangeConnection.id == connection_id).first()
        if conn:
            conn.last_sync_status = "success"
            conn.last_sync_time = datetime.utcnow()
            conn.last_error = None
            db.commit()

        print(f"Sync complete! Imported {trades_imported} new trades.")

    except Exception as e:
        print(f"Sync failed: {e}")
        import traceback
        traceback.print_exc()

        # Mark as failed with error message
        try:
            conn = db.query(ExchangeConnection).filter(ExchangeConnection.id == connection_id).first()
            if conn:
                conn.last_sync_status = "failed"
                conn.last_error = str(e)[:500]  # Limit error message length
                db.commit()
        except Exception as db_error:
            print(f"Error updating connection status: {db_error}")
