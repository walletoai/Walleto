# Walleto - AI Context Document

This document provides context for AI assistants working on the Walleto codebase.

## Project Overview

**Walleto** is a premium crypto trading journal and AI-powered analysis platform for perpetual futures traders. It enables users to track, analyze, and optimize their trading performance across multiple cryptocurrency exchanges with AI coaching insights.

**Domain**: walleto.ai (landing), app.walleto.ai (main app), api.walleto.ai (backend)

## Architecture

```
/Walleto
├── backend/        # Python FastAPI server (api.walleto.ai)
├── frontend/       # React + TypeScript web app (app.walleto.ai)
├── landing/        # Marketing landing page (walleto.ai)
└── Configuration files
```

### Deployment
- **Platform**: Google Cloud Run
- **Container Registry**: Google Container Registry / Artifact Registry
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Build System**: Google Cloud Build (cloudbuild.yaml files)

## Technology Stack

### Backend (Python)
| Category | Technology |
|----------|------------|
| Framework | FastAPI + Uvicorn |
| Database | SQLAlchemy ORM + Supabase REST API |
| Exchanges | CCXT library + custom clients |
| AI/ML | OpenAI API, Anthropic Claude API |
| Auth | Supabase Auth + JWT |
| Scheduling | APScheduler (24-hour sync cycles) |
| Security | Cryptography (API key encryption) |

**Key Dependencies**: fastapi, sqlalchemy, ccxt>=4.0.0, openai>=1.3.0, anthropic>=0.40.0, supabase>=2.0.0

### Frontend (React)
| Category | Technology |
|----------|------------|
| Framework | React 18.3 + TypeScript |
| Build | Vite 7.2 |
| Auth | Supabase SDK |
| Charting | Lightweight-charts, Recharts, Chart.js |
| UI | Headless UI, Lucide React icons |
| Layout | React Grid Layout (draggable widgets) |
| Routing | React Router v7 |

### Landing Page
- React 18.2 + Vite 5.0
- Tailwind CSS 3.3
- Recharts for hero visualizations

## Key Features

### Core Trading Features
1. **Multi-Exchange Support**: Binance Futures, Bybit, Blofin, Hyperliquid
2. **Automatic Trade Syncing**: Scheduled sync via APScheduler
3. **CSV Import**: Custom parsers for each exchange format
4. **Trade Analytics**: 36+ dashboard widgets
5. **Trade Replay**: Historical candle playback with speed controls

### AI Coaching System
1. **Claude/OpenAI Integration**: Personalized trading insights
2. **Memory System**: Persistent coach memory across sessions
3. **Pattern Detection**: Automatic trading pattern identification
4. **Outcome Tracking**: Win rates and performance analytics

### Additional Features
- Trade Journal with rich text editor
- Calendar heatmap for performance visualization
- Leverage settings per symbol
- Invite/waitlist system

## Backend Structure

### Routes (API Endpoints)
| Route File | Lines | Purpose |
|------------|-------|---------|
| coach.py | 1,075 | AI conversations, insights, reports |
| journal.py | 787 | Trade journaling and linking |
| blofin_sync.py | 610 | Blofin exchange synchronization |
| exchanges.py | 471 | Exchange connection management |
| social.py | 419 | Posts, follows, comments (WIP) |
| invite.py | 407 | Waitlist and invite codes |
| binance_sync.py | 347 | Binance trade sync |
| hyperliquid_sync.py | 312 | Hyperliquid sync |
| bybit_sync.py | 305 | Bybit sync |
| trades.py | 178 | Trade CRUD operations |

### Services (Business Logic)
| Service | Purpose |
|---------|---------|
| claude_service.py | Anthropic Claude API integration |
| llm_service.py | OpenAI API integration |
| coach_service.py | Coach logic layer |
| memory_manager.py | Coach memory persistence (757 lines) |
| context_builder.py | AI context assembly (814 lines) |
| pattern_detector.py | Trading pattern analysis |
| journal_service.py | Journal operations (679 lines) |
| supabase_client.py | Supabase REST wrapper (624 lines) |
| exchange_service.py | Exchange abstraction (631 lines) |
| encryption.py | API key encryption |

