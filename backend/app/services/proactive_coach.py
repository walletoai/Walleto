"""
ProactiveCoach: Generates insights automatically without user prompting.
Triggers on trade completion, session end, streaks, and scheduled reports.
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import uuid

from app.services.pattern_detector import PatternDetector
from app.services.mistake_detector import MistakeDetector, Mistake
from app.services.claude_service import ClaudeService
from app.services.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class ProactiveInsight:
    """Represents a proactive coaching insight."""

    TYPE_TRADE_REVIEW = "trade_review"
    TYPE_DAILY_SUMMARY = "daily_summary"
    TYPE_WEEKLY_REPORT = "weekly_report"
    TYPE_PATTERN_ALERT = "pattern_alert"
    TYPE_MISTAKE_WARNING = "mistake_warning"
    TYPE_STREAK_ALERT = "streak_alert"
    TYPE_MILESTONE = "milestone"

    def __init__(
        self,
        insight_type: str,
        title: str,
        content: str,
        severity: str = "info",
        user_id: str = None,
        trade_id: str = None,
        metadata: Dict = None,
    ):
        self.id = str(uuid.uuid4())
        self.insight_type = insight_type
        self.title = title
        self.content = content
        self.severity = severity
        self.user_id = user_id
        self.trade_id = trade_id
        self.metadata = metadata or {}
        self.created_at = datetime.utcnow()
        self.is_read = False

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "insight_type": self.insight_type,
            "title": self.title,
            "content": self.content,
            "severity": self.severity,
            "user_id": self.user_id,
            "trade_id": self.trade_id,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "is_read": self.is_read,
        }


class ProactiveCoach:
    """Service for generating proactive coaching insights."""

    def __init__(self):
        self.pattern_detector = PatternDetector()
        self.mistake_detector = MistakeDetector()
        self.supabase = SupabaseClient()

        try:
            self.claude = ClaudeService()
        except RuntimeError:
            logger.warning("Claude service not available for proactive coach")
            self.claude = None

    async def on_trade_completed(
        self,
        user_id: str,
        trade: Dict,
        recent_trades: List[Dict],
        user_stats: Optional[Dict] = None,
    ) -> List[ProactiveInsight]:
        """
        Called when a new trade is synced/imported.
        Generates immediate insights about the trade.

        Args:
            user_id: User ID
            trade: The new trade
            recent_trades: Recent trade history
            user_stats: User's trading statistics

        Returns:
            List of generated insights
        """
        insights = []

        # Check for mistakes
        mistakes = await self.mistake_detector.check_trade(trade, recent_trades, user_stats)
        for mistake in mistakes:
            insight = ProactiveInsight(
                insight_type=ProactiveInsight.TYPE_MISTAKE_WARNING,
                title=self._get_mistake_title(mistake.mistake_type),
                content=f"{mistake.description}\n\n**Suggestion:** {mistake.suggestion}",
                severity=mistake.severity,
                user_id=user_id,
                trade_id=trade.get("id"),
                metadata={"mistake_type": mistake.mistake_type},
            )
            insights.append(insight)

        # Check for streaks
        streak_insight = await self._check_streak_alert(user_id, trade, recent_trades)
        if streak_insight:
            insights.append(streak_insight)

        # Check for milestones
        milestone_insight = await self._check_milestones(user_id, trade, recent_trades, user_stats)
        if milestone_insight:
            insights.append(milestone_insight)

        # Generate quick trade review (if Claude is available)
        if self.claude and trade.get("pnl_usd") is not None:
            review_insight = await self._generate_quick_trade_review(user_id, trade, recent_trades)
            if review_insight:
                insights.append(review_insight)

        # Save insights to database
        for insight in insights:
            await self._save_insight(insight)

        return insights

    async def generate_daily_summary(
        self,
        user_id: str,
        trades: List[Dict],
        user_context: Optional[Dict] = None,
    ) -> Optional[ProactiveInsight]:
        """
        Generate end-of-day trading summary.

        Args:
            user_id: User ID
            trades: Today's trades
            user_context: User's trading context

        Returns:
            Daily summary insight or None
        """
        if not trades:
            return None

        # Calculate daily stats
        total_pnl = sum(t.get("pnl_usd", 0) for t in trades)
        wins = sum(1 for t in trades if t.get("pnl_usd", 0) > 0)
        losses = len(trades) - wins
        win_rate = (wins / len(trades) * 100) if trades else 0

        # Check for mistakes in today's session
        session_mistakes = await self.mistake_detector.analyze_session(trades)

        # Build summary content
        outcome = "profitable" if total_pnl > 0 else "unprofitable"
        pnl_emoji = "📈" if total_pnl > 0 else "📉"

        content = f"""## Daily Trading Summary {pnl_emoji}

**Today's Results:**
- Trades: {len(trades)} ({wins} wins, {losses} losses)
- Win Rate: {win_rate:.1f}%
- Total PnL: ${total_pnl:,.2f}

