"""
Background job scheduler for automatic exchange trade syncing.
Uses APScheduler to run sync jobs on a schedule (every 24 hours).
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.jobstores.memory import MemoryJobStore
import logging
from datetime import datetime
from typing import Optional

from app.db import SessionLocal
from app.models import ExchangeConnection
from app.services.encryption import decrypt_secret
from app.services.exchange_service import ExchangeService
import asyncio

# Set up logging
logging.basicConfig()
logging.getLogger('apscheduler').setLevel(logging.INFO)
logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: Optional[BackgroundScheduler] = None
exchange_service = ExchangeService()


def start_scheduler():
    """
    Initialize and start the APScheduler background job scheduler.
    Schedules sync jobs to run every 24 hours for all active exchange connections.
    """
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        logger.warning("Scheduler already running")
        return

    logger.info("Starting exchange sync scheduler (24-hour interval)...")

    _scheduler = BackgroundScheduler(
        jobstores={'default': MemoryJobStore()},
        timezone='UTC'
    )

    # Add periodic job to check and sync all connections every 24 hours
    _scheduler.add_job(
        func=sync_all_connections,
        trigger=IntervalTrigger(hours=24),  # Run every 24 hours
        id='sync_all_exchanges',
        name='Sync all exchange connections (daily)',
        replace_existing=True,
        misfire_grace_time=3600  # Allow 1 hour grace for missed executions
    )

    _scheduler.start()
    logger.info("Exchange sync scheduler started successfully - running every 24 hours")


def stop_scheduler():
    """
    Stop the background job scheduler.
    """
    global _scheduler

    if _scheduler is None:
        logger.warning("Scheduler not running")
        return

    logger.info("Stopping exchange sync scheduler...")
    _scheduler.shutdown(wait=True)
    _scheduler = None
    logger.info("Scheduler stopped")


def sync_all_connections():
    """
    Sync all active exchange connections.
    This is the main job that runs on schedule.
    """
    logger.info(f"[{datetime.utcnow()}] Starting scheduled sync for all connections...")

    db = SessionLocal()
    try:
        # Get all exchange connections
        connections = db.query(ExchangeConnection).all()
        logger.info(f"Found {len(connections)} exchange connections to sync")

        for conn in connections:
            try:
                # Skip if connection is in the middle of a sync
                if conn.last_sync_status == "in_progress":
                    logger.info(f"Skipping {conn.exchange_name} for user {conn.user_id}: sync already in progress")
                    continue

                logger.info(f"Scheduling sync for {conn.exchange_name} (ID: {conn.id})")
                # Schedule the sync in a non-blocking way
                sync_single_connection_async(conn.id, conn.exchange_name, conn.api_key_encrypted,
                                           conn.api_secret_encrypted, conn.api_passphrase_encrypted,
                                           conn.user_id)

            except Exception as e:
                logger.error(f"Error scheduling sync for connection {conn.id}: {e}")
                continue

        logger.info("Scheduled all pending syncs")

    except Exception as e:
        logger.error(f"Error in sync_all_connections: {e}")

    finally:
        db.close()


def sync_single_connection_async(connection_id: str, exchange_name: str, api_key_encrypted: str,
                                api_secret_encrypted: str, api_passphrase_encrypted: str,
                                user_id: str):
    """
    Sync a single connection asynchronously.
    Decrypts secrets and runs the sync operation.
    """
    try:
        # Decrypt secrets
        api_key = decrypt_secret(api_key_encrypted)
        api_secret = decrypt_secret(api_secret_encrypted)
        api_passphrase = decrypt_secret(api_passphrase_encrypted) if api_passphrase_encrypted else None

        # Run async sync operation
        # Since we're in a sync context, we need to create a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            loop.run_until_complete(
                _sync_connection(connection_id, exchange_name, api_key, api_secret, api_passphrase, user_id)
            )
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Error in sync_single_connection_async for {connection_id}: {e}")
        # Update connection status to failed
        db = SessionLocal()
        try:
            conn = db.query(ExchangeConnection).filter(ExchangeConnection.id == connection_id).first()
            if conn:
                conn.last_sync_status = "failed"
                conn.last_error = str(e)[:500]
                db.commit()
        except Exception as db_err:
            logger.error(f"Error updating connection status: {db_err}")
        finally:
            db.close()


async def _sync_connection(connection_id: str, exchange_name: str, api_key: str,
                          api_secret: str, api_passphrase: str, user_id: str):
    """
    Internal async function to sync a single connection.
    """
    db = SessionLocal()
    trades_imported = 0

    try:
        logger.info(f"Starting background sync for {exchange_name} user {user_id}...")

        # Mark as in_progress
        conn = db.query(ExchangeConnection).filter(ExchangeConnection.id == connection_id).first()
        if not conn:
            logger.error(f"Connection {connection_id} not found!")
            return

        conn.last_sync_status = "in_progress"
        db.commit()

        # Get last sync time for incremental sync
        since = None
        if conn.last_sync_time:
            since = int(conn.last_sync_time.timestamp() * 1000)
            logger.info(f"Syncing since last sync: {conn.last_sync_time}")
        else:
            logger.info(f"First sync for this connection, fetching all trades from 2020")

        # Fetch trades from exchange
        logger.info(f"Fetching trades from {exchange_name}...")
        fetched_trades = await exchange_service.fetch_all_trades(
            exchange_name, api_key, api_secret, api_passphrase, since=since
        )
        logger.info(f"Fetched {len(fetched_trades)} trades from {exchange_name}")

        if not fetched_trades:
            logger.info("No new trades to import")
            conn.last_sync_status = "success"
            conn.last_sync_time = datetime.utcnow()
            conn.last_error = None
            db.commit()
            return

        # Deduplicate trades
        from app.models import Trade
        unique_trades = exchange_service.deduplicate_trades(fetched_trades, user_id, exchange_name, db)
        logger.info(f"After deduplication: {len(unique_trades)} new trades to import")

        # Save trades to database
        import uuid
        for trade_data in unique_trades:
            try:
                new_trade = Trade(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    date=trade_data.get('date'),
                    symbol=trade_data.get('symbol'),
                    side=trade_data.get('side'),
                    entry=trade_data.get('entry'),
                    exit=trade_data.get('exit'),
                    size=trade_data.get('size'),
                    fees=trade_data.get('fees'),
                    pnl_usd=trade_data.get('pnl_usd'),
                    pnl_pct=trade_data.get('pnl_pct'),
                    exchange=trade_data.get('exchange'),
                    exchange_trade_id=trade_data.get('exchange_trade_id'),
                    notes=trade_data.get('notes')
                )
                db.add(new_trade)
                trades_imported += 1

            except Exception as e:
                logger.error(f"Error saving trade {trade_data.get('exchange_trade_id')}: {e}")
                continue

        # Commit all trades
        if trades_imported > 0:
            db.commit()
            logger.info(f"Successfully imported {trades_imported} trades")

        # Update sync status to success
        conn = db.query(ExchangeConnection).filter(ExchangeConnection.id == connection_id).first()
        if conn:
            conn.last_sync_status = "success"
            conn.last_sync_time = datetime.utcnow()
            conn.last_error = None
            db.commit()

        logger.info(f"Sync complete! Imported {trades_imported} new trades.")

    except Exception as e:
        logger.error(f"Background sync failed: {e}", exc_info=True)

        # Mark as failed
        try:
            conn = db.query(ExchangeConnection).filter(ExchangeConnection.id == connection_id).first()
            if conn:
                conn.last_sync_status = "failed"
                conn.last_error = str(e)[:500]
                db.commit()
        except Exception as db_err:
            logger.error(f"Error updating connection status: {db_err}")

    finally:
        db.close()


def get_scheduler_status() -> dict:
    """
    Get the current status of the scheduler.
    """
    global _scheduler

    if _scheduler is None:
        return {"status": "not_initialized"}

    return {
        "status": "running" if _scheduler.running else "stopped",
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run_time": str(job.next_run_time) if job.next_run_time else None
            }
            for job in _scheduler.get_jobs()
        ]
    }
