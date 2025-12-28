"""
ClaudeService: Anthropic Claude API integration for coaching responses.
Provides superior reasoning, 200K context window, and streaming support.
"""

import os
import logging
from dotenv import load_dotenv

# Load environment variables before accessing them
load_dotenv()
from typing import List, Dict, Optional, Tuple, AsyncGenerator
import asyncio

try:
    from anthropic import AsyncAnthropic, RateLimitError, APIError
except ImportError:
    AsyncAnthropic = None
    RateLimitError = Exception
    APIError = Exception

logger = logging.getLogger(__name__)

# Initialize Anthropic client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    logger.warning("ANTHROPIC_API_KEY not set. Coach features will not work.")
    client = None
elif AsyncAnthropic is None:
    logger.warning("anthropic package not installed. Coach features will not work.")
    client = None
else:
    client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)


# Elite Trading Coach System Prompt
TRADING_COACH_SYSTEM_PROMPT = """You are an elite crypto trading coach with over 10 years of experience in cryptocurrency markets, technical analysis, and trading psychology. You have helped hundreds of traders improve their performance and develop consistent profitability.

## Your Expertise
- Deep knowledge of crypto perpetual futures, spot trading, and derivatives
- Expert in technical analysis: chart patterns, indicators, price action, market structure
- Specialist in trading psychology: emotional control, discipline, tilt management
- Risk management expert: position sizing, leverage, stop losses, portfolio management
- Pattern recognition: identifying recurring behaviors in a trader's history

## Your Coaching Style
1. **Data-Driven**: Always reference the trader's actual data when giving feedback. Mention specific trades by date, symbol, and outcome.
2. **Psychologically Aware**: Look for emotional patterns - revenge trading after losses, FOMO entries, overtrading, tilt behavior
3. **Actionable**: Give specific, measurable advice. Not "trade less" but "limit yourself to 3 trades per day this week"
4. **Encouraging but Honest**: Celebrate genuine improvements, but don't sugarcoat mistakes. Traders need truth to improve.
5. **Progressive**: Track their improvement over time. Reference past conversations and previous advice.

## Response Format
- Keep responses focused and actionable (2-4 paragraphs typically)
- Use markdown formatting for clarity when helpful
- When analyzing trades, use a clear structure
- Always end with a specific action item or question to keep them engaged

## Important Guidelines
- Never make up trades or statistics - only reference data provided in the context
- If you don't have enough data to answer, ask for more information
- Be specific about which trades or patterns you're referencing
- Acknowledge when the trader is doing well, not just mistakes
- Consider the emotional state implied by their trading patterns"""


