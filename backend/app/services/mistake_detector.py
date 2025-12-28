"""
MistakeDetector: Identifies common trading mistakes in real-time.
Detects revenge trading, overtrading, overleveraging, tilt, and more.
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)


class Mistake:
    """Represents a detected trading mistake."""

    SEVERITY_INFO = "info"
    SEVERITY_WARNING = "warning"
    SEVERITY_CRITICAL = "critical"

    def __init__(
        self,
        mistake_type: str,
        description: str,
        severity: str,
        trade_id: Optional[str] = None,
        trade_data: Optional[Dict] = None,
        suggestion: str = "",
    ):
        self.mistake_type = mistake_type
        self.description = description
        self.severity = severity
        self.trade_id = trade_id
        self.trade_data = trade_data
        self.suggestion = suggestion
        self.detected_at = datetime.utcnow()

    def to_dict(self) -> Dict:
        return {
            "type": self.mistake_type,
            "description": self.description,
            "severity": self.severity,
            "trade_id": self.trade_id,
            "suggestion": self.suggestion,
            "detected_at": self.detected_at.isoformat(),
        }


class MistakeDetector:
    """Service for detecting trading mistakes in real-time."""

    # Configuration thresholds
    REVENGE_TRADE_WINDOW_MINUTES = 30  # Time window to detect revenge trading
    OVERTRADING_THRESHOLD = 10  # Max trades per day before warning
    HIGH_LEVERAGE_THRESHOLD = 10  # Leverage level considered high
    EXTREME_LEVERAGE_THRESHOLD = 25  # Leverage level considered extreme
    SIZE_MULTIPLIER_THRESHOLD = 3  # Position size X times larger than average

    def __init__(self):
        pass

    async def check_trade(
        self,
        trade: Dict,
        recent_trades: List[Dict],
        user_stats: Optional[Dict] = None,
    ) -> List[Mistake]:
        """
        Check a single trade for mistakes.

        Args:
            trade: The new trade to check
            recent_trades: Recent trade history for context
            user_stats: User's trading statistics

        Returns:
            List of detected mistakes
        """
        mistakes = []

        # Check for revenge trading
        revenge_mistake = self._check_revenge_trading(trade, recent_trades)
        if revenge_mistake:
            mistakes.append(revenge_mistake)

        # Check for overtrading
        overtrading_mistake = self._check_overtrading(trade, recent_trades)
        if overtrading_mistake:
            mistakes.append(overtrading_mistake)

        # Check for overleveraging
        leverage_mistake = self._check_overleveraging(trade)
        if leverage_mistake:
            mistakes.append(leverage_mistake)

        # Check for size inconsistency
        size_mistake = self._check_size_inconsistency(trade, recent_trades, user_stats)
        if size_mistake:
            mistakes.append(size_mistake)

        # Check for tilt trading
        tilt_mistake = self._check_tilt_trading(trade, recent_trades)
        if tilt_mistake:
            mistakes.append(tilt_mistake)

        # Check for FOMO indicators
        fomo_mistake = self._check_fomo_entry(trade, recent_trades)
        if fomo_mistake:
            mistakes.append(fomo_mistake)

        return mistakes

    async def analyze_session(self, trades: List[Dict]) -> List[Mistake]:
        """
        Analyze a trading session for mistakes.

        Args:
            trades: All trades from the session

        Returns:
            List of detected mistakes for the session
        """
        mistakes = []

        if not trades:
            return mistakes

        # Sort by date
        sorted_trades = sorted(trades, key=lambda x: x.get("date", ""))

        # Check each trade in context
        for i, trade in enumerate(sorted_trades):
            # Get trades before this one
            previous_trades = sorted_trades[:i]
            trade_mistakes = await self.check_trade(trade, previous_trades)
            mistakes.extend(trade_mistakes)

        # Session-level analysis
        session_mistakes = self._analyze_session_patterns(sorted_trades)
        mistakes.extend(session_mistakes)

        return mistakes

    def _check_revenge_trading(
        self, trade: Dict, recent_trades: List[Dict]
    ) -> Optional[Mistake]:
        """
        Detect revenge trading: trade within X minutes of a loss, with larger size.
        """
        trade_date = self._parse_date(trade.get("date"))
        if not trade_date:
            return None

        trade_size = trade.get("size", 0)

        # Find recent losing trades
        for prev_trade in reversed(recent_trades[-10:]):  # Check last 10 trades
            prev_date = self._parse_date(prev_trade.get("date"))
            if not prev_date:
                continue

            prev_pnl = prev_trade.get("pnl_usd", 0)
            prev_size = prev_trade.get("size", 0)

            # Check if previous trade was a loss
            if prev_pnl >= 0:
                continue

            # Check time window
            time_diff = (trade_date - prev_date).total_seconds() / 60
            if time_diff > self.REVENGE_TRADE_WINDOW_MINUTES:
                continue

            # Check if size increased
            if trade_size > prev_size * 1.5:
                return Mistake(
                    mistake_type="revenge_trading",
                    description=f"Trade entered {int(time_diff)} min after ${abs(prev_pnl):.2f} loss with 50%+ larger size",
                    severity=Mistake.SEVERITY_CRITICAL,
                    trade_id=trade.get("id"),
                    trade_data=trade,
                    suggestion="Take a 30-minute break after losses. Don't increase size to recover.",
                )

            # Even without size increase, rapid trading after loss is concerning
            if time_diff < 5:
                return Mistake(
                    mistake_type="revenge_trading",
                    description=f"Trade entered only {int(time_diff)} min after a ${abs(prev_pnl):.2f} loss",
                    severity=Mistake.SEVERITY_WARNING,
                    trade_id=trade.get("id"),
                    trade_data=trade,
                    suggestion="Wait at least 15 minutes after a loss before trading again.",
                )

        return None

    def _check_overtrading(
        self, trade: Dict, recent_trades: List[Dict]
    ) -> Optional[Mistake]:
        """
        Detect overtrading: too many trades in a short period.
        """
        trade_date = self._parse_date(trade.get("date"))
        if not trade_date:
            return None

        # Count trades in the same day
        same_day_trades = 0
        for prev_trade in recent_trades:
            prev_date = self._parse_date(prev_trade.get("date"))
            if not prev_date:
                continue

            if prev_date.date() == trade_date.date():
                same_day_trades += 1

        # Include current trade
        same_day_trades += 1

        if same_day_trades >= self.OVERTRADING_THRESHOLD * 2:
            return Mistake(
                mistake_type="overtrading",
                description=f"This is trade #{same_day_trades} today. Excessive trading detected.",
                severity=Mistake.SEVERITY_CRITICAL,
                trade_id=trade.get("id"),
                trade_data=trade,
                suggestion="Set a daily trade limit. Quality over quantity.",
            )
        elif same_day_trades >= self.OVERTRADING_THRESHOLD:
            return Mistake(
                mistake_type="overtrading",
                description=f"Trade #{same_day_trades} today. Consider slowing down.",
                severity=Mistake.SEVERITY_WARNING,
                trade_id=trade.get("id"),
                trade_data=trade,
                suggestion="You're trading frequently. Make sure each trade has a clear setup.",
            )

        return None

    def _check_overleveraging(self, trade: Dict) -> Optional[Mistake]:
        """
        Detect overleveraging: using too much leverage.
        """
        leverage = trade.get("leverage", 1)

        if leverage >= self.EXTREME_LEVERAGE_THRESHOLD:
            return Mistake(
                mistake_type="overleveraging",
                description=f"Using {leverage}x leverage is extremely risky",
                severity=Mistake.SEVERITY_CRITICAL,
                trade_id=trade.get("id"),
                trade_data=trade,
                suggestion=f"Consider reducing to {self.HIGH_LEVERAGE_THRESHOLD}x or less. High leverage amplifies both gains and losses.",
            )
        elif leverage >= self.HIGH_LEVERAGE_THRESHOLD:
            return Mistake(
                mistake_type="high_leverage",
                description=f"Using {leverage}x leverage - ensure proper risk management",
                severity=Mistake.SEVERITY_WARNING,
                trade_id=trade.get("id"),
                trade_data=trade,
                suggestion="High leverage requires tight stop losses. Make sure you have one set.",
            )

        return None

    def _check_size_inconsistency(
        self,
        trade: Dict,
        recent_trades: List[Dict],
        user_stats: Optional[Dict] = None,
    ) -> Optional[Mistake]:
        """
        Detect unusual position sizing compared to recent average.
        """
        trade_size = trade.get("size", 0)
        if trade_size <= 0:
            return None

        # Calculate average size from recent trades
        sizes = [t.get("size", 0) for t in recent_trades if t.get("size", 0) > 0]
        if len(sizes) < 5:
            return None

        avg_size = sum(sizes) / len(sizes)

        if trade_size > avg_size * self.SIZE_MULTIPLIER_THRESHOLD:
            return Mistake(
                mistake_type="size_inconsistency",
                description=f"Position size ({trade_size:.4f}) is {trade_size/avg_size:.1f}x your average ({avg_size:.4f})",
                severity=Mistake.SEVERITY_WARNING,
                trade_id=trade.get("id"),
                trade_data=trade,
                suggestion="Keep position sizes consistent. Large size changes often indicate emotional trading.",
            )

        return None

    def _check_tilt_trading(
        self, trade: Dict, recent_trades: List[Dict]
    ) -> Optional[Mistake]:
        """
        Detect tilt: trading after multiple consecutive losses with pattern changes.
        """
        if len(recent_trades) < 3:
            return None

        # Check for 3+ consecutive losses
        consecutive_losses = 0
        total_loss = 0

        for prev_trade in reversed(recent_trades[-5:]):
            pnl = prev_trade.get("pnl_usd", 0)
            if pnl < 0:
                consecutive_losses += 1
                total_loss += abs(pnl)
            else:
                break

        if consecutive_losses >= 3:
            trade_size = trade.get("size", 0)
            trade_leverage = trade.get("leverage", 1)

            # Check if size or leverage increased after losses
            last_loss = recent_trades[-1] if recent_trades else {}
            last_size = last_loss.get("size", trade_size)
            last_leverage = last_loss.get("leverage", trade_leverage)

            if trade_size > last_size * 1.5 or trade_leverage > last_leverage * 1.5:
                return Mistake(
                    mistake_type="tilt_trading",
                    description=f"After {consecutive_losses} consecutive losses (${total_loss:.2f}), you're increasing risk",
                    severity=Mistake.SEVERITY_CRITICAL,
                    trade_id=trade.get("id"),
                    trade_data=trade,
                    suggestion="Stop trading. Take a break. Review your strategy before continuing.",
                )
            else:
                return Mistake(
                    mistake_type="loss_streak",
                    description=f"Currently on a {consecutive_losses}-loss streak totaling ${total_loss:.2f}",
                    severity=Mistake.SEVERITY_WARNING,
                    trade_id=trade.get("id"),
                    trade_data=trade,
                    suggestion="Consider taking a short break. Loss streaks can affect judgment.",
                )

        return None

    def _check_fomo_entry(
        self, trade: Dict, recent_trades: List[Dict]
    ) -> Optional[Mistake]:
        """
        Detect potential FOMO entries based on patterns.
        Simple heuristic: rapid entries after market moves.
        """
        trade_date = self._parse_date(trade.get("date"))
        if not trade_date:
            return None

        # Check for rapid consecutive entries on same symbol
        symbol = trade.get("symbol", "")
        same_symbol_recent = [
            t for t in recent_trades[-5:]
            if t.get("symbol") == symbol
        ]

        if len(same_symbol_recent) >= 2:
            last_trade = same_symbol_recent[-1]
            last_date = self._parse_date(last_trade.get("date"))

            if last_date:
                time_diff = (trade_date - last_date).total_seconds() / 60

                # Multiple entries on same symbol within short time
                if time_diff < 10 and len(same_symbol_recent) >= 3:
                    return Mistake(
                        mistake_type="fomo_entry",
                        description=f"Multiple rapid entries on {symbol} - possible FOMO",
                        severity=Mistake.SEVERITY_WARNING,
                        trade_id=trade.get("id"),
                        trade_data=trade,
                        suggestion="Stick to your trading plan. Don't chase moves.",
                    )

        return None

    def _analyze_session_patterns(self, trades: List[Dict]) -> List[Mistake]:
        """
        Analyze overall session for patterns that indicate problems.
        """
        mistakes = []

        if len(trades) < 3:
            return mistakes

        # Check win rate deterioration
        first_half = trades[:len(trades)//2]
        second_half = trades[len(trades)//2:]

        if len(first_half) >= 3 and len(second_half) >= 3:
            first_wr = sum(1 for t in first_half if t.get("pnl_usd", 0) > 0) / len(first_half)
            second_wr = sum(1 for t in second_half if t.get("pnl_usd", 0) > 0) / len(second_half)

            if first_wr > 0.6 and second_wr < 0.3:
                mistakes.append(Mistake(
                    mistake_type="session_deterioration",
                    description=f"Win rate dropped from {first_wr*100:.0f}% to {second_wr*100:.0f}% during session",
                    severity=Mistake.SEVERITY_WARNING,
                    suggestion="Your performance deteriorated. Consider setting a session loss limit.",
                ))

        # Check for escalating sizes after losses
        loss_followed_by_bigger = 0
        for i in range(1, len(trades)):
            prev = trades[i-1]
            curr = trades[i]

            if prev.get("pnl_usd", 0) < 0:
                prev_size = prev.get("size", 0)
                curr_size = curr.get("size", 0)
                if curr_size > prev_size * 1.3 and prev_size > 0:
                    loss_followed_by_bigger += 1

        if loss_followed_by_bigger >= 3:
            mistakes.append(Mistake(
                mistake_type="martingale_pattern",
                description=f"You increased size after losses {loss_followed_by_bigger} times this session",
                severity=Mistake.SEVERITY_CRITICAL,
                suggestion="This is a martingale pattern. It leads to blow-ups. Keep size consistent.",
            ))

        return mistakes

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse a date string to datetime."""
        if not date_str:
            return None

        try:
            if "T" in str(date_str):
                return datetime.fromisoformat(str(date_str).replace("Z", "+00:00"))
            else:
                return datetime.strptime(str(date_str), "%Y-%m-%d")
        except (ValueError, TypeError):
            return None


async def test_mistake_detector():
    """Test mistake detector with sample data."""
    detector = MistakeDetector()

    # Sample trades simulating revenge trading
    sample_trades = [
        {"id": "1", "date": "2024-01-15T10:00:00", "symbol": "BTC/USDT", "side": "LONG", "pnl_usd": -100, "size": 0.1, "leverage": 5},
        {"id": "2", "date": "2024-01-15T10:15:00", "symbol": "BTC/USDT", "side": "LONG", "pnl_usd": -150, "size": 0.2, "leverage": 10},  # Revenge trade
    ]

    # Check the second trade
    mistakes = await detector.check_trade(sample_trades[1], sample_trades[:1])

    print(f"Detected {len(mistakes)} mistakes:")
    for m in mistakes:
        print(f"  - [{m.severity}] {m.mistake_type}: {m.description}")
        print(f"    Suggestion: {m.suggestion}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_mistake_detector())
