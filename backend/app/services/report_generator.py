"""
ReportGenerator: Generates detailed trading reports.
Creates daily summaries, weekly reports, and trade-by-trade analysis.
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import uuid

from app.services.pattern_detector import PatternDetector
from app.services.mistake_detector import MistakeDetector
from app.services.claude_service import ClaudeService

logger = logging.getLogger(__name__)


class TradingReport:
    """Represents a trading report."""

    TYPE_DAILY = "daily"
    TYPE_WEEKLY = "weekly"
    TYPE_MONTHLY = "monthly"
    TYPE_TRADE_REVIEW = "trade_review"

    def __init__(
        self,
        report_type: str,
        title: str,
        summary: str,
        sections: List[Dict],
        user_id: str,
        period_start: datetime = None,
        period_end: datetime = None,
        metadata: Dict = None,
    ):
        self.id = str(uuid.uuid4())
        self.report_type = report_type
        self.title = title
        self.summary = summary
        self.sections = sections
        self.user_id = user_id
        self.period_start = period_start
        self.period_end = period_end
        self.metadata = metadata or {}
        self.created_at = datetime.utcnow()

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "report_type": self.report_type,
            "title": self.title,
            "summary": self.summary,
            "sections": self.sections,
            "user_id": self.user_id,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
        }


class ReportGenerator:
    """Service for generating detailed trading reports."""

    def __init__(self):
        self.pattern_detector = PatternDetector()
        self.mistake_detector = MistakeDetector()

        try:
            self.claude = ClaudeService()
        except RuntimeError:
            logger.warning("Claude service not available for report generation")
            self.claude = None

    async def generate_daily_report(
        self,
        user_id: str,
        trades: List[Dict],
        date: datetime = None,
        user_context: Optional[Dict] = None,
    ) -> TradingReport:
        """
        Generate a comprehensive daily trading report.

        Args:
            user_id: User ID
            trades: Trades for the day
            date: The date of the report (defaults to today)
            user_context: User's trading context

        Returns:
            Daily trading report
        """
        date = date or datetime.utcnow()
        date_str = date.strftime("%B %d, %Y")

        if not trades:
            return TradingReport(
                report_type=TradingReport.TYPE_DAILY,
                title=f"Daily Report - {date_str}",
                summary="No trades were executed today.",
                sections=[{
                    "title": "No Activity",
                    "content": "Take this opportunity to review your strategy and prepare for tomorrow.",
                }],
                user_id=user_id,
                period_start=date.replace(hour=0, minute=0, second=0),
                period_end=date.replace(hour=23, minute=59, second=59),
            )

        # Calculate statistics
        stats = self._calculate_stats(trades)
        mistakes = await self.mistake_detector.analyze_session(trades)

        sections = []

        # Performance Overview Section
        sections.append({
            "title": "📊 Performance Overview",
            "content": self._format_performance_section(stats),
            "type": "stats",
            "data": stats,
        })

        # Trade Breakdown Section
        sections.append({
            "title": "📈 Trade Breakdown",
            "content": self._format_trades_table(trades),
            "type": "trades",
            "data": [self._format_trade_summary(t) for t in trades],
        })

        # Mistakes Section (if any)
        if mistakes:
            sections.append({
                "title": "⚠️ Areas for Improvement",
                "content": self._format_mistakes_section(mistakes),
                "type": "mistakes",
                "data": [m.to_dict() for m in mistakes],
            })

        # AI Coach Analysis (if available)
        if self.claude:
            try:
                analysis, _, _ = await self.claude.generate_daily_summary(trades, user_context)
                sections.append({
                    "title": "🤖 Coach's Analysis",
                    "content": analysis,
                    "type": "ai_analysis",
                })
            except Exception as e:
                logger.error(f"Error getting Claude analysis: {e}")

        # Tomorrow's Focus Section
        sections.append({
            "title": "🎯 Tomorrow's Focus",
            "content": self._generate_focus_suggestions(stats, mistakes),
            "type": "suggestions",
        })

        # Generate summary
        outcome = "profitable" if stats["total_pnl"] > 0 else "unprofitable"
        summary = f"{'📈' if stats['total_pnl'] > 0 else '📉'} {len(trades)} trades executed with {stats['win_rate']:.1f}% win rate. Total PnL: ${stats['total_pnl']:,.2f} ({outcome})."

        return TradingReport(
            report_type=TradingReport.TYPE_DAILY,
            title=f"Daily Report - {date_str}",
            summary=summary,
            sections=sections,
            user_id=user_id,
            period_start=date.replace(hour=0, minute=0, second=0),
            period_end=date.replace(hour=23, minute=59, second=59),
            metadata=stats,
        )

    async def generate_weekly_report(
        self,
        user_id: str,
        trades: List[Dict],
        week_start: datetime = None,
        user_context: Optional[Dict] = None,
    ) -> TradingReport:
        """
        Generate a comprehensive weekly trading report.

        Args:
            user_id: User ID
            trades: Trades for the week
            week_start: Start of the week
            user_context: User's trading context

        Returns:
            Weekly trading report
        """
        week_start = week_start or (datetime.utcnow() - timedelta(days=7))
        week_end = week_start + timedelta(days=7)
        week_str = f"{week_start.strftime('%b %d')} - {week_end.strftime('%b %d, %Y')}"

        if not trades:
            return TradingReport(
                report_type=TradingReport.TYPE_WEEKLY,
                title=f"Weekly Report - {week_str}",
                summary="No trades were executed this week.",
                sections=[{
                    "title": "No Activity",
                    "content": "Consider if you're being patient for the right setups or avoiding the market entirely.",
                }],
                user_id=user_id,
                period_start=week_start,
                period_end=week_end,
            )

        # Calculate statistics
        stats = self._calculate_stats(trades)
        patterns = await self.pattern_detector.analyze_patterns(trades)

        sections = []

        # Weekly Summary Section
        sections.append({
            "title": "📊 Week at a Glance",
            "content": self._format_weekly_summary(stats),
            "type": "stats",
            "data": stats,
        })

        # Daily Breakdown Section
        daily_breakdown = self._group_by_day(trades)
        sections.append({
            "title": "📅 Daily Breakdown",
            "content": self._format_daily_breakdown(daily_breakdown),
            "type": "daily",
            "data": daily_breakdown,
        })

        # Symbol Performance Section
        symbol_stats = self._analyze_by_symbol(trades)
        sections.append({
            "title": "💹 Symbol Performance",
            "content": self._format_symbol_performance(symbol_stats),
            "type": "symbols",
            "data": symbol_stats,
        })

        # Patterns Detected Section
        if patterns:
            sections.append({
                "title": "🔍 Patterns Detected",
                "content": self._format_patterns_section(patterns),
                "type": "patterns",
                "data": [p.to_dict() for p in patterns],
            })

        # Best and Worst Trades Section
        sections.append({
            "title": "🏆 Notable Trades",
            "content": self._format_notable_trades(trades),
            "type": "notable",
        })

        # AI Coach Analysis
        if self.claude:
            try:
                analysis, _, _ = await self.claude.generate_weekly_report(trades, user_context)
                sections.append({
                    "title": "🤖 Coach's Weekly Analysis",
                    "content": analysis,
                    "type": "ai_analysis",
                })
            except Exception as e:
                logger.error(f"Error getting Claude weekly analysis: {e}")

        # Goals for Next Week
        sections.append({
            "title": "🎯 Goals for Next Week",
            "content": self._generate_weekly_goals(stats, patterns),
            "type": "goals",
        })

        # Generate summary
        trend = "📈" if stats["total_pnl"] > 0 else "📉"
        summary = f"{trend} Week of {week_str}: {len(trades)} trades, {stats['win_rate']:.1f}% win rate, ${stats['total_pnl']:,.2f} total PnL."

        return TradingReport(
            report_type=TradingReport.TYPE_WEEKLY,
            title=f"Weekly Report - {week_str}",
            summary=summary,
            sections=sections,
            user_id=user_id,
            period_start=week_start,
            period_end=week_end,
            metadata=stats,
        )

    async def generate_trade_review(
        self,
        user_id: str,
        trade: Dict,
        context_trades: List[Dict] = None,
        user_context: Optional[Dict] = None,
    ) -> TradingReport:
        """
        Generate a detailed review of a single trade.

        Args:
            user_id: User ID
            trade: The trade to review
            context_trades: Recent trades for context
            user_context: User's trading context

        Returns:
            Trade review report
        """
        symbol = trade.get("symbol", "Unknown")
        pnl = trade.get("pnl_usd", 0)
        side = trade.get("side", "Unknown")
        date_str = trade.get("date", "Unknown")[:10]

        sections = []

        # Trade Details Section
        sections.append({
            "title": "📋 Trade Details",
            "content": self._format_trade_details(trade),
            "type": "details",
            "data": trade,
        })

        # Entry Analysis Section
        sections.append({
            "title": "🎯 Entry Analysis",
            "content": self._analyze_entry(trade, context_trades),
            "type": "entry",
        })

        # Exit Analysis Section
        sections.append({
            "title": "🚪 Exit Analysis",
            "content": self._analyze_exit(trade),
            "type": "exit",
        })

        # Risk Management Section
        sections.append({
            "title": "⚖️ Risk Assessment",
            "content": self._analyze_risk(trade),
            "type": "risk",
        })

        # AI Deep Analysis (if available)
        if self.claude:
            try:
                analysis, _, _ = await self.claude.analyze_trade(trade, user_context)
                sections.append({
                    "title": "🤖 AI Trade Analysis",
                    "content": analysis,
                    "type": "ai_analysis",
                })
            except Exception as e:
                logger.error(f"Error getting Claude trade analysis: {e}")

        # Lessons Learned Section
        sections.append({
            "title": "📚 Key Takeaways",
            "content": self._generate_trade_lessons(trade, pnl),
            "type": "lessons",
        })

        # Generate summary
        outcome = "Win" if pnl > 0 else "Loss"
        emoji = "📈" if pnl > 0 else "📉"
        summary = f"{emoji} {outcome} on {symbol} {side}: ${pnl:,.2f} ({trade.get('pnl_pct', 0):.2f}%)"

        return TradingReport(
            report_type=TradingReport.TYPE_TRADE_REVIEW,
            title=f"Trade Review: {symbol} {side}",
            summary=summary,
            sections=sections,
            user_id=user_id,
            metadata={
                "trade_id": trade.get("id"),
                "symbol": symbol,
                "side": side,
                "pnl": pnl,
            },
        )

    def _calculate_stats(self, trades: List[Dict]) -> Dict:
        """Calculate trading statistics."""
        if not trades:
            return {}

        total_pnl = sum(t.get("pnl_usd", 0) for t in trades)
        wins = [t for t in trades if t.get("pnl_usd", 0) > 0]
        losses = [t for t in trades if t.get("pnl_usd", 0) <= 0]

        avg_win = sum(t.get("pnl_usd", 0) for t in wins) / len(wins) if wins else 0
        avg_loss = sum(t.get("pnl_usd", 0) for t in losses) / len(losses) if losses else 0

        return {
            "total_trades": len(trades),
            "wins": len(wins),
            "losses": len(losses),
            "win_rate": (len(wins) / len(trades) * 100) if trades else 0,
            "total_pnl": total_pnl,
            "avg_pnl": total_pnl / len(trades),
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "profit_factor": abs(avg_win / avg_loss) if avg_loss != 0 else 0,
            "best_trade": max(trades, key=lambda t: t.get("pnl_usd", 0)).get("pnl_usd", 0),
            "worst_trade": min(trades, key=lambda t: t.get("pnl_usd", 0)).get("pnl_usd", 0),
        }

    def _format_performance_section(self, stats: Dict) -> str:
        """Format performance statistics as markdown."""
        return f"""