### Database Models
1. **Candles** - OHLCV price data
2. **FundingRates** - Crypto funding rates
3. **ExchangeConnection** - Encrypted API credentials
4. **Trade** - Individual trade records
5. **CoachInsight** - AI-generated insights
6. **TradePattern** - Pattern analysis results
7. **UserProfile** - User metadata
8. **CalendarEvent** - Trade-related events
9. **Post/Like/Comment/Follow** - Social features (WIP)

### Migrations
Located in `backend/migrations/`:
- `002_memory_system.sql` - Coach conversation tables
- `003_journal_system.sql` - Trade journaling tables
- `004_invite_system.sql` - Waitlist and invite system
- `create_leverage_settings.sql` - Leverage configuration

## Frontend Structure

### Pages (14 total)
- DashboardPage, AnalyticsPage, TradesPage, SettingsPage
- JournalPage, WalletoReplayPage
- TradeDetailPage, LiveTradeDetailPage, LiveTradeEntryPage
- LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage
- DocsPage

### Component Directories
- `layout/` - Navigation, auth guard, mobile drawer
- `journal/` - Editor, templates, mood picker
- `coach/` - CoachButton, CoachPanel
- `modals/` - Dialog components
- `charts/` - Dashboard widget components

### Key Config Files
- `src/lib/supabase.ts` - Supabase client setup
- `src/config/api.ts` - API endpoint configuration
- `src/types/` - TypeScript type definitions

## Environment Variables

### Backend (.env)
```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=         # Service role key
SUPABASE_JWT_SECRET=
ENCRYPTION_KEY=
ADMIN_API_KEY=
DATABASE_URL=
```

### Frontend (.env)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

## Development Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Landing
cd landing
npm install
npm run dev
```

## Deployment

Each service deploys independently via Cloud Build:

```bash
# Backend
cd backend && gcloud builds submit --config cloudbuild.yaml

# Frontend
cd frontend && gcloud builds submit --config cloudbuild.yaml

# Landing
cd landing && gcloud builds submit --config cloudbuild.yaml
```

### Cloud Run Configuration
- **Backend**: 1Gi memory, 1 CPU, 0-10 instances
- **Frontend**: 256Mi memory, 1 CPU, Nginx serving
- **Landing**: 256Mi memory, Nginx serving

## CORS Configuration

Backend allows these origins:
- `http://localhost:5173` (local dev)
- `https://walleto.ai`
- `https://app.walleto.ai`
- `https://api.walleto.ai`

## Important Notes for AI Assistants

### Security Reminders
1. Never commit .env files or API keys
2. Use `deploy-secrets.sh` pattern but keep it in .gitignore
3. Supabase service role key has admin access - protect it
4. API keys are encrypted before storage in database

### Code Patterns
1. Backend uses dependency injection via FastAPI's Depends()
2. Supabase client uses REST API with httpx (not the Python SDK directly for most operations)
3. Frontend uses React context for auth state
4. Exchange sync runs on 24-hour intervals via APScheduler

### Database Access
- Backend uses SQLAlchemy for local operations
- Supabase REST API for user-specific queries (RLS enabled)
- Service role bypasses RLS for admin operations

### File Naming Conventions
- Backend: snake_case for files and functions
- Frontend: PascalCase for components, camelCase for utilities
- Routes: grouped by feature (coach.py, journal.py, etc.)

### Testing
- No test files currently exist
- Tests should be added to `backend/tests/` and `frontend/src/__tests__/`

## Future Work (Incomplete Features)

Located in `frontend/future-additions/social/`:
- Profile system with public/private modes
- Social feed with posts and comments
- Follow/unfollow system
- Feed ranking algorithm

These features have backend routes but frontend integration is incomplete.

## Quick Reference

| What | Where |
|------|-------|
| API entry point | `backend/app/main.py` |
| Database models | `backend/app/models.py` |
| Exchange clients | `backend/app/services/*_client.py` |
| AI services | `backend/app/services/claude_service.py`, `llm_service.py` |
| Frontend entry | `frontend/src/main.tsx` |
| Supabase config | `frontend/src/lib/supabase.ts` |
| API config | `frontend/src/config/api.ts` |
| Landing app | `landing/src/App.tsx` (monolithic) |