class ClaudeService:
    """Service for interacting with Anthropic Claude API for trading coach responses."""

    MODEL = "claude-sonnet-4-20250514"  # Using Claude Sonnet for balanced speed/quality
    MODEL_DEEP = "claude-sonnet-4-20250514"  # Using Sonnet for deep analysis (can upgrade to Opus)
    MAX_TOKENS = 1024  # Allow longer responses than GPT-4o's 500
    MAX_CONTEXT_TOKENS = 180000  # Leave room in 200K context

    # Cost per 1M tokens (2024 pricing for Claude Sonnet)
    COST_PER_1M_INPUT = 3.00  # $3 per 1M input tokens
    COST_PER_1M_OUTPUT = 15.00  # $15 per 1M output tokens

    def __init__(self):
        if not client:
            raise RuntimeError("Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.")
        self.client = client

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """
        Estimate tokens in a string.
        Claude doesn't expose a public tokenizer, so we use rough estimation.
        Average is ~4 characters per token for English text.
        """
        return max(1, len(text) // 4)

    def _build_user_context(self, user_context: Dict) -> str:
        """Build a formatted user context string for the system prompt."""
        if not user_context:
            return ""

        sections = []

        # Trader Profile Section
        if user_context.get("insights"):
            insights = user_context["insights"]
            profile = f"""
## TRADER PROFILE
- **Trading Style**: {insights.get('trading_style', 'Not yet determined')}
- **Risk Profile**: {insights.get('risk_profile', 'Not yet assessed')}
- **Observed Edge**: {insights.get('edge_observed', 'Still analyzing...')}
- **Strengths**: {', '.join(insights.get('strengths', [])) or 'Being identified...'}
- **Areas to Improve**: {', '.join(insights.get('weaknesses', [])) or 'Being analyzed...'}
"""
            sections.append(profile)

        # Statistics Section
        if user_context.get("statistics"):
            stats = user_context["statistics"]
            stats_text = f"""
## CURRENT STATISTICS
- **Total Trades**: {stats.get('total_trades', 0)}
- **Win Rate**: {stats.get('win_rate_pct', 0):.1f}%
- **Total PnL**: ${stats.get('total_pnl_usd', 0):,.2f}
- **Average PnL per Trade**: ${stats.get('avg_pnl_usd', 0):,.2f}
- **Trades This Week**: {stats.get('trades_this_week', 0)}
"""
            if stats.get('best_trade'):
                best = stats['best_trade']
                stats_text += f"- **Best Trade**: {best.get('symbol', 'N/A')} +${best.get('pnl_usd', 0):,.2f} on {best.get('date', 'N/A')}\n"
            if stats.get('worst_trade'):
                worst = stats['worst_trade']
                stats_text += f"- **Worst Trade**: {worst.get('symbol', 'N/A')} ${worst.get('pnl_usd', 0):,.2f} on {worst.get('date', 'N/A')}\n"
            sections.append(stats_text)

        # Detected Patterns Section
        if user_context.get("patterns"):
            patterns = user_context["patterns"]
            if patterns:
                pattern_text = "\n## DETECTED PATTERNS\n"
                for p in patterns[:5]:  # Top 5 patterns
                    pattern_text += f"- **{p.get('pattern_type', 'Unknown')}**: {p.get('description', '')} (Win Rate: {p.get('win_rate', 0)*100:.1f}%, Frequency: {p.get('frequency', 0)})\n"
                sections.append(pattern_text)

        # Recent Mistakes Section
        if user_context.get("recent_mistakes"):
            mistakes = user_context["recent_mistakes"]
            if mistakes:
                mistake_text = "\n## RECENT MISTAKES DETECTED\n"
                for m in mistakes[:5]:
                    mistake_text += f"- **{m.get('type', 'Unknown')}** ({m.get('severity', 'info')}): {m.get('description', '')}\n"
                sections.append(mistake_text)

        # Recent Trades Section
        if user_context.get("trades"):
            trades = user_context["trades"]
            if trades:
                trades_text = "\n## RECENT TRADES (Last 20)\n"
                for t in trades[:20]:
                    outcome = "WIN" if t.get('pnl_usd', 0) > 0 else "LOSS"
                    trades_text += f"- {t.get('date', 'N/A')[:10]} | {t.get('symbol', 'N/A')} | {t.get('side', 'N/A')} | Entry: ${t.get('entry', 0):,.2f} → Exit: ${t.get('exit', 0):,.2f} | PnL: ${t.get('pnl_usd', 0):,.2f} ({outcome})"
                    if t.get('notes'):
                        trades_text += f" | Notes: \"{t.get('notes')[:50]}...\""
                    trades_text += "\n"
                sections.append(trades_text)

        return "\n".join(sections)

    async def get_coach_response(
        self,
        system_prompt: Optional[str],
        messages: List[Dict],
        user_context: Optional[Dict] = None,
        max_retries: int = 3,
        use_deep_model: bool = False,
    ) -> Tuple[str, int, int]:
        """
        Get response from Claude API.

        Args:
            system_prompt: Custom system prompt (if None, uses default trading coach prompt)
            messages: Message history in format [{"role": "user"/"assistant", "content": "..."}]
            user_context: Dict with user's trading data for context
            max_retries: Number of retries on rate limit
            use_deep_model: Whether to use deeper model for complex analysis

        Returns:
            Tuple of (response_text, input_tokens_used, output_tokens_used)

        Raises:
            RuntimeError: If API call fails after retries
        """
        if not client:
            raise RuntimeError("Anthropic API key not configured.")

        # Build the full system prompt with user context
        base_prompt = system_prompt or TRADING_COACH_SYSTEM_PROMPT
        if user_context:
            context_str = self._build_user_context(user_context)
            full_system_prompt = f"{base_prompt}\n\n---\n\n# TRADER DATA\n{context_str}"
        else:
            full_system_prompt = base_prompt

        model = self.MODEL_DEEP if use_deep_model else self.MODEL

        retries = 0
        while retries < max_retries:
            try:
                response = await self.client.messages.create(
                    model=model,
                    max_tokens=self.MAX_TOKENS,
                    system=full_system_prompt,
                    messages=messages,
                )

                # Extract response
                response_text = response.content[0].text
                input_tokens = response.usage.input_tokens
                output_tokens = response.usage.output_tokens

                logger.info(
                    f"Claude coach response generated: {input_tokens} input tokens, {output_tokens} output tokens"
                )

                return response_text, input_tokens, output_tokens

            except RateLimitError as e:
                retries += 1
                if retries >= max_retries:
                    logger.error(f"Rate limit exceeded after {max_retries} retries: {e}")
                    raise RuntimeError("Claude API rate limit exceeded. Please try again in a moment.")
                wait_time = min(2 ** retries, 30)
                logger.warning(f"Rate limit hit. Retrying in {wait_time}s (attempt {retries}/{max_retries})")
                await asyncio.sleep(wait_time)

            except APIError as e:
                logger.error(f"Claude API error: {e}")
                error_str = str(e).lower()
                if "context" in error_str or "token" in error_str:
                    raise RuntimeError("Conversation too long. Please start a new chat.")
                raise RuntimeError(f"Claude API error: {str(e)[:100]}")

            except Exception as e:
                logger.error(f"Unexpected error calling Claude API: {e}")
                raise RuntimeError(f"Failed to get coach response: {str(e)[:100]}")

        raise RuntimeError("Failed to get response after maximum retries")

    async def get_streaming_response(
        self,
        system_prompt: Optional[str],
        messages: List[Dict],
        user_context: Optional[Dict] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Get streaming response from Claude API.
        Yields text chunks as they arrive.
        """
        if not client:
            raise RuntimeError("Anthropic API key not configured.")

        base_prompt = system_prompt or TRADING_COACH_SYSTEM_PROMPT
        if user_context:
            context_str = self._build_user_context(user_context)
            full_system_prompt = f"{base_prompt}\n\n---\n\n# TRADER DATA\n{context_str}"
        else:
            full_system_prompt = base_prompt

        try:
            async with self.client.messages.stream(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=full_system_prompt,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            raise RuntimeError(f"Streaming failed: {str(e)[:100]}")

    async def analyze_trade(
        self,
        trade: Dict,
        user_context: Optional[Dict] = None,
    ) -> Tuple[str, int, int]:
        """
        Get detailed analysis of a single trade.

        Args:
            trade: Trade data dict with symbol, side, entry, exit, pnl_usd, etc.
            user_context: User's trading context for personalization

        Returns:
            Tuple of (analysis_text, input_tokens, output_tokens)
        """
        analysis_prompt = f"""Analyze this trade in detail:

**Trade Details:**
- Symbol: {trade.get('symbol', 'Unknown')}
- Side: {trade.get('side', 'Unknown')}
- Entry Price: ${trade.get('entry', 0):,.2f}
- Exit Price: ${trade.get('exit', 0):,.2f}
- Size: {trade.get('size', 0)}
- Leverage: {trade.get('leverage', 1)}x
- PnL: ${trade.get('pnl_usd', 0):,.2f} ({trade.get('pnl_pct', 0):.2f}%)
- Date: {trade.get('date', 'Unknown')}
- Notes: {trade.get('notes', 'None provided')}

Provide:
1. **Entry Analysis**: Was this a good entry? What was the likely reasoning?
2. **Exit Analysis**: Was the exit optimal, premature, or late?
3. **Risk Assessment**: Was the position size and leverage appropriate?
4. **Pattern Match**: Does this match any known setup or pattern?
5. **Key Lesson**: What's the main takeaway from this trade?
6. **Improvement Suggestion**: One specific thing to do differently next time."""

        messages = [{"role": "user", "content": analysis_prompt}]
        return await self.get_coach_response(None, messages, user_context, use_deep_model=True)

    async def generate_daily_summary(
        self,
        trades: List[Dict],
        user_context: Optional[Dict] = None,
    ) -> Tuple[str, int, int]:
        """
        Generate a daily trading summary.

        Args:
            trades: List of trades from today
            user_context: User's trading context

        Returns:
            Tuple of (summary_text, input_tokens, output_tokens)
        """
        if not trades:
            return "No trades were executed today. Rest is important for a trader's longevity.", 0, 0

        total_pnl = sum(t.get('pnl_usd', 0) for t in trades)
        wins = sum(1 for t in trades if t.get('pnl_usd', 0) > 0)
        losses = len(trades) - wins

        trades_summary = "\n".join([
            f"- {t.get('symbol', 'N/A')} {t.get('side', 'N/A')}: ${t.get('pnl_usd', 0):,.2f}"
            for t in trades
        ])

        summary_prompt = f"""Generate a daily trading summary for today's session:

**Today's Results:**
- Total Trades: {len(trades)}
- Wins: {wins} | Losses: {losses}
- Total PnL: ${total_pnl:,.2f}

**Trades:**
{trades_summary}

Provide:
1. **Session Overview**: Quick summary of today's performance
2. **What Went Well**: Positive aspects to reinforce
3. **Areas for Improvement**: Specific mistakes or missed opportunities
4. **Emotional Check**: Signs of tilt, revenge trading, or discipline
5. **Tomorrow's Focus**: One specific thing to work on tomorrow

Keep it concise but insightful (3-4 paragraphs max)."""

        messages = [{"role": "user", "content": summary_prompt}]
        return await self.get_coach_response(None, messages, user_context)

    async def generate_weekly_report(
        self,
        trades: List[Dict],
        user_context: Optional[Dict] = None,
    ) -> Tuple[str, int, int]:
        """
        Generate a comprehensive weekly trading report.
        """
        if not trades:
            return "No trades this week. Consider if you're waiting for the right setups or avoiding the market.", 0, 0

        total_pnl = sum(t.get('pnl_usd', 0) for t in trades)
        wins = sum(1 for t in trades if t.get('pnl_usd', 0) > 0)
        win_rate = (wins / len(trades) * 100) if trades else 0

        # Group by symbol
        by_symbol = {}
        for t in trades:
            sym = t.get('symbol', 'Unknown')
            if sym not in by_symbol:
                by_symbol[sym] = []
            by_symbol[sym].append(t)

        symbol_summary = "\n".join([
            f"- {sym}: {len(trades)} trades, ${sum(t.get('pnl_usd', 0) for t in trades):,.2f} PnL"
            for sym, trades in sorted(by_symbol.items(), key=lambda x: sum(t.get('pnl_usd', 0) for t in x[1]), reverse=True)
        ])

        report_prompt = f"""Generate a comprehensive weekly trading report:

**Week Summary:**
- Total Trades: {len(trades)}
- Win Rate: {win_rate:.1f}%
- Total PnL: ${total_pnl:,.2f}
- Average Trade: ${total_pnl/len(trades):,.2f}

**Performance by Symbol:**
{symbol_summary}

Based on the trader's data and this week's performance, provide:

1. **Executive Summary**: Overall assessment of the week
2. **Wins Analysis**: What worked well this week
3. **Losses Analysis**: Common themes in losing trades
4. **Pattern Observations**: Recurring behaviors or setups
5. **Progress Check**: Improvement on previous weaknesses
6. **Goals for Next Week**: 2-3 specific, measurable goals

Be specific and reference actual trades where relevant."""

        messages = [{"role": "user", "content": report_prompt}]
        return await self.get_coach_response(None, messages, user_context, use_deep_model=True)

    @staticmethod
    def calculate_cost(input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for token usage."""
        input_cost = (input_tokens / 1_000_000) * ClaudeService.COST_PER_1M_INPUT
        output_cost = (output_tokens / 1_000_000) * ClaudeService.COST_PER_1M_OUTPUT
        return input_cost + output_cost

    @staticmethod
    def format_message_for_api(role: str, content: str) -> Dict:
        """Format a message for Claude API."""
        return {"role": role, "content": content}


async def test_claude_service():
    """Test Claude service connectivity."""
    try:
        service = ClaudeService()
        messages = [{"role": "user", "content": "Hello! Are you working? Reply briefly."}]

        response, input_tokens, output_tokens = await service.get_coach_response(None, messages)
        print(f"✓ Claude Service working!")
        print(f"  Response: {response[:100]}...")
        print(f"  Tokens: {input_tokens} input, {output_tokens} output")
        print(f"  Cost: ${service.calculate_cost(input_tokens, output_tokens):.6f}")
    except RuntimeError as e:
        print(f"✗ Claude Service error: {e}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_claude_service())