| Metric | Value |
|--------|-------|
| Total Trades | {stats['total_trades']} |
| Wins / Losses | {stats['wins']} / {stats['losses']} |
| Win Rate | {stats['win_rate']:.1f}% |
| Total PnL | ${stats['total_pnl']:,.2f} |
| Average Trade | ${stats['avg_pnl']:,.2f} |
| Average Win | ${stats['avg_win']:,.2f} |
| Average Loss | ${stats['avg_loss']:,.2f} |
| Profit Factor | {stats['profit_factor']:.2f} |
"""

    def _format_trades_table(self, trades: List[Dict]) -> str:
        """Format trades as a markdown table."""
        lines = ["| Time | Symbol | Side | Entry | Exit | PnL |", "|------|--------|------|-------|------|-----|"]

        for t in sorted(trades, key=lambda x: x.get("date", "")):
            time = t.get("date", "")[:16].replace("T", " ")
            symbol = t.get("symbol", "N/A")
            side = t.get("side", "N/A")
            entry = f"${t.get('entry', 0):,.2f}"
            exit_p = f"${t.get('exit', 0):,.2f}"
            pnl = t.get("pnl_usd", 0)
            pnl_str = f"{'📈' if pnl > 0 else '📉'} ${pnl:,.2f}"
            lines.append(f"| {time} | {symbol} | {side} | {entry} | {exit_p} | {pnl_str} |")

        return "\n".join(lines)

    def _format_trade_summary(self, trade: Dict) -> Dict:
        """Format a single trade summary."""
        return {
            "time": trade.get("date", "")[:16],
            "symbol": trade.get("symbol", "N/A"),
            "side": trade.get("side", "N/A"),
            "pnl": trade.get("pnl_usd", 0),
            "outcome": "win" if trade.get("pnl_usd", 0) > 0 else "loss",
        }

    def _format_mistakes_section(self, mistakes: List) -> str:
        """Format mistakes as markdown."""
        lines = []
        for m in mistakes:
            severity_icon = "🔴" if m.severity == "critical" else "🟡" if m.severity == "warning" else "🔵"
            lines.append(f"{severity_icon} **{m.mistake_type.replace('_', ' ').title()}**")
            lines.append(f"   {m.description}")
            if m.suggestion:
                lines.append(f"   💡 *{m.suggestion}*")
            lines.append("")
        return "\n".join(lines)

    def _generate_focus_suggestions(self, stats: Dict, mistakes: List) -> str:
        """Generate focus suggestions for tomorrow."""
        suggestions = []

        if stats.get("win_rate", 0) < 50:
            suggestions.append("Focus on trade quality over quantity - be more selective with entries")

        if mistakes:
            mistake_types = set(m.mistake_type for m in mistakes)
            if "revenge_trading" in mistake_types:
                suggestions.append("Practice patience after losses - take a 30-minute break")
            if "overtrading" in mistake_types:
                suggestions.append("Set a maximum of 5 trades for tomorrow")
            if "overleveraging" in mistake_types:
                suggestions.append("Use lower leverage - aim for 5x maximum")

        if not suggestions:
            if stats.get("total_pnl", 0) > 0:
                suggestions.append("Great day! Maintain your discipline and don't get overconfident")
            else:
                suggestions.append("Review today's losing trades and identify the common thread")

        return "\n".join(f"- {s}" for s in suggestions)

    def _format_weekly_summary(self, stats: Dict) -> str:
        """Format weekly summary statistics."""
        return f"""