"""

        if session_mistakes:
            content += "**Issues Detected:**\n"
            for m in session_mistakes[:3]:
                content += f"- ⚠️ {m.description}\n"
            content += "\n"

        # Use Claude for personalized summary if available
        if self.claude:
            try:
                summary_text, _, _ = await self.claude.generate_daily_summary(trades, user_context)
                content += f"**Coach's Take:**\n{summary_text}"
            except Exception as e:
                logger.error(f"Error generating Claude summary: {e}")
                content += f"**Summary:** {'Good' if total_pnl > 0 else 'Challenging'} day. {'Keep the momentum!' if total_pnl > 0 else 'Review your trades and learn from mistakes.'}"

        insight = ProactiveInsight(
            insight_type=ProactiveInsight.TYPE_DAILY_SUMMARY,
            title=f"Daily Summary: ${total_pnl:,.2f} ({outcome.title()})",
            content=content,
            severity="info" if total_pnl >= 0 else "warning",
            user_id=user_id,
            metadata={
                "total_pnl": total_pnl,
                "trade_count": len(trades),
                "win_rate": win_rate,
            },
        )

        await self._save_insight(insight)
        return insight

    async def generate_weekly_report(
        self,
        user_id: str,
        trades: List[Dict],
        user_context: Optional[Dict] = None,
    ) -> Optional[ProactiveInsight]:
        """
        Generate weekly trading report.

        Args:
            user_id: User ID
            trades: This week's trades
            user_context: User's trading context

        Returns:
            Weekly report insight or None
        """
        if not trades:
            return None

        # Calculate weekly stats
        total_pnl = sum(t.get("pnl_usd", 0) for t in trades)
        wins = sum(1 for t in trades if t.get("pnl_usd", 0) > 0)
        win_rate = (wins / len(trades) * 100) if trades else 0

        # Detect patterns from this week
        patterns = await self.pattern_detector.analyze_patterns(trades)

        # Build report content
        content = f"""## Weekly Trading Report 📊

**Week Summary:**
- Total Trades: {len(trades)}
- Win Rate: {win_rate:.1f}%
- Total PnL: ${total_pnl:,.2f}
- Average per Trade: ${total_pnl/len(trades):,.2f}

