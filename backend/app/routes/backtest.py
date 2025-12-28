from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.backtest_engine import run_funding_threshold_backtest
from backtest.engine.engine import run_backtest, run_portfolio_backtest, run_walk_forward
from backtest.models.strategy_config import (
    BacktestRunRequest,
    PortfolioBacktestRequest,
    WalkForwardRequest,
    StrategyConfig,
)
from backtest.storage.strategy_store import (
    list_strategies,
    get_strategy,
    save_strategy,
)

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


class FundingThresholdRequest(BaseModel):
    symbol: str
    timeframe: str
    start: str
    end: str
    side: str
    funding_threshold: float
    take_profit_pct: float
    stop_loss_pct: float
    max_bars: int


@router.post("/run")
def backtest_run(req: BacktestRunRequest):
    return run_backtest(req)


@router.post("/portfolio")
def backtest_portfolio(req: PortfolioBacktestRequest):
    return run_portfolio_backtest(req)


@router.post("/walk-forward")
def backtest_walk_forward(req: WalkForwardRequest):
    return run_walk_forward(req)


@router.post("/funding-threshold")
async def funding_threshold_backtest(req: FundingThresholdRequest):
    result = run_funding_threshold_backtest(
        symbol=req.symbol,
        timeframe=req.timeframe,
        start=req.start,
        end=req.end,
        side=req.side,
        funding_threshold=req.funding_threshold,
        tp_pct=req.take_profit_pct,
        sl_pct=req.stop_loss_pct,
        max_bars=req.max_bars,
    )
    return result


from sqlalchemy.orm import Session
from fastapi import Depends

from app.db import get_db
from app.models import SavedStrategy


class SaveStrategyRequest(BaseModel):
    user_id: str
    name: str
    config: StrategyConfig


@router.get("/strategy/list")
def strategy_list(user_id: str, db: Session = Depends(get_db)):
    strategies = db.query(SavedStrategy).filter(SavedStrategy.user_id == user_id).all()
    return {"strategies": [s.name for s in strategies]}


@router.get("/strategy/list_details")
def strategy_list_details(user_id: str, db: Session = Depends(get_db)):
    strategies = db.query(SavedStrategy).filter(SavedStrategy.user_id == user_id).all()
    return [{"id": s.id, "name": s.name} for s in strategies]


@router.get("/strategy/get/{name}")
def strategy_get(name: str, user_id: str, db: Session = Depends(get_db)):
    strategy = (
        db.query(SavedStrategy)
        .filter(SavedStrategy.user_id == user_id, SavedStrategy.name == name)
        .first()
    )
    if strategy is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy.config


@router.post("/strategy/save")
def strategy_save(req: SaveStrategyRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(SavedStrategy)
        .filter(SavedStrategy.user_id == req.user_id, SavedStrategy.name == req.name)
        .first()
    )
    if existing:
        existing.config = req.config.dict()
    else:
        new_strategy = SavedStrategy(
            user_id=req.user_id,
            name=req.name,
            config=req.config.dict(),
        )
        db.add(new_strategy)
    
    db.commit()
    return {"ok": True, "name": req.name}