**Total PnL:** ${stats['total_pnl']:,.2f}
**Trades:** {stats['total_trades']} ({stats['wins']} wins, {stats['losses']} losses)
**Win Rate:** {stats['win_rate']:.1f}%
**Average Trade:** ${stats['avg_pnl']:,.2f}
**Best Trade:** ${stats['best_trade']:,.2f}
**Worst Trade:** ${stats['worst_trade']:,.2f}
"""

    def _group_by_day(self, trades: List[Dict]) -> Dict:
        """Group trades by day."""
        by_day = defaultdict(list)
        for t in trades:
            day = t.get("date", "")[:10]
            by_day[day].append(t)
        return dict(by_day)

    def _format_daily_breakdown(self, daily_breakdown: Dict) -> str:
        """Format daily breakdown as markdown."""
        lines = ["| Day | Trades | Win Rate | PnL |", "|-----|--------|----------|-----|"]

        for day, trades in sorted(daily_breakdown.items()):
            wins = sum(1 for t in trades if t.get("pnl_usd", 0) > 0)
            wr = (wins / len(trades) * 100) if trades else 0
            pnl = sum(t.get("pnl_usd", 0) for t in trades)
            emoji = "📈" if pnl > 0 else "📉"
            lines.append(f"| {day} | {len(trades)} | {wr:.0f}% | {emoji} ${pnl:,.2f} |")

        return "\n".join(lines)

    def _analyze_by_symbol(self, trades: List[Dict]) -> Dict:
        """Analyze performance by symbol."""
        by_symbol = defaultdict(list)
        for t in trades:
            by_symbol[t.get("symbol", "Unknown")].append(t)

        stats = {}
        for symbol, symbol_trades in by_symbol.items():
            pnl = sum(t.get("pnl_usd", 0) for t in symbol_trades)
            wins = sum(1 for t in symbol_trades if t.get("pnl_usd", 0) > 0)
            stats[symbol] = {
                "trades": len(symbol_trades),
                "pnl": pnl,
                "win_rate": (wins / len(symbol_trades) * 100) if symbol_trades else 0,
            }

        return stats

    def _format_symbol_performance(self, symbol_stats: Dict) -> str:
        """Format symbol performance as markdown."""
        lines = ["| Symbol | Trades | Win Rate | PnL |", "|--------|--------|----------|-----|"]

        for symbol, stats in sorted(symbol_stats.items(), key=lambda x: x[1]["pnl"], reverse=True):
            emoji = "📈" if stats["pnl"] > 0 else "📉"
            lines.append(f"| {symbol} | {stats['trades']} | {stats['win_rate']:.0f}% | {emoji} ${stats['pnl']:,.2f} |")

        return "\n".join(lines)

    def _format_patterns_section(self, patterns: List) -> str:
        """Format detected patterns as markdown."""
        lines = []
        for p in patterns:
            confidence = "🟢" if p.confidence > 0.8 else "🟡"
            lines.append(f"{confidence} **{p.pattern_type.replace('_', ' ').title()}**")
            lines.append(f"   {p.description}")
            lines.append(f"   Confidence: {p.confidence*100:.0f}% | Win Rate: {p.win_rate*100:.0f}%")
            lines.append("")
        return "\n".join(lines)

    def _format_notable_trades(self, trades: List[Dict]) -> str:
        """Format best and worst trades."""
        best = max(trades, key=lambda t: t.get("pnl_usd", 0))
        worst = min(trades, key=lambda t: t.get("pnl_usd", 0))

        return f"""
