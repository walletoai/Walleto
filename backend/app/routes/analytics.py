from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db import get_db
from ..models import Trade

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/benchmarks")
def get_benchmarks(db: Session = Depends(get_db)):
    # 1. Get all trades
    # Note: For large datasets, this should be optimized with SQL aggregations.
    # For MVP, we'll fetch and process or use basic SQL.
    
    # Count total traders
    total_traders = db.query(func.count(func.distinct(Trade.user_id))).scalar() or 0
    
    # Avg Win Rate
    # We need win rate per user first, then average them.
    # SQL: SELECT user_id, SUM(CASE WHEN pnl_usd > 0 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as win_rate FROM trades GROUP BY user_id
    
    win_rates_query = db.query(
        Trade.user_id,
        (func.sum(func.case((Trade.pnl_usd > 0, 1), else_=0)) * 1.0 / func.count(Trade.id)).label("win_rate")
    ).group_by(Trade.user_id).all()
    
    if not win_rates_query:
        return {
            "avg_win_rate": 0,
            "top_win_rate": 0,
            "avg_pnl_per_trade": 0,
            "total_traders": 0
        }
        
    win_rates = [r.win_rate for r in win_rates_query if r.win_rate is not None]
    avg_win_rate = sum(win_rates) / len(win_rates) if win_rates else 0
    top_win_rate = max(win_rates) if win_rates else 0
    
    # Avg PnL per Trade (Global)
    avg_pnl = db.query(func.avg(Trade.pnl_usd)).scalar() or 0
    
    return {
        "avg_win_rate": round(avg_win_rate * 100, 2), # Return as percentage
        "top_win_rate": round(top_win_rate * 100, 2),
        "avg_pnl_per_trade": round(avg_pnl, 2),
        "total_traders": total_traders
    }