"""

        if patterns:
            content += "**Patterns Detected:**\n"
            for p in patterns[:5]:
                content += f"- {p.description}\n"
            content += "\n"

        # Use Claude for personalized report if available
        if self.claude:
            try:
                report_text, _, _ = await self.claude.generate_weekly_report(trades, user_context)
                content += f"**Coach's Analysis:**\n{report_text}"
            except Exception as e:
                logger.error(f"Error generating Claude weekly report: {e}")

        insight = ProactiveInsight(
            insight_type=ProactiveInsight.TYPE_WEEKLY_REPORT,
            title=f"Weekly Report: ${total_pnl:,.2f}",
            content=content,
            severity="info",
            user_id=user_id,
            metadata={
                "total_pnl": total_pnl,
                "trade_count": len(trades),
                "win_rate": win_rate,
                "patterns_count": len(patterns),
            },
        )

        await self._save_insight(insight)
        return insight

    async def _check_streak_alert(
        self,
        user_id: str,
        trade: Dict,
        recent_trades: List[Dict],
    ) -> Optional[ProactiveInsight]:
        """Check for win/loss streaks and generate alerts."""
        if len(recent_trades) < 2:
            return None

        # Count current streak
        streak_count = 1
        streak_type = "win" if trade.get("pnl_usd", 0) > 0 else "loss"

        for prev_trade in reversed(recent_trades):
            prev_pnl = prev_trade.get("pnl_usd", 0)
            if (streak_type == "win" and prev_pnl > 0) or (streak_type == "loss" and prev_pnl <= 0):
                streak_count += 1
            else:
                break

        # Alert on significant streaks
        if streak_count >= 5:
            if streak_type == "win":
                return ProactiveInsight(
                    insight_type=ProactiveInsight.TYPE_STREAK_ALERT,
                    title=f"🔥 {streak_count}-Win Streak!",
                    content=f"Amazing! You're on a {streak_count}-trade winning streak. Stay disciplined and don't let overconfidence creep in. Consider reducing size slightly to protect your gains.",
                    severity="info",
                    user_id=user_id,
                    trade_id=trade.get("id"),
                    metadata={"streak_count": streak_count, "streak_type": "win"},
                )
            else:
                return ProactiveInsight(
                    insight_type=ProactiveInsight.TYPE_STREAK_ALERT,
                    title=f"⚠️ {streak_count}-Loss Streak",
                    content=f"You're on a {streak_count}-trade losing streak. This is the time to **stop trading** and review. What's changed? Consider taking a break and coming back with fresh eyes.",
                    severity="critical",
                    user_id=user_id,
                    trade_id=trade.get("id"),
                    metadata={"streak_count": streak_count, "streak_type": "loss"},
                )
        elif streak_count >= 3:
            if streak_type == "loss":
                return ProactiveInsight(
                    insight_type=ProactiveInsight.TYPE_STREAK_ALERT,
                    title=f"3-Loss Streak Warning",
                    content=f"You've lost 3 trades in a row. Consider taking a short break before your next trade. Review what went wrong.",
                    severity="warning",
                    user_id=user_id,
                    trade_id=trade.get("id"),
                    metadata={"streak_count": streak_count, "streak_type": "loss"},
                )

        return None

    async def _check_milestones(
        self,
        user_id: str,
        trade: Dict,
        recent_trades: List[Dict],
        user_stats: Optional[Dict] = None,
    ) -> Optional[ProactiveInsight]:
        """Check for trading milestones and achievements."""
        all_trades = recent_trades + [trade]
        total_trades = len(all_trades)

        # Trade count milestones
        milestones = [10, 25, 50, 100, 250, 500, 1000]
        for milestone in milestones:
            if total_trades == milestone:
                total_pnl = sum(t.get("pnl_usd", 0) for t in all_trades)
                return ProactiveInsight(
                    insight_type=ProactiveInsight.TYPE_MILESTONE,
                    title=f"🎯 {milestone} Trades Milestone!",
                    content=f"Congratulations! You've completed {milestone} trades with a total PnL of ${total_pnl:,.2f}. Keep learning and improving!",
                    severity="info",
                    user_id=user_id,
                    metadata={"milestone": milestone, "total_pnl": total_pnl},
                )

        # Check for best trade ever
        if user_stats and trade.get("pnl_usd", 0) > 0:
            best_trade = user_stats.get("best_trade", {})
            if trade.get("pnl_usd", 0) > best_trade.get("pnl_usd", 0):
                return ProactiveInsight(
                    insight_type=ProactiveInsight.TYPE_MILESTONE,
                    title=f"🏆 New Best Trade!",
                    content=f"${trade.get('pnl_usd', 0):,.2f} on {trade.get('symbol', 'Unknown')} - your new personal best! What made this trade work?",
                    severity="info",
                    user_id=user_id,
                    trade_id=trade.get("id"),
                    metadata={"pnl": trade.get("pnl_usd", 0)},
                )

        return None

    async def _generate_quick_trade_review(
        self,
        user_id: str,
        trade: Dict,
        recent_trades: List[Dict],
    ) -> Optional[ProactiveInsight]:
        """Generate a quick AI review of the trade."""
        if not self.claude:
            return None

        pnl = trade.get("pnl_usd", 0)

        # Only generate detailed review for significant trades
        avg_pnl = 0
        if recent_trades:
            avg_pnl = sum(abs(t.get("pnl_usd", 0)) for t in recent_trades) / len(recent_trades)

        if abs(pnl) < avg_pnl * 1.5 and abs(pnl) < 100:
            return None  # Skip insignificant trades

        try:
            review_text, _, _ = await self.claude.analyze_trade(trade)

            title = f"{'📈' if pnl > 0 else '📉'} Trade Review: {trade.get('symbol', 'Unknown')}"

            return ProactiveInsight(
                insight_type=ProactiveInsight.TYPE_TRADE_REVIEW,
                title=title,
                content=review_text,
                severity="info",
                user_id=user_id,
                trade_id=trade.get("id"),
                metadata={"pnl": pnl, "symbol": trade.get("symbol")},
            )
        except Exception as e:
            logger.error(f"Error generating trade review: {e}")
            return None

    def _get_mistake_title(self, mistake_type: str) -> str:
        """Get a user-friendly title for a mistake type."""
        titles = {
            "revenge_trading": "⚠️ Revenge Trading Detected",
            "overtrading": "📊 Overtrading Alert",
            "overleveraging": "⚡ High Leverage Warning",
            "high_leverage": "⚡ Leverage Reminder",
            "size_inconsistency": "📏 Position Size Alert",
            "tilt_trading": "🎰 Tilt Warning",
            "loss_streak": "📉 Loss Streak Alert",
            "fomo_entry": "😰 FOMO Alert",
            "session_deterioration": "📉 Session Quality Declining",
            "martingale_pattern": "🚨 Dangerous Pattern Detected",
        }
        return titles.get(mistake_type, f"⚠️ {mistake_type.replace('_', ' ').title()}")

    async def _save_insight(self, insight: ProactiveInsight) -> None:
        """Save insight to database."""
        try:
            await self.supabase.insert_proactive_insight(insight.to_dict())
            logger.info(f"Saved proactive insight: {insight.insight_type} for user {insight.user_id}")
        except Exception as e:
            logger.error(f"Error saving proactive insight: {e}")

    async def get_pending_insights(
        self,
        user_id: str,
        limit: int = 20,
    ) -> List[Dict]:
        """Get unread insights for a user."""
        try:
            insights = await self.supabase.get_proactive_insights(user_id, limit)
            return insights
        except Exception as e:
            logger.error(f"Error getting pending insights: {e}")
            return []

    async def mark_insight_read(self, insight_id: str, user_id: str) -> bool:
        """Mark an insight as read."""
        try:
            await self.supabase.update_proactive_insight(insight_id, user_id, {"is_read": True})
            return True
        except Exception as e:
            logger.error(f"Error marking insight as read: {e}")
            return False