**🏆 Best Trade:**
- {best.get('symbol')} {best.get('side')}: ${best.get('pnl_usd', 0):,.2f}
- Entry: ${best.get('entry', 0):,.2f} → Exit: ${best.get('exit', 0):,.2f}

**📉 Worst Trade:**
- {worst.get('symbol')} {worst.get('side')}: ${worst.get('pnl_usd', 0):,.2f}
- Entry: ${worst.get('entry', 0):,.2f} → Exit: ${worst.get('exit', 0):,.2f}
"""

    def _generate_weekly_goals(self, stats: Dict, patterns: List) -> str:
        """Generate goals for next week."""
        goals = []

        if stats.get("win_rate", 0) < 50:
            goals.append("Improve trade selection - aim for 55%+ win rate")
        else:
            goals.append("Maintain current win rate while improving average gain")

        if stats.get("profit_factor", 0) < 1.5:
            goals.append("Work on letting winners run longer")

        if patterns:
            for p in patterns:
                if "worst" in p.pattern_type or "warning" in p.pattern_type:
                    goals.append(f"Address the {p.pattern_type.replace('_', ' ')} pattern")
                    break

        if not goals:
            goals.append("Continue executing your strategy with discipline")

        return "\n".join(f"- {g}" for g in goals[:3])

    def _format_trade_details(self, trade: Dict) -> str:
        """Format trade details section."""
        return f"""
