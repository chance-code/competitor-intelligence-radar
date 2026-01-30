# Competitor Intelligence Radar

An AI-first competitive intelligence system optimized for signal over noise, with a special focus on Voice AI capabilities across Auto, Home Services, and Med Spa verticals.

## Features

- **Continuous Ingestion**: Automatically fetches and processes competitor information from multiple sources
- **AI-Powered Analysis**: Classifies and summarizes stories by vertical, competitor, and AI capability
- **Verification System**: Distinguishes between verified facts and unverified marketing claims
- **Executive Dashboard**: Clean, fast interface with priority-based story feed
- **Search & Filters**: Full-text search with filters by competitor, vertical, AI capability, and priority
- **Configurable**: Competitors and sources defined in YAML files - no code changes needed

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Background Jobs**: BullMQ + Redis (with cron fallback)
- **Auth**: JWT-based session management

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for background job queuing)

### Installation

1. **Clone and install dependencies**
   ```bash
   cd competitor-intelligence-radar
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Start background worker** (in a separate terminal)
   ```bash
   npm run worker
   ```

6. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | No | Redis connection for BullMQ (falls back to cron if not set) |
| `JWT_SECRET` | Yes | Secret key for JWT authentication |
| `OPENAI_API_KEY` | No | OpenAI API key for enhanced summaries |
| `NEWS_API_KEY` | No | News API key for additional sources |

## Configuration

### Competitors (`config/competitors.yaml`)

Define competitors to track:

```yaml
competitors:
  - name: ServiceTitan
    website: https://servicetitan.com
    verticals:
      - Home Services
    keywords:
      - field service management
      - HVAC software
      - Titan Intelligence
    category: FSM
```

### Sources (`config/sources.yaml`)

Define data sources:

```yaml
sources:
  - name: ServiceTitan Blog
    base_url: https://servicetitan.com/blog
    source_type: official
    trust_tier: HIGH
```

#### Source Types
- `official`: Company blogs, release notes, docs
- `industry`: Trade publications, industry news
- `reviews`: G2, Capterra, user reviews
- `jobs`: Career pages, hiring signals

#### Trust Tiers
- `HIGH`: Official docs, release notes
- `MEDIUM`: Reputable industry publications
- `LOW`: Reviews, forums, social media

## Ingestion Pipeline

The system runs five jobs in sequence:

1. **fetch_sources_job**: Pulls RSS feeds and web pages
2. **normalize_job**: Strips HTML, normalizes text, computes checksums
3. **dedupe_and_cluster_job**: Groups related stories together
4. **summarize_and_analyze_job**: AI analysis with priority and verification
5. **alerts_job**: Triggers user notifications

Default schedule: Every 6 hours

## AI Capability Taxonomy

Stories are tagged with AI capabilities:

- `AI_VOICE_AGENT` - Voice AI/phone agents
- `AI_CHAT_AGENT` - Chat bots and messaging AI
- `AI_LEAD_RESPONSE` - Automated lead follow-up
- `AI_SCHEDULING_BOOKING` - AI-powered scheduling
- `AI_DISPATCH_ROUTING` - Intelligent dispatch
- `AI_MARKETING_AUTOMATION` - AI marketing tools
- `AI_REPUTATION_REVIEWS` - Review management AI
- `AI_ANALYTICS_INSIGHTS` - Predictive analytics
- `AI_PAYMENTS_COLLECTIONS` - Payment automation
- `AI_WORKFLOW_AUTOMATION` - General workflow AI

## Priority System

- **P0 (Critical)**: Major AI launches, pricing changes, acquisitions
- **P1 (Important)**: Meaningful AI capability improvements
- **P2 (Monitor)**: Minor updates, routine news

## Verification Rules

AI claims are marked `VERIFIED` only when:
- Supported by official documentation (HIGH trust tier), OR
- Corroborated by 2+ independent sources

Otherwise marked as `CLAIM_UNVERIFIED`.

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/search` | GET | Search stories with filters |
| `/api/search/options` | GET | Get filter options |
| `/api/jobs` | GET | Get job run history |
| `/api/jobs/stats` | GET | Get system statistics |
| `/api/jobs/trigger` | POST | Manually trigger a job |

## Deployment

### Using Docker

```bash
docker build -t competitor-radar .
docker run -p 3000:3000 --env-file .env competitor-radar
```

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Run database migrations:
   ```bash
   npm run db:push
   ```

3. Start the production server:
   ```bash
   npm start
   ```

4. Start the worker (separate process):
   ```bash
   npm run worker
   ```

## Default Credentials

After seeding, log in with:
- Email: `admin@example.com`
- Password: `admin123`

**Important**: Change these credentials in production!

## Project Structure

```
├── config/                 # YAML configuration files
│   ├── competitors.yaml    # Competitor definitions
│   └── sources.yaml        # Data source definitions
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Database seeding script
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── dashboard/      # Main dashboard
│   │   ├── competitors/    # Competitor profiles
│   │   ├── stories/        # Story details
│   │   ├── search/         # Search interface
│   │   ├── admin/          # Admin panel
│   │   └── api/            # API routes
│   ├── components/         # React components
│   │   └── ui/             # shadcn/ui components
│   ├── lib/                # Shared utilities
│   │   ├── ai.ts           # AI analysis functions
│   │   ├── auth.ts         # Authentication
│   │   ├── config.ts       # Config loader
│   │   ├── db.ts           # Database client
│   │   ├── ingestion.ts    # Ingestion pipeline
│   │   ├── queue.ts        # Job queue
│   │   └── utils.ts        # Utilities
│   └── workers/            # Background worker
└── public/                 # Static assets
```

## License

Proprietary - All rights reserved
