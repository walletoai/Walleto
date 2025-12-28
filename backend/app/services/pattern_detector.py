"""
PatternDetector: Analyzes trading history to identify patterns in user behavior.
Detects time-based, symbol-based, behavioral, and technical patterns.
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)


class Pattern:
    """Represents a detected trading pattern."""

    def __init__(
        self,
        pattern_type: str,
        description: str,
        confidence: float,
        frequency: int,
        win_rate: float,
        avg_return: float,
        examples: List[Dict] = None,
    ):
        self.pattern_type = pattern_type
        self.description = description
        self.confidence = confidence  # 0.0 to 1.0
        self.frequency = frequency
        self.win_rate = win_rate
        self.avg_return = avg_return
        self.examples = examples or []

    def to_dict(self) -> Dict:
        return {
            "pattern_type": self.pattern_type,
            "description": self.description,
            "confidence": self.confidence,
            "frequency": self.frequency,
            "win_rate": self.win_rate,
            "avg_return": self.avg_return,
            "examples": self.examples[:3],  # Limit examples
        }


class PatternDetector:
    """Service for detecting patterns in trading behavior."""

    # Minimum trades needed for pattern detection
    MIN_TRADES_FOR_PATTERN = 5
    # Minimum confidence threshold
    MIN_CONFIDENCE = 0.6

    def __init__(self):
        pass

    async def analyze_patterns(self, trades: List[Dict]) -> List[Pattern]:
        """
        Analyze trades to detect patterns.

        Args:
            trades: List of trade dictionaries

        Returns:
            List of detected patterns sorted by confidence
        """
        if not trades or len(trades) < self.MIN_TRADES_FOR_PATTERN:
            logger.info(f"Not enough trades for pattern detection: {len(trades) if trades else 0}")
            return []

        patterns = []

        # Time-based analysis
        patterns.extend(self._analyze_time_patterns(trades))

        # Symbol-based analysis
        patterns.extend(self._analyze_symbol_patterns(trades))

        # Side analysis (LONG vs SHORT)
        patterns.extend(self._analyze_side_patterns(trades))

        # Behavioral analysis
        patterns.extend(self._analyze_behavioral_patterns(trades))

        # Streak analysis
        patterns.extend(self._analyze_streaks(trades))

        # Leverage patterns
        patterns.extend(self._analyze_leverage_patterns(trades))

        # Filter by confidence and sort
        valid_patterns = [p for p in patterns if p.confidence >= self.MIN_CONFIDENCE]
        valid_patterns.sort(key=lambda x: x.confidence, reverse=True)

        logger.info(f"Detected {len(valid_patterns)} patterns from {len(trades)} trades")
        return valid_patterns

    def _analyze_time_patterns(self, trades: List[Dict]) -> List[Pattern]:
        """Analyze patterns based on time of day and day of week."""
        patterns = []

        # Group by hour of day
        by_hour = defaultdict(list)
        # Group by day of week
        by_day = defaultdict(list)

        for trade in trades:
            trade_date = self._parse_date(trade.get("date"))
            if not trade_date:
                continue

            hour = trade_date.hour
            day = trade_date.strftime("%A")
            pnl = trade.get("pnl_usd", 0)

            by_hour[hour].append(pnl)
            by_day[day].append(pnl)

        # Find best performing hours
        hour_stats = {}
        for hour, pnls in by_hour.items():
            if len(pnls) >= 3:
                hour_stats[hour] = {
                    "count": len(pnls),
                    "win_rate": sum(1 for p in pnls if p > 0) / len(pnls),
                    "avg_pnl": sum(pnls) / len(pnls),
                    "total_pnl": sum(pnls),
                }

        # Best trading hours
        if hour_stats:
            best_hour = max(hour_stats.items(), key=lambda x: x[1]["avg_pnl"])
            worst_hour = min(hour_stats.items(), key=lambda x: x[1]["avg_pnl"])

            if best_hour[1]["avg_pnl"] > 0 and best_hour[1]["count"] >= 5:
                confidence = min(0.9, 0.5 + (best_hour[1]["count"] / 50))
                patterns.append(Pattern(
                    pattern_type="best_trading_hour",
                    description=f"You perform best around {best_hour[0]}:00 UTC with ${best_hour[1]['avg_pnl']:.2f} avg PnL",
                    confidence=confidence,
                    frequency=best_hour[1]["count"],
                    win_rate=best_hour[1]["win_rate"],
                    avg_return=best_hour[1]["avg_pnl"],
                ))

            if worst_hour[1]["avg_pnl"] < 0 and worst_hour[1]["count"] >= 5:
                confidence = min(0.9, 0.5 + (worst_hour[1]["count"] / 50))
                patterns.append(Pattern(
                    pattern_type="worst_trading_hour",
                    description=f"Avoid trading around {worst_hour[0]}:00 UTC - avg loss of ${abs(worst_hour[1]['avg_pnl']):.2f}",
                    confidence=confidence,
                    frequency=worst_hour[1]["count"],
                    win_rate=worst_hour[1]["win_rate"],
                    avg_return=worst_hour[1]["avg_pnl"],
                ))

        # Day of week analysis
        day_stats = {}
        for day, pnls in by_day.items():
            if len(pnls) >= 3:
                day_stats[day] = {
                    "count": len(pnls),
                    "win_rate": sum(1 for p in pnls if p > 0) / len(pnls),
                    "avg_pnl": sum(pnls) / len(pnls),
                }

        if day_stats:
            best_day = max(day_stats.items(), key=lambda x: x[1]["avg_pnl"])
            if best_day[1]["avg_pnl"] > 0 and best_day[1]["count"] >= 5:
                patterns.append(Pattern(
                    pattern_type="best_trading_day",
                    description=f"{best_day[0]}s are your best day with {best_day[1]['win_rate']*100:.0f}% win rate",
                    confidence=min(0.85, 0.5 + (best_day[1]["count"] / 30)),
                    frequency=best_day[1]["count"],
                    win_rate=best_day[1]["win_rate"],
                    avg_return=best_day[1]["avg_pnl"],
                ))

        return patterns

    def _analyze_symbol_patterns(self, trades: List[Dict]) -> List[Pattern]:
        """Analyze patterns by trading symbol."""
        patterns = []

        by_symbol = defaultdict(list)
        for trade in trades:
            symbol = trade.get("symbol", "Unknown")
            pnl = trade.get("pnl_usd", 0)
            by_symbol[symbol].append({
                "pnl": pnl,
                "trade": trade,
            })

        symbol_stats = {}
        for symbol, data in by_symbol.items():
            if len(data) >= 3:
                pnls = [d["pnl"] for d in data]
                symbol_stats[symbol] = {
                    "count": len(data),
                    "win_rate": sum(1 for p in pnls if p > 0) / len(pnls),
                    "avg_pnl": sum(pnls) / len(pnls),
                    "total_pnl": sum(pnls),
                }

        if symbol_stats:
            # Best symbol
            best = max(symbol_stats.items(), key=lambda x: x[1]["total_pnl"])
            if best[1]["total_pnl"] > 0 and best[1]["count"] >= 5:
                patterns.append(Pattern(
                    pattern_type="best_symbol",
                    description=f"{best[0]} is your most profitable pair: ${best[1]['total_pnl']:.2f} total ({best[1]['win_rate']*100:.0f}% win rate)",
                    confidence=min(0.9, 0.5 + (best[1]["count"] / 40)),
                    frequency=best[1]["count"],
                    win_rate=best[1]["win_rate"],
                    avg_return=best[1]["avg_pnl"],
                ))

            # Worst symbol
            worst = min(symbol_stats.items(), key=lambda x: x[1]["total_pnl"])
            if worst[1]["total_pnl"] < 0 and worst[1]["count"] >= 5:
                patterns.append(Pattern(
                    pattern_type="worst_symbol",
                    description=f"Consider avoiding {worst[0]}: ${worst[1]['total_pnl']:.2f} total loss ({worst[1]['win_rate']*100:.0f}% win rate)",
                    confidence=min(0.9, 0.5 + (worst[1]["count"] / 40)),
                    frequency=worst[1]["count"],
                    win_rate=worst[1]["win_rate"],
                    avg_return=worst[1]["avg_pnl"],
                ))

        return patterns

    def _analyze_side_patterns(self, trades: List[Dict]) -> List[Pattern]:
        """Analyze LONG vs SHORT performance."""
        patterns = []

        longs = [t for t in trades if t.get("side", "").upper() == "LONG"]
        shorts = [t for t in trades if t.get("side", "").upper() == "SHORT"]

        if len(longs) >= 5 and len(shorts) >= 5:
            long_pnl = [t.get("pnl_usd", 0) for t in longs]
            short_pnl = [t.get("pnl_usd", 0) for t in shorts]

            long_wr = sum(1 for p in long_pnl if p > 0) / len(long_pnl)
            short_wr = sum(1 for p in short_pnl if p > 0) / len(short_pnl)

            long_avg = sum(long_pnl) / len(long_pnl)
            short_avg = sum(short_pnl) / len(short_pnl)

            # Significant difference
            if abs(long_wr - short_wr) > 0.15:
                if long_wr > short_wr:
                    patterns.append(Pattern(
                        pattern_type="long_bias_edge",
                        description=f"You're better at longs ({long_wr*100:.0f}%) than shorts ({short_wr*100:.0f}%)",
                        confidence=min(0.85, 0.5 + (len(longs) + len(shorts)) / 100),
                        frequency=len(longs),
                        win_rate=long_wr,
                        avg_return=long_avg,
                    ))
                else:
                    patterns.append(Pattern(
                        pattern_type="short_bias_edge",
                        description=f"You're better at shorts ({short_wr*100:.0f}%) than longs ({long_wr*100:.0f}%)",
                        confidence=min(0.85, 0.5 + (len(longs) + len(shorts)) / 100),
                        frequency=len(shorts),
                        win_rate=short_wr,
                        avg_return=short_avg,
                    ))

        return patterns

    def _analyze_behavioral_patterns(self, trades: List[Dict]) -> List[Pattern]:
        """Analyze behavioral patterns like position sizing consistency."""
        patterns = []

        if len(trades) < 10:
            return patterns

        # Position size consistency
        sizes = [t.get("size", 0) for t in trades if t.get("size", 0) > 0]
        if len(sizes) >= 10:
            avg_size = statistics.mean(sizes)
            std_size = statistics.stdev(sizes) if len(sizes) > 1 else 0

            # Check for inconsistent sizing
            oversized_trades = [t for t in trades if t.get("size", 0) > avg_size * 2]
            if len(oversized_trades) >= 3:
                oversized_pnl = [t.get("pnl_usd", 0) for t in oversized_trades]
                oversized_wr = sum(1 for p in oversized_pnl if p > 0) / len(oversized_pnl)

                patterns.append(Pattern(
                    pattern_type="oversizing_behavior",
                    description=f"You sometimes oversize (>{avg_size*2:.0f} units) - these trades have {oversized_wr*100:.0f}% win rate",
                    confidence=min(0.8, 0.5 + len(oversized_trades) / 20),
                    frequency=len(oversized_trades),
                    win_rate=oversized_wr,
                    avg_return=sum(oversized_pnl) / len(oversized_pnl) if oversized_pnl else 0,
                ))

        # Trading frequency patterns
        trade_dates = [self._parse_date(t.get("date")) for t in trades]
        trade_dates = [d for d in trade_dates if d]
        trade_dates.sort()

        if len(trade_dates) >= 10:
            # Count trades per day
            trades_per_day = defaultdict(int)
            for d in trade_dates:
                day_key = d.strftime("%Y-%m-%d")
                trades_per_day[day_key] += 1

            heavy_days = [day for day, count in trades_per_day.items() if count >= 10]
            if heavy_days:
                patterns.append(Pattern(
                    pattern_type="overtrading_tendency",
                    description=f"You have {len(heavy_days)} days with 10+ trades - consider quality over quantity",
                    confidence=min(0.8, 0.5 + len(heavy_days) / 10),
                    frequency=len(heavy_days),
                    win_rate=0,
                    avg_return=0,
                ))

        return patterns

    def _analyze_streaks(self, trades: List[Dict]) -> List[Pattern]:
        """Analyze win/loss streaks and behavior after streaks."""
        patterns = []

        # Sort trades by date
        sorted_trades = sorted(trades, key=lambda x: x.get("date", ""))

        # Find streaks
        current_streak = 0
        streak_type = None
        max_win_streak = 0
        max_loss_streak = 0

        trades_after_win_streak = []
        trades_after_loss_streak = []

        for i, trade in enumerate(sorted_trades):
            pnl = trade.get("pnl_usd", 0)
            is_win = pnl > 0

            if streak_type is None:
                streak_type = "win" if is_win else "loss"
                current_streak = 1
            elif (streak_type == "win" and is_win) or (streak_type == "loss" and not is_win):
                current_streak += 1
            else:
                # Streak broken
                if streak_type == "win" and current_streak >= 3:
                    max_win_streak = max(max_win_streak, current_streak)
                    if i < len(sorted_trades):
                        trades_after_win_streak.append(trade)
                elif streak_type == "loss" and current_streak >= 3:
                    max_loss_streak = max(max_loss_streak, current_streak)
                    if i < len(sorted_trades):
                        trades_after_loss_streak.append(trade)

                streak_type = "win" if is_win else "loss"
                current_streak = 1

        # Analyze behavior after streaks
        if len(trades_after_loss_streak) >= 3:
            pnls = [t.get("pnl_usd", 0) for t in trades_after_loss_streak]
            win_rate = sum(1 for p in pnls if p > 0) / len(pnls)

            if win_rate < 0.4:
                patterns.append(Pattern(
                    pattern_type="tilt_after_losses",
                    description=f"After 3+ loss streaks, your next trade wins only {win_rate*100:.0f}% - possible tilt",
                    confidence=min(0.85, 0.5 + len(trades_after_loss_streak) / 15),
                    frequency=len(trades_after_loss_streak),
                    win_rate=win_rate,
                    avg_return=sum(pnls) / len(pnls),
                ))

        if len(trades_after_win_streak) >= 3:
            pnls = [t.get("pnl_usd", 0) for t in trades_after_win_streak]
            win_rate = sum(1 for p in pnls if p > 0) / len(pnls)

            if win_rate < 0.4:
                patterns.append(Pattern(
                    pattern_type="overconfidence_after_wins",
                    description=f"After 3+ win streaks, your next trade wins only {win_rate*100:.0f}% - possible overconfidence",
                    confidence=min(0.8, 0.5 + len(trades_after_win_streak) / 15),
                    frequency=len(trades_after_win_streak),
                    win_rate=win_rate,
                    avg_return=sum(pnls) / len(pnls),
                ))

        return patterns

    def _analyze_leverage_patterns(self, trades: List[Dict]) -> List[Pattern]:
        """Analyze patterns related to leverage usage."""
        patterns = []

        trades_with_leverage = [t for t in trades if t.get("leverage", 1) > 1]
        if len(trades_with_leverage) < 5:
            return patterns

        # Group by leverage level
        by_leverage = defaultdict(list)
        for t in trades_with_leverage:
            lev = t.get("leverage", 1)
            if lev <= 5:
                group = "low (1-5x)"
            elif lev <= 10:
                group = "medium (6-10x)"
            elif lev <= 25:
                group = "high (11-25x)"
            else:
                group = "extreme (>25x)"

            by_leverage[group].append(t.get("pnl_usd", 0))

        leverage_stats = {}
        for group, pnls in by_leverage.items():
            if len(pnls) >= 3:
                leverage_stats[group] = {
                    "count": len(pnls),
                    "win_rate": sum(1 for p in pnls if p > 0) / len(pnls),
                    "avg_pnl": sum(pnls) / len(pnls),
                }

        # Find best leverage level
        if leverage_stats:
            best = max(leverage_stats.items(), key=lambda x: x[1]["avg_pnl"])
            if best[1]["avg_pnl"] > 0:
                patterns.append(Pattern(
                    pattern_type="optimal_leverage",
                    description=f"Your {best[0]} leverage trades perform best: {best[1]['win_rate']*100:.0f}% win rate, ${best[1]['avg_pnl']:.2f} avg",
                    confidence=min(0.8, 0.5 + best[1]["count"] / 30),
                    frequency=best[1]["count"],
                    win_rate=best[1]["win_rate"],
                    avg_return=best[1]["avg_pnl"],
                ))

            # Warn about high leverage if it's losing
            if "extreme (>25x)" in leverage_stats:
                extreme = leverage_stats["extreme (>25x)"]
                if extreme["avg_pnl"] < 0:
                    patterns.append(Pattern(
                        pattern_type="high_leverage_warning",
                        description=f"Extreme leverage (>25x) is hurting you: {extreme['win_rate']*100:.0f}% win rate, ${extreme['avg_pnl']:.2f} avg loss",
                        confidence=min(0.9, 0.5 + extreme["count"] / 20),
                        frequency=extreme["count"],
                        win_rate=extreme["win_rate"],
                        avg_return=extreme["avg_pnl"],
                    ))

        return patterns

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse a date string to datetime."""
        if not date_str:
            return None

        try:
            # Try ISO format first
            if "T" in str(date_str):
                return datetime.fromisoformat(str(date_str).replace("Z", "+00:00"))
            else:
                return datetime.strptime(str(date_str), "%Y-%m-%d")
        except (ValueError, TypeError):
            return None