| Field | Value |
|-------|-------|
| Symbol | {trade.get('symbol', 'N/A')} |
| Side | {trade.get('side', 'N/A')} |
| Entry Price | ${trade.get('entry', 0):,.2f} |
| Exit Price | ${trade.get('exit', 0):,.2f} |
| Size | {trade.get('size', 0)} |
| Leverage | {trade.get('leverage', 1)}x |
| Fees | ${trade.get('fees', 0):,.2f} |
| PnL | ${trade.get('pnl_usd', 0):,.2f} ({trade.get('pnl_pct', 0):.2f}%) |
| Date | {trade.get('date', 'N/A')} |
"""

    def _analyze_entry(self, trade: Dict, context_trades: List[Dict] = None) -> str:
        """Analyze the trade entry."""
        notes = trade.get("notes", "")
        side = trade.get("side", "").upper()

        analysis = f"**{side} position entered at ${trade.get('entry', 0):,.2f}**\n\n"

        if notes:
            analysis += f"Your notes: *\"{notes}\"*\n\n"

        analysis += "Consider:\n"
        analysis += "- Was there a clear setup or signal?\n"
        analysis += "- Did you wait for confirmation or chase the move?\n"
        analysis += "- Was the entry at a key level (support/resistance)?\n"

        return analysis

    def _analyze_exit(self, trade: Dict) -> str:
        """Analyze the trade exit."""
        pnl = trade.get("pnl_usd", 0)
        pnl_pct = trade.get("pnl_pct", 0)

        if pnl > 0:
            return f"""
