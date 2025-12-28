import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger(__name__)

# Load environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

Base = declarative_base()

# Make database optional for Cloud Run (we use Supabase REST API for most operations)
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("SQLAlchemy database configured")
else:
    # In production, we use Supabase REST API directly
    # Create an in-memory SQLite database for any local operations that need it
    engine = create_engine("sqlite:///./app.db", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.warning("DATABASE_URL not set, using in-memory SQLite for local operations")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
