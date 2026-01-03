from dotenv import load_dotenv
load_dotenv()  # Load .env before any other imports

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from app import models, db
from .routes import backtest, exchanges, profile, calendar, upload, social, analytics, trades, coach, blofin_sync, binance_sync, bybit_sync, hyperliquid_sync, leverage_settings, journal, invite
from .services.sync_scheduler import start_scheduler, stop_scheduler
import logging


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # Cache control for API responses
        if not request.url.path.startswith("/static"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        return response

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
models.Base.metadata.create_all(bind=db.engine)

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Application starting up...")
    # Auto-sync scheduler: syncs all connected exchanges every 24 hours
    try:
        start_scheduler()
        logger.info("24-hour auto-sync scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")

    yield

    # Shutdown
    logger.info("Application shutting down...")
    try:
        stop_scheduler()
        logger.info("Scheduler stopped successfully")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {e}")

app = FastAPI(
    title="Walleto Backtest API",
    description="API for backtesting perp strategies and syncing trades",
    version="1.0.0",
    lifespan=lifespan,
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Allow local frontend + deployed frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://walleto-backtest-api.onrender.com",  # legacy backend
    "https://walleto.ai",
    "https://www.walleto.ai",
    "https://app.walleto.ai",
    "https://api.walleto.ai",
]

# Add security headers middleware first (executes last)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(backtest.router)
app.include_router(exchanges.router)
app.include_router(profile.router)
app.include_router(calendar.router)
app.include_router(upload.router)
app.include_router(social.router)
app.include_router(analytics.router)
app.include_router(trades.router)
app.include_router(coach.router)
app.include_router(blofin_sync.router)
app.include_router(binance_sync.router)
app.include_router(bybit_sync.router)
app.include_router(hyperliquid_sync.router)
app.include_router(leverage_settings.router)
app.include_router(journal.router)
app.include_router(invite.router)


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