**Winning exit at ${trade.get('exit', 0):,.2f}** (+{pnl_pct:.2f}%)

Questions to consider:
- Did you hit your target or exit early?
- Could you have captured more of the move?
- Was the exit based on your plan or emotion?
"""
        else:
            return f"""
**Losing exit at ${trade.get('exit', 0):,.2f}** ({pnl_pct:.2f}%)

Questions to consider:
- Did you have a stop loss in place?
- Did you follow your stop or override it?
- Was this a calculated risk or a blown trade?
"""

    def _analyze_risk(self, trade: Dict) -> str:
        """Analyze risk management."""
        leverage = trade.get("leverage", 1)
        size = trade.get("size", 0)
        pnl = trade.get("pnl_usd", 0)

        risk_level = "Low" if leverage <= 5 else "Medium" if leverage <= 10 else "High"
        risk_emoji = "🟢" if leverage <= 5 else "🟡" if leverage <= 10 else "🔴"

        return f"""
{risk_emoji} **Risk Level: {risk_level}**

- Leverage: {leverage}x
- Position Size: {size}

{"⚠️ High leverage amplifies both gains and losses. Consider reducing for better risk management." if leverage > 10 else "✅ Reasonable leverage for this trade."}
"""

    def _generate_trade_lessons(self, trade: Dict, pnl: float) -> str:
        """Generate lessons from the trade."""
        if pnl > 0:
            return """
**What to repeat:**
- Document what made this trade work
- Note the setup and entry criteria
- Remember this feeling of disciplined execution

**Going forward:**
- Look for similar setups
- Don't deviate from what works
"""
        else:
            return """
**What to learn:**
- Identify what went wrong
- Was it the setup, timing, or execution?
- Did emotions play a role?

**Going forward:**
- Write down one specific thing to improve
- Don't repeat the same mistake
- Remember: every loss is tuition
"""
