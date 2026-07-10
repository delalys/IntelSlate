<img width="3021" height="2835" alt="IMG_2122" src="https://github.com/user-attachments/assets/0c1be1b3-e1ce-4f6c-b416-55023311db6e" />


# IntelSlate

Stock portfolio app with AI news intelligence for e-ink terminals

### >>> [Live Demo](http://51.68.225.198:3000/en) <<<

## Project Overview

  IntelSlate is a stock portfolio dashboard that tracks stocks with live market data and AI-generated news summaries — designed and optimised for the sepecific requirements of an e-ink terminals (TRMNL device).

  The app fetches stock prices hourly, selects tickers with significant moves, pulls relevant news articles, and summarizes them daily using Claude AI. Two
  complete themes ship out of the box — a retro-ink theme built specifically for e-ink hardware and a default one. The frontend is fully
  server-rendered and cached so an e-ink device can wake, screenshot, and sleep in under a second.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Styling:** Tailwind CSS
- **AI Integration:** OpenAI API (GPT-4o-mini)
- **Email:** Resend
- **Hosting:** Vercel with Vercel Cron

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud)
- OpenAI API key
- Resend API key (for email delivery)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd IntelSlate
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration values.

4. Set up the database:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
IntelSlate/
├── prisma/                    # Database schema and migrations
│   ├── migrations/            # Database migration files
│   ├── schema.prisma          # Prisma schema definition
│   └── seed.ts                # Database seeding script
│
├── public/                    # Static assets
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   └── cron/          # Cron job endpoints (scheduled tasks)
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   │
│   ├── components/            # React components
│   │   ├── dashboard/         # Server Components (dashboard views)
│   │   └── config/            # Client Components (configuration UI)
│   │
│   ├── actions/               # Server Actions (form submissions, mutations)
│   │
│   ├── lib/                   # Shared utilities and services
│   │   ├── api/               # External API clients (OpenAI, news sources)
│   │   ├── utils/             # Helper functions
│   │   └── prisma.ts          # Prisma client instance
│   │
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts           # Central type exports
│   │
│   └── schemas/               # Zod validation schemas
│
├── .env.example               # Environment variable template
├── docker-compose.yml         # Docker configuration for PostgreSQL
├── next.config.ts             # Next.js configuration
├── prisma.config.ts           # Prisma configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Project dependencies
```

## Directory Conventions

### Components
- **`src/components/dashboard/`** - Server Components for read-only dashboard views
- **`src/components/config/`** - Client Components for interactive configuration UI
- Naming: **PascalCase** (e.g., `BriefingCard.tsx`, `TopicSelector.tsx`)

### Server Actions
- **`src/actions/`** - Server Actions for form handling and data mutations
- Naming: **camelCase** with action suffix (e.g., `createTopic.ts`, `updateSource.ts`)

### Library Code
- **`src/lib/api/`** - External service clients (OpenAI, RSS feeds, news APIs)
- **`src/lib/utils/`** - Pure utility functions
- Naming: **camelCase** (e.g., `formatDate.ts`, `openaiClient.ts`)

### Types & Schemas
- **`src/types/`** - TypeScript interfaces and type definitions
- **`src/schemas/`** - Zod schemas for runtime validation
- Naming: **camelCase** for files, **PascalCase** for types

### API Routes
- **`src/app/api/`** - API endpoints following Next.js App Router conventions
- **`src/app/api/cron/`** - Vercel Cron job endpoints

## Environment Variables

See `.env.example` for required environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI API key for LLM integration |
| `RESEND_API_KEY` | Resend API key for email delivery |
| `CRON_AUTH_TOKEN` | Optional bearer token for cron endpoint auth |

## VPS Cron Schedule

If you are deploying to a VPS (instead of Vercel Cron), add these jobs with `crontab -e`.
The examples below assume your server runs on UTC. If your VPS uses a different timezone,
convert the schedule accordingly (JST = UTC + 9; 6:00 AM JST = 21:00 UTC on the previous day).

```cron
55 * * * * curl -s -X POST https://your-domain.com/api/cron/stocks >> /var/log/intelslate-cron.log 2>&1
0 21 * * * curl -s -X POST https://your-domain.com/api/cron/news >> /var/log/intelslate-cron.log 2>&1
5 21 * * * curl -s -X POST https://your-domain.com/api/cron/summarize >> /var/log/intelslate-cron.log 2>&1
```

Timing rationale:
- Stocks at :55 so data is ready before the TRMNL hourly screenshot
- News at 6:00 AM JST (21:00 UTC) for fresh morning headlines
- Summaries at 6:05 AM JST to run after news is fetched

Optional auth token:
- Set `CRON_AUTH_TOKEN` in your environment to require authorization.
- Add the header to each cron request: `Authorization: Bearer <token>`.
  Example:
  `curl -s -X POST -H "Authorization: Bearer <token>" https://your-domain.com/api/cron/stocks`

Logs are appended to `/var/log/intelslate-cron.log`.

## Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma database GUI
npx prisma migrate   # Run database migrations
npx prisma db seed   # Seed the database
```

## Architecture Overview

IntelSlate follows a modular architecture:

1. **Data Layer** - Prisma ORM with PostgreSQL for persistent storage
2. **API Layer** - Next.js API routes and Server Actions
3. **UI Layer** - React components with Server/Client split
4. **Integration Layer** - External API clients for news and AI services
5. **Scheduling Layer** - Vercel Cron for automated briefing generation

## License

MIT
