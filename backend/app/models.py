# app/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Text, func
from .db import Base
import uuid


class Candle(Base):
    __tablename__ = "candles"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    timeframe = Column(String, index=True, nullable=False)
    open_time = Column(DateTime, index=True, nullable=False)

    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)


class FundingRate(Base):
    __tablename__ = "funding_rates"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    funding_time = Column(DateTime, index=True, nullable=False)
    funding_rate = Column(Float, nullable=False)


class BacktestJob(Base):
    __tablename__ = "backtest_jobs"

    id = Column(Integer, primary_key=True, index=True)
    strategy = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, index=True)
    params = Column(JSON, nullable=False)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ExchangeConnection(Base):
    __tablename__ = "exchange_connections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)
    exchange_name = Column(String, nullable=False)
    api_key_encrypted = Column(String, nullable=False)
    api_secret_encrypted = Column(String, nullable=False)
    api_passphrase_encrypted = Column(String, nullable=True)
    last_sync_time = Column(DateTime(timezone=True), nullable=True)
    last_sync_status = Column(String, nullable=True, default="pending")  # pending, in_progress, success, failed
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SavedStrategy(Base):
    __tablename__ = "saved_strategies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    config = Column(JSON, nullable=False)
    is_public = Column(Integer, default=0) # 0=False, 1=True (SQLite doesn't have Boolean type natively in all versions, but SQLAlchemy handles it. Using Integer for safety or Boolean if standard)
    # Actually SQLAlchemy Boolean maps to INTEGER in SQLite.
    # Let's use Boolean from sqlalchemy
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(String, primary_key=True, index=True)
    username = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    is_private = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Trade(Base):
    __tablename__ = "trades"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)
    leverage = Column(Float, nullable=True)
    fees = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    exchange = Column(String, nullable=True)
    exchange_trade_id = Column(String, nullable=True, index=True)
    date = Column(DateTime, nullable=True)  # Exchange sync timestamp
    entry = Column(Float, nullable=True)  # Entry price from exchange sync
    exit = Column(Float, nullable=True)  # Exit price from exchange sync
    size = Column(Float, nullable=True)  # Trade size from exchange sync
    pnl_usd = Column(Float, nullable=True)  # PnL in USD
    pnl_pct = Column(Float, nullable=True)  # PnL percentage from exchange sync


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("user_profiles.user_id"), nullable=False)
    content = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    likes_count = Column(Integer, default=0)
    strategy_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Follow(Base):
    __tablename__ = "follows"

    follower_id = Column(String, primary_key=True)
    following_id = Column(String, primary_key=True)
    status = Column(String, default="accepted")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("user_profiles.user_id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CoachInsight(Base):
    __tablename__ = "coach_insights"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)
    trading_style = Column(String, nullable=True)
    risk_profile = Column(String, nullable=True)
    edge_observed = Column(Text, nullable=True)
    strengths = Column(JSON, nullable=True)
    weaknesses = Column(JSON, nullable=True)
    favorite_symbols = Column(JSON, nullable=True)
    favorite_timeframes = Column(JSON, nullable=True)
    total_trades_analyzed = Column(Integer, default=0)
    last_updated = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TradePattern(Base):
    __tablename__ = "trade_patterns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)
    pattern_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    frequency = Column(Integer, default=0)
    win_rate = Column(Float, nullable=True)
    avg_return = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
