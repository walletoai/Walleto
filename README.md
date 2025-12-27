# Walleto - Crypto Trading Journal

A premium crypto trading journal for perpetual traders with AI-powered insights.

## Project Structure

```
crypto-pnl-tracker/
├── backend/          # Python FastAPI backend
│   ├── app/          # Main application code
│   ├── migrations/   # Database migrations
│   └── Dockerfile    # Backend container config
│
├── frontend/         # Main React application
│   ├── src/          # Source code
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/
│   │   └── hooks/
│   └── Dockerfile    # Frontend container config
│
└── landing/          # Landing page (walleto.ai)
    ├── App.tsx       # Main landing page component
    ├── components/   # Landing-specific components
    │   ├── Dashboard.tsx        # Demo dashboard preview
    │   ├── SupportChat.tsx      # Support chat widget
    │   ├── PrivacyPolicyModal.tsx
    │   └── TermsOfServiceModal.tsx
    ├── services/     # Support bot and ticket services
    └── Dockerfile    # Landing container config
```

## Development

### Landing Page
```bash
cd landing
npm install
npm run dev
```

### Frontend App
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Deployment

Each component deploys independently to Google Cloud Run:

- **Landing**: Deploy from `landing/` with `gcloud builds submit`
- **Frontend**: Deploy from `frontend/` with `gcloud builds submit`
- **Backend**: Deploy from `backend/` with `gcloud builds submit`

## Supported Exchanges

### API Integration (Recommended)
Connect your exchange for automatic trade syncing:

| Exchange | History Limit | Leverage Data | Auto-Sync |
|----------|--------------|---------------|-----------|
| Binance Futures | 6 months | Current only* | ✓ Hourly |
| Bybit | 2 years | ✓ Historical | ✓ Hourly |
| Blofin | 180 days | ✓ Historical | ✓ Hourly |
| Hyperliquid | Full history | ✓ Historical | ✓ Hourly |

*Binance doesn't provide historical leverage - set defaults in Settings

### CSV Import
Import trades from any exchange via CSV export:

| Exchange | How to Export | Columns Parsed |
|----------|--------------|----------------|
| Binance | Orders → Position History → Export | Symbol, Entry/Exit Price, Size, PNL, ROE |
| Bybit | Orders → Derivatives → Closed P&L → Export | Contracts, Side, Qty, Entry/Exit Price, Closed P&L |
| Blofin | Account → Trade History → Export | Instrument, Side, Size, Price, Fee, Realized PnL |
| Hyperliquid | Trade History → Export to CSV | Coin, Side, Sz, Px, Closed PnL, Fee |
| Custom | Use standard format | date, symbol, side, entry, exit, size, pnl_usd |

**CSV Import Features:**
- Exchange-specific parsers (auto-detects format)
- Step-by-step wizard with instructions
- Preview before import
- Validation and error handling

**API vs CSV Comparison:**

| Data Field | API Sync | CSV Import |
|------------|----------|------------|
| Symbol | ✓ | ✓ |
| Side (LONG/SHORT) | ✓ | ✓ |
| Entry/Exit Price | ✓ | ✓ |
| Position Size | ✓ | ✓ |
| Leverage | ✓ (varies) | Default 1x |
| Fees | ✓ | ✓ |
| PnL USD | ✓ | ✓ |
| PnL % | ✓ | ✓ (calculated) |
| Entry Time | ✓ | Close time only |
| Exit Time | ✓ | Close time only |

**Best Practice:** Use API for ongoing tracking, CSV for historical backfill beyond API limits.

## Features

- **Dashboard** - Real-time statistics, calendar heatmap, equity curve
- **Analytics** - 36+ widgets for deep performance analysis
- **Trade Journal** - Rich text editor with trade linking
- **AI Coach** - Personalized trading insights and pattern detection
- **Trade Replay** - Review trades with real historical candles
- **CSV Import** - Bulk import with exchange-specific parsers
- **Multi-Exchange** - Track all your accounts in one place

## Trade Replay

Review your trades on actual historical price charts with real candle data.

### Data Sources
Trade Replay fetches real OHLCV data from multiple exchanges (no simulated data):

| Priority | Source | Coverage |
|----------|--------|----------|
| 1 | Binance Futures API | ~6 months history |
| 2 | Binance Spot API | ~6 months history |
| 3 | Bybit API | ~2 years history |

The system automatically:
- Detects symbol format (BTCUSDT, BTC-USDT, BTC.P, etc.)
- Tries each source until data is found
- Shows "● LIVE DATA" indicator for real data

### Replay Features
- **Animated Playback** - Watch trades unfold candle by candle
- **Speed Controls** - 0.5x to 10x playback speed
- **Timeframes** - 1m, 5m, 15m, 1h, 4h charts
- **TP/SL Visualization** - Set and view stop loss/take profit levels
- **Live P&L** - Real-time profit calculation during playback
- **Trade Markers** - Entry, exit, SL, and TP lines on chart

### Limitations
Trades older than the exchange history limits will show an error since candle data is no longer available from the APIs.
