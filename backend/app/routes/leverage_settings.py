"""
Leverage settings endpoints - allows users to set default leverage per symbol
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
from supabase import create_client, Client

router = APIRouter(prefix="/api/leverage-settings", tags=["leverage-settings"])

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None


class LeverageSetting(BaseModel):
    """Leverage setting for a symbol"""
    symbol: str
    leverage: float
    exchange: str  # e.g., 'blofin', 'binance', 'bybit', etc.


class LeverageSettingResponse(BaseModel):
    """Response with leverage setting"""
    id: str
    user_id: str
    symbol: str
    leverage: float
    exchange: str
    created_at: str
    updated_at: str


@router.get("/{user_id}", response_model=List[LeverageSettingResponse])
async def get_leverage_settings(user_id: str) -> List[LeverageSettingResponse]:
    """Get all leverage settings for a user"""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase client not initialized")
    try:
        response = supabase.table("leverage_settings").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception as e:
        print(f"❌ Error fetching leverage settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}")
async def set_leverage_setting(user_id: str, setting: LeverageSetting):
    """Set or update leverage setting for a symbol on a specific exchange"""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase client not initialized")
    try:
        # Check if setting already exists for this exchange + symbol combination
        existing = supabase.table("leverage_settings").select("*").eq("user_id", user_id).eq("symbol", setting.symbol).eq("exchange", setting.exchange).execute()

        if existing.data:
            # Update existing setting
            response = supabase.table("leverage_settings").update({
                "leverage": setting.leverage
            }).eq("user_id", user_id).eq("symbol", setting.symbol).eq("exchange", setting.exchange).execute()

            return {
                "success": True,
                "message": f"Updated leverage for {setting.symbol} on {setting.exchange} to {setting.leverage}x",
                "data": response.data[0] if response.data else None
            }
        else:
            # Insert new setting
            response = supabase.table("leverage_settings").insert({
                "user_id": user_id,
                "symbol": setting.symbol,
                "leverage": setting.leverage,
                "exchange": setting.exchange
            }).execute()

            return {
                "success": True,
                "message": f"Set leverage for {setting.symbol} on {setting.exchange} to {setting.leverage}x",
                "data": response.data[0] if response.data else None
            }
    except Exception as e:
        print(f"❌ Error setting leverage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}/{exchange}/{symbol}")
async def delete_leverage_setting(user_id: str, exchange: str, symbol: str):
    """Delete leverage setting for a symbol on a specific exchange (reset to default 1x)"""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase client not initialized")
    try:
        response = supabase.table("leverage_settings").delete().eq("user_id", user_id).eq("exchange", exchange).eq("symbol", symbol).execute()

        return {
            "success": True,
            "message": f"Reset leverage for {symbol} on {exchange} to default (1x)"
        }
    except Exception as e:
        print(f"❌ Error deleting leverage setting: {e}")
        raise HTTPException(status_code=500, detail=str(e))
