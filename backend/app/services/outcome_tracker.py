"""
OutcomeTracker: Tracks if coach advice actually helped the user improve.
Measures trading metrics before and after advice, determines if advice was followed.
This creates a feedback loop for the coach to learn what works.
"""

import logging
import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import httpx
import json
import uuid

logger = logging.getLogger(__name__)


class AdviceOutcome:
    """Represents an advice outcome record."""

    def __init__(
        self,
        id: str,
        user_id: str,
        conversation_id: str,
        advice_summary: str,
        advice_category: str,
        given_at: datetime,
        metrics_before: Optional[Dict] = None,
        metrics_after: Optional[Dict] = None,
        was_followed: Optional[bool] = None,
        outcome: str = "pending",
        outcome_notes: Optional[str] = None,
        learning_value: Optional[float] = None,
    ):
        self.id = id
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.advice_summary = advice_summary
        self.advice_category = advice_category
        self.given_at = given_at
        self.metrics_before = metrics_before or {}
        self.metrics_after = metrics_after or {}
        self.was_followed = was_followed
        self.outcome = outcome
        self.outcome_notes = outcome_notes
        self.learning_value = learning_value


class OutcomeTracker:
    """
    Tracks outcomes of coach advice to measure effectiveness.
    Creates a feedback loop for continuous improvement.
    """

    # Measurement windows
    DEFAULT_MEASUREMENT_DAYS = 7
    MIN_TRADES_FOR_MEASUREMENT = 10

    # Advice categories
    ADVICE_CATEGORIES = [
        "risk_management",
        "psychology",
        "strategy",
        "execution",
        "position_sizing",
        "general",
    ]

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.supabase_key = os.getenv("SUPABASE_KEY", "")
        self.supabase_available = bool(self.supabase_url and self.supabase_key)

        if not self.supabase_available:
            logger.warning("Supabase not configured - outcome tracking disabled")

    async def record_advice_given(
        self,
        user_id: str,
        conversation_id: str,
        message_id: str,
        advice_summary: str,
        advice_category: str,
        current_metrics: Dict,
    ) -> Optional[str]:
        """
        Record that advice was given to track its outcome later.

        Args:
            user_id: User ID
            conversation_id: Conversation ID
            message_id: Message ID containing the advice
            advice_summary: Short summary of the advice
            advice_category: Category of advice (risk, psychology, etc.)
            current_metrics: User's current trading metrics

        Returns:
            Outcome record ID if successful
        """
        if not self.supabase_available:
            return None

        try:
            advice_id = str(uuid.uuid4())
            now = datetime.utcnow()

            payload = {
                "id": advice_id,
                "user_id": user_id,
                "conversation_id": conversation_id,
                "message_id": message_id,
                "advice_summary": advice_summary[:500],
                "advice_category": advice_category,
                "given_at": now.isoformat() + "Z",
                "measurement_start": now.isoformat() + "Z",
                "measurement_end": (now + timedelta(days=self.DEFAULT_MEASUREMENT_DAYS)).isoformat() + "Z",
                "metrics_before": json.dumps(current_metrics),
                "outcome": "pending",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/coach_advice_outcomes",
                    json=payload,
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(f"Failed to record advice: {response.status_code}")
                    return None

                logger.info(f"Recorded advice outcome {advice_id} for user {user_id}")
                return advice_id

        except Exception as e:
            logger.error(f"Error recording advice: {e}")
            return None

    async def measure_advice_outcomes(self, user_id: str) -> List[Dict]:
        """
        Measure outcomes for advice where the measurement window has ended.

        Args:
            user_id: User ID

        Returns:
            List of outcomes that were measured
        """
        if not self.supabase_available:
            return []

        try:
            # Get pending outcomes that are ready to measure
            pending = await self._get_pending_outcomes(user_id)

            measured = []
            for outcome in pending:
                # Check if measurement window has ended
                measurement_end = datetime.fromisoformat(
                    outcome["measurement_end"].replace("Z", "+00:00")
                )

                if datetime.utcnow().replace(tzinfo=measurement_end.tzinfo) < measurement_end:
                    continue  # Not ready yet

                # Get current metrics to compare
                metrics_after = await self._get_user_metrics(
                    user_id,
                    since=datetime.fromisoformat(outcome["measurement_start"].replace("Z", "+00:00")),
                )

                if not metrics_after or metrics_after.get("trade_count", 0) < self.MIN_TRADES_FOR_MEASUREMENT:
                    # Not enough trades to measure, extend window
                    await self._extend_measurement_window(outcome["id"])
                    continue

                # Compare metrics
                metrics_before = json.loads(outcome.get("metrics_before", "{}"))
                comparison = self._compare_metrics(metrics_before, metrics_after)

                # Determine outcome
                outcome_result = self._determine_outcome(comparison, outcome["advice_category"])

                # Update the record
                await self._update_outcome(
                    outcome_id=outcome["id"],
                    metrics_after=metrics_after,
                    outcome=outcome_result["outcome"],
                    outcome_notes=outcome_result["notes"],
                    learning_value=outcome_result["learning_value"],
                )

                measured.append({
                    "advice_id": outcome["id"],
                    "advice_summary": outcome["advice_summary"],
                    "outcome": outcome_result["outcome"],
                    "notes": outcome_result["notes"],
                })

            return measured

        except Exception as e:
            logger.error(f"Error measuring outcomes: {e}")
            return []

    async def get_outcome_statistics(self, user_id: str) -> Dict:
        """
        Get statistics about advice outcomes for a user.

        Args:
            user_id: User ID

        Returns:
            Statistics about advice effectiveness
        """
        if not self.supabase_available:
            return {"error": "Tracking disabled"}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/coach_advice_outcomes",
                    params={
                        "user_id": f"eq.{user_id}",
                        "select": "outcome,advice_category,learning_value",
                    },
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    return {"error": f"API error: {response.status_code}"}

                outcomes = response.json()

                if not outcomes:
                    return {
                        "total_advice": 0,
                        "message": "No advice outcomes recorded yet",
                    }

                # Calculate statistics
                total = len(outcomes)
                by_outcome = {}
                by_category = {}
                total_learning_value = 0
                measured_count = 0

                for o in outcomes:
                    outcome = o.get("outcome", "pending")
                    category = o.get("advice_category", "general")
                    learning = o.get("learning_value")

                    by_outcome[outcome] = by_outcome.get(outcome, 0) + 1

                    if category not in by_category:
                        by_category[category] = {"total": 0, "improved": 0}
                    by_category[category]["total"] += 1
                    if outcome == "improved":
                        by_category[category]["improved"] += 1

                    if learning is not None:
                        total_learning_value += learning
                        measured_count += 1

                # Calculate effectiveness rates
                improved = by_outcome.get("improved", 0)
                no_change = by_outcome.get("no_change", 0)
                worsened = by_outcome.get("worsened", 0)
                measured = improved + no_change + worsened

                effectiveness_rate = (improved / measured * 100) if measured > 0 else 0

                return {
                    "total_advice": total,
                    "outcomes_measured": measured,
                    "pending": by_outcome.get("pending", 0),
                    "improved": improved,
                    "no_change": no_change,
                    "worsened": worsened,
                    "effectiveness_rate": round(effectiveness_rate, 1),
                    "by_category": by_category,
                    "avg_learning_value": (
                        round(total_learning_value / measured_count, 2)
                        if measured_count > 0
                        else None
                    ),
                }

        except Exception as e:
            logger.error(f"Error getting outcome statistics: {e}")
            return {"error": str(e)}

    async def get_most_effective_advice_types(self, user_id: str) -> List[Dict]:
        """
        Get the types of advice that have been most effective for this user.

        Args:
            user_id: User ID

        Returns:
            List of advice categories sorted by effectiveness
        """
        stats = await self.get_outcome_statistics(user_id)

        if "error" in stats or not stats.get("by_category"):
            return []

        effectiveness = []
        for category, data in stats["by_category"].items():
            if data["total"] >= 3:  # Need at least 3 data points
                rate = data["improved"] / data["total"] * 100
                effectiveness.append({
                    "category": category,
                    "total_advice": data["total"],
                    "times_improved": data["improved"],
                    "effectiveness_rate": round(rate, 1),
                })

        # Sort by effectiveness rate
        effectiveness.sort(key=lambda x: -x["effectiveness_rate"])
        return effectiveness

    async def _get_pending_outcomes(self, user_id: str) -> List[Dict]:
        """Get outcomes that are pending measurement."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/coach_advice_outcomes",
                    params={
                        "user_id": f"eq.{user_id}",
                        "outcome": "eq.pending",
                        "select": "*",
                    },
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    return []

                return response.json()

        except Exception as e:
            logger.error(f"Error getting pending outcomes: {e}")
            return []

    async def _get_user_metrics(
        self, user_id: str, since: datetime
    ) -> Optional[Dict]:
        """Get user's trading metrics since a given date."""
        try:
            # This would fetch from your trades table
            # For now, returning a placeholder
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/trades",
                    params={
                        "user_id": f"eq.{user_id}",
                        "date": f"gte.{since.isoformat()}",
                        "select": "pnl_usd,pnl_pct,side,symbol,leverage",
                    },
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    return None

                trades = response.json()

                if not trades:
                    return {"trade_count": 0}

                # Calculate metrics
                pnls = [t.get("pnl_usd", 0) for t in trades if t.get("pnl_usd") is not None]
                wins = sum(1 for p in pnls if p > 0)
                total = len(pnls)

                return {
                    "trade_count": total,
                    "win_rate": (wins / total * 100) if total > 0 else 0,
                    "total_pnl": sum(pnls),
                    "avg_pnl": sum(pnls) / total if total > 0 else 0,
                    "avg_leverage": sum(
                        t.get("leverage", 1) or 1 for t in trades
                    ) / len(trades) if trades else 1,
                }

        except Exception as e:
            logger.error(f"Error getting user metrics: {e}")
            return None

    def _compare_metrics(
        self, before: Dict, after: Dict
    ) -> Dict:
        """Compare before and after metrics."""
        comparison = {}

        for key in ["win_rate", "avg_pnl", "total_pnl"]:
            before_val = before.get(key, 0)
            after_val = after.get(key, 0)

            if before_val == 0:
                change_pct = 100 if after_val > 0 else 0
            else:
                change_pct = ((after_val - before_val) / abs(before_val)) * 100

            comparison[key] = {
                "before": before_val,
                "after": after_val,
                "change": after_val - before_val,
                "change_pct": round(change_pct, 2),
                "improved": after_val > before_val,
            }

        return comparison

    def _determine_outcome(
        self, comparison: Dict, advice_category: str
    ) -> Dict:
        """Determine the outcome based on metric comparison."""
        # Count improvements
        improvements = sum(1 for v in comparison.values() if v.get("improved"))
        total_metrics = len(comparison)

        # Calculate overall change
        win_rate_change = comparison.get("win_rate", {}).get("change", 0)
        avg_pnl_change = comparison.get("avg_pnl", {}).get("change", 0)

        # Determine outcome
        if improvements >= total_metrics * 0.6:  # 60% or more improved
            if win_rate_change > 5 or avg_pnl_change > 0:
                outcome = "improved"
                notes = f"Win rate changed by {win_rate_change:+.1f}%, avg PnL changed by ${avg_pnl_change:+.2f}"
                learning_value = 0.8
            else:
                outcome = "improved"
                notes = "Slight improvement in trading metrics"
                learning_value = 0.5
        elif improvements <= total_metrics * 0.3:  # 30% or fewer improved
            outcome = "worsened"
            notes = "Trading metrics declined after advice"
            learning_value = -0.3
        else:
            outcome = "no_change"
            notes = "No significant change in trading metrics"
            learning_value = 0.0

        return {
            "outcome": outcome,
            "notes": notes,
            "learning_value": learning_value,
        }

    async def _update_outcome(
        self,
        outcome_id: str,
        metrics_after: Dict,
        outcome: str,
        outcome_notes: str,
        learning_value: float,
    ) -> bool:
        """Update an outcome record with results."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.supabase_url}/rest/v1/coach_advice_outcomes",
                    params={"id": f"eq.{outcome_id}"},
                    json={
                        "metrics_after": json.dumps(metrics_after),
                        "outcome": outcome,
                        "outcome_notes": outcome_notes,
                        "learning_value": learning_value,
                        "updated_at": datetime.utcnow().isoformat() + "Z",
                    },
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    timeout=10.0,
                )

                return response.status_code in (200, 204)

        except Exception as e:
            logger.error(f"Error updating outcome: {e}")
            return False

    async def _extend_measurement_window(self, outcome_id: str) -> bool:
        """Extend the measurement window for an outcome."""
        try:
            new_end = datetime.utcnow() + timedelta(days=self.DEFAULT_MEASUREMENT_DAYS)

            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.supabase_url}/rest/v1/coach_advice_outcomes",
                    params={"id": f"eq.{outcome_id}"},
                    json={
                        "measurement_end": new_end.isoformat() + "Z",
                        "updated_at": datetime.utcnow().isoformat() + "Z",
                    },
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    timeout=10.0,
                )

                return response.status_code in (200, 204)

        except Exception as e:
            logger.error(f"Error extending measurement window: {e}")
            return False


class AdviceExtractor:
    """
    Extracts actionable advice from coach responses for outcome tracking.
    Uses Claude to identify specific advice that should be tracked.
    """

    EXTRACTION_PROMPT = """Analyze this coach response and extract any specific, actionable advice given.

For each piece of advice, identify:
1. A short summary (1-2 sentences)
2. The category: risk_management, psychology, strategy, execution, position_sizing, or general

Only extract advice that is:
- Specific and actionable
- Something that can be measured by future trading results
- Not just general encouragement

Return JSON:
{
    "advice_items": [
        {
            "summary": "Reduce position size to 2% max per trade",
            "category": "risk_management"
        }
    ]
}

If no specific advice was given, return empty array.

COACH RESPONSE:
{response}
"""

    def __init__(self):
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")

    async def extract_advice(self, coach_response: str) -> List[Dict]:
        """
        Extract actionable advice from a coach response.

        Args:
            coach_response: The coach's response text

        Returns:
            List of advice items with summary and category
        """
        if not self.anthropic_key:
            return []

        try:
            prompt = self.EXTRACTION_PROMPT.format(response=coach_response)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    json={
                        "model": "claude-3-haiku-20240307",  # Use Haiku for speed
                        "max_tokens": 500,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                    headers={
                        "x-api-key": self.anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    timeout=15.0,
                )

                if response.status_code != 200:
                    return []

                data = response.json()
                content = data.get("content", [{}])[0].get("text", "")

                # Parse JSON
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]

                result = json.loads(content.strip())
                return result.get("advice_items", [])

        except Exception as e:
            logger.error(f"Error extracting advice: {e}")
            return []