async def test_pattern_detector():
    """Test pattern detector with sample data."""
    detector = PatternDetector()

    # Sample trades
    sample_trades = [
        {"date": "2024-01-15T10:00:00", "symbol": "BTC/USDT", "side": "LONG", "pnl_usd": 100, "size": 0.1, "leverage": 5},
        {"date": "2024-01-15T14:00:00", "symbol": "BTC/USDT", "side": "LONG", "pnl_usd": -50, "size": 0.1, "leverage": 5},
        {"date": "2024-01-16T10:00:00", "symbol": "ETH/USDT", "side": "SHORT", "pnl_usd": 75, "size": 1, "leverage": 10},
        {"date": "2024-01-16T15:00:00", "symbol": "BTC/USDT", "side": "LONG", "pnl_usd": 200, "size": 0.1, "leverage": 5},
        {"date": "2024-01-17T10:00:00", "symbol": "BTC/USDT", "side": "LONG", "pnl_usd": 150, "size": 0.1, "leverage": 5},
        {"date": "2024-01-17T16:00:00", "symbol": "ETH/USDT", "side": "SHORT", "pnl_usd": -100, "size": 1, "leverage": 10},
    ]

    patterns = await detector.analyze_patterns(sample_trades)

    print(f"Detected {len(patterns)} patterns:")
    for p in patterns:
        print(f"  - {p.pattern_type}: {p.description} (confidence: {p.confidence:.2f})")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_pattern_detector())
