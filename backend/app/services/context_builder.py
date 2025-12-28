"""
ContextBuilder: Builds rich context from user's trade data for coach prompts.
Gathers recent trades, statistics, patterns, mistakes, insights, progress, and MEMORIES.
Enhanced for the AI Trading Coach with comprehensive context building.
Now includes persistent memory system for personalized coaching.
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models import Trade, CoachInsight, TradePattern
from app.services.supabase_service import SupabaseService
from app.services.pattern_detector import PatternDetector
from app.services.mistake_detector import MistakeDetector
from app.services.memory_manager import MemoryManager
from app.services.embedding_service import SemanticMemorySearch
from app.services.journal_service import journal_service

logger = logging.getLogger(__name__)

# Initialize services
supabase = SupabaseService()


class ContextBuilder:
    """Builds comprehensive user context from trade history, patterns, mistakes, and MEMORIES."""

    # Configuration
    MAX_TRADES_FOR_CONTEXT = 500
    MAX_TRADES_FOR_PROMPT = 50
    MISTAKE_LOOKBACK_DAYS = 7
    PATTERN_MIN_CONFIDENCE = 0.6

    def __init__(self):
        self.pattern_detector = PatternDetector()
        self.mistake_detector = MistakeDetector()
        self.memory_manager = MemoryManager()
        self.semantic_search = SemanticMemorySearch()

    @staticmethod
    async def build_user_context(user_id: str, db: Session) -> Dict:
        """
        Build rich context about user's trading for the coach.
        This is the main entry point for context building.

        Returns:
            Dictionary with comprehensive user context including:
            - statistics: Full trading stats
            - trades: Recent trades with all fields
            - patterns: Detected patterns with confidence
            - recent_mistakes: Mistakes from last 7 days
            - insights: Trading style, edge, strengths/weaknesses
            - progress: Improvement tracking
            - conversation_history: Previous coaching sessions
        """
        builder = ContextBuilder()
        return await builder._build_context(user_id, db)

    async def _build_context(self, user_id: str, db: Session) -> Dict:
        """Internal method to build the full context."""
        try:
            # Get user statistics
            stats = await self._get_user_statistics(user_id, db)

            # Get trades for analysis
            all_trades = await self._get_recent_trades(user_id, db, limit=self.MAX_TRADES_FOR_CONTEXT)

            # Get coach insights
            insights = await self._get_coach_insights(user_id, db)

            # Detect patterns from trades
            detected_patterns = await self._detect_patterns(all_trades)

            # Get stored patterns (from database)
            stored_patterns = await self._get_stored_patterns(user_id, db)

            # Combine patterns (prefer detected, supplement with stored)
            patterns = self._merge_patterns(detected_patterns, stored_patterns)

            # Get recent mistakes
            recent_mistakes = await self._get_recent_mistakes(user_id, all_trades)

            # Calculate progress metrics
            progress = await self._calculate_progress(user_id, all_trades, stats)

            # Get conversation history
            conversation_history = await self._get_conversation_history(user_id, db)

            # Get persistent memories (NEW)
            memories = await self._get_user_memories(user_id)

            # Get user goals (NEW)
            goals = await self._get_user_goals(user_id)

            # Get recent episodes (NEW)
            episodes = await self._get_recent_episodes(user_id)

            # Get journal context (NEW)
            journal_context = await self._get_journal_context(user_id)

            # Compile context
            context = {
                "user_id": user_id,
                "statistics": stats,
                "trades": all_trades[:self.MAX_TRADES_FOR_PROMPT],  # Limit for prompt
                "all_trades_count": len(all_trades),
                "patterns": patterns,
                "recent_mistakes": recent_mistakes,
                "insights": insights,
                "progress": progress,
                "conversation_history": conversation_history,
                # NEW: Memory system data
                "memories": memories,
                "goals": goals,
                "episodes": episodes,
                # NEW: Journal context
                "journal": journal_context,
                "context_summary": await self._generate_context_summary(
                    stats, insights, patterns, recent_mistakes, progress, len(all_trades), memories
                ),
                "built_at": datetime.utcnow().isoformat(),
            }

            return context

        except Exception as e:
            logger.error(f"Error building user context: {e}")
            return {
                "user_id": user_id,
                "error": f"Could not load full context: {str(e)[:100]}",
            }

    async def _get_user_statistics(self, user_id: str, db: Session) -> Dict:
        """Get user's trading statistics from Supabase."""
        try:
            stats = await supabase.get_user_statistics(user_id)
            return stats

        except Exception as e:
            logger.error(f"Error getting user statistics: {e}")
            return {"error": str(e)}

    async def _get_recent_trades(self, user_id: str, db: Session, limit: int = 500) -> List[Dict]:
        """Get user's recent trades from Supabase."""
        try:
            trades = await supabase.get_user_trades(user_id, limit=limit)
            return trades

        except Exception as e:
            logger.error(f"Error getting recent trades: {e}")
            return []

    async def _get_coach_insights(self, user_id: str, db: Session) -> Dict:
        """Get stored coach insights about user."""
        try:
            insight = db.query(CoachInsight).filter(CoachInsight.user_id == user_id).first()

            if not insight:
                return {
                    "status": "no_insights_yet",
                    "message": "Coach is still learning about your trading style. Keep trading and chatting!",
                }

            return {
                "trading_style": insight.trading_style,
                "risk_profile": insight.risk_profile,
                "edge_observed": insight.edge_observed,
                "strengths": insight.strengths or [],
                "weaknesses": insight.weaknesses or [],
                "favorite_symbols": insight.favorite_symbols or [],
                "favorite_timeframes": insight.favorite_timeframes or [],
                "total_trades_analyzed": insight.total_trades_analyzed,
                "last_updated": insight.last_updated.isoformat() if insight.last_updated else None,
            }

        except Exception as e:
            logger.error(f"Error getting coach insights: {e}")
            return {"status": "error", "message": str(e)}

    async def _detect_patterns(self, trades: List[Dict]) -> List[Dict]:
        """Run pattern detection on trades."""
        if not trades or len(trades) < self.pattern_detector.MIN_TRADES_FOR_PATTERN:
            return []

        try:
            patterns = await self.pattern_detector.analyze_patterns(trades)
            return [
                {
                    "pattern_type": p.pattern_type,
                    "description": p.description,
                    "confidence": p.confidence,
                    "impact": p.impact,
                    "trade_count": p.trade_count,
                    "metadata": p.metadata,
                }
                for p in patterns
                if p.confidence >= self.PATTERN_MIN_CONFIDENCE
            ]

        except Exception as e:
            logger.error(f"Error detecting patterns: {e}")
            return []

    async def _get_stored_patterns(self, user_id: str, db: Session, limit: int = 10) -> List[Dict]:
        """Get pre-computed trade patterns from database."""
        try:
            patterns = (
                db.query(TradePattern)
                .filter(TradePattern.user_id == user_id)
                .order_by(TradePattern.win_rate.desc())
                .limit(limit)
                .all()
            )

            return [
                {
                    "pattern_type": "stored",
                    "pattern_name": p.pattern_name,
                    "symbol": p.symbol,
                    "timeframe": p.timeframe,
                    "total_trades": p.total_trades,
                    "win_rate": round(p.win_rate, 2),
                    "avg_pnl": round(p.avg_pnl, 2),
                    "avg_pnl_pct": round(p.avg_pnl_pct, 2),
                    "description": p.description,
                    "confidence": 0.8,  # Default confidence for stored patterns
                }
                for p in patterns
            ]

        except Exception as e:
            logger.error(f"Error getting stored patterns: {e}")
            return []

    def _merge_patterns(self, detected: List[Dict], stored: List[Dict]) -> List[Dict]:
        """Merge detected and stored patterns, avoiding duplicates."""
        # Start with detected patterns (more recent/accurate)
        merged = list(detected)

        # Add stored patterns that don't overlap
        detected_types = {p.get("pattern_type") for p in detected}
        for sp in stored:
            if sp.get("pattern_name") not in detected_types:
                merged.append(sp)

        # Sort by confidence/impact
        merged.sort(key=lambda x: (x.get("confidence", 0), x.get("impact", "neutral")), reverse=True)

        return merged[:15]  # Limit to top 15 patterns

    async def _get_recent_mistakes(self, user_id: str, trades: List[Dict]) -> List[Dict]:
        """Get mistakes from the last N days."""
        if not trades:
            return []

        try:
            # Filter trades to last N days
            cutoff = datetime.utcnow() - timedelta(days=self.MISTAKE_LOOKBACK_DAYS)
            recent_trades = []

            for trade in trades:
                trade_date = self._parse_date(trade.get("date"))
                if trade_date and trade_date >= cutoff:
                    recent_trades.append(trade)

            if not recent_trades:
                return []

            # Analyze session for mistakes
            mistakes = await self.mistake_detector.analyze_session(recent_trades)

            return [
                {
                    "type": m.mistake_type,
                    "description": m.description,
                    "severity": m.severity,
                    "suggestion": m.suggestion,
                    "trade_id": m.trade_id,
                    "detected_at": m.detected_at.isoformat(),
                }
                for m in mistakes
            ]

        except Exception as e:
            logger.error(f"Error getting recent mistakes: {e}")
            return []

    async def _calculate_progress(
        self, user_id: str, trades: List[Dict], stats: Dict
    ) -> Dict:
        """Calculate progress metrics comparing recent to historical performance."""
        if not trades or len(trades) < 20:
            return {
                "status": "insufficient_data",
                "message": "Need at least 20 trades to calculate progress",
            }

        try:
            # Split trades into periods
            half = len(trades) // 2
            recent_trades = trades[:half]  # More recent (sorted newest first typically)
            older_trades = trades[half:]

            # Calculate metrics for each period
            def calc_metrics(trade_list: List[Dict]) -> Dict:
                if not trade_list:
                    return {}

                pnls = [t.get("pnl_usd", 0) for t in trade_list if t.get("pnl_usd") is not None]
                if not pnls:
                    return {}

                wins = sum(1 for p in pnls if p > 0)
                total = len(pnls)

                return {
                    "trade_count": total,
                    "win_rate": (wins / total * 100) if total > 0 else 0,
                    "total_pnl": sum(pnls),
                    "avg_pnl": sum(pnls) / total if total > 0 else 0,
                    "best_trade": max(pnls) if pnls else 0,
                    "worst_trade": min(pnls) if pnls else 0,
                }

            recent_metrics = calc_metrics(recent_trades)
            older_metrics = calc_metrics(older_trades)

            if not recent_metrics or not older_metrics:
                return {"status": "error", "message": "Could not calculate metrics"}

            # Calculate improvements
            win_rate_change = recent_metrics["win_rate"] - older_metrics["win_rate"]
            avg_pnl_change = recent_metrics["avg_pnl"] - older_metrics["avg_pnl"]

            # Determine trend
            if win_rate_change > 5 and avg_pnl_change > 0:
                trend = "improving"
                trend_description = "Your trading is improving! Win rate and average PnL are both up."
            elif win_rate_change < -5 and avg_pnl_change < 0:
                trend = "declining"
                trend_description = "Performance has declined recently. Let's identify what changed."
            elif abs(win_rate_change) < 3 and abs(avg_pnl_change) < older_metrics["avg_pnl"] * 0.1:
                trend = "stable"
                trend_description = "Performance is stable. Look for optimization opportunities."
            else:
                trend = "mixed"
                trend_description = "Mixed results. Some areas improving, others need attention."

            return {
                "status": "calculated",
                "trend": trend,
                "trend_description": trend_description,
                "recent_period": recent_metrics,
                "older_period": older_metrics,
                "changes": {
                    "win_rate_change": round(win_rate_change, 2),
                    "avg_pnl_change": round(avg_pnl_change, 2),
                    "total_pnl_change": round(recent_metrics["total_pnl"] - older_metrics["total_pnl"], 2),
                },
            }

        except Exception as e:
            logger.error(f"Error calculating progress: {e}")
            return {"status": "error", "message": str(e)}

    async def _get_conversation_history(self, user_id: str, db: Session, limit: int = 5) -> List[Dict]:
        """Get recent conversation history for context continuity."""
        try:
            # Try to get from Supabase
            conversations = await supabase.get_recent_conversations(user_id, limit=limit)

            history = []
            for conv in conversations:
                # Get last few messages from each conversation
                messages = conv.get("messages", [])[-3:]  # Last 3 messages per conversation
                if messages:
                    history.append({
                        "conversation_id": conv.get("id"),
                        "title": conv.get("title", "Untitled"),
                        "date": conv.get("created_at"),
                        "messages": [
                            {
                                "role": m.get("role"),
                                "content": m.get("content", "")[:200] + "..." if len(m.get("content", "")) > 200 else m.get("content", ""),
                            }
                            for m in messages
                        ],
                    })

            return history

        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []

    async def _get_user_memories(self, user_id: str) -> Dict:
        """Get user's persistent memories organized by type."""
        try:
            memory_context = await self.memory_manager.get_memory_context(user_id)
            return memory_context
        except Exception as e:
            logger.error(f"Error getting user memories: {e}")
            return {}

    async def _get_user_goals(self, user_id: str) -> List[Dict]:
        """Get user's active trading goals."""
        try:
            goals = await self.memory_manager.get_active_goals(user_id)
            # get_active_goals returns dicts from Supabase
            return [
                {
                    "title": g.get("title"),
                    "goal_type": g.get("goal_type"),
                    "description": g.get("description"),
                    "target_value": g.get("target_value"),
                    "current_value": g.get("current_value"),
                    "progress_percent": g.get("progress_percent"),
                    "deadline": g.get("deadline"),
                }
                for g in goals
            ]
        except Exception as e:
            logger.error(f"Error getting user goals: {e}")
            return []

    async def _get_recent_episodes(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent significant episodes in user's trading journey."""
        try:
            episodes = await self.memory_manager.get_episodes(user_id, limit=limit)
            return [
                {
                    "episode_type": e.episode_type,
                    "title": e.title,
                    "description": e.description,
                    "significance": e.significance,
                    "outcome": e.outcome,
                    "date": str(e.created_at),
                }
                for e in episodes
            ]
        except Exception as e:
            logger.error(f"Error getting recent episodes: {e}")
            return []

    async def _get_journal_context(self, user_id: str) -> Dict:
        """Get user's journal data for coach context."""
        try:
            journal_context = await journal_service.get_journal_context_for_coach(user_id)
            return journal_context
        except Exception as e:
            logger.error(f"Error getting journal context: {e}")
            return {}

    async def get_relevant_context_for_message(
        self, user_id: str, message: str, db: Session
    ) -> Dict:
        """
        Get context specifically relevant to the current message.
        Uses semantic search to find related past conversations and memories.
        """
        try:
            # Get base context
            base_context = await self._build_context(user_id, db)

            # Find semantically similar past conversations
            similar_context = await self.semantic_search.get_relevant_memories_for_query(
                user_id=user_id,
                query=message,
                include_conversations=True,
                max_results=5,
            )

            # Add to context
            base_context["relevant_past_context"] = similar_context
            base_context["query_topics"] = similar_context.get("topics_detected", [])

            return base_context

        except Exception as e:
            logger.error(f"Error getting relevant context: {e}")
            return await self._build_context(user_id, db)

    async def _generate_context_summary(
        self,
        stats: Dict,
        insights: Dict,
        patterns: List[Dict],
        mistakes: List[Dict],
        progress: Dict,
        trade_count: int,
        memories: Optional[Dict] = None,
    ) -> str:
        """Generate a human-readable summary of the user context including memories."""
        lines = []

        # Statistics summary
        if "error" not in stats:
            lines.append(
                f"Trading performance: {stats.get('total_trades', 0)} total trades with {stats.get('win_rate_pct', 0):.1f}% win rate"
            )
            lines.append(
                f"Account status: ${stats.get('total_pnl_usd', 0):,.2f} total P&L, ${stats.get('avg_pnl_usd', 0):,.2f} average per trade"
            )

        # Progress summary
        if progress.get("status") == "calculated":
            trend = progress.get("trend", "unknown")
            if trend == "improving":
                lines.append("Recent trend: IMPROVING - trading performance is getting better")
            elif trend == "declining":
                lines.append("Recent trend: DECLINING - performance needs attention")
            elif trend == "stable":
                lines.append("Recent trend: STABLE - consistent performance")

        # Insights summary
        if "status" not in insights:
            if insights.get("trading_style"):
                lines.append(f"Trading style: {insights['trading_style']}")
            if insights.get("edge_observed"):
                lines.append(f"Observed edge: {insights['edge_observed']}")

        # Memory-based insights (NEW)
        if memories:
            if memories.get("strengths"):
                lines.append(f"Known strengths: {len(memories['strengths'])} identified")
            if memories.get("weaknesses"):
                lines.append(f"Areas to improve: {len(memories['weaknesses'])} identified")
            if memories.get("goals"):
                active_goals = [g for g in memories.get("goals", []) if g.get("status") == "active"]
                if active_goals:
                    lines.append(f"Active goals: {len(active_goals)}")
            if memories.get("triggers"):
                lines.append(f"Known emotional triggers: {len(memories['triggers'])} tracked")

        # Patterns summary
        if patterns:
            high_confidence = [p for p in patterns if p.get("confidence", 0) >= 0.7]
            if high_confidence:
                lines.append(f"Key patterns identified: {len(high_confidence)} high-confidence patterns")
                best = high_confidence[0]
                lines.append(f"  - {best.get('description', best.get('pattern_name', 'Unknown'))}")

        # Mistakes summary
        if mistakes:
            critical = [m for m in mistakes if m.get("severity") == "critical"]
            warnings = [m for m in mistakes if m.get("severity") == "warning"]
            if critical:
                lines.append(f"ATTENTION: {len(critical)} critical trading mistakes in last 7 days")
            if warnings:
                lines.append(f"Warnings: {len(warnings)} areas to watch")

        return "\n".join(lines) if lines else "Building user profile..."

    def _parse_date(self, date_str) -> Optional[datetime]:
        """Parse date string to datetime."""
        if not date_str:
            return None

        try:
            if isinstance(date_str, datetime):
                return date_str
            if "T" in str(date_str):
                return datetime.fromisoformat(str(date_str).replace("Z", "+00:00"))
            else:
                return datetime.strptime(str(date_str), "%Y-%m-%d")
        except (ValueError, TypeError):
            return None

    @staticmethod
    def format_context_for_prompt(context: Dict) -> str:
        """
        Format context dictionary into a string for inclusion in coach system prompt.
        This is the main method used by ClaudeService to get formatted context.
        """
        parts = []

        # Statistics section
        if "statistics" in context and "error" not in context["statistics"]:
            stats = context["statistics"]
            parts.append("=== TRADING STATISTICS ===")
            parts.append(f"Total trades: {stats.get('total_trades', 0)}")
            parts.append(f"Win rate: {stats.get('win_rate_pct', 0):.1f}%")
            parts.append(f"Total P&L: ${stats.get('total_pnl_usd', 0):,.2f}")
            parts.append(f"Average P&L per trade: ${stats.get('avg_pnl_usd', 0):,.2f}")
            parts.append(f"Best trade: ${stats.get('best_trade_pnl', 0):,.2f}")
            parts.append(f"Worst trade: ${stats.get('worst_trade_pnl', 0):,.2f}")
            parts.append(f"Trades this week: {stats.get('trades_this_week', 0)}")
            parts.append("")

        # Progress section
        if "progress" in context and context["progress"].get("status") == "calculated":
            prog = context["progress"]
            parts.append("=== PERFORMANCE TREND ===")
            parts.append(f"Trend: {prog.get('trend', 'unknown').upper()}")
            parts.append(f"Analysis: {prog.get('trend_description', '')}")
            changes = prog.get("changes", {})
            if changes:
                parts.append(f"Win rate change: {changes.get('win_rate_change', 0):+.1f}%")
                parts.append(f"Avg PnL change: ${changes.get('avg_pnl_change', 0):+,.2f}")
            parts.append("")

        # Insights section
        if "insights" in context and "status" not in context["insights"]:
            insights = context["insights"]
            parts.append("=== TRADER PROFILE ===")
            if insights.get("trading_style"):
                parts.append(f"Trading style: {insights['trading_style']}")
            if insights.get("risk_profile"):
                parts.append(f"Risk profile: {insights['risk_profile']}")
            if insights.get("edge_observed"):
                parts.append(f"Observed edge: {insights['edge_observed']}")
            if insights.get("strengths"):
                parts.append(f"Strengths: {', '.join(insights['strengths'])}")
            if insights.get("weaknesses"):
                parts.append(f"Areas to improve: {', '.join(insights['weaknesses'])}")
            if insights.get("favorite_symbols"):
                parts.append(f"Favorite symbols: {', '.join(insights['favorite_symbols'][:5])}")
            parts.append("")

        # Patterns section
        if "patterns" in context and context["patterns"]:
            parts.append("=== DETECTED PATTERNS ===")
            for pattern in context["patterns"][:8]:  # Top 8 patterns
                confidence = pattern.get("confidence", 0) * 100
                desc = pattern.get("description", pattern.get("pattern_name", "Unknown"))
                parts.append(f"- [{confidence:.0f}%] {desc}")
            parts.append("")

        # Recent mistakes section
        if "recent_mistakes" in context and context["recent_mistakes"]:
            parts.append("=== RECENT MISTAKES (Last 7 Days) ===")
            for mistake in context["recent_mistakes"][:5]:  # Top 5 mistakes
                severity = mistake.get("severity", "info").upper()
                parts.append(f"- [{severity}] {mistake.get('type', 'unknown')}: {mistake.get('description', '')}")
                if mistake.get("suggestion"):
                    parts.append(f"  Suggestion: {mistake['suggestion']}")
            parts.append("")

        # Recent trades section
        if "trades" in context and context["trades"]:
            parts.append(f"=== RECENT TRADES (Last {len(context['trades'])} of {context.get('all_trades_count', 0)}) ===")
            for trade in context["trades"][:15]:  # Show last 15 trades
                date = str(trade.get("date", ""))[:10]
                symbol = trade.get("symbol", "?")
                side = trade.get("side", "?")
                entry = trade.get("entry", trade.get("entry_price", 0))
                exit_price = trade.get("exit", trade.get("exit_price", 0))
                pnl = trade.get("pnl_usd", 0)
                pnl_pct = trade.get("pnl_percent", trade.get("pnl_pct", 0))
                leverage = trade.get("leverage", 1)
                notes = trade.get("notes", "")

                trade_line = f"- {date}: {symbol} {side}"
                if leverage and leverage > 1:
                    trade_line += f" ({leverage}x)"
                trade_line += f" @ {entry} -> {exit_price}"
                trade_line += f" | PnL: ${pnl:,.2f}"
                if pnl_pct:
                    trade_line += f" ({pnl_pct:+.1f}%)"
                parts.append(trade_line)

                if notes:
                    parts.append(f"  Note: {notes[:100]}{'...' if len(notes) > 100 else ''}")
            parts.append("")

        # Conversation history section
        if "conversation_history" in context and context["conversation_history"]:
            parts.append("=== PREVIOUS COACHING CONTEXT ===")
            for conv in context["conversation_history"][:3]:  # Last 3 conversations
                parts.append(f"Session: {conv.get('title', 'Untitled')} ({conv.get('date', '')[:10]})")
                for msg in conv.get("messages", []):
                    role = msg.get("role", "")
                    content = msg.get("content", "")
                    parts.append(f"  {role.title()}: {content}")
            parts.append("")

        # === MEMORY SYSTEM (NEW) ===

        # Persistent memories section
        if "memories" in context and context["memories"]:
            memories = context["memories"]
            parts.append("=== WHAT I KNOW ABOUT THIS TRADER ===")

            # Trading style
            if memories.get("trading_styles"):
                parts.append("Trading Style:")
                for mem in memories["trading_styles"][:3]:
                    confidence = mem.get("confidence", 0) * 100
                    parts.append(f"  - [{confidence:.0f}%] {mem.get('content', '')}")

            # Strengths
            if memories.get("strengths"):
                parts.append("Known Strengths:")
                for mem in memories["strengths"][:5]:
                    confidence = mem.get("confidence", 0) * 100
                    parts.append(f"  - [{confidence:.0f}%] {mem.get('content', '')}")

            # Weaknesses
            if memories.get("weaknesses"):
                parts.append("Areas Needing Improvement:")
                for mem in memories["weaknesses"][:5]:
                    confidence = mem.get("confidence", 0) * 100
                    reinforced = mem.get("times_reinforced", 1)
                    parts.append(f"  - [{confidence:.0f}%] {mem.get('content', '')} (seen {reinforced}x)")

            # Trading rules
            if memories.get("rules"):
                parts.append("Trading Rules They've Set:")
                for mem in memories["rules"][:5]:
                    parts.append(f"  - {mem.get('content', '')}")

            # Emotional triggers
            if memories.get("triggers"):
                parts.append("Known Emotional Triggers:")
                for mem in memories["triggers"][:5]:
                    parts.append(f"  - {mem.get('content', '')}")

            # Breakthroughs
            if memories.get("breakthroughs"):
                parts.append("Key Breakthroughs/Realizations:")
                for mem in memories["breakthroughs"][:3]:
                    parts.append(f"  - {mem.get('content', '')}")

            # Preferences
            if memories.get("preferences"):
                parts.append("Preferences:")
                for mem in memories["preferences"][:3]:
                    parts.append(f"  - {mem.get('content', '')}")

            # Personality notes
            if memories.get("personalities"):
                parts.append("Personality/Communication Notes:")
                for mem in memories["personalities"][:2]:
                    parts.append(f"  - {mem.get('content', '')}")

            parts.append("")

        # Active goals section
        if "goals" in context and context["goals"]:
            parts.append("=== ACTIVE TRADING GOALS ===")
            for goal in context["goals"][:5]:
                progress = goal.get("progress_percent", 0)
                parts.append(f"- {goal.get('title', 'Unknown goal')}")
                if goal.get("description"):
                    parts.append(f"  {goal['description']}")
                parts.append(f"  Progress: {progress:.0f}%")
                if goal.get("deadline"):
                    parts.append(f"  Deadline: {goal['deadline'][:10]}")
            parts.append("")

        # Recent episodes (key moments) section
        if "episodes" in context and context["episodes"]:
            parts.append("=== KEY MOMENTS IN TRADING JOURNEY ===")
            for episode in context["episodes"][:5]:
                ep_type = episode.get("episode_type", "unknown").replace("_", " ").title()
                significance = episode.get("significance", "medium").upper()
                parts.append(f"- [{significance}] {ep_type}: {episode.get('title', 'Untitled')}")
                if episode.get("description"):
                    parts.append(f"  {episode['description'][:200]}")
                if episode.get("outcome"):
                    parts.append(f"  Outcome: {episode['outcome']}")
            parts.append("")

        # Journal context section (NEW)
        if "journal" in context and context["journal"]:
            journal = context["journal"]
            parts.append("=== TRADING JOURNAL ===")

            # Journaling streak
            if journal.get("journaling_streak", 0) > 0:
                parts.append(f"Current journaling streak: {journal['journaling_streak']} days")
            parts.append(f"Total journal entries: {journal.get('total_entries', 0)}")
            parts.append(f"Active journaler: {'Yes' if journal.get('is_active_journaler') else 'No'}")

            # Mood patterns
            if journal.get("mood_patterns"):
                mood = journal["mood_patterns"]
                parts.append(f"Average mood score: {mood.get('average_mood_score', 0):.1f}/5")
                parts.append(f"Pre-trade avg mood: {mood.get('pre_trade_average', 0):.1f}/5")
                parts.append(f"Post-trade avg mood: {mood.get('post_trade_average', 0):.1f}/5")
                improvement = mood.get("mood_improvement_after_trade", 0)
                if improvement > 0:
                    parts.append(f"Mood improves by {improvement:.1f} after trades")
                elif improvement < 0:
                    parts.append(f"Mood drops by {abs(improvement):.1f} after trades")
                if mood.get("most_common_mood"):
                    parts.append(f"Most common mood: {mood['most_common_mood']}")

            # Recent journal entries
            if journal.get("recent_entries"):
                parts.append("Recent journal entries:")
                for entry in journal["recent_entries"][:3]:
                    parts.append(f"  - {entry.get('title', 'Untitled')} ({entry.get('entry_date', '')})")
                    if entry.get("pre_trade_mood"):
                        parts.append(f"    Mood before: {entry['pre_trade_mood']}")
                    if entry.get("post_trade_mood"):
                        parts.append(f"    Mood after: {entry['post_trade_mood']}")
                    if entry.get("content_preview"):
                        parts.append(f"    {entry['content_preview'][:100]}...")
            parts.append("")

        # Relevant past context (from semantic search)
        if "relevant_past_context" in context and context["relevant_past_context"]:
            past = context["relevant_past_context"]
            if past.get("relevant_conversations"):
                parts.append("=== RELATED PAST CONVERSATIONS ===")
                for conv in past["relevant_conversations"][:3]:
                    similarity = conv.get("similarity", 0) * 100
                    parts.append(f"- [{similarity:.0f}% relevant] {conv.get('content_summary', '')}")
                parts.append("")

        return "\n".join(parts)
