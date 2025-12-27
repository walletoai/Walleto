import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useResponsive } from '../hooks/useResponsive';

export default function DocsPage() {
    const { isMobile, isTablet } = useResponsive();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const [selectedCategory, setSelectedCategory] = useState('getting-started');
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileNav, setShowMobileNav] = useState(false);

    // Handle URL params for category and section navigation
    useEffect(() => {
        const categoryParam = searchParams.get('category');
        if (categoryParam) {
            setSelectedCategory(categoryParam);
        }

        // Handle hash scroll after category change
        const hash = location.hash.replace('#', '');
        if (hash) {
            // Small delay to ensure the category content has rendered
            setTimeout(() => {
                const element = document.getElementById(hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }, [searchParams, location.hash]);

    const docs = {
        'getting-started': {
            title: 'Getting Started',
            icon: '🚀',
            sections: [
                {
                    id: 'intro',
                    title: 'Welcome to Walleto',
                    visual: '📊',
                    content: `Walleto is a professional crypto trading journal and PnL tracker designed for serious traders. Whether you're trading on Binance, Bybit, Blofin, or Hyperliquid, Walleto helps you systematically track, analyze, and improve your trading performance.

Our mission is simple: transform raw trading data into actionable insights through sophisticated analytics, visualization, and automation.`
                },
                {
                    id: 'setup',
                    title: 'Initial Setup (5 Minutes)',
                    visual: '⚙️',
                    content: `Getting started with Walleto takes just 5 minutes:

1. Create an Account - Sign up with your email
2. Connect Your Exchange - Navigate to Settings and connect your first exchange
3. Authenticate - Enter your exchange API credentials (read-only)
4. Sync Trades - Our system automatically pulls your trading history
5. Start Analyzing - Explore your dashboard and analytics

Your API keys are encrypted end-to-end and never stored in plain text.`
                },
                {
                    id: 'three-ways',
                    title: 'Three Ways to Add Trades',
                    visual: '📝',
                    content: `Method 1: Automatic Sync (Recommended)
- Connect your exchange in Settings
- Trades sync automatically every hour
- Your complete history is imported instantly
- Zero manual data entry

Method 2: Manual Entry
- Click "Add Trade" on the dashboard
- Fill in trade details: symbol, entry/exit, size, leverage
- Assign a setup/strategy
- Save and analyze

Method 3: CSV Import
- Use our CSV template
- Bulk import multiple trades
- Perfect for historical data migration
- See CSV Import section for detailed requirements`
                }
            ]
        },
        'dashboard': {
            title: 'Dashboard Guide',
            icon: '📱',
            sections: [
                {
                    id: 'dashboard-overview',
                    title: 'Dashboard Overview',
                    visual: '📊',
                    content: `The Dashboard is your trading command center. It displays real-time statistics, visual heat maps, and quick-access tools for managing your trades.

Key components:
- Statistics Panel: Net PnL, Win Rate, Total Trades
- Monthly Calendar: Visual PnL heat map by day
- Weekly Heatmap: Profitability patterns by day and time
- PnL Curve: Equity growth visualization
- Quick Actions: Add trades, create events, view details`
                },
                {
                    id: 'stats-explained',
                    title: 'Understanding Your Statistics',
                    visual: '📈',
                    content: `Net PnL: Your total profit/loss in USD
- Toggle time windows: 1W, 1M, YTD, ALL
- Includes all fees and slippage
- Real-time updates as trades sync

Win Rate: Percentage of winning trades
- 50% = break-even trades
- 60%+ = profitable strategy
- Visual circular progress bar

Total Trades: Complete trade count
- Includes wins, losses, and breakevens
- Updated as trades sync in

Best/Worst Symbols: Top performing pairs
- Identifies your strongest trading pairs
- Highlights where to focus effort`
                },
                {
                    id: 'calendar-heatmap',
                    title: 'Monthly Calendar Heatmap',
                    visual: '🗓️',
                    content: `Color Coding:
- Green = Profitable days
- Red = Losing days
- Gray = No trades
- Intensity = Magnitude of P&L

Interactive Features:
- Click any day to see detailed trades
- Filter by symbol, setup, or side (LONG/SHORT)
- View all trades for that specific day
- Analyze daily patterns

Why It Matters:
- Identify your most profitable days
- Spot trading patterns
- Understand which setups work best
- Track consistency and win rate`
                }
            ]
        },
        'analytics': {
            title: 'Advanced Analytics',
            icon: '📈',
            sections: [
                {
                    id: 'analytics-intro',
                    title: 'Analytics Engine Overview',
                    visual: '🔍',
                    content: `Walleto includes a professional-grade analytics engine with 30+ customizable widgets. This is where you discover what makes your trading profitable (or unprofitable).

Each widget tells a story about your trading:
- What setups are most profitable?
- Which symbols do you trade best?
- When do you make the most money?
- What's your actual risk/reward ratio?
- How does volatility affect your results?`
                },
                {
                    id: 'key-metrics',
                    title: 'Key Metrics Explained',
                    visual: '📊',
                    content: `Win Rate: Winning trades ÷ Total trades
- Your consistency metric
- 60%+ is excellent for most strategies

Risk/Reward Ratio: Average win ÷ Average loss
- Measures edge
- 1.5+ means you win more than you lose per trade
- Can overcome lower win rates

Max Drawdown: Peak-to-trough decline
- Measures emotional stress
- Smaller = more stable strategy
- Below 25% is professional-grade

Equity Curve: Compounded growth visualization
- Straight up = consistent wins
- Flat regions = choppy markets
- Down moves = periods of losses`
                },
                {
                    id: 'using-filters',
                    title: 'Using Filters for Insights',
                    visual: '🎯',
                    content: `Time Window:
- ALL: See entire trading history
- Custom: Select specific date range
- Compare different time periods

Symbol Filter:
- Focus on specific trading pairs
- Compare BTC vs alts performance
- Identify your best markets

Setup Filter:
- Analyze individual strategies
- Compare setup profitability
- Optimize your best performers

Application:
- Apply multiple filters together
- See real-time metric updates
- Export filtered data for research`
                }
            ]
        },
        'widget-reference': {
            title: 'Widget Reference',
            icon: '📊',
            sections: [
                {
                    id: 'widgets-intro',
                    title: 'Analytics Widgets Overview',
                    visual: '📊',
                    content: `Walleto provides 36 specialized analytics widgets organized into 7 categories. Each widget is designed to answer specific questions about your trading performance and help you identify areas for improvement.

Widget Categories:
• Performance Overview - Track your overall trading results
• Asset & Symbol Analysis - Understand which assets you trade best
• Time Analysis - Discover your optimal trading times
• Pattern Recognition - Identify behavioral patterns
• Risk Management - Optimize your risk-taking
• Trade Execution - Improve entry and exit quality
• Market Conditions - Adapt to different market environments

Each widget below includes:
✓ What it measures
✓ How it's calculated
✓ How to use it to improve your trading
✓ Key action items`
                },
                {
                    id: 'equity-curve',
                    title: 'Equity Curve',
                    visual: '📈',
                    content: `WHAT IT MEASURES:
Your cumulative account growth over time, showing how your trading capital has grown or declined.

HOW IT'S CALCULATED:
Starting from $0, each trade's PnL is added chronologically to show cumulative returns. The chart displays your running total profit/loss over your entire trading history.

Formula: Cumulative PnL = Sum of all PnL up to that point

HOW TO USE IT:
• Upward slope = consistent profitability
• Flat periods = breakeven or choppy trading
• Downward slopes = losing streaks
• Steeper slope = faster growth rate

Look for:
- Consistency: A smooth upward curve is better than jagged spikes
- Recovery: How quickly do you recover from drawdowns?
- Acceleration: Is your growth rate increasing over time?

ACTION ITEMS:
✓ If curve is declining, stop trading and review your strategy
✓ If curve is flat, you may be overtrading or lacking edge
✓ Compare different time periods to identify what changed
✓ Use this as your "north star" metric for overall performance`
                },
                {
                    id: 'drawdown-widget',
                    title: 'Drawdown Analysis',
                    visual: '📉',
                    content: `WHAT IT MEASURES:
The peak-to-trough decline in your account, showing your largest losing periods and how long they lasted.

HOW IT'S CALCULATED:
Drawdown % = (Peak Value - Current Value) / Peak Value × 100

The widget tracks your highest equity point and measures how far below that peak you've fallen at any given time.

HOW TO USE IT:
• Max Drawdown: Your worst-case scenario - important for position sizing
• Current Drawdown: How much you're down from your peak right now
• Drawdown Duration: How long drawdowns typically last

Key Insights:
- Professional traders keep max drawdown below 25%
- Longer drawdowns can indicate strategy breakdown
- Frequent small drawdowns may be better than rare large ones

ACTION ITEMS:
✓ Set a max drawdown limit (e.g., 20%) and stop trading if exceeded
✓ If in a drawdown, reduce position size by 50%
✓ Review trades during drawdown periods - what went wrong?
✓ Use drawdown data to set realistic stop-loss levels`
                },
                {
                    id: 'performance-summary',
                    title: 'Performance Summary',
                    visual: '📊',
                    content: `WHAT IT MEASURES:
A comprehensive snapshot of your key trading statistics including total PnL, win rate, profit factor, and average trade metrics.

HOW IT'S CALCULATED:
• Total PnL: Sum of all trade profits and losses
• Win Rate: (Winning Trades / Total Trades) × 100
• Profit Factor: Gross Profits / Gross Losses
• Avg Win: Total Winning PnL / Number of Wins
• Avg Loss: Total Losing PnL / Number of Losses
• Expectancy: (Win Rate × Avg Win) - (Loss Rate × Avg Loss)

HOW TO USE IT:
This is your trading "report card." Focus on:
- Win Rate: 50%+ means you win more often than lose
- Profit Factor: Above 1.5 indicates strong edge
- Expectancy: Positive = you make money over time

The relationship between metrics matters:
- Low win rate + high avg win = momentum/trend strategy
- High win rate + low avg win = scalping strategy
- Both high = exceptional strategy

ACTION ITEMS:
✓ Calculate your expectancy - if negative, your strategy needs work
✓ Compare profit factor across different setups
✓ If win rate is below 40%, focus on trade selection
✓ If avg loss > avg win, tighten your stop-losses`
                },
                {
                    id: 'trade-outcome',
                    title: 'Trade Outcome Distribution',
                    visual: '📊',
                    content: `WHAT IT MEASURES:
The distribution of your trade results, showing how your PnL is spread across different outcome ranges.

HOW IT'S CALCULATED:
Trades are grouped into PnL buckets (e.g., -$500 to -$250, -$250 to $0, $0 to $250, etc.) and counted. This creates a histogram showing where most of your trades end up.

HOW TO USE IT:
• Bell curve centered right of $0 = healthy distribution
• Long left tail = occasional large losses hurting you
• Long right tail = occasional big winners helping you
• Narrow distribution = consistent but small gains/losses

Look for:
- Where is your "peak"? Ideally slightly positive
- Are there outliers? Big losses you could have avoided?
- How symmetric is your distribution?

ACTION ITEMS:
✓ Identify and eliminate the large loss outliers
✓ If distribution is too narrow, you may be taking profits too early
✓ Aim to shift the entire distribution rightward over time
✓ Review trades in the worst bucket - what patterns exist?`
                },
                {
                    id: 'win-rate-timeline',
                    title: 'Win Rate Timeline',
                    visual: '📈',
                    content: `WHAT IT MEASURES:
How your win rate has changed over time, showing whether you're improving or declining as a trader.

HOW IT'S CALCULATED:
Win rate is calculated for each time period (daily, weekly, or monthly) as:
Win Rate = (Winning Trades in Period / Total Trades in Period) × 100

A rolling average smooths out short-term noise.

HOW TO USE IT:
• Upward trend = improving trade selection
• Downward trend = strategy may be degrading
• High volatility = inconsistent execution

Compare win rate changes to:
- Market conditions (trending vs ranging)
- Your emotional state (tilt periods)
- Strategy changes you've made

ACTION ITEMS:
✓ If win rate is declining, review what changed in your process
✓ Mark when you made strategy changes and see the impact
✓ Identify your "hot" and "cold" periods - what's different?
✓ Set a minimum win rate threshold for your strategy`
                },
                {
                    id: 'daily-pnl',
                    title: 'Daily PnL',
                    visual: '📅',
                    content: `WHAT IT MEASURES:
Your profit and loss for each trading day, showing daily performance patterns and consistency.

HOW IT'S CALCULATED:
All trades closed on each calendar day are summed to get the daily PnL. Days with no trades show as $0.

HOW TO USE IT:
• Green bars = profitable days
• Red bars = losing days
• Bar height = magnitude of gain/loss

Look for:
- Consistency: More green than red?
- Magnitude: Are your green days bigger than red days?
- Patterns: Certain days of week better?
- Streaks: How often do you have multiple red days?

ACTION ITEMS:
✓ If a day starts with 2 losses, consider stopping for the day
✓ Set a daily loss limit (e.g., -$500) and stop if hit
✓ Review your worst days - were they preventable?
✓ Track your best days - what did you do differently?`
                },
                {
                    id: 'monthly-heatstick',
                    title: 'Monthly Heatstick',
                    visual: '🗓️',
                    content: `WHAT IT MEASURES:
A calendar-style visualization showing your PnL for each day of the month, with color intensity indicating magnitude.

HOW IT'S CALCULATED:
Each day's total PnL is calculated and displayed as a colored cell:
• Green intensity = profitable day (darker = more profit)
• Red intensity = losing day (darker = more loss)
• Gray = no trading activity

HOW TO USE IT:
• Spot patterns at a glance
• Identify your best and worst days
• See monthly trends and seasonality
• Track consistency week-over-week

This is your trading "scorecard" - aim for more green than red, and aim for the red days to be lighter (smaller losses) than the green days are dark (larger wins).

ACTION ITEMS:
✓ Print this monthly and review patterns
✓ If you see clusters of red, investigate what happened
✓ Compare month-over-month to track improvement
✓ Use this to identify if certain market conditions hurt you`
                },
                {
                    id: 'asset-pnl-breakdown',
                    title: 'Asset PnL Breakdown',
                    visual: '💰',
                    content: `WHAT IT MEASURES:
Your total profit and loss broken down by each asset/cryptocurrency you trade.

HOW IT'S CALCULATED:
All trades for each symbol are grouped and summed:
• Total PnL per symbol
• Trade count per symbol
• Win rate per symbol
• Average PnL per trade per symbol

HOW TO USE IT:
This answers: "Which assets am I most profitable trading?"

• Focus on your top performers
• Reduce or eliminate losing symbols
• Consider if certain assets match your strategy better

Key insights:
- High volume + low profit = you may be overtrading that asset
- Low volume + high profit = hidden gem, trade more
- Consistent losses = stop trading that asset

ACTION ITEMS:
✓ Rank your symbols by profitability
✓ Stop trading your bottom 3 performers for 1 month
✓ Increase size on your top 3 performers
✓ Ask: Does my strategy match this asset's behavior?`
                },
                {
                    id: 'symbol-breakdown',
                    title: 'Symbol Breakdown',
                    visual: '📊',
                    content: `WHAT IT MEASURES:
Detailed performance metrics for each trading symbol including win rate, average win/loss, and total trades.

HOW IT'S CALCULATED:
For each symbol:
• Win Rate = Winning Trades / Total Trades × 100
• Avg Win = Sum of Winning PnL / Count of Wins
• Avg Loss = Sum of Losing PnL / Count of Losses
• Profit Factor = Gross Wins / Gross Losses

HOW TO USE IT:
Compare metrics across symbols to find:
- Which symbols you have the best edge on
- Which symbols have the best risk/reward
- Whether you should specialize or diversify

A high win rate with low profit factor means small wins, big losses - dangerous pattern.

ACTION ITEMS:
✓ Create a "focus list" of your top 5 symbols
✓ For symbols with low win rate + low profit factor, stop trading
✓ Look for symbols with profit factor > 2.0 - double down
✓ Track if your edge changes over time for each symbol`
                },
                {
                    id: 'setup-breakdown',
                    title: 'Setup Breakdown',
                    visual: '🎯',
                    content: `WHAT IT MEASURES:
Performance metrics grouped by your trading setups/strategies (e.g., "Breakout", "Mean Reversion", "News Play").

HOW IT'S CALCULATED:
Trades tagged with the same setup are grouped:
• Total PnL per setup
• Win rate per setup
• Trade count per setup
• Average R-multiple per setup

HOW TO USE IT:
This is crucial for strategy optimization:
- Which setups actually make money?
- Which setups do you THINK work but don't?
- Should you specialize in fewer setups?

Be honest about tagging trades correctly - this data is only as good as your labels.

ACTION ITEMS:
✓ Tag ALL trades with a setup name consistently
✓ Eliminate setups with negative expectancy
✓ Focus 80% of trades on your top 2-3 setups
✓ Review: Are you forcing trades into "good" setup labels?`
                },
                {
                    id: 'long-short-performance',
                    title: 'Long vs Short Performance',
                    visual: '↕️',
                    content: `WHAT IT MEASURES:
Compares your performance on long (buy) positions versus short (sell) positions.

HOW IT'S CALCULATED:
Trades are split by side:
• Long: Total PnL, win rate, avg win/loss for BUY positions
• Short: Total PnL, win rate, avg win/loss for SELL positions

HOW TO USE IT:
Most traders have a directional bias - this widget reveals yours:
- Better at longs = you may prefer trend-following
- Better at shorts = you may prefer mean-reversion
- Balanced = you're adaptable to market conditions

Consider:
- Market regime: Trending markets favor longs in bull markets
- Psychology: Shorting feels different than longing
- Strategy fit: Does your setup work both directions?

ACTION ITEMS:
✓ If one side is significantly worse, reduce size on that side
✓ Practice paper trading your weak side
✓ Consider only trading your strong side in choppy markets
✓ Track if your bias changes with market conditions`
                },
                {
                    id: 'time-of-day',
                    title: 'Time of Day Profitability',
                    visual: '🕐',
                    content: `WHAT IT MEASURES:
Your trading performance broken down by hour of the day, showing when you trade best.

HOW IT'S CALCULATED:
Trades are grouped by the hour they were opened:
• Total PnL per hour
• Trade count per hour
• Win rate per hour
• Average PnL per trade per hour

HOW TO USE IT:
This reveals your optimal trading windows:
- When are you most profitable?
- When do you lose the most?
- Are you trading at the right times?

Consider:
- Market sessions: Asia, Europe, US open/close
- Volatility: Higher volatility hours vs quiet hours
- Your alertness: When are you sharpest mentally?

ACTION ITEMS:
✓ Identify your top 3 profitable hours
✓ Stop trading during your worst 2-3 hours
✓ Align your schedule to be present during best hours
✓ Consider why certain hours work - volatility? Volume?`
                },
                {
                    id: 'day-of-week',
                    title: 'Day of Week Profitability',
                    visual: '📅',
                    content: `WHAT IT MEASURES:
Your trading performance for each day of the week (Monday through Sunday).

HOW IT'S CALCULATED:
Trades are grouped by the day of week they were opened:
• Total PnL per day
• Trade count per day
• Win rate per day
• Average PnL per trade per day

HOW TO USE IT:
Discover your best and worst trading days:
- Monday blues? Market gaps can cause whipsaws
- Friday profits? Position squaring before weekend
- Weekend warrior? Crypto trades 24/7

Patterns to look for:
- Consistent losers on certain days = avoid them
- Best days = increase size or trade more
- Volume differences by day

ACTION ITEMS:
✓ Take your worst day of the week OFF
✓ If Fridays are bad, close positions by Thursday
✓ If Mondays are bad, wait until afternoon to trade
✓ Track if weekend crypto trades differ from weekday`
                },
                {
                    id: 'trade-frequency',
                    title: 'Trade Frequency vs PnL',
                    visual: '📊',
                    content: `WHAT IT MEASURES:
The relationship between how often you trade and your profitability - are you overtrading?

HOW IT'S CALCULATED:
Days are grouped by trade count (0-2 trades, 3-5 trades, 6-10 trades, 10+ trades):
• Average daily PnL for each frequency bucket
• Total days in each bucket
• Win rate per frequency level

HOW TO USE IT:
This answers: "Am I overtrading?"

Common patterns:
- More trades = less profit = overtrading problem
- Few trades = high profit = you have discipline
- Optimal zone = your sweet spot for trade count

Psychology insight: After losses, traders often overtrade to "make it back" - this usually makes things worse.

ACTION ITEMS:
✓ Find your optimal trades-per-day number
✓ Set a hard limit: "I will not exceed X trades today"
✓ If you're overtrading, take a break after each trade
✓ Quality over quantity - be selective`
                },
                {
                    id: 'holding-time',
                    title: 'Holding Time vs Profit',
                    visual: '⏱️',
                    content: `WHAT IT MEASURES:
How trade duration (how long you hold positions) affects your profitability.

HOW IT'S CALCULATED:
Holding time = Exit Time - Entry Time
Trades are grouped by duration:
• < 5 minutes (scalps)
• 5-30 minutes (day trades)
• 30 min - 4 hours (intraday)
• 4-24 hours (swing)
• > 24 hours (position)

For each bucket: Average PnL, win rate, trade count

HOW TO USE IT:
This reveals your optimal timeframe:
- Quick scalps profitable? You read short-term flow well
- Longer holds profitable? You identify bigger moves
- Mismatch? You may be cutting winners or holding losers

Common issues:
- Cutting winners too early (exits below avg hold time)
- Holding losers too long (losses have longer hold time)

ACTION ITEMS:
✓ Identify your most profitable holding time range
✓ Set time-based exits: "If not in profit by X hours, exit"
✓ Compare hold time of wins vs losses - are you patient with winners?
✓ Match your strategy to your optimal timeframe`
                },
                {
                    id: 'consecutive-wins-losses',
                    title: 'Consecutive Wins/Losses',
                    visual: '🔥',
                    content: `WHAT IT MEASURES:
Your winning and losing streaks - how many wins/losses in a row you typically experience.

HOW IT'S CALCULATED:
Streaks are counted sequentially:
• Max consecutive wins
• Max consecutive losses
• Average winning streak length
• Average losing streak length
• Distribution of streak lengths

HOW TO USE IT:
Understand your streak patterns for mental preparation:
- Long losing streaks = need mental resilience
- Short streaks = more random/choppy results
- Awareness helps avoid tilt after losses

Psychology application:
- After 3 losses in a row, reduce size by 50%
- During a winning streak, don't increase size (mean reversion)
- Know your "max pain" point and plan for it

ACTION ITEMS:
✓ Set a rule: "After X consecutive losses, stop for the day"
✓ Don't increase size during winning streaks
✓ Journal your mental state during losing streaks
✓ Use streaks to validate if your edge is intact`
                },
                {
                    id: 'regime-detection',
                    title: 'Regime Detection',
                    visual: '🔄',
                    content: `WHAT IT MEASURES:
Your performance across different market regimes (trending up, trending down, ranging/choppy).

HOW IT'S CALCULATED:
Market regime is estimated based on your trade data:
• Price direction over holding period
• Volatility levels
• Win rate and PnL per regime

Regimes:
• Bull Trend: Consistent higher highs
• Bear Trend: Consistent lower lows
• Ranging: Sideways, choppy action

HOW TO USE IT:
This is crucial for strategy adaptation:
- "I make money in trends but lose in chop"
- "I'm a contrarian, I profit in ranges"
- Knowing this helps you sit out bad regimes

When you see your weak regime developing:
- Reduce position size
- Switch to a different strategy
- Or simply don't trade

ACTION ITEMS:
✓ Identify your best and worst market regime
✓ Learn to recognize regime changes early
✓ Have a "ranging market" playbook
✓ Consider not trading in your worst regime`
                },
                {
                    id: 'confluence-score',
                    title: 'Confluence Score',
                    visual: '🎯',
                    content: `WHAT IT MEASURES:
Analyzes your trades to identify which combination of factors leads to the most profitable outcomes.

HOW IT'S CALCULATED:
Each trade is scored based on multiple factors:
• Time of day (optimal vs suboptimal)
• Day of week (your best vs worst days)
• Symbol performance (your top symbols vs others)
• Position size (optimal sizing vs over/under)

Confluence Score = Weighted combination of favorable factors
Higher score = More factors aligned in your favor

HOW TO USE IT:
This is your "perfect trade" detector:
- High confluence trades have better outcomes
- Low confluence = you're fighting against your own data
- Wait for high confluence setups

Example: If your data shows you're best at:
- BTC trades (symbol)
- On Tuesdays (day)
- At 2pm (time)
- With 5% position size (size)

A trade with all 4 = high confluence. Take it with confidence.

ACTION ITEMS:
✓ Only take trades with confluence score > 70%
✓ Use this to filter setups before entry
✓ Track if high confluence trades outperform
✓ Increase position size on highest confluence trades`
                },
                {
                    id: 'risk-metrics-summary',
                    title: 'Risk Metrics Summary',
                    visual: '⚠️',
                    content: `WHAT IT MEASURES:
A comprehensive overview of your risk management including average risk per trade, position sizing, and loss statistics.

HOW IT'S CALCULATED:
• Avg Risk/Trade: Average loss amount on losing trades
• Avg Position Size: Average margin used per trade = (Entry × Quantity) / Leverage
• Max Single Loss: Your largest losing trade
• Loss Rate: Percentage of trades that are losses
• Risk of Ruin: Statistical probability of blowing your account

HOW TO USE IT:
This is your risk "dashboard":
- Is your avg risk/trade appropriate for your account size?
- Is your max single loss within acceptable limits?
- Are you sizing positions consistently?

Rule of thumb:
- Risk no more than 1-2% per trade
- Max single loss should be < 5% of account
- Position sizes should be consistent (low variance)

ACTION ITEMS:
✓ Calculate if your avg risk is < 2% of account
✓ Review your max loss - was it avoidable?
✓ If position sizes vary wildly, standardize them
✓ Set hard stop-loss on every trade`
                },
                {
                    id: 'risk-reward-scatter',
                    title: 'Position Size vs PnL (Risk/Reward Scatter)',
                    visual: '📊',
                    content: `WHAT IT MEASURES:
A scatter plot showing the relationship between your position sizes and the resulting profits/losses.

HOW IT'S CALCULATED:
Each dot represents one trade:
• X-axis: Position Size (margin in USD) = (Entry × Quantity) / Leverage
• Y-axis: PnL in USD
• Color: Green = winner, Red = loser

HOW TO USE IT:
This reveals critical patterns:
- Do bigger positions make more or lose more?
- Are your losses concentrated at large sizes?
- Is there an "optimal" position size for you?

Ideal pattern:
- Wins and losses evenly distributed across sizes
- Bigger positions don't mean bigger losses
- Consistent sizing with consistent results

Warning signs:
- Big positions → Big losses (sizing up before losses)
- Small positions → Small wins (sizing down before wins)
- This suggests emotional/tilt-based sizing

ACTION ITEMS:
✓ Check if your biggest losses came from biggest positions
✓ Standardize position sizes to reduce variance
✓ Don't increase size after wins (overconfidence trap)
✓ Use this to find your optimal position size range`
                },
                {
                    id: 'position-size-accuracy',
                    title: 'Position Size Accuracy',
                    visual: '📏',
                    content: `WHAT IT MEASURES:
How your performance varies across different position size ranges (based on your actual sizing patterns).

HOW IT'S CALCULATED:
Your position sizes are divided into percentile-based buckets:
• Small (0-20th percentile of your sizes)
• Medium-Small (20-40th percentile)
• Medium (40-60th percentile)
• Medium-Large (60-80th percentile)
• Large (80-100th percentile)

For each bucket: Win rate, average PnL, trade count

HOW TO USE IT:
Find your optimal sizing zone:
- Which size bucket has the best win rate?
- Which has the best average PnL?
- Are you most profitable with small or large positions?

This widget uses YOUR actual sizing data, so buckets are personalized to your trading style.

ACTION ITEMS:
✓ Identify your most profitable size bucket
✓ Adjust sizing to stay in your optimal range
✓ If large sizes lose more, cap your max position
✓ Test if increasing size in your best bucket improves results`
                },
                {
                    id: 'exposure-heatmap',
                    title: 'Exposure Heatmap',
                    visual: '🗺️',
                    content: `WHAT IT MEASURES:
A heatmap showing your portfolio exposure across different symbols and time periods.

HOW IT'S CALCULATED:
For each time period and symbol:
• Exposure = Total position value (margin) held
• Color intensity = Higher exposure
• Grid: Time periods × Symbols

HOW TO USE IT:
Visualize concentration risk:
- Are you overexposed to one asset?
- Do you increase exposure after wins/losses?
- How does your exposure change over time?

Risk management insight:
- High concentration = high risk if that asset drops
- Diversification isn't just about symbols, but timing
- Track if you "double down" on losers

ACTION ITEMS:
✓ Set max exposure per symbol (e.g., 25% of account)
✓ Diversify across uncorrelated assets
✓ Don't add to losing positions
✓ Review if you have "pet" symbols you overweight`
                },
                {
                    id: 'leverage-impact',
                    title: 'Leverage Impact',
                    visual: '⚡',
                    content: `WHAT IT MEASURES:
How your use of leverage affects your trading performance - are you overleveraging?

HOW IT'S CALCULATED:
Trades are grouped by leverage level:
• Low (1-5x)
• Medium (6-10x)
• High (11-25x)
• Very High (25x+)

For each bucket: Average PnL, win rate, max loss

HOW TO USE IT:
This answers: "Is my leverage helping or hurting?"

Common patterns:
- Higher leverage → Lower win rate (less room for error)
- Higher leverage → Bigger max losses
- Optimal leverage varies by strategy and skill

Leverage amplifies everything - both gains AND losses. If you're not consistently profitable at 1-3x, adding leverage won't help.

ACTION ITEMS:
✓ If high leverage has lower win rate, reduce it
✓ Start new strategies at 1-3x, increase only if profitable
✓ Your leverage should match your stop-loss width
✓ Calculate max leverage: 100 / (Stop Loss % × 2)`
                },
                {
                    id: 'tp-sl-ratio',
                    title: 'Take Profit vs Stop Loss Hit Ratio',
                    visual: '🎯',
                    content: `WHAT IT MEASURES:
How often your trades hit take profit targets versus stop loss targets.

HOW IT'S CALCULATED:
For trades with defined TP/SL:
• TP Hit Rate = Trades hitting TP / Total trades with TP
• SL Hit Rate = Trades hitting SL / Total trades with SL
• Neither = Trades closed manually before TP or SL

HOW TO USE IT:
This reveals your target-setting accuracy:
- TP hit rate > 60% = Your targets are achievable
- SL hit rate > 50% = Your stops may be too tight
- High "neither" % = You're overriding your system

Optimization insights:
- If TP rarely hits, consider tighter targets
- If SL always hits, widen stops or improve entries
- If you often exit manually, trust your levels more

ACTION ITEMS:
✓ Track why you exit before TP/SL - is it emotional?
✓ If TP rarely hits, reduce your profit targets
✓ If SL always hits, either widen stops or improve entries
✓ Test different TP/SL ratios to optimize`
                },
                {
                    id: 'stop-loss-distance',
                    title: 'Stop Loss Distance Analysis',
                    visual: '📏',
                    content: `WHAT IT MEASURES:
Analyzes your stop loss placement - how far your stops are from entry and how this affects outcomes.

HOW IT'S CALCULATED:
For each trade:
• SL Distance % = |Entry - Stop Loss| / Entry × 100
• Grouped by distance ranges (1-2%, 2-3%, 3-5%, 5%+)
• For each range: Hit rate, win rate, avg PnL

HOW TO USE IT:
Find your optimal stop loss distance:
- Tight stops (1-2%): More stopped out, but smaller losses
- Wide stops (5%+): Less stopped out, but bigger losses when hit
- There's usually an optimal zone for your strategy

Consider:
- Volatility of asset (more volatile = wider stops needed)
- Your entry accuracy (better entries = tighter stops possible)
- Risk tolerance (tighter stops = more trades needed)

ACTION ITEMS:
✓ Identify which SL distance has the best win rate
✓ If tight stops always get hit, widen them
✓ Match SL to asset volatility (ATR-based stops)
✓ Backtest different SL distances on winning setups`
                },
                {
                    id: 'trade-quality-index',
                    title: 'Trade Quality Index',
                    visual: '⭐',
                    content: `WHAT IT MEASURES:
A composite score rating the overall quality of each trade based on multiple execution factors.

HOW IT'S CALCULATED:
Quality Score (0-100) considers:
• Entry Timing: Did you enter at a good price?
• Exit Timing: Did you exit optimally?
• Risk/Reward: Was the R:R favorable?
• Position Sizing: Was sizing appropriate?
• Hold Time: Did you hold according to plan?

Each factor is weighted and combined into a single score.

HOW TO USE IT:
This separates PROCESS from OUTCOME:
- High quality + loss = good trade, bad luck
- Low quality + win = bad trade, good luck
- Focus on improving quality, results follow

You can win on bad trades (luck) and lose on good trades (variance). Track quality to see if you're executing well regardless of outcome.

ACTION ITEMS:
✓ Review your highest AND lowest quality trades
✓ Aim for average quality score > 70
✓ A losing trade can still be "high quality"
✓ Don't judge trades solely by P&L`
                },
                {
                    id: 'slippage-analysis',
                    title: 'Slippage Analysis',
                    visual: '📉',
                    content: `WHAT IT MEASURES:
The difference between your intended entry/exit prices and actual execution prices.

HOW IT'S CALCULATED:
Entry Slippage = |Actual Entry - Intended Entry| / Intended Entry × 100
Exit Slippage = |Actual Exit - Intended Exit| / Intended Exit × 100
Total Slippage Cost = Sum of all slippage in USD

HOW TO USE IT:
Slippage is a hidden cost that eats your profits:
- High slippage = poor execution or illiquid markets
- Consistent slippage = factor it into your targets
- Slippage varies by time, volume, and asset

Reduce slippage by:
- Using limit orders instead of market orders
- Trading during high-volume periods
- Avoiding illiquid assets
- Not chasing entries

ACTION ITEMS:
✓ Calculate your total slippage cost per month
✓ If high, switch to limit orders where possible
✓ Factor typical slippage into your TP targets
✓ Avoid trading during low-liquidity hours`
                },
                {
                    id: 'entry-efficiency',
                    title: 'Entry Efficiency',
                    visual: '🎯',
                    content: `WHAT IT MEASURES:
How well-timed your entries are relative to the subsequent price movement.

HOW IT'S CALCULATED:
For each trade:
• Max Favorable Excursion (MFE): Best price reached after entry
• Entry Efficiency = (Entry - Worst Price Before MFE) / (MFE - Worst Price) × 100

Higher efficiency = You entered closer to the optimal point.

HOW TO USE IT:
This shows if you're entering too early or too late:
- High efficiency (>70%): Great timing
- Medium efficiency (40-70%): Room to improve
- Low efficiency (<40%): Entries need work

Common issues:
- FOMO entries = chasing, low efficiency
- Early entries = right idea, wrong timing
- Perfect entries = might be using limit orders well

ACTION ITEMS:
✓ If efficiency is low, wait for better entries
✓ Use limit orders at support/resistance
✓ Don't chase - if you missed it, wait for next setup
✓ Review your best entries - what made them good?`
                },
                {
                    id: 'liquidity-vs-entry',
                    title: 'Liquidity vs Entry Quality',
                    visual: '💧',
                    content: `WHAT IT MEASURES:
How market liquidity at the time of entry affects your trade execution quality.

HOW IT'S CALCULATED:
Liquidity is estimated based on:
• Trade size relative to typical volume
• Time of day (session activity)
• Spread at entry

Correlation between liquidity level and:
• Slippage experienced
• Win rate
• Average PnL

HOW TO USE IT:
Understand when to trade:
- High liquidity = Better fills, less slippage
- Low liquidity = Wider spreads, worse execution
- Match your size to available liquidity

Timing matters:
- Market opens = high liquidity
- Late night/weekends = low liquidity
- News events = liquidity can disappear

ACTION ITEMS:
✓ Avoid large trades during low liquidity periods
✓ Trade during overlapping market sessions
✓ Reduce size if entering illiquid markets
✓ Check spread before entering - wide = illiquid`
                },
                {
                    id: 'reaction-time',
                    title: 'Reaction Time Analysis',
                    visual: '⚡',
                    content: `WHAT IT MEASURES:
How quickly you execute trades after your entry signals, and how this affects performance.

HOW IT'S CALCULATED:
Reaction time is inferred from trade patterns:
• Entry timing relative to key price levels
• Time between trades (rapid-fire vs deliberate)
• Comparison of immediate vs delayed entries

Grouped by reaction speed: Fast, Medium, Slow

HOW TO USE IT:
Find your optimal execution speed:
- Too fast: FOMO, not waiting for confirmation
- Too slow: Missing moves, chasing
- Optimal: Deliberate but decisive

Speed is style-dependent:
- Scalpers need fast reactions
- Swing traders need patience
- Know your timeframe

ACTION ITEMS:
✓ If fast entries lose more, add a confirmation step
✓ If slow entries miss moves, prepare orders in advance
✓ Use alerts to be ready when setups develop
✓ Practice executing your plan without hesitation`
                },
                {
                    id: 'volatility-performance',
                    title: 'Volatility vs Performance',
                    visual: '🌊',
                    content: `WHAT IT MEASURES:
How your trading performance varies with market volatility - do you thrive in calm or chaotic markets?

HOW IT'S CALCULATED:
Volatility per trade = |Exit - Entry| / Entry × Leverage
Trades grouped by volatility level:
• Very Low (0-5%)
• Low (5-10%)
• Medium (10-20%)
• High (20-50%)
• Very High (50%+)

For each bucket: Win rate, avg PnL, trade count

HOW TO USE IT:
Discover your volatility "sweet spot":
- Profitable in low vol = you're a range trader
- Profitable in high vol = you trade momentum
- Profitable across all = adaptable strategy

Most traders have a preference:
- High vol: Bigger moves, but harder to manage risk
- Low vol: Consistent, but smaller opportunities
- Know yourself and trade your environment

ACTION ITEMS:
✓ Identify your most profitable volatility range
✓ Reduce size when trading outside your zone
✓ Have different strategies for different volatility
✓ Learn to recognize when volatility is changing`
                },
                {
                    id: 'correlation-matrix',
                    title: 'Correlation Matrix',
                    visual: '🔗',
                    content: `WHAT IT MEASURES:
How the performance of different assets you trade are correlated - do they move together or opposite?

HOW IT'S CALCULATED:
Correlation coefficient between assets:
• +1.0 = Perfect positive correlation (move together)
• 0.0 = No correlation (independent)
• -1.0 = Perfect negative correlation (move opposite)

Based on returns during your trading periods.

HOW TO USE IT:
This is crucial for portfolio risk management:
- High correlation = concentrated risk
- Low/negative correlation = diversification benefit
- Trading correlated assets = doubling your bet

If BTC and ETH are 0.9 correlated:
- Being long both = 2x BTC exposure
- Consider only trading one
- Or trade the spread (pairs trading)

ACTION ITEMS:
✓ Don't hold large positions in highly correlated assets
✓ Look for uncorrelated assets to diversify
✓ Consider pairs trading negatively correlated assets
✓ Reduce total exposure when adding correlated trades`
                },
                {
                    id: 'multi-layer-candle',
                    title: 'Multi-Layer Price Chart',
                    visual: '📊',
                    content: `WHAT IT MEASURES:
Your daily PnL overlaid with moving averages to show trends in your trading performance.

HOW IT'S CALCULATED:
• Daily PnL bars: Sum of all trades closed each day
• SMA 20: 20-day simple moving average of daily PnL
• SMA 50: 50-day simple moving average of daily PnL

These show short-term and long-term trends in your profitability.

HOW TO USE IT:
Read it like a price chart of your own performance:
- Golden line above moving averages = outperforming your average
- Golden line below moving averages = underperforming
- SMA 20 crossing above SMA 50 = positive trend change
- SMA 20 crossing below SMA 50 = negative trend change

This gives you an "at a glance" view of whether your trading is improving or declining.

ACTION ITEMS:
✓ When below both SMAs, review what changed
✓ Use crossovers as signals to adjust strategy
✓ Aim to keep daily PnL above SMA 20
✓ If SMA 50 is declining, take a break and reassess`
                },
                {
                    id: 'funding-rate-bias',
                    title: 'Funding Rate Bias (Leverage Analysis)',
                    visual: '💰',
                    content: `WHAT IT MEASURES:
Your performance across different leverage levels, which correlates with funding rate exposure in perpetual futures.

HOW IT'S CALCULATED:
Trades grouped by leverage (proxy for funding exposure):
• Low Funding (1-2x leverage)
• Medium Funding (3-5x leverage)
• High Funding (6-10x leverage)
• Extreme Funding (10x+ leverage)

For each: Avg PnL, win rate, trade count

HOW TO USE IT:
In perpetual futures, funding rates are paid between longs and shorts. Higher leverage = higher funding exposure.

Key insights:
- If high leverage performs worse, funding may be eating profits
- Extreme funding during one-sided markets can add up
- Consider funding when holding positions overnight

For futures traders:
- Positive funding = longs pay shorts
- Negative funding = shorts pay longs
- Align with the side receiving funding when possible

ACTION ITEMS:
✓ If high leverage underperforms, use lower leverage
✓ Factor funding cost into overnight hold decisions
✓ Check funding rate before entering large positions
✓ Consider closing before 8-hour funding times`
                },
                {
                    id: 'distance-from-ath',
                    title: 'Distance from ATH',
                    visual: '🏔️',
                    content: `WHAT IT MEASURES:
Your performance based on how far the asset's price was from its All-Time High when you traded.

HOW IT'S CALCULATED:
Distance from ATH = (ATH - Current Price) / ATH × 100

Trades grouped by ATH distance:
• Near ATH (0-10%): Asset near peak
• Moderate (10-30%): Healthy pullback
• Deep (30-50%): Significant correction
• Crash (50%+): Major decline

For each: Win rate, avg PnL, trade count

HOW TO USE IT:
This reveals market timing patterns:
- Profitable near ATH = momentum trader
- Profitable far from ATH = dip buyer
- Know your strength and trade accordingly

Market psychology:
- Near ATH: FOMO, retail buying, potential reversal
- Far from ATH: Fear, capitulation, potential bottom
- Your edge may exist in specific conditions

ACTION ITEMS:
✓ Identify which ATH distance you're most profitable
✓ Avoid trading conditions where you consistently lose
✓ Size up in your optimal zone
✓ Be contrarian when data supports it`
                },
                {
                    id: 'rsi-outcome',
                    title: 'RSI Outcome Analysis',
                    visual: '📈',
                    content: `WHAT IT MEASURES:
Your performance when entering trades at different RSI (Relative Strength Index) conditions.

HOW IT'S CALCULATED:
RSI is estimated from price movement:
• Entry price vs recent range
• Momentum at entry

Trades grouped by RSI condition:
• Oversold (<30): Potentially bottom
• Neutral (30-70): Normal range
• Overbought (>70): Potentially top

For each: Win rate, avg PnL, trade count

HOW TO USE IT:
Discover if you're a momentum or mean-reversion trader:
- Profitable buying oversold = mean reversion edge
- Profitable buying overbought = momentum edge
- Data-driven insight into your actual style

Common patterns:
- Buying overbought often means chasing
- Buying oversold can be catching falling knives
- Neutral entries may be highest quality

ACTION ITEMS:
✓ Check if your strategy matches your RSI performance
✓ If buying overbought loses, add confirmation before entry
✓ If buying oversold wins, look for more of these setups
✓ Use RSI as a filter, not a signal`
                }
            ]
        },
        'trades': {
            title: 'Trade Journal',
            icon: '📓',
            sections: [
                {
                    id: 'trade-methods',
                    title: 'Trade Entry Methods',
                    visual: '📥',
                    content: `1. Automatic Exchange Sync (Recommended)
- Connect exchange in Settings
- All historical trades imported automatically
- New trades sync every hour
- Zero manual data entry
- Most accurate method

2. Manual Entry
- Use "Add Trade" form on dashboard
- Enter: Date, Symbol, Side, Entry/Exit, Size, Leverage, Fees
- Optional: Assign setup, add notes, set SL/TP targets
- Ideal for: Trades outside exchanges, demo trades

3. CSV Import
- Bulk upload historical trades
- Use our CSV template
- Perfect for migrating from other platforms`
                },
                {
                    id: 'trade-fields',
                    title: 'Understanding Trade Fields',
                    visual: '📋',
                    content: `Essential Fields:
- Date: Trade entry date/time (stored in UTC)
- Symbol: Trading pair (e.g., BTC/USDT)
- Side: LONG or SHORT position
- Entry Price: Price where you entered
- Exit Price: Price where you exited
- Size: Position size (in base asset)
- Leverage: Leverage used (1-125x depending on exchange)

Optional Fields:
- Fees: Trading commission paid
- Setup: Trading strategy/setup name
- Notes: Trade analysis and observations
- Stop Loss: SL price target
- Take Profit: TP price target

Calculated Fields (Auto):
- PnL USD: Profit/loss in dollars
- PnL %: Return percentage
- Risk/Reward: Ratio of potential win to loss`
                },
                {
                    id: 'journaling',
                    title: 'The Power of Trade Journaling',
                    visual: '📝',
                    content: `What to Track in Notes:
- Why did you enter? (Setup/catalyst)
- Why did you exit? (TP/SL/emotional)
- What could you improve?
- Market conditions at entry
- Mistakes to avoid

Using Notes for Growth:
- Review losing trades: What went wrong?
- Analyze winning trades: What went right?
- Spot patterns: Are certain setups consistently better?
- Emotional analysis: When did you override your system?

Best Practices:
- Write notes immediately after closing trades
- Be honest about mistakes
- Track emotional vs disciplined exits
- Review weekly for patterns`
                }
            ]
        },
        'csv-import': {
            title: 'CSV Import Guide',
            icon: '📥',
            sections: [
                {
                    id: 'csv-overview',
                    title: 'CSV Import Overview',
                    visual: '📋',
                    content: `The CSV import feature lets you bulk upload historical trades from any exchange. Walleto automatically detects and parses CSV exports from Binance, Bybit, Blofin, and Hyperliquid - no manual column renaming required!

CSV Import is ideal for:
- Importing older trade history beyond API limits
- Migrating from other trading journals
- Adding trades from exchanges we don't yet support via API
- Backing up and restoring your trade data

Key Features:
✓ Exchange-Specific Parsers - Automatically handles different CSV formats
✓ Auto-Detection - Identifies which exchange your CSV came from
✓ Step-by-Step Wizard - Guided import process with instructions
✓ Preview Before Import - Review parsed trades before saving
✓ Validation - Catches errors before import`
                },
                {
                    id: 'csv-how-to-import',
                    title: 'How to Import (Step-by-Step)',
                    visual: '📥',
                    content: `Step 1: Click "Import CSV" on Dashboard
- Find the "Import CSV" button in the dashboard header
- This opens the import wizard

Step 2: Select Your Exchange
- Choose from: Binance, Bybit, Blofin, Hyperliquid, or Custom
- Each exchange has different CSV column formats
- Walleto handles the parsing automatically

Step 3: Follow Exchange-Specific Instructions
- The wizard shows you exactly how to export from your exchange
- Screenshots and step-by-step guidance included
- Expected columns are displayed so you can verify

Step 4: Upload Your CSV File
- Click "I have my CSV ready"
- Drag & drop or click to browse
- File is parsed instantly

Step 5: Preview Your Trades
- See a summary: Total trades, P&L, Win rate
- Preview the first 10 trades in a table
- Verify the data looks correct

Step 6: Confirm Import
- Click "Import X Trades" to save
- Trades appear on your dashboard immediately
- All analytics update automatically`
                },
                {
                    id: 'csv-binance',
                    title: 'Binance Futures CSV Export',
                    visual: '🟡',
                    content: `How to Export from Binance:

1. Log into Binance and go to Futures
2. Click Orders → Position History
3. Click "Export" in the top right corner
4. Select your date range (max 3 months at a time)
5. Download the CSV file
6. Upload to Walleto

Expected Columns:
Symbol, Size, Entry Price, Mark Price, PNL, ROE, Time

What Walleto Extracts:
✓ Symbol - Trading pair (BTCUSDT → BTC)
✓ Side - LONG or SHORT based on position size
✓ Entry Price - Your entry price
✓ Exit Price - Mark price at close
✓ Size - Position quantity
✓ PnL USD - Realized profit/loss
✓ PnL % - Return on equity (ROE)
✓ Date - Position close time

Limitations:
⚠️ Leverage NOT included - Binance doesn't export historical leverage
⚠️ Max 3 months per export - May need multiple exports
⚠️ Only 6 months history available

Tip: After importing, go to Settings → Leverage Settings to set your default leverage per symbol for accurate margin calculations.`
                },
                {
                    id: 'csv-bybit',
                    title: 'Bybit CSV Export',
                    visual: '🔵',
                    content: `How to Export from Bybit:

1. Log into Bybit
2. Go to Orders → Derivatives → Closed P&L
3. Click "Export" button
4. Select your date range
5. Click "Export Now"
6. Wait for file to generate, then "Download"
7. Upload to Walleto

Expected Columns:
Contracts, Side, Qty, Entry Price, Exit Price, Closed P&L, Trade Time

What Walleto Extracts:
✓ Symbol - Contract name (BTCUSDT → BTC)
✓ Side - Buy/Sell mapped to LONG/SHORT
✓ Entry Price - Position entry price
✓ Exit Price - Position exit price
✓ Size - Position quantity
✓ PnL USD - Closed P&L amount
✓ Fees - Trading fees (if included)
✓ Date - Trade close time

Limitations:
⚠️ Max 10,000 trades per export
⚠️ Leverage not always included in CSV (API provides it)

Note: Bybit's API provides complete leverage data. Consider using "Connect Exchange" for best results.`
                },
                {
                    id: 'csv-blofin',
                    title: 'Blofin CSV Export',
                    visual: '🟢',
                    content: `How to Export from Blofin:

1. Log into Blofin
2. Go to Account → Trade History
3. Select "Futures" for perpetual trades
4. Choose your date range (max 180 days)
5. Click "Export" to download CSV
6. Upload to Walleto

Expected Columns:
Instrument, Side, Size, Price, Fee, Realized PnL, Time

What Walleto Extracts:
✓ Symbol - Instrument name (BTC-USDT → BTC)
✓ Side - Buy/Sell mapped to LONG/SHORT
✓ Entry Price - Trade price
✓ Size - Position size
✓ Fees - Trading fees
✓ PnL USD - Realized profit/loss
✓ Date - Trade timestamp

Limitations:
⚠️ Max 180 days per export
⚠️ For older data, contact support@blofin.com

Recommendation: Use "Connect Exchange" for automatic syncing - Blofin's API provides complete data including leverage.`
                },
                {
                    id: 'csv-hyperliquid',
                    title: 'Hyperliquid CSV Export',
                    visual: '🟣',
                    content: `How to Export from Hyperliquid:

1. Connect your wallet to Hyperliquid
2. Click the "Trade History" tab at the bottom
3. Click "Export to CSV"
4. Save the file
5. Upload to Walleto

Expected Columns:
Time, Coin, Side, Sz, Px, Closed PnL, Fee

What Walleto Extracts:
✓ Symbol - Coin name (already clean format)
✓ Side - Buy/Sell mapped to LONG/SHORT
✓ Entry Price - Px (price)
✓ Size - Sz (size)
✓ Fees - Trading fees
✓ PnL USD - Closed PnL
✓ Date - Trade timestamp

Limitations:
⚠️ Max 10,000 trades per export
⚠️ Leverage not included in CSV

Note: Hyperliquid uses unique column names (Sz, Px) which Walleto automatically recognizes.`
                },
                {
                    id: 'csv-custom',
                    title: 'Custom/Other Exchange CSV',
                    visual: '📝',
                    content: `For exchanges not listed above, use our standard format:

Required Columns:
date,symbol,side,entry,exit,size,pnl_usd

Optional Columns:
leverage,fees,pnl_pct

Example CSV:
date,symbol,side,entry,exit,size,leverage,fees,pnl_usd,pnl_pct
2024-12-15,BTC,LONG,43250.50,43500.25,0.5,10,5.50,124.88,2.88
2024-12-15,ETH,SHORT,2300.00,2250.00,2.0,5,3.00,99.00,0.86
2024-12-14,SOL,LONG,195.50,190.00,10,3,15.00,-65.00,-1.11

Column Name Alternatives Accepted:
- date: time, timestamp, Date, Time
- symbol: pair, coin, asset, Symbol, Pair
- side: direction, Side, Direction
- entry: entry_price, entryPrice, open, Entry Price
- exit: exit_price, exitPrice, close, Exit Price
- size: qty, quantity, amount, Size, Qty
- pnl_usd: pnl, profit, PnL, Realized PnL
- pnl_pct: roi, roe, return, ROI, ROE

The parser tries multiple column name variations automatically.`
                },
                {
                    id: 'csv-vs-api',
                    title: 'CSV Import vs API Connection',
                    visual: '⚖️',
                    content: `API Connection (Recommended):
✓ Automatic hourly syncing
✓ Complete historical data
✓ Leverage data (Bybit, Blofin)
✓ Separate entry/exit timestamps
✓ Zero manual work
✓ Real-time updates

CSV Import:
✓ Works for any exchange
✓ Import older history beyond API limits
✓ Backup/restore data
✓ No API keys needed
⚠️ Manual process
⚠️ Single timestamp (close time only)
⚠️ Leverage often missing

Data Comparison:
┌─────────────────┬───────────┬─────────────┐
│ Field           │ API Sync  │ CSV Import  │
├─────────────────┼───────────┼─────────────┤
│ Symbol          │ ✓         │ ✓           │
│ Side            │ ✓         │ ✓           │
│ Entry Price     │ ✓         │ ✓           │
│ Exit Price      │ ✓         │ ✓           │
│ Size            │ ✓         │ ✓           │
│ Leverage        │ ✓*        │ ⚠️ Default 1│
│ Fees            │ ✓         │ ✓           │
│ PnL USD         │ ✓         │ ✓           │
│ PnL %           │ ✓         │ ✓ Calculated│
│ Entry Time      │ ✓         │ ⚠️ Close time│
│ Exit Time       │ ✓         │ ⚠️ Close time│
│ Exchange        │ ✓         │ ✓           │
└─────────────────┴───────────┴─────────────┘

*Leverage: Bybit includes in API, Binance requires defaults

Recommendation: Use API for ongoing tracking, CSV for historical backfill.`
                },
                {
                    id: 'csv-data-captured',
                    title: 'What Data is Captured',
                    visual: '📊',
                    content: `Every CSV import captures these fields:

Core Trade Data:
• Symbol - The trading pair (BTC, ETH, SOL, etc.)
• Side - Position direction (LONG or SHORT)
• Entry Price - Price when position opened
• Exit Price - Price when position closed
• Size - Position quantity in base asset
• Exchange - Source exchange (binance, bybit, etc.)

Financial Data:
• PnL USD - Realized profit/loss in dollars
• PnL % - Return percentage (calculated if missing)
• Fees - Trading fees (when available)
• Leverage - Multiplier used (defaults to 1x if missing)

Timestamps:
• Entry Time - When position was opened*
• Date - Original close/trade time

*Note: Most exchange CSVs only provide the close time, not separate entry/exit times. The close time is used as the entry_time for analytics purposes.

Calculated Fields:
If PnL % is missing, Walleto calculates it:
PnL % = (PnL USD / (Entry × Size / Leverage)) × 100

After Import:
All data flows into:
- Dashboard statistics
- Calendar heatmap
- Analytics widgets
- Trade journal
- AI Coach context`
                },
                {
                    id: 'csv-limitations',
                    title: 'Known Limitations',
                    visual: '⚠️',
                    content: `Leverage Data:
Most exchange CSVs don't include historical leverage. Walleto defaults to 1x.

Solution: Go to Settings → Leverage Settings and set your default leverage per symbol. This applies to all trades for that symbol.

Timestamps:
Exchange CSVs typically only have one timestamp (when trade closed). Separate entry/exit times aren't available.

Impact: Holding time analytics may be less accurate for CSV imports.

History Limits:
• Binance: Max 6 months via CSV, 3 months per export
• Bybit: Max 10,000 trades per export
• Blofin: Max 180 days per export
• Hyperliquid: Max 10,000 trades per export

Solution: Export in batches and import multiple CSVs.

Missing Fields:
If your CSV is missing required data:
- Trades without PnL are skipped
- Trades without entry price are skipped
- Invalid dates use current import time

Duplicate Detection:
Currently, CSV imports don't check for duplicates. Avoid importing the same file twice.

Best Practice:
Use API connection for ongoing tracking, CSV only for:
- Historical data before API integration
- Trades older than API history limits
- Backup/migration purposes`
                },
                {
                    id: 'csv-troubleshooting',
                    title: 'Troubleshooting',
                    visual: '🔧',
                    content: `"No valid trades found"
→ Check that your CSV has the expected columns
→ Verify you selected the correct exchange
→ Open CSV in text editor to check format

"CSV file is empty"
→ File may be corrupted
→ Try re-downloading from exchange
→ Check file has data rows (not just headers)

Trades showing wrong side
→ Exchange uses different terminology
→ Verify Buy=LONG, Sell=SHORT mapping
→ Check original CSV values

Zero PnL on all trades
→ PnL column may have different name
→ Check for "Realized PnL", "Closed P&L", etc.
→ Values might be in different format

Dates showing as today
→ Date format not recognized
→ Use ISO format: 2024-12-15
→ Check for timezone issues

Preview looks wrong
→ Wrong exchange selected
→ Try "Custom" format with manual columns
→ Check CSV isn't corrupted

Import button doesn't work
→ No valid trades parsed
→ Check browser console for errors
→ Try smaller file first

After import, can't find trades
→ Check date filters on dashboard
→ Verify import completed (success message)
→ Refresh the page`
                }
            ]
        },
        'exchanges': {
            title: 'Exchange Integration',
            icon: '🔗',
            sections: [
                {
                    id: 'why-connect',
                    title: 'Why Connect Your Exchange?',
                    visual: '🔐',
                    content: `Automatic Trade Syncing:
- Zero manual data entry
- All trades imported automatically
- Historical trades downloaded on first sync
- New trades sync every hour
- Complete accuracy with exchange data

Benefits:
- Save hours of manual logging
- Never miss a trade
- Complete trade history analysis
- Accurate fee calculations
- Real-time performance tracking
- Multi-account monitoring

Security:
- Read-only API keys only
- Credentials encrypted with Fernet
- Never stored in plain text
- Keys never transmitted to exchange
- You can revoke anytime`
                },
                {
                    id: 'supported-exchanges',
                    title: 'Supported Exchanges',
                    visual: '🌍',
                    content: `Binance ⚡
- Global leader in volume
- Futures support (USDS-M perpetuals)
- History: 6 months via API
- Leverage: NOT included (set defaults manually)
- Best for: All traders

Bybit 📊
- Specialized in perpetuals
- Ultra-liquid derivatives
- History: 2 years via API
- Leverage: INCLUDED in historical data
- Best for: Futures traders

Blofin 🔷
- Perpetual futures platform
- Advanced trading features
- History: Unlimited (all-time)
- Leverage: NOT included (set defaults manually)
- Best for: Perp traders

Hyperliquid ⚙️
- High-performance chain
- Ultra-low latency
- Modern onchain protocols
- Best for: Advanced traders

More Coming: We're constantly adding new exchanges based on user demand.`
                },
                {
                    id: 'exchange-comparison',
                    title: 'Exchange Comparison',
                    visual: '📊',
                    content: `History Limits:
| Exchange    | API History        | Leverage Data | Auth Method    |
|-------------|--------------------|---------------|----------------|
| Blofin      | Unlimited          | No            | API Key+Secret |
| Bybit       | 2 years            | Yes (only!)   | API Key+Secret |
| Binance     | 6 months           | No            | API Key+Secret |
| Hyperliquid | ~500-1000 trades   | No            | Wallet Only    |

Leverage Handling:
- Bybit: Leverage is automatically included in trade data - no setup needed
- Blofin, Binance & Hyperliquid: Leverage defaults to 1x (Hyperliquid 10x) - set defaults in Settings

PnL Calculation (identical for all):
PnL% = (PnL USD / (Entry Price x Quantity / Leverage)) x 100

Data Format:
All exchanges output identical trade format:
- Symbol (e.g., BTC-USDT or BTC-USDC for Hyperliquid)
- Entry/Exit prices and times
- Quantity (in coins, not contracts)
- Leverage, Fees, PnL USD, PnL %

Why Hyperliquid Only Needs Wallet Address:
Hyperliquid is a decentralized exchange - all trades are onchain!
- No API keys needed - your wallet address is public
- Trade data is stored on the blockchain
- Anyone can view any wallet's trade history
- Centralized exchanges (Binance, Bybit, Blofin) store data privately

Charts & Analytics:
All trades from all exchanges work identically in:
- Dashboard metrics and charts
- Calendar heatmap
- Analytics breakdowns
- Journal trade links`
                },
                {
                    id: 'history-limitations',
                    title: 'Trade History Limitations & Workarounds',
                    visual: '⚠️',
                    content: `API Limitations (Exchange-Imposed):
These are limitations set by the exchanges, not Walleto:

Binance: 6 months maximum
- The /fapi/v1/userTrades endpoint only returns 6 months of history
- This is a Binance API limitation, not Walleto
- For older trades: Use CSV import (see below)

Bybit: 2 years maximum
- The /v5/position/closed-pnl endpoint returns up to 2 years
- Older than 2 years: Contact Bybit support or use CSV export
- Data before account upgrade may need separate import

Blofin: Unlimited
- Complete trade history available via API
- No limitations on historical data

Hyperliquid: 2000 most recent fills (~500-1000 trades)
- Onchain data with no date restrictions, but limited to 2000 fills
- A "fill" is a single order execution (one trade can have multiple fills)
- Opening a position = 1+ fills, Closing = 1+ fills
- 2000 fills ≈ 500-1000 complete trades for most traders
- Very active traders or those using many partial entries may hit the limit
- For more history: Export from Hyperliquid dashboard or use blockchain explorers

Workaround: CSV Import
For trades older than API limits, use CSV import:
1. Export trades from your exchange website
2. Navigate to Trades page in Walleto
3. Click "Import CSV" button
4. Upload your exported file
5. Map columns to Walleto format

Binance CSV Export:
1. Go to Binance > Orders > Futures Order History
2. Click Export icon > Select date range
3. Choose "Beyond 6 months - Custom" for older data
4. Download and import to Walleto

Bybit CSV Export:
1. Go to Bybit > Assets > Data Export
2. Select "Derivatives" > Choose date range
3. Max 6 months per export, up to 2 years total
4. Download and import to Walleto

Pro Tip: Export and save your trade history regularly. Once data ages out of the API window, you'll need your own records.`
                },
                {
                    id: 'connect-steps',
                    title: 'How to Connect Your Exchange',
                    visual: '⚙️',
                    content: `Step 1: Navigate to Settings
- Click Settings in main navigation
- Scroll to "Exchange Integrations" section

Step 2: Select Exchange
- Choose from: Binance, Bybit, Blofin, Hyperliquid
- Click "Connect" button

Step 3: Create API Key
- Log into your exchange account
- Go to API management/settings
- Create new API key with these permissions:
  ✓ Read trading history
  ✓ View balances
  ✓ View orders
  ✗ Do NOT enable withdrawal
  ✗ Do NOT enable trading

Step 4: Enter Credentials
- Copy API Key from exchange
- Copy API Secret from exchange
- Paste API Passphrase (if required)
- Click "Connect"

Step 5: Verify
- See "✓ Connected" badge
- Click "Sync Now" to start
- Check dashboard for imported trades`
                },
                {
                    id: 'security-best',
                    title: 'API Security Best Practices',
                    visual: '🛡️',
                    content: `Creating Secure API Keys:
1. Use restricted API keys only (not Master key)
2. Set permissions to READ ONLY
3. Add IP whitelisting (your home IP)
4. Disable trading and withdrawal permissions
5. Create separate keys for each platform

In Walleto:
- Keys are encrypted immediately upon submission
- We only display last 4 characters
- Keys never appear in logs or error messages
- You can revoke anytime from Settings

What We Can See:
✓ Your trading history
✓ Your current balances
✓ Your open orders
✓ Your transaction history

What We CANNOT See:
✗ Your withdrawal address
✗ Your email address
✗ Your 2FA settings
✗ Your funding password`
                },
                {
                    id: 'leverage-defaults',
                    title: 'Setting Default Leverage for Exchanges',
                    visual: '⚙️',
                    content: `Why Set Default Leverage?
Blofin and Binance do NOT provide leverage data in their trade history APIs. When you sync trades from these exchanges, leverage defaults to 1x, which significantly affects your PnL percentage calculations.

Bybit is the exception - it INCLUDES leverage in historical data automatically.

Which Exchanges Need Setup:
- Blofin: Must set defaults (API has no leverage)
- Binance: Must set defaults (API has no leverage)
- Bybit: No setup needed (leverage included automatically)

How to Set Default Leverage:
1. Navigate to the Trades page
2. Click "⚙️ Set Leverage" button in the top-right
3. Select the Exchange (Blofin or Binance)
4. Select the Symbol (e.g., BTC-USDT, ETH-USDT)
5. Enter your typical leverage (e.g., 40x, 10x)
6. Optional: Check "Also update all existing trades" to apply to current trades
7. Click "Save Default Leverage"

What Happens:
✓ Future trades: All new trades for that symbol/exchange will use this leverage
✓ Existing trades: If you checked the box, current trades are updated immediately
✓ PnL recalculation: PnL% is automatically recalculated based on the new leverage
✓ No resync needed: Changes happen in the database, no need to resync from exchange

Example:
If you trade ETH-USDT on Binance at 20x leverage:
1. Set ETH-USDT + Binance = 20x
2. All future ETH-USDT trades from Binance will show 20x
3. Check the box to update existing ETH-USDT trades to 20x
4. Your PnL% will now accurately reflect 20x leverage

Per-Exchange, Per-Symbol:
- You can set different leverage for each symbol on each exchange
- BTC on Binance can be 10x while BTC on Blofin is 20x
- Each setting is independent and customizable

Managing Your Settings:
- View all current defaults in the modal
- Delete any setting to reset to 1x default
- Update anytime as your trading style changes`
                },
                {
                    id: 'exchange-leverage-details',
                    title: 'Leverage by Exchange',
                    visual: '📈',
                    content: `Bybit - Leverage Included
Bybit is the ONLY exchange that includes leverage in historical trade data.
- Leverage automatically imported with each trade
- PnL% calculated correctly without any setup
- No action needed after syncing

Binance - Must Set Defaults
Binance does NOT provide leverage in trade history API.
- All trades default to 1x leverage
- You MUST set defaults for accurate PnL%
- Affects all Binance Futures trades

Blofin - Must Set Defaults
Blofin does NOT provide leverage in trade history API.
- All trades default to 1x leverage
- You MUST set defaults for accurate PnL%
- Affects all Blofin perpetual trades

Hyperliquid - Must Set Defaults
Hyperliquid does NOT include leverage in trade fills.
- All trades default to 10x leverage
- You can change defaults in Settings
- Onchain data doesn't include your leverage settings

The Problem Without Defaults:
- You trade ETH-USDC at 40x leverage
- API doesn't include leverage in trade data
- Walleto imports the trade with default leverage
- Your PnL% shows -2.5% instead of the actual -100%

The Solution: Set Default Leverage
For Blofin, Binance, and Hyperliquid, you SHOULD set default leverage for each symbol you trade:

Step 1: Identify Your Symbols
- Review your trades on the Trades page
- Note which symbols you actively trade on each exchange

Step 2: Set Defaults
- Click "⚙️ Set Leverage" on the Trades page
- For each symbol:
  * Select Exchange: Blofin or Binance
  * Select Symbol: (e.g., ETH-USDT)
  * Enter Leverage: (e.g., 40x)
  * Check "Also update all existing trades"
  * Click "Save Default Leverage"

Step 3: Verify
- Check your trades on the Trades page
- PnL percentages should now be accurate
- Margin amounts should reflect actual leverage used

Example Setup:
If you typically trade on Binance:
- BTC-USDT at 20x → Set BTC-USDT + Binance = 20x
- ETH-USDT at 10x → Set ETH-USDT + Binance = 10x
- SOL-USDT at 5x → Set SOL-USDT + Binance = 5x

Variable Leverage:
If you use different leverage for the same symbol:
- Set the most common leverage as default
- Manually edit specific trades with different leverage using the Edit button
- This gives you flexibility while maintaining accuracy`
                }
            ]
        },
        'replay': {
            title: 'Trade Replay',
            icon: '▶️',
            sections: [
                {
                    id: 'replay-intro',
                    title: 'What is Trade Replay?',
                    visual: '📊',
                    content: `Trade Replay is a powerful analysis tool that lets you review your trades on actual price charts with REAL historical candle data. See exactly where you entered, where you exited, and what you missed.

Use Cases:
- Analyze entry quality and timing
- Understand why trades won/lost
- Identify entry/exit improvements
- Review trade decision-making
- Learn from mistakes
- Celebrate winning trades

All charts display real market data from the time of your trade - no simulated or fake candles.`
                },
                {
                    id: 'replay-data-sources',
                    title: 'Real Candle Data Sources',
                    visual: '📡',
                    content: `Trade Replay uses REAL historical candle data from multiple exchanges. We never show fake or simulated candles.

Data Source Priority:
1. Binance Futures API (primary) - For perpetual/futures trades
2. Binance Spot API (fallback) - For spot trading pairs
3. Bybit API (fallback) - Additional coverage

When you open a trade replay, the system automatically:
- Detects your symbol format (BTCUSDT, BTC-USDT, BTC.P, etc.)
- Tries each data source until it finds candle data
- Shows "● LIVE DATA" indicator when using real data

Historical Data Limits:
| Exchange | History Available |
|----------|-------------------|
| Binance Futures | ~6 months |
| Binance Spot | ~6 months |
| Bybit | ~2 years |

Note: Trades older than these limits will show an error message since historical candle data is no longer available from the exchanges.`
                },
                {
                    id: 'replay-features',
                    title: 'Replay Features',
                    visual: '🎯',
                    content: `Select Trade:
- Browse your trade history in sidebar
- Click to load chart at entry date
- See all your trades listed with P&L

Interactive Chart:
- Zoom in/out for detail
- Scroll to different timeframes
- See entry and exit markers
- View stop loss and take profit targets
- Pan across time periods

Timeframe Selection:
- Switch between 1m, 5m, 15m, 1h, 4h
- See trades in different time contexts
- Identify patterns at various scales
- Understand market structure

Trade Markers:
- Gold entry line = where you entered
- Green/Red exit line = where you exited (color based on P&L)
- Red SL line = stop loss level
- Green TP line = take profit level

Data Source Indicator:
- "● LIVE DATA" (green) = Real candles from exchange
- Error message = No historical data available`
                },
                {
                    id: 'replay-playback',
                    title: 'Playback Controls',
                    visual: '⏯️',
                    content: `The replay feature includes animated playback to watch how the trade unfolded:

Playback Controls:
- ⏮ Reset: Jump back to trade entry
- ▶ Play: Watch candles appear one by one
- ⏸ Pause: Stop playback
- ⏭ Skip to End: Jump to trade exit

Speed Controls:
- 0.5x: Slow motion for detailed analysis
- 1x: Normal speed
- 2x, 5x, 10x: Fast forward through the trade

Progress Slider:
- Drag to any point in the trade
- See live P&L update as price moves
- Watch SL/TP levels get hit

Live P&L Display:
- Real-time P&L calculation as candles play
- Shows both $ amount and % return
- Calculated based on your actual position size and leverage`
                },
                {
                    id: 'replay-tpsl',
                    title: 'TP/SL Visualization',
                    visual: '🎯',
                    content: `Set and visualize your stop loss and take profit levels:

Setting TP/SL:
- Click "+ TP/SL" button in the header
- Enter your stop loss price
- Enter your take profit price
- Lines appear on the chart

Visual Feedback:
- SL line shows in red with % distance from entry
- TP line shows in green with % distance from entry
- "SL HIT" badge appears if price touches stop loss
- "TP HIT" badge appears if price reaches take profit

Use Cases:
- Analyze if your SL was too tight or too loose
- See if TP was realistic given market conditions
- Review risk/reward ratio visually
- Learn optimal level placement for future trades`
                },
                {
                    id: 'live-mode',
                    title: 'Live Trading Mode',
                    visual: '📡',
                    content: `What It Does:
- Shows real-time candle data from exchange
- Updates every second with live prices
- Charts update in real-time
- Enter live trades with market prices

How to Use:
1. Go to Replay page
2. Click "Live Mode" toggle
3. Select trading pair
4. See real-time chart data
5. Optional: Enter new live trades

Live Trade Entry Form:
- Symbol: Select from your favorite pairs
- Side: LONG or SHORT
- Entry Price: Auto-populates with current price
- Stop Loss: Define your risk
- Take Profit: Define your target
- Position Size: Calculate risk/reward

Real-Time Features:
- Live price updates (WebSocket connection)
- Bid/Ask spread display
- Current 24h high/low
- Volume information`
                }
            ]
        },
        'coach': {
            title: 'AI Trading Coach',
            icon: '🤖',
            sections: [
                {
                    id: 'coach-intro',
                    title: 'What is the AI Trading Coach?',
                    visual: '🤖',
                    content: `The AI Trading Coach is your personal trading mentor powered by Claude AI. It analyzes your trades, identifies patterns, and provides personalized coaching to help you improve your trading performance.

Key Features:
- Real-time analysis of your trading history
- Personalized feedback based on your edge and style
- Persistent memory that remembers everything about you
- Multi-exchange trade data integration
- Identifies strengths and weaknesses
- Tracks your goals and progress over time
- Learns what advice works best for you

The coach learns from every conversation and becomes increasingly knowledgeable about your specific trading patterns, triggers, and psychology.`
                },
                {
                    id: 'coach-memory',
                    title: 'How the Coach Remembers You',
                    visual: '🧠',
                    content: `Persistent Memory System:
Unlike typical AI chatbots that forget everything, your coach remembers:

What It Learns:
- Trading Style: Are you a scalper, swing trader, or position trader?
- Strengths: What you're good at (e.g., "Excellent at BTC long entries")
- Weaknesses: Areas to improve (e.g., "Tends to revenge trade after losses")
- Triggers: Emotional patterns (e.g., "FOMO when missing moves")
- Rules: Trading rules you've set for yourself
- Preferences: Favorite pairs, sessions, strategies
- Breakthroughs: Key realizations you've had
- Personality: How you like to be coached

How It Works:
1. After each conversation, the coach analyzes what was discussed
2. New learnings are extracted and stored
3. Existing knowledge is reinforced or updated
4. Next time you chat, the coach references this knowledge

The more you chat, the smarter your coach becomes about YOUR specific trading.`
                },
                {
                    id: 'coach-how-to',
                    title: 'How to Use the Coach',
                    visual: '💬',
                    content: `Getting Started:
1. Click the chat bubble (💬) button at the bottom-right of any page
2. The Coach Panel opens with three tabs: Chat, Insights, Reports
3. Use the Chat tab to have conversations
4. Check Insights for auto-generated alerts
5. View Reports for daily/weekly summaries

The Three Tabs:

💬 CHAT TAB
- Direct conversation with your AI coach
- Quick action buttons for common requests
- Full conversation history

📊 INSIGHTS TAB
- Auto-generated proactive insights
- Trade reviews, pattern alerts, mistake warnings
- Unread badge shows new insights
- Mark as read or dismiss

📈 REPORTS TAB
- Daily reports (last 7 days)
- Weekly reports (last 4 weeks)
- Click "Generate Report" for today's summary
- Expandable detailed analysis`
                },
                {
                    id: 'coach-prompts',
                    title: 'What to Ask Your Coach',
                    visual: '💬',
                    content: `PERFORMANCE ANALYSIS:
- "Analyze my trading this week"
- "Why am I losing money?"
- "What's my win rate on BTC vs altcoins?"
- "Am I better at longs or shorts?"
- "What time of day do I trade best?"

PATTERN DETECTION:
- "What patterns have you noticed about me?"
- "What are my strengths and weaknesses?"
- "When do I tend to make mistakes?"
- "Am I over-leveraging?"
- "Do I have a revenge trading problem?"

TRADE REVIEW:
- "Analyze my last 10 trades"
- "Review my losing trades this week"
- "What went wrong with my ETH trades?"
- "Which setups are working for me?"

COACHING & IMPROVEMENT:
- "How can I improve my win rate?"
- "What should I focus on this week?"
- "Give me 3 things to work on"
- "What's holding me back?"

MEMORY & SELF-REFLECTION:
- "What do you know about me?"
- "What have I told you about my trading style?"
- "What goals am I working on?"
- "What advice has worked for me before?"

GOAL SETTING:
- "I want to improve my win rate to 60%"
- "Help me stop revenge trading"
- "Set a goal: no trades above 10x leverage"
- "Track my progress on [goal]"`
                },
                {
                    id: 'coach-insights-tab',
                    title: 'Using the Insights Tab',
                    visual: '📊',
                    content: `What Are Proactive Insights?
The coach automatically generates insights without you asking. These appear in the Insights tab with an unread badge.

Types of Insights:

🔍 TRADE REVIEW
- Generated after each trade completes
- Quick analysis of what went well/wrong
- Suggestions for improvement

⚠️ MISTAKE WARNING
- Detected revenge trading
- Overleveraging alerts
- FOMO entry detection
- Tilt trading warnings

📈 PATTERN ALERT
- New pattern discovered in your trading
- Changes in your performance
- Behavioral observations

🔥 STREAK ALERT
- 3+ consecutive wins = keep momentum
- 3+ consecutive losses = take a break warning

🏆 MILESTONE
- First $1,000 day
- 100 trades completed
- New all-time high

Severity Levels:
- 🔵 Info: General observations
- 🟡 Warning: Pay attention
- 🔴 Critical: Immediate action needed

Managing Insights:
- Click to expand and read full insight
- Mark as read to clear the badge
- Dismiss if not relevant`
                },
                {
                    id: 'coach-reports-tab',
                    title: 'Using the Reports Tab',
                    visual: '📈',
                    content: `Daily Reports:
- Shows last 7 days of trading summaries
- Each report includes:
  • Total PnL and trade count
  • Win rate for the day
  • Best and worst trades
  • Detected mistakes
  • AI-generated analysis and advice

Weekly Reports:
- Shows last 4 weeks of performance
- Comprehensive week-over-week analysis
- Pattern detection across the week
- Progress toward goals
- Key lessons and takeaways

Generating Reports:
1. Go to the Reports tab
2. Click "Generate Report" button
3. Coach analyzes your trades for that day
4. Report is saved and displayed

Best Practice:
- Generate a daily report after each trading session
- Review weekly reports every weekend
- Use insights to adjust your strategy
- Track progress over time

Reports are stored permanently - build a history of your trading journey!`
                },
                {
                    id: 'coach-goals',
                    title: 'Setting Trading Goals',
                    visual: '🎯',
                    content: `Goal Tracking:
Set measurable trading goals and track your progress over time.

Goal Types:
- Win Rate: "Improve win rate from 45% to 55%"
- PnL: "Make $5,000 this month"
- Risk: "Never use more than 5x leverage"
- Consistency: "Trade every day for 30 days"
- Psychology: "No revenge trading for 2 weeks"
- Habit: "Journal every trade"
- Skill: "Master support/resistance entries"

How Goals Work:
1. Tell your coach about a goal you want to set
2. The coach records it with a target and baseline
3. Progress is tracked automatically from your trades
4. Coach provides updates and encouragement
5. Celebrate when you achieve it!

Example:
You: "I want to improve my win rate to 60%"
Coach: "Great goal! You're currently at 48%. I'll track your progress."
[After 2 weeks]
Coach: "You're at 54% now - up 6%! Keep focusing on your A+ setups."`
                },
                {
                    id: 'coach-episodes',
                    title: 'Key Moments & Milestones',
                    visual: '📍',
                    content: `Episode Tracking:
Your coach remembers important moments in your trading journey.

Types of Episodes:
- Milestones: First $1,000 day, 100 trades, new ATH
- Breakthroughs: Key realizations that changed your trading
- Setbacks: Significant losses or blowups (to learn from)
- Commitments: Promises you've made to yourself
- Lessons: Important coaching moments
- Goal Achieved: Celebrations when you hit targets

Why This Matters:
- Coach can reference past victories when you're struggling
- Patterns in setbacks help identify recurring issues
- Commitments are tracked and followed up on
- Your trading journey is documented over time

Example:
"Remember last month when you had that -$2,000 day after revenge trading? You committed to taking a 30-minute break after any loss over $500. How has that been going?"`
                },
                {
                    id: 'coach-features',
                    title: 'Coach Features',
                    visual: '⚡',
                    content: `Conversation History:
- All conversations are saved automatically
- Access past coaching sessions anytime
- Build on previous insights
- See how your trading has evolved

Semantic Search:
- Coach finds relevant past conversations automatically
- If you ask about leverage, it recalls previous leverage discussions
- Connects patterns across months of conversations

Outcome Tracking:
- Coach tracks if its advice actually helped
- Measures your performance before and after advice
- Learns which types of advice work best for YOU
- Adapts coaching style based on what's effective

Proactive Insights:
- Coach surfaces insights without you asking
- Alerts for detected mistakes (revenge trading, FOMO)
- Daily and weekly performance summaries
- Pattern alerts when something changes

Real-Time Analytics:
- Coach accesses live data from your dashboard
- Analyzes trades as they sync
- Provides up-to-date insights
- Monitors progress over time`
                },
                {
                    id: 'coach-tips',
                    title: 'Tips for Better Coaching',
                    visual: '💡',
                    content: `Be Specific:
- Instead of: "How do I trade better?"
- Try: "I keep losing on DOGE short trades. What am I doing wrong?"

Share Your Psychology:
- Tell the coach when you're feeling tilted
- Mention if you're trading emotionally
- Discuss your mental state - it remembers patterns

Set Goals Together:
- "I want to improve my win rate"
- "Help me stop revenge trading"
- "I want to be consistently profitable"

Ask What It Knows:
- "What are my main weaknesses?"
- "What patterns have you noticed about me?"
- "What advice has worked for me before?"

Provide Feedback:
- "That advice helped a lot"
- "I tried that but it didn't work because..."
- Report back on how suggestions went

Best Practice:
- Chat regularly (daily or after trading sessions)
- Be honest about mistakes and emotions
- Set concrete goals with deadlines
- Review your progress weekly
- Celebrate wins together!`
                }
            ]
        },
        'journal': {
            title: 'Trading Journal',
            icon: '📓',
            sections: [
                {
                    id: 'journal-overview',
                    title: 'Journal Overview',
                    visual: '📓',
                    content: `The Trading Journal is your personal space for documenting trades, tracking emotions, and building self-awareness as a trader. It features a Notion-style editor with rich formatting and integrates directly with your AI Coach.

Key Features:
- Notion-style block editor with slash commands
- Pre-built templates for common journal types
- Mood tracking before and after trades
- Trade linking to embed actual trade data
- Voice-to-text capture for quick entries
- AI-generated writing prompts
- Journaling streak gamification
- Mood heatmap visualization

Why Journal?
Studies show that traders who journal consistently:
- Make 20-30% fewer emotional decisions
- Identify patterns faster
- Recover from losses more quickly
- Develop stronger trading discipline`
                },
                {
                    id: 'creating-entries',
                    title: 'Creating Journal Entries',
                    visual: '✍️',
                    content: `Creating a New Entry:
1. Navigate to the Journal page
2. Click the "+ New" button in the sidebar
3. Choose a template or start blank
4. Begin writing in the editor

Using Templates:
Pre-built templates help you structure your thoughts:

- Pre-Trade Analysis: Document your thesis before entering
- Post-Trade Review: Analyze what happened after closing
- Weekly Review: Reflect on your trading week
- Lesson Learned: Capture important realizations
- Quick Mood Check: Fast emotional check-in

Custom Templates:
Create your own templates for recurring entry types. Any entry structure can be saved as a template for future use.

Entry Organization:
- Pin important entries for quick access
- Favorite entries you want to revisit
- Search by title or filter by type
- Entries are sorted by date automatically`
                },
                {
                    id: 'block-editor',
                    title: 'Notion-Style Block Editor',
                    visual: '📝',
                    content: `The journal uses a block-based editor similar to Notion. Each paragraph, heading, or element is a "block" that can be moved and formatted.

Slash Commands:
Type "/" to open the block menu:
- /h1, /h2, /h3 - Headings
- /bullet - Bullet list
- /numbered - Numbered list
- /checklist - Checkable to-do items
- /quote - Block quote
- /callout - Highlighted callout box
- /divider - Horizontal line
- /trade - Insert trade card
- /stats - Insert stats widget

Keyboard Shortcuts:
- Enter: Create new block
- Backspace (on empty): Delete block
- Escape: Close menus

Formatting Tips:
- Use headings to structure long entries
- Checklists work great for trading rules
- Callouts highlight important insights
- Quotes are perfect for lessons learned`
                },
                {
                    id: 'mood-tracking',
                    title: 'Mood Tracking',
                    visual: '🌡️',
                    content: `Understanding your emotional state is crucial for trading success. The journal includes comprehensive mood tracking.

Pre-Trade Mood:
Record how you feel BEFORE entering a trade:
- Are you confident or anxious?
- Feeling FOMO or patient?
- Calm or revenge trading?

Post-Trade Mood:
Record how you feel AFTER closing:
- Satisfied or frustrated?
- Did emotions influence your exit?
- Learning or blaming?

Mood Categories:
Positive: Confident, Excited, Calm, Focused
Neutral: Neutral
Negative: Anxious, Fearful, FOMO, Revenge, Frustrated

Mood Heatmap:
The widgets panel shows a visual heatmap of your moods over time. Patterns emerge:
- Do you trade worse when anxious?
- Does FOMO lead to losses?
- Which moods correlate with wins?

The AI Coach uses this data to:
- Warn you when trading in poor emotional states
- Identify your emotional triggers
- Suggest when to step away
- Track improvement over time`
                },
                {
                    id: 'trade-linking',
                    title: 'Linking Trades',
                    visual: '🔗',
                    content: `Connect your journal entries directly to actual trades for comprehensive documentation.

How to Link Trades:
1. Open a journal entry
2. Click "Link Trades" in the toolbar
3. Search or browse your trades
4. Select trades to link
5. Click "Save Links"

Benefits:
- See the actual trade data alongside your notes
- One entry can link to multiple trades
- Trades can be linked to multiple entries
- Perfect for post-trade reviews

Use Cases:
- Link a Pre-Trade Analysis to the trade you took
- Link a Post-Trade Review to the specific trade
- Link multiple related trades in a Weekly Review
- Document a series of trades in one entry

Finding Linked Entries:
When viewing a trade elsewhere in Walleto, you can see which journal entries mention it.`
                },
                {
                    id: 'voice-capture',
                    title: 'Voice Capture',
                    visual: '🎤',
                    content: `Quickly capture thoughts using voice-to-text. Perfect for busy traders who want to journal without typing.

Using Voice Capture:
1. Click the microphone icon (🎤) in the editor toolbar
2. Click the large mic button to start recording
3. Speak your thoughts clearly
4. Click stop when finished
5. Review the transcript
6. Click "Add to Entry" to insert

Tips for Best Results:
- Speak clearly and at moderate pace
- Avoid background noise
- Short phrases work better than long monologues
- Review and edit the transcript as needed

Use Cases:
- Quick post-trade thoughts while still in the zone
- Morning market analysis before you start
- End of day reflection
- Capturing real-time emotional state

Browser Support:
Voice capture uses the Web Speech API. Works best in:
- Chrome (recommended)
- Edge
- Safari (limited)`
                },
                {
                    id: 'ai-prompts',
                    title: 'AI Writing Prompts',
                    visual: '✨',
                    content: `The AI analyzes your recent trading activity and generates contextual writing prompts to help you journal effectively.

Prompt Types:
- Big Win: "You had a great win on BTC! What setup led to this success?"
- Losing Streak: "After a few consecutive losses, what emotions are you experiencing?"
- New Symbol: "First time trading SOL. What's your thesis?"
- High Leverage: "You used 20x leverage. What was your risk management plan?"
- Weekly Review: "It's Sunday! Time to review your trading week."
- Morning Routine: "Good morning! How are you feeling? Ready to trade?"

How It Works:
The prompts panel in the right sidebar shows relevant prompts based on:
- Recent trade results
- Patterns detected
- Day of the week
- Time of day

Clicking a prompt creates a new entry with that question as the starting point.

Benefits:
- Never stare at a blank page
- Focus on what matters most right now
- Build a habit of relevant reflection
- Coach learns from your responses`
                },
                {
                    id: 'streaks-gamification',
                    title: 'Journaling Streaks',
                    visual: '🔥',
                    content: `Build consistent journaling habits with streak tracking and gamification.

Streak System:
- Current Streak: Days in a row you've journaled
- Longest Streak: Your all-time record
- Total Entries: Lifetime journal count
- Total Words: How much you've written

How Streaks Work:
- Write at least one entry per day to maintain streak
- Miss a day? Streak resets to 0
- Weekends count! True consistency matters

Why Streaks Matter:
Research shows that consistent journaling:
- Builds self-awareness faster
- Creates accountability
- Strengthens the reflection habit
- Correlates with trading improvement

Tips for Maintaining Streaks:
- Set a daily reminder to journal
- Even a quick mood check counts
- Journal right after your trading session
- Use voice capture for fast entries
- Template-based entries are faster

The Coach Notices:
Your AI Coach can see your journaling habits and will:
- Congratulate you on milestone streaks
- Encourage you if streak breaks
- Reference past entries in coaching
- Notice when you skip journaling`
                },
                {
                    id: 'coach-integration',
                    title: 'Coach Integration',
                    visual: '🤖',
                    content: `Your journal is fully integrated with the AI Trading Coach for a complete coaching experience.

What the Coach Sees:
- Recent journal entries (titles and previews)
- Your mood patterns over time
- Pre-trade vs post-trade mood changes
- Journaling streak and consistency
- Themes and topics you write about

How the Coach Uses This:
1. Deeper Context: The coach understands your emotional journey
2. Pattern Recognition: Spots correlations between mood and performance
3. Personalized Advice: References your own written insights
4. Accountability: Knows if you're journaling consistently

Ask the Coach About Journaling:
- "What patterns do you see in my journal?"
- "How do my moods affect my trading?"
- "What should I journal about today?"
- "Summarize my last week's entries"

Future Features:
- Coach can create journal entries for you
- Coach can edit entries with your permission
- Coach can suggest tags and categorization
- Advanced sentiment analysis`
                }
            ]
        },
        'settings': {
            title: 'Settings & Configuration',
            icon: '⚙️',
            sections: [
                {
                    id: 'settings-overview',
                    title: 'Settings Overview',
                    visual: '⚙️',
                    content: `The Settings page is your control center for managing exchange connections, account preferences, and data management. Access it via the "Settings" link in the navigation bar.

Key Sections:
- Exchange Integrations: Connect and manage your trading accounts
- Sync Controls: Trigger manual syncs and view sync status
- Data Management: Delete trades or manage your data
- Leverage Settings: Configure default leverage per exchange/symbol

Navigation:
Settings is accessible from the main navigation bar on all devices.`
                },
                {
                    id: 'exchange-connections',
                    title: 'Managing Exchange Connections',
                    visual: '🔗',
                    content: `Connecting an Exchange:
1. Click "Connect Exchange" button
2. Select your exchange (Binance, Bybit, Blofin, Hyperliquid)
3. Enter your API Key (from your exchange account)
4. Enter your API Secret
5. Enter API Passphrase (if required by exchange)
6. Click "Connect"

After Connection:
✓ Connection status shows "Connected" with green badge
✓ Last sync timestamp displays
✓ Historical trades begin importing automatically
✓ New trades sync every hour

Managing Connections:
- Sync Now: Click to manually trigger a sync
- Delete: Remove the connection (trades remain in database)
- View Status: See last sync time and connection health

Multiple Exchanges:
You can connect as many exchanges as you need. All trades are consolidated into your single Walleto dashboard.`
                },
                {
                    id: 'sync-settings',
                    title: 'Sync Settings & Controls',
                    visual: '🔄',
                    content: `Automatic Syncing:
- Trades sync automatically every hour
- No action required after initial connection
- New trades appear on dashboard within 60 minutes

Manual Sync:
If you need trades immediately:
1. Go to Settings
2. Find your connected exchange
3. Click "Sync Now" button
4. Wait for sync to complete (usually 10-30 seconds)
5. New trades appear immediately

Sync Status Indicators:
- ✓ Connected: Exchange is linked and syncing
- ⏳ Syncing: Sync in progress
- ✗ Error: Connection issue (check API key)
- Last Synced: Shows timestamp of last successful sync

Troubleshooting Sync Issues:
- Check API key permissions (must have read access)
- Verify API key hasn't expired
- Ensure exchange account is active
- Try disconnecting and reconnecting`
                },
                {
                    id: 'data-management',
                    title: 'Data Management',
                    visual: '🗄️',
                    content: `Deleting Trades:
You can delete trades in several ways:

1. Individual Trade Delete:
   - Go to Trades page
   - Click on a trade to open details
   - Click "Delete" button
   - Confirm deletion

2. Mass Delete by Platform:
   - Go to Trades page
   - Click "Mass Delete" button
   - Select platform (All, Blofin, Binance, Bybit, or Manual)
   - Confirm deletion
   - All trades from selected platform are removed

3. Delete All Trades:
   - Go to Settings page
   - Scroll to "Delete All Trades" section
   - Click "Delete All My Trades"
   - Confirm by typing DELETE
   - All trades are permanently removed

⚠️ Warning: Deleted trades cannot be recovered. Export your data first if needed.

Exporting Data:
- CSV export available from Trades page
- Includes all trade fields
- Use for backup or tax reporting`
                },
                {
                    id: 'account-settings',
                    title: 'Account Settings',
                    visual: '👤',
                    content: `Profile Management:
Your account is managed through Supabase authentication.

Changing Password:
1. Click your profile icon
2. Select "Reset Password"
3. Check your email for reset link
4. Create new password

Logging Out:
- Click "Logout" button in navigation bar
- Session ends immediately
- Re-login required to access data

Deleting Account:
1. Go to Settings
2. Scroll to bottom
3. Click "Delete Account"
4. Confirm by entering your email
5. All data is permanently removed

Data Privacy:
- Your trades are visible only to you
- API keys are encrypted at rest
- We don't sell or share your data
- See our Privacy Policy for details`
                }
            ]
        },
        'trade-management': {
            title: 'Trade Management',
            icon: '📊',
            sections: [
                {
                    id: 'trades-page-overview',
                    title: 'Trades Page Overview',
                    visual: '📋',
                    content: `The Trades page is your comprehensive trade log. Access it via "Trades" in the navigation bar.

Page Layout:
- Stats Bar: Quick metrics (Net PnL, Win Rate, Trades, Avg Win/Loss)
- Filter Bar: Date range, symbol, setup filters
- Trade List: All trades with sorting options
- Action Buttons: Set Leverage, Mass Delete, Add Trade

Trade List Columns:
- Date: When the trade was opened
- Symbol: Trading pair (BTC, ETH, etc.)
- Side: LONG or SHORT
- Entry/Exit: Prices
- Size: Position size in USD
- Leverage: Leverage used
- PnL: Profit/Loss in USD
- PnL%: Return percentage
- Setup: Assigned strategy
- Exchange: Source platform`
                },
                {
                    id: 'filtering-trades',
                    title: 'Filtering & Sorting Trades',
                    visual: '🔍',
                    content: `Date Range Filter:
- Quick Presets: 1W, 1M, 3M, 6M, 1Y, ALL
- Custom Range: Select specific start/end dates
- Affects all displayed trades and statistics

Symbol Filter:
- "All Coins" shows everything
- Select specific coin to filter
- Stats update to show filtered data only

Setup Filter:
- "All Setups" shows everything
- Filter by your trading strategies
- Great for analyzing specific setup performance

Side Filter:
- All, LONG only, or SHORT only
- Compare long vs short performance

Exchange Filter:
- All Exchanges shows everything
- Filter by Binance, Bybit, Blofin, etc.
- Useful for exchange-specific analysis

Sorting:
Click column headers to sort:
- Date: Newest or oldest first
- PnL: Biggest wins or losses first
- PnL%: Best or worst returns first
- Symbol: Alphabetical order`
                },
                {
                    id: 'editing-trades',
                    title: 'Editing Trades',
                    visual: '✏️',
                    content: `Opening Edit Mode:
1. Find the trade in your trade list
2. Click the trade row to select it
3. Click "Edit" button that appears
4. Edit modal opens with all fields

Editable Fields:
- Date: Change trade date/time
- Symbol: Update trading pair
- Side: Switch between LONG/SHORT
- Entry Price: Adjust entry price
- Exit Price: Adjust exit price
- Size: Change position size
- Leverage: Update leverage used
- Fees: Add or adjust fees
- Exchange: Change source exchange

Saving Changes:
1. Make your edits
2. Click "Save Changes"
3. Trade updates immediately
4. Analytics recalculate automatically

When to Edit:
- Correct data import errors
- Add missing fees
- Fix wrong leverage from API
- Adjust prices for accuracy
- Update exchange source`
                },
                {
                    id: 'trade-notes',
                    title: 'Adding Trade Notes',
                    visual: '📝',
                    content: `Why Use Notes:
Trade notes are essential for learning and improvement. Document your reasoning, emotions, and lessons for each trade.

Adding Notes:
1. Click on any trade to select it
2. Click "Notes" button or the notes icon
3. Notes modal opens
4. Type your observations
5. Click "Save Notes"

What to Document:
✓ Why you entered the trade
✓ What setup/signal you used
✓ Market conditions at entry
✓ How you managed the trade
✓ Why you exited (TP, SL, manual)
✓ What you could improve
✓ Emotional state during trade

Note Templates:
Entry Reason: [Setup name] triggered at [price]
Management: [How you adjusted SL/TP]
Exit Reason: [TP hit / SL hit / Manual exit]
Lesson: [What you learned]
Improvement: [What to do differently]

Reviewing Notes:
- Notes appear when viewing trade details
- Search notes in the Trade Journal
- Use for weekly review sessions`
                },
                {
                    id: 'mass-delete',
                    title: 'Mass Delete Trades',
                    visual: '🗑️',
                    content: `When to Use Mass Delete:
- Clean up test/demo trades
- Remove trades from a specific exchange
- Start fresh after strategy change
- Delete duplicate imports

How to Mass Delete:
1. Go to Trades page
2. Click "Mass Delete" button (top right)
3. Select deletion scope:
   - All Trades: Everything
   - By Exchange: Binance, Bybit, Blofin, etc.
   - Manual Only: Only manually entered trades

4. Review trade count to be deleted
5. Type "DELETE" to confirm
6. Click "Delete Trades"
7. Trades are permanently removed

⚠️ Important Warnings:
- This action CANNOT be undone
- Export your data before deleting
- Analytics will recalculate immediately
- Connected exchanges will re-sync trades on next sync

Recommended Workflow:
1. Export trades as CSV (backup)
2. Disconnect exchange if needed
3. Perform mass delete
4. Reconnect exchange if desired
5. Verify new data is correct`
                },
                {
                    id: 'setup-manager',
                    title: 'Setup & Strategy Manager',
                    visual: '🎯',
                    content: `What are Setups:
Setups (also called strategies) are labels you assign to trades to track which trading approaches work best.

Examples of Setups:
- "Breakout" - Breakout trading strategy
- "Mean Reversion" - Range trading
- "News Play" - Trading on news events
- "Scalp" - Quick in-and-out trades
- "Swing" - Multi-day positions

Creating a Setup:
1. Go to Dashboard
2. Click "Setup Manager" button
3. Click "Add Setup"
4. Enter setup name
5. Click "Create"

Assigning Setups to Trades:
1. Open trade edit modal
2. Find "Setup" dropdown
3. Select your setup
4. Save changes

Or when adding manual trades:
- Select setup in the Add Trade form

Analyzing Setup Performance:
1. Go to Analytics page
2. View "Setup Breakdown" widget
3. See PnL, win rate, trade count per setup
4. Use Setup Filter to focus on one strategy

Managing Setups:
- Edit: Change setup name
- Delete: Remove setup (trades become "No Setup")
- Reorder: Drag to change display order`
                },
                {
                    id: 'calendar-events',
                    title: 'Calendar Events',
                    visual: '📅',
                    content: `What are Calendar Events:
Beyond automatic trade tracking, you can add custom events to your trading calendar for context and planning.

Types of Events:
- Trading Notes: "Took break due to volatility"
- Market Events: "Fed announcement", "ETH upgrade"
- Personal: "Vacation - no trading"
- Reminders: "Review monthly performance"

Adding Events:
1. Go to Dashboard
2. Click any date on the calendar
3. Click "Add Event" button
4. Enter event title
5. Add description (optional)
6. Save event

Viewing Events:
- Events appear on calendar with icon
- Click date to see all events
- Events shown alongside trades

Why Use Events:
✓ Provide context for trading results
✓ Track market-moving events
✓ Note when you weren't trading
✓ Plan future trading activities
✓ Correlate performance with events

Best Practices:
- Log major market events
- Note vacation/break periods
- Track strategy changes
- Document rule modifications`
                }
            ]
        },
        'mobile': {
            title: 'Mobile Guide',
            icon: '📱',
            sections: [
                {
                    id: 'mobile-overview',
                    title: 'Using Walleto on Mobile',
                    visual: '📱',
                    content: `Walleto is fully responsive and works great on mobile devices. Access all features from your phone or tablet.

Mobile Navigation:
- Tap the hamburger menu (☰) to open navigation
- Swipe to close the menu
- All pages accessible from the drawer

Optimized for Touch:
- Large touch targets (44px minimum)
- Swipe gestures supported
- No hover-only features

Supported Devices:
- iPhone (iOS 14+)
- Android phones
- iPad and Android tablets
- Any modern mobile browser`
                },
                {
                    id: 'mobile-dashboard',
                    title: 'Dashboard on Mobile',
                    visual: '📊',
                    content: `Mobile Dashboard Layout:
The dashboard adapts to smaller screens:

Stats Cards:
- Stack vertically on phones
- Show same data as desktop
- Tap for more details

Calendar:
- Full month visible
- Swipe to change months
- Tap day for details
- Pinch to zoom (tablets)

Weekly Heatmap:
- Horizontal scroll enabled
- Tap cells for details

Quick Actions:
- Add Trade button always visible
- Access settings from menu`
                },
                {
                    id: 'mobile-trades',
                    title: 'Viewing Trades on Mobile',
                    visual: '📋',
                    content: `Trade List on Mobile:
- Horizontal scroll for all columns
- Tap trade to expand details
- Swipe left/right to see more

Filtering:
- Filter dropdowns at top
- Date picker optimized for touch
- Results update immediately

Editing Trades:
1. Tap trade row
2. Tap "Edit" button
3. Modal opens full-screen
4. Edit fields with keyboard
5. Tap "Save"

Tips for Mobile:
- Use landscape mode for wider tables
- Pinch to zoom on charts
- Pull down to refresh data`
                },
                {
                    id: 'mobile-analytics',
                    title: 'Analytics on Mobile',
                    visual: '📈',
                    content: `Analytics Layout:
- Widgets stack vertically
- Each widget full-width
- Scroll to see all widgets
- Tap for widget details

Navigation Tabs:
- Swipe between analytics pages
- Tab bar scrolls horizontally
- Current page highlighted

Charts:
- Touch to see data points
- Pinch to zoom
- Swipe to pan
- Rotate for landscape view

Best Practices:
- Use landscape for charts
- Focus on key widgets
- Set filters for quick views`
                },
                {
                    id: 'mobile-limitations',
                    title: 'Mobile Considerations',
                    visual: '⚠️',
                    content: `Best Experienced on Desktop:
Some features work better on larger screens:

- Trade Replay: Charts optimized for desktop
- Complex Analytics: More visible on larger screens
- CSV Import: Easier with file system access
- Bulk Editing: More efficient with keyboard

Mobile Optimized:
✓ Dashboard overview
✓ Trade list viewing
✓ Quick PnL checks
✓ Basic analytics
✓ AI Coach chat

Coming Soon:
- Native iOS app (2026)
- Native Android app (2026)
- Push notifications
- Widget for home screen`
                }
            ]
        },
        'faq': {
            title: 'FAQ & Support',
            icon: '❓',
            sections: [
                {
                    id: 'security-qa',
                    title: 'Security & Privacy',
                    visual: '🔒',
                    content: `Q: Are my API keys safe?
A: Absolutely. Your API keys are encrypted with Fernet (military-grade encryption) immediately upon submission. We never store them in plain text. Only the last 4 characters are displayed anywhere in the app.

Q: Can you trade with my keys?
A: No. We explicitly require read-only API keys. You should never give anyone trading or withdrawal permissions. Our system can only view your trades, not execute them.

Q: What data do you collect?
A: We collect only what's necessary: your trades, exchange balances, and basic profile info. We don't sell data. We don't share with third parties. Your data is yours.

Q: Can I delete my account?
A: Yes. Go to Settings and select "Delete Account". All your data is permanently removed.`
                },
                {
                    id: 'usage-qa',
                    title: 'Using Walleto',
                    visual: '💡',
                    content: `Q: How often do trades sync?
A: Automatic syncs happen every hour for all connected exchanges. You can also manually trigger a sync anytime from Settings.

Q: Can I import trades from multiple exchanges?
A: Yes! Connect as many exchanges as you want. Walleto consolidates all your trades into one dashboard.

Q: Can I edit trades?
A: Yes. Click any trade to edit details like entry price, exit price, fees, notes, etc.

Q: Do you support cryptocurrency deposits?
A: No. Walleto is a tracking tool, not an exchange. We track your trades but don't handle deposits/withdrawals.

Q: What about taxes?
A: Our CSV export works with tax software. We're working on built-in tax reports for 2024.`
                },
                {
                    id: 'technical-qa',
                    title: 'Technical Support',
                    visual: '🛠️',
                    content: `Q: What browsers are supported?
A: Chrome, Firefox, Safari, and Edge (latest versions). Mobile browsers supported for viewing.

Q: Is there a mobile app?
A: Web app works great on mobile. Native iOS/Android apps coming in 2026.

Q: Can I export my data?
A: Yes. Full CSV export of all trades available anytime. No lock-in.

Q: What if the service goes down?
A: Your data is safely stored. Service status at status.walleto.app. We maintain 99.9% uptime.

Q: How do I report a bug?
A: Email support@walleto.app or use the feedback form in-app.`
                },
                {
                    id: 'troubleshooting',
                    title: 'Troubleshooting Common Issues',
                    visual: '🔧',
                    content: `TRADES NOT SYNCING

Problem: Trades aren't appearing after connecting exchange
Solutions:
1. Verify API key permissions (must include trade history read access)
2. Check if API key has expired
3. Try clicking "Sync Now" manually
4. Disconnect and reconnect the exchange
5. Ensure your exchange account is active

Problem: Missing historical trades
Solutions:
1. Some exchanges limit history to 3-6 months
2. Check date range filters on Trades page
3. Use CSV import for older trades
4. Verify API permissions include history access

WRONG PNL% VALUES

Problem: PnL percentages seem incorrect
Causes & Solutions:
1. Leverage not set: For Blofin trades, you MUST set default leverage
   - Go to Trades → Set Leverage → Configure per symbol
   - Check "Update existing trades" to fix current data

2. Wrong leverage imported: Edit the trade and correct leverage value

3. Calculation method: PnL% = PnL USD / Margin Used × 100
   Margin = Position Value / Leverage

CHARTS NOT LOADING

Problem: Candlestick charts blank or not loading
Solutions:
1. Check internet connection
2. Try refreshing the page
3. Clear browser cache (Ctrl+Shift+Delete)
4. Disable ad blockers that might block WebSocket
5. Try a different browser
6. Symbol may not have enough data yet

LOGIN ISSUES

Problem: Can't log in
Solutions:
1. Reset password via "Forgot Password"
2. Check email for verification link
3. Clear browser cookies
4. Try incognito/private window
5. Contact support if persists

Problem: Session keeps expiring
Solutions:
1. Check if cookies are enabled
2. Don't use "Clear on exit" browser setting
3. Re-login and check "Remember me"

CSV IMPORT FAILING

Problem: CSV upload shows errors
Solutions:
1. Check column names match exactly (case-sensitive)
2. Use ISO date format (YYYY-MM-DD)
3. Remove thousand separators from numbers
4. Ensure no blank rows in middle of data
5. Save as UTF-8 encoded CSV
6. Try smaller batches (100 trades at a time)

ANALYTICS NOT UPDATING

Problem: Analytics show old data
Solutions:
1. Check date filters are set to include new trades
2. Refresh the page (Ctrl+R)
3. Clear browser cache
4. Verify trades are actually saved (check Trades page)
5. Wait a few seconds for calculations

MOBILE DISPLAY ISSUES

Problem: Layout broken on mobile
Solutions:
1. Try landscape orientation
2. Refresh the page
3. Clear mobile browser cache
4. Update your browser
5. Report specific issue to support

GENERAL TIPS

If something isn't working:
1. Refresh the page first
2. Check your internet connection
3. Try a different browser
4. Clear cache and cookies
5. Check status.walleto.app for outages
6. Contact support@walleto.app with details`
                },
                {
                    id: 'contact-support',
                    title: 'Contacting Support',
                    visual: '📧',
                    content: `Email Support:
support@walleto.app
- Response within 24 hours
- Include your username
- Describe the issue in detail
- Attach screenshots if possible

What to Include:
1. Your username/email
2. Browser and device type
3. Steps to reproduce the issue
4. Screenshots or screen recordings
5. Any error messages shown

Community Help:
- Check documentation first
- Search FAQ for common issues
- Ask in community Discord
- Report bugs on GitHub

Feature Requests:
- Email features@walleto.app
- Vote on existing requests
- Explain your use case
- We read every suggestion!

Status Updates:
- Check status.walleto.app for outages
- Follow @WalletoApp on Twitter
- Join Discord for announcements`
                },
                {
                    id: 'keyboard-shortcuts',
                    title: 'Tips & Tricks',
                    visual: '⌨️',
                    content: `Productivity Tips:

Quick Navigation:
- Use browser back/forward for navigation
- Bookmark frequently used pages
- Use search in docs (Ctrl+F)

Data Entry:
- Tab between form fields
- Enter to submit forms
- Escape to close modals

Analytics:
- Double-click charts to reset zoom
- Hover for detailed tooltips
- Use filters to focus analysis

Trade Management:
- Sort by clicking column headers
- Filter by multiple criteria
- Batch operations with mass delete

Best Practices:
✓ Set up default leverage before syncing
✓ Tag all trades with setups
✓ Add notes to significant trades
✓ Review analytics weekly
✓ Export backups regularly

Power User Tips:
- Create custom setups for different strategies
- Use time-based filters to compare periods
- Check "Apply to existing" when setting leverage
- Review worst trades to find patterns
- Use AI Coach for personalized insights`
                }
            ]
        }
    };

    const currentDoc = docs[selectedCategory as keyof typeof docs];

    // When searching, search across ALL categories; otherwise show current category only
    const getAllSearchResults = () => {
        if (!searchQuery.trim()) {
            return currentDoc.sections.map(section => ({
                ...section,
                categoryKey: selectedCategory,
                categoryTitle: currentDoc.title,
                categoryIcon: currentDoc.icon
            }));
        }

        const query = searchQuery.toLowerCase();
        const results: Array<{
            id: string;
            title: string;
            visual: string;
            content: string;
            categoryKey: string;
            categoryTitle: string;
            categoryIcon: string;
        }> = [];

        Object.entries(docs).forEach(([categoryKey, category]) => {
            category.sections.forEach(section => {
                if (
                    section.title.toLowerCase().includes(query) ||
                    section.content.toLowerCase().includes(query)
                ) {
                    results.push({
                        ...section,
                        categoryKey,
                        categoryTitle: category.title,
                        categoryIcon: category.icon
                    });
                }
            });
        });

        return results;
    };

    const filteredSections = getAllSearchResults();

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'rgba(29, 26, 22, 0.3)' }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: isMobile ? '24px 16px' : isTablet ? '32px 20px' : '48px 24px'
            }}>
                {/* Header */}
                <div style={{ marginBottom: isMobile ? '24px' : '48px', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: isMobile ? '1.75rem' : isTablet ? '2.25rem' : '3rem',
                        fontWeight: '700',
                        color: '#F5C76D',
                        marginBottom: '8px'
                    }}>
                        📚 {isMobile ? 'Documentation' : 'Walleto Documentation'}
                    </h1>
                    <p style={{
                        fontSize: isMobile ? '13px' : '16px',
                        color: '#8B7355',
                        marginBottom: isMobile ? '16px' : '24px'
                    }}>
                        Everything you need to master your trading analytics
                    </p>

                    {/* Mobile Category Selector */}
                    {isMobile && (
                        <div style={{ marginBottom: '16px' }}>
                            <button
                                onClick={() => setShowMobileNav(!showMobileNav)}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    backgroundColor: 'rgba(42, 37, 31, 0.6)',
                                    border: '1px solid rgba(212, 165, 69, 0.2)',
                                    borderRadius: '8px',
                                    color: '#F5C76D',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span>{docs[selectedCategory as keyof typeof docs]?.icon} {docs[selectedCategory as keyof typeof docs]?.title}</span>
                                <span>{showMobileNav ? '▲' : '▼'}</span>
                            </button>
                            {showMobileNav && (
                                <div style={{
                                    marginTop: '8px',
                                    backgroundColor: 'rgba(42, 37, 31, 0.9)',
                                    border: '1px solid rgba(212, 165, 69, 0.2)',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    position: 'absolute',
                                    left: '16px',
                                    right: '16px',
                                    zIndex: 100
                                }}>
                                    {Object.entries(docs).map(([key, doc]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setSelectedCategory(key);
                                                setShowMobileNav(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                backgroundColor: selectedCategory === key ? 'rgba(245, 199, 109, 0.2)' : 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: selectedCategory === key ? '#F5C76D' : '#C2B280',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                fontSize: '14px',
                                                fontWeight: selectedCategory === key ? '600' : '400',
                                            }}
                                        >
                                            <span style={{ marginRight: '8px' }}>{doc.icon}</span>
                                            {doc.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Main Layout */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : isTablet ? '220px 1fr' : '280px 1fr',
                    gap: isMobile ? '20px' : '32px'
                }}>
                    {/* Sidebar Navigation - Hidden on mobile */}
                    {!isMobile && (
                    <div>
                        <div style={{
                            backgroundColor: 'rgba(42, 37, 31, 0.6)',
                            border: '1px solid rgba(212, 165, 69, 0.15)',
                            borderRadius: '12px',
                            padding: isTablet ? '16px' : '24px',
                            backdropFilter: 'blur(10px)',
                            position: 'sticky',
                            top: '32px'
                        }}>
                            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#C2B280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
                                Categories
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(docs).map(([key, doc]) => (
                                    <button
                                        key={key}
                                        onClick={() => { setSelectedCategory(key); setSearchQuery(''); }}
                                        style={{
                                            padding: '12px 16px',
                                            backgroundColor: selectedCategory === key ? 'rgba(245, 199, 109, 0.2)' : 'transparent',
                                            border: selectedCategory === key ? '1px solid rgba(245, 199, 109, 0.4)' : '1px solid transparent',
                                            borderRadius: '8px',
                                            color: selectedCategory === key ? '#F5C76D' : '#8B7355',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontSize: '14px',
                                            fontWeight: selectedCategory === key ? '600' : '400',
                                            transition: 'all 200ms ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedCategory !== key) {
                                                e.currentTarget.style.backgroundColor = 'rgba(212, 165, 69, 0.1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedCategory !== key) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <span style={{ marginRight: '8px' }}>{doc.icon}</span>
                                        {doc.title}
                                    </button>
                                ))}
                            </div>

                            {/* Download Section */}
                            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(212, 165, 69, 0.15)' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#C2B280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                    Export
                                </h3>
                                <button
                                    onClick={() => downloadDocs()}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: 'rgba(52, 211, 153, 0.15)',
                                        border: '1px solid rgba(52, 211, 153, 0.3)',
                                        borderRadius: '8px',
                                        color: '#10b981',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        transition: 'all 200ms ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 0.25)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 0.15)';
                                    }}
                                >
                                    📥 Download HTML
                                </button>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Main Content */}
                    <div>
                        {/* Search Bar */}
                        <div style={{ marginBottom: '32px' }}>
                            <input
                                type="text"
                                placeholder="Search documentation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: 'rgba(42, 37, 31, 0.6)',
                                    border: '1px solid rgba(212, 165, 69, 0.15)',
                                    borderRadius: '8px',
                                    color: '#C2B280',
                                    fontSize: '14px',
                                    backdropFilter: 'blur(10px)',
                                    transition: 'all 200ms ease'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(245, 199, 109, 0.3)';
                                    e.currentTarget.style.backgroundColor = 'rgba(42, 37, 31, 0.8)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(212, 165, 69, 0.15)';
                                    e.currentTarget.style.backgroundColor = 'rgba(42, 37, 31, 0.6)';
                                }}
                            />
                        </div>

                        {/* Search Results Count */}
                        {searchQuery.trim() && (
                            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#8B7355' }}>
                                Found <span style={{ color: '#F5C76D', fontWeight: '600' }}>{filteredSections.length}</span> result{filteredSections.length !== 1 ? 's' : ''} for "<span style={{ color: '#F5C76D' }}>{searchQuery}</span>"
                            </div>
                        )}

                        {/* Content Sections */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {filteredSections.map((section) => (
                                <div
                                    key={`${section.categoryKey}-${section.id}`}
                                    id={section.id}
                                    style={{
                                        backgroundColor: 'rgba(42, 37, 31, 0.6)',
                                        border: '1px solid rgba(212, 165, 69, 0.15)',
                                        borderRadius: '12px',
                                        padding: '32px',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                >
                                    {/* Category Badge - shown when searching */}
                                    {searchQuery.trim() && (
                                        <div
                                            onClick={() => { setSelectedCategory(section.categoryKey); setSearchQuery(''); }}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                marginBottom: '12px',
                                                padding: '4px 10px',
                                                backgroundColor: 'rgba(245, 199, 109, 0.15)',
                                                border: '1px solid rgba(245, 199, 109, 0.3)',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                color: '#F5C76D',
                                                cursor: 'pointer',
                                                transition: 'all 200ms ease'
                                            }}
                                        >
                                            <span>{section.categoryIcon}</span>
                                            <span>{section.categoryTitle}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '32px' }}>{section.visual}</div>
                                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#F5C76D', margin: 0 }}>
                                            {section.title}
                                        </h2>
                                    </div>
                                    <div style={{
                                        fontSize: '15px',
                                        lineHeight: '1.8',
                                        color: '#C2B280',
                                        whiteSpace: 'pre-wrap',
                                        wordWrap: 'break-word'
                                    }}>
                                        {section.content}
                                    </div>
                                </div>
                            ))}
                            {filteredSections.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '48px',
                                    color: '#8B7355'
                                }}>
                                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>No results found for "{searchQuery}"</p>
                                    <p style={{ fontSize: '14px' }}>Try different keywords or browse categories</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid rgba(212, 165, 69, 0.15)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#8B7355', marginBottom: '16px' }}>
                        Need help? Email support@walleto.app or join our community
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#F5C76D', fontSize: '13px', cursor: 'pointer' }}>📖 Status Page</span>
                        <span style={{ color: '#8B7355' }}>•</span>
                        <span style={{ color: '#F5C76D', fontSize: '13px', cursor: 'pointer' }}>👥 Community</span>
                        <span style={{ color: '#8B7355' }}>•</span>
                        <span style={{ color: '#F5C76D', fontSize: '13px', cursor: 'pointer' }}>💬 Feedback</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function downloadDocs() {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Walleto - Complete Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.8;
            color: #333;
            background: #f5f7fa;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 60px 40px;
            background: white;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        h1 {
            color: #f39c12;
            border-bottom: 4px solid #f39c12;
            padding-bottom: 20px;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle { color: #7f8c8d; font-size: 1.1em; margin-bottom: 40px; }
        h2 {
            color: #2c3e50;
            margin-top: 40px;
            margin-bottom: 20px;
            font-size: 1.8em;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        h3 { color: #34495e; margin-top: 25px; margin-bottom: 15px; }
        .section {
            background: #f8f9fa;
            padding: 25px;
            margin: 25px 0;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        ul, ol { margin-left: 25px; margin-bottom: 15px; }
        li { margin-bottom: 10px; }
        .footer {
            text-align: center;
            color: #7f8c8d;
            margin-top: 60px;
            padding-top: 30px;
            border-top: 2px solid #ecf0f1;
            font-size: 0.9em;
        }
        .toc {
            background: #ecf0f1;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .toc h3 { margin-top: 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Walleto Complete Documentation</h1>
        <p class="subtitle">Professional Crypto Trading Journal & PnL Tracker</p>
        <p class="subtitle" style="font-size: 0.9em;">Generated: ${new Date().toLocaleString()}</p>

        <div class="toc">
            <h3>Table of Contents</h3>
            <ul>
                <li>Getting Started</li>
                <li>Dashboard Guide</li>
                <li>Advanced Analytics</li>
                <li>Widget Reference (36+ Analytics Widgets)</li>
                <li>Trade Journal</li>
                <li>CSV Import Guide</li>
                <li>Exchange Integration</li>
                <li>Trade Replay Engine</li>
                <li>AI Trading Coach</li>
                <li>Settings & Configuration</li>
                <li>Trade Management</li>
                <li>Mobile Guide</li>
                <li>FAQ, Support & Troubleshooting</li>
            </ul>
        </div>

        <h2>🚀 Getting Started with Walleto</h2>
        <p>Walleto is a professional crypto trading journal and PnL tracker designed for serious traders. Walleto helps you systematically track, analyze, and improve your trading performance across Binance, Bybit, Blofin, and Hyperliquid.</p>
        <div class="section">
            <h3>Initial Setup (5 Minutes)</h3>
            <ol>
                <li>Create an Account - Sign up with your email</li>
                <li>Connect Your Exchange - Navigate to Settings</li>
                <li>Authenticate - Enter your API credentials (read-only)</li>
                <li>Sync Trades - Your trading history syncs automatically</li>
                <li>Start Analyzing - Explore your dashboard and analytics</li>
            </ol>
        </div>

        <h2>📱 Dashboard Guide</h2>
        <p>The Dashboard is your trading command center with real-time statistics, heat maps, and analytics.</p>
        <div class="section">
            <h3>Key Components</h3>
            <ul>
                <li><strong>Statistics Panel:</strong> Net PnL, Win Rate, Total Trades</li>
                <li><strong>Monthly Calendar:</strong> Visual PnL heat map</li>
                <li><strong>Weekly Heatmap:</strong> Profitability patterns</li>
                <li><strong>PnL Curve:</strong> Equity growth visualization</li>
            </ul>
        </div>

        <h2>📈 Advanced Analytics</h2>
        <p>30+ customizable widgets for deep performance analysis.</p>
        <div class="section">
            <h3>Key Metrics</h3>
            <ul>
                <li><strong>Win Rate:</strong> Percentage of winning trades (60%+ is excellent)</li>
                <li><strong>Risk/Reward Ratio:</strong> Average win ÷ Average loss</li>
                <li><strong>Max Drawdown:</strong> Peak-to-trough decline (below 25% is professional)</li>
                <li><strong>Equity Curve:</strong> Compounded growth visualization</li>
            </ul>
        </div>

        <h2>📓 Trade Journal</h2>
        <p>Track trades via automatic sync, manual entry, or CSV import.</p>
        <div class="section">
            <h3>Entry Methods</h3>
            <ul>
                <li>Automatic Exchange Sync - Zero manual entry, hourly updates</li>
                <li>Manual Entry - Dashboard form for custom trades</li>
                <li>CSV Import - Bulk upload historical data</li>
            </ul>
        </div>

        <h2>🔗 Exchange Integration</h2>
        <p>Connect your trading accounts for automatic trade syncing.</p>
        <div class="section">
            <h3>Supported Exchanges</h3>
            <ul>
                <li><strong>Binance ⚡</strong> - Global leader, Spot & Futures</li>
                <li><strong>Bybit 📊</strong> - Perpetuals specialist</li>
                <li><strong>Blofin 🔷</strong> - Options & Futures (⚠️ Requires manual leverage setup)</li>
                <li><strong>Hyperliquid ⚙️</strong> - High-performance derivatives</li>
            </ul>
            <p><strong>Security:</strong> API keys are encrypted with Fernet encryption. Read-only keys required. Never stored in plain text.</p>
        </div>

        <div class="section">
            <h3>⚠️ Blofin Integration & Leverage</h3>
            <p><strong>Important:</strong> Blofin's API does NOT provide leverage information for historical trades. All synced trades default to 1x leverage, which affects your PnL percentage calculations.</p>

            <h4>The Problem:</h4>
            <ul>
                <li>You trade ETH-USDT at 40x leverage</li>
                <li>Blofin API doesn't include leverage in trade data</li>
                <li>Walleto imports the trade with 1x leverage (default)</li>
                <li>Your PnL% shows -4.28% instead of the actual -171%</li>
            </ul>

            <h4>The Solution:</h4>
            <ol>
                <li>Sync your Blofin trades as normal</li>
                <li>Go to the Trades page</li>
                <li>Click "⚙️ Set Leverage" button</li>
                <li>For each symbol you trade:
                    <ul>
                        <li>Select Exchange: Blofin</li>
                        <li>Select Symbol: (e.g., ETH-USDT)</li>
                        <li>Enter your typical leverage (e.g., 40x)</li>
                        <li>Check "Also update all existing trades"</li>
                        <li>Click "Save Default Leverage"</li>
                    </ul>
                </li>
            </ol>
            <p>Once configured, all future Blofin trades for that symbol will automatically use your default leverage.</p>
        </div>

        <div class="section">
            <h3>Setting Default Leverage</h3>
            <p>For exchanges that don't provide leverage data (like Blofin), you can set default leverage values per symbol.</p>
            <ol>
                <li>Navigate to the Trades page</li>
                <li>Click "⚙️ Set Leverage" button in the top-right</li>
                <li>Select Exchange and Symbol</li>
                <li>Enter your typical leverage</li>
                <li>Optional: Check box to update existing trades</li>
                <li>Click "Save Default Leverage"</li>
            </ol>
            <p><strong>Benefits:</strong> Future trades use correct leverage automatically. Existing trades can be updated without resyncing. PnL percentages reflect actual leverage used.</p>
        </div>

        <h2>▶️ Trade Replay Engine</h2>
        <p>Review your trades on actual price charts with interactive features.</p>
        <div class="section">
            <h3>Features</h3>
            <ul>
                <li>Interactive charts with trade markers</li>
                <li>Multiple timeframe selection (1m-1D)</li>
                <li>Live trading mode with real-time data</li>
                <li>Entry/exit visualization</li>
            </ul>
        </div>

        <h2>🤖 AI Trading Coach</h2>
        <p>Get personalized trading coaching from an AI assistant that analyzes your trades and provides actionable insights.</p>
        <div class="section">
            <h3>Coach Features</h3>
            <ul>
                <li>Real-time analysis of your trading history</li>
                <li>Personalized feedback based on your trading patterns</li>
                <li>Conversation history saved for future reference</li>
                <li>Multi-exchange trade data integration</li>
                <li>Identifies your strengths and weaknesses</li>
                <li>Suggests concrete improvements</li>
            </ul>
        </div>
        <div class="section">
            <h3>Using the Coach</h3>
            <p>Click the chat bubble (💬) button on any page to open the coach. Ask questions like:</p>
            <ul>
                <li>"Why am I losing money?"</li>
                <li>"What patterns do I have?"</li>
                <li>"How can I improve my win rate?"</li>
                <li>"Which setups are most profitable?"</li>
                <li>"Am I over-leveraging?"</li>
            </ul>
        </div>

        <h2>❓ FAQ & Support</h2>
        <div class="section">
            <p><strong>Q: Are my API keys safe?</strong><br>A: Yes. Keys are encrypted with military-grade Fernet encryption and never stored in plain text.</p>
        </div>
        <div class="section">
            <p><strong>Q: How often do trades sync?</strong><br>A: Every hour automatically, plus manual sync anytime from Settings.</p>
        </div>
        <div class="section">
            <p><strong>Q: Can I export my data?</strong><br>A: Yes. Full CSV export available anytime. No lock-in.</p>
        </div>
        <div class="section">
            <p><strong>Q: Is there a mobile app?</strong><br>A: Web app works great on mobile. Native iOS/Android apps coming in 2026.</p>
        </div>

        <div class="footer">
            <p><strong>Walleto - Professional Crypto Trading Journal</strong></p>
            <p>Visit: www.walleto.app | Email: support@walleto.app</p>
            <p>© 2024 Walleto. All rights reserved.</p>
            <p style="margin-top: 20px; font-style: italic;">Thank you for using Walleto!</p>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `walleto-docs-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
