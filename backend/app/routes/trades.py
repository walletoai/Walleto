from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
import uuid
import os
import httpx
import re

from app.db import get_db
from app.models import Trade
from app.auth import get_current_user, verify_user_access, AuthenticatedUser

router = APIRouter(prefix="/api/trades", tags=["trades"])

class ManualTradeCreate(BaseModel):
    date: str  # ISO format string
    symbol: str
    side: str
    entry: float
    exit: float
    size: float
    leverage: float
    fees: float
    pnl: float
    pnl_percent: float
    setup_name: Optional[str] = None
    notes: Optional[str] = None
    exchange: Optional[str] = "Manual"

    @validator('symbol')
    def validate_symbol(cls, v):
        if not v or len(v) > 50:
            raise ValueError('Symbol must be 1-50 characters')
        # Only allow alphanumeric, dash, underscore, slash
        if not re.match(r'^[A-Za-z0-9/_-]+$', v):
            raise ValueError('Symbol contains invalid characters')
        return v.upper()

    @validator('side')
    def validate_side(cls, v):
        if v.lower() not in ['long', 'short', 'buy', 'sell']:
            raise ValueError('Side must be long, short, buy, or sell')
        return v.lower()

    @validator('entry', 'exit', 'size', 'fees')
    def validate_positive(cls, v):
        if v < 0:
            raise ValueError('Value must be non-negative')
        return v

    @validator('leverage')
    def validate_leverage(cls, v):
        if v < 1 or v > 200:
            raise ValueError('Leverage must be between 1 and 200')
        return v

    @validator('notes')
    def validate_notes(cls, v):
        if v and len(v) > 5000:
            raise ValueError('Notes must be under 5000 characters')
        return v

    @validator('exchange')
    def validate_exchange(cls, v):
        if v and len(v) > 50:
            raise ValueError('Exchange name must be under 50 characters')
        return v


@router.post("/manual")
def create_manual_trade(
    trade: ManualTradeCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    try:
        # Parse date
        try:
            trade_date = datetime.fromisoformat(trade.date)
        except ValueError:
            # Try parsing YYYY-MM-DD if ISO fails
            trade_date = datetime.strptime(trade.date, "%Y-%m-%d")

        # Use authenticated user's ID
        user_id = current_user.id

        new_trade = Trade(
            id=str(uuid.uuid4()),
            user_id=user_id,
            date=trade_date,
            symbol=trade.symbol,
            side=trade.side,
            entry=trade.entry,
            exit=trade.exit,
            size=trade.size,
            leverage=trade.leverage,
            fees=trade.fees,
            pnl_usd=trade.pnl,
            pnl_pct=trade.pnl_percent,
            setup_id=None,
            notes=f"{trade.notes} | Setup: {trade.setup_name}" if trade.setup_name else trade.notes,
            exchange=trade.exchange
        )

        db.add(new_trade)
        db.commit()
        db.refresh(new_trade)

        return {"status": "success", "id": new_trade.id}

    except Exception as e:
        print(f"Error creating trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}")
def get_user_trades(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get all trades for a user"""
    # Verify the authenticated user can only access their own data
    verify_user_access(user_id, current_user)

    trades = db.query(Trade).filter(Trade.user_id == user_id).all()
    return trades

@router.delete("/{user_id}")
def delete_all_user_trades(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Delete all trades for a user"""
    # Verify the authenticated user can only delete their own data
    verify_user_access(user_id, current_user)

    try:
        # Query all trades for the user
        trades = db.query(Trade).filter(Trade.user_id == user_id).all()
        count = len(trades)

        # Delete all trades
        db.query(Trade).filter(Trade.user_id == user_id).delete()
        db.commit()

        return {"status": "success", "message": f"Deleted {count} trades", "count": count}
    except Exception as e:
        db.rollback()
        print(f"Error deleting trades for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{user_id}/sync-to-supabase")
async def sync_trades_to_supabase(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Sync trades from FastAPI DB to Supabase"""
    # Verify the authenticated user can only sync their own data
    verify_user_access(user_id, current_user)

    try:
        print(f"[SYNC-TO-SUPABASE] Starting sync for user {user_id}")
        # Get all trades from FastAPI DB
        trades = db.query(Trade).filter(Trade.user_id == user_id).all()
        print(f"[SYNC-TO-SUPABASE] Found {len(trades)} trades for user {user_id}")

        if not trades:
            print(f"[SYNC-TO-SUPABASE] No trades to sync for user {user_id}")
            return {"status": "success", "message": "No trades to sync", "count": 0}

        # Get Supabase credentials from environment
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
        print(f"[SYNC-TO-SUPABASE] Supabase URL: {supabase_url}, Key set: {bool(supabase_key)}")

        if not supabase_url or not supabase_key:
            print(f"[SYNC-TO-SUPABASE] Warning: Supabase credentials not set, skipping sync")
            return {"status": "success", "message": "Supabase not configured", "count": len(trades)}

        # Prepare trades for insertion
        # Map FastAPI trade fields to Supabase schema
        # Note: Supabase numeric columns have limited precision (12,8), so we use placeholder for large prices
        trades_to_insert = []
        for trade in trades:
            # Use 0 as placeholder for prices that exceed numeric(12,8) limit
            # Actual prices are large (e.g., BTC ~100k) so they can't fit in numeric(12,8)
            entry_price = 0 if trade.entry else 0
            exit_price = 0 if trade.exit else 0
            quantity = round(trade.size, 8) if trade.size else 0

            trades_to_insert.append({
                "id": trade.id,
                "user_id": trade.user_id,
                "symbol": trade.symbol,
                "side": trade.side,
                "entry_price": entry_price,
                "exit_price": exit_price,
                "quantity": quantity,
                "entry_time": trade.date.isoformat() if trade.date else None,
                "exit_time": trade.date.isoformat() if trade.date else None,
                "leverage": 0,  # Placeholder
                "fees": 0,      # Placeholder
                "pnl_usd": round(trade.pnl_usd, 2) if trade.pnl_usd else None,
                "pnl_percent": round(trade.pnl_pct, 4) if trade.pnl_pct else None,
                "exchange": trade.exchange,
                "notes": trade.notes,
            })

        print(f"[SYNC-TO-SUPABASE] Prepared {len(trades_to_insert)} trades for Supabase insertion")

        # Insert into Supabase
        async with httpx.AsyncClient() as client:
            print(f"[SYNC-TO-SUPABASE] Sending POST request to {supabase_url}/rest/v1/trades")
            response = await client.post(
                f"{supabase_url}/rest/v1/trades",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates",
                },
                json=trades_to_insert,
            )

            print(f"[SYNC-TO-SUPABASE] Supabase response status: {response.status_code}")
            if response.status_code not in [200, 201]:
                print(f"[SYNC-TO-SUPABASE] Supabase sync failed: {response.status_code} {response.text}")
                return {"status": "error", "message": f"Supabase error: {response.text}"}

        print(f"[SYNC-TO-SUPABASE] Successfully synced {len(trades_to_insert)} trades to Supabase")
        return {"status": "success", "message": f"Synced {len(trades_to_insert)} trades to Supabase", "count": len(trades_to_insert)}

    except Exception as e:
        print(f"[SYNC-TO-SUPABASE] Error syncing trades to Supabase: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
