/**
 * Prisma Seed Script
 * Creates a hardcoded user for MVP development and testing,
 * and seeds 30 days of portfolio snapshots.
 *
 * Run with: npm run db:seed
 */

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Create PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create adapter and Prisma client
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Hardcoded MVP user configuration
const MVP_USER = {
  email: 'thomas@intelslate.local',
};

// Number of days of portfolio history to seed
const SNAPSHOT_DAYS = 30;

// Demo mode stock definitions
const DEMO_STOCKS = [
  { ticker: 'TSLA', buyPrice: 220.0, quantity: 10, domain: 'tesla.com' },
  { ticker: 'AAPL', buyPrice: 175.0, quantity: 15, domain: 'apple.com' },
  { ticker: 'SFTBY', buyPrice: 21.0, quantity: 50, domain: 'softbank.co.jp' },
  { ticker: 'NVDA', buyPrice: 800.0, quantity: 5, domain: 'nvidia.com' },
  { ticker: 'META', buyPrice: 480.0, quantity: 8, domain: 'meta.com' },
];

/**
 * Seed 30 days of portfolio snapshots based on current stocks + market data.
 * Uses a random walk backwards from today's calculated portfolio value,
 * with daily changes between -1.8% and +1.8% to create realistic history.
 */
async function seedPortfolioSnapshots(userId: string): Promise<void> {
  console.log('\n📊 Seeding portfolio snapshots...');

  // Fetch user's stocks
  const stocks = await prisma.stock.findMany({
    where: { userId },
  });

  if (stocks.length === 0) {
    console.log('   ⏭️  No stocks found — skipping portfolio snapshots.');
    return;
  }

  // Fetch current market data for those tickers
  const tickers = stocks.map((s) => s.ticker);
  const marketData = await prisma.marketData.findMany({
    where: { ticker: { in: tickers } },
  });

  const marketDataMap = new Map(marketData.map((m) => [m.ticker, m]));

  // Calculate today's portfolio value from real positions
  const todayValue = stocks.reduce((sum, stock) => {
    const marketEntry = marketDataMap.get(stock.ticker);
    const price = marketEntry?.price ?? stock.buyPrice;
    return sum + price * stock.quantity;
  }, 0);

  if (todayValue <= 0) {
    console.log('   ⏭️  Portfolio value is 0 — skipping snapshots.');
    return;
  }

  console.log(`   Current portfolio value: €${todayValue.toFixed(2)}`);

  // Deterministic seed for reproducible yet natural-looking data
  let rngState = 42;
  function seededRandom(): number {
    rngState = (rngState * 1664525 + 1013904223) & 0x7fffffff;
    return rngState / 0x7fffffff;
  }

  // Build daily values walking backwards from today
  const dailyValues: { date: string; totalValue: number }[] = [];
  let value = todayValue;

  for (let daysAgo = 0; daysAgo < SNAPSHOT_DAYS; daysAgo++) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split('T')[0];

    dailyValues.push({ date: dateStr, totalValue: value });

    // Random daily change: -1.8% to +1.8% (slightly biased positive for realism)
    const dailyChange = (seededRandom() - 0.48) * 0.036;
    value = value / (1 + dailyChange);
  }

  // Reverse so oldest date comes first
  dailyValues.reverse();

  // Upsert all snapshots
  let created = 0;
  let updated = 0;

  for (const snap of dailyValues) {
    const result = await prisma.portfolioSnapshot.upsert({
      where: { userId_date: { userId, date: snap.date } },
      update: { totalValue: snap.totalValue },
      create: {
        userId,
        date: snap.date,
        totalValue: snap.totalValue,
      },
    });

    // If createdAt is very recent, it was just created (not a perfect check, but good enough)
    if (result.createdAt.getTime() > Date.now() - 2000) {
      created++;
    } else {
      updated++;
    }
  }

  const oldest = dailyValues[0];
  const newest = dailyValues[dailyValues.length - 1];
  const totalChange = newest.totalValue - oldest.totalValue;
  const totalChangePercent = (totalChange / oldest.totalValue) * 100;

  console.log(
    `   ✅ Portfolio snapshots seeded: ${created} created, ${updated} updated`,
  );
  console.log(
    `   📅 Range: ${oldest.date} → ${newest.date} (${SNAPSHOT_DAYS} days)`,
  );
  console.log(
    `   📈 Value range: €${oldest.totalValue.toFixed(2)} → €${newest.totalValue.toFixed(2)} (${totalChangePercent >= 0 ? '+' : ''}${totalChangePercent.toFixed(2)}%)`,
  );
}

/**
 * Seed demo stocks for the given user.
 */
async function seedDemoStocks(userId: string): Promise<void> {
  console.log('\n📈 Seeding demo stocks...');
  for (const stock of DEMO_STOCKS) {
    await prisma.stock.upsert({
      where: { userId_ticker: { userId, ticker: stock.ticker } },
      update: {
        buyPrice: stock.buyPrice,
        quantity: stock.quantity,
        logoUrl: `/api/logo/${stock.domain}`,
      },
      create: {
        userId,
        ticker: stock.ticker,
        buyPrice: stock.buyPrice,
        quantity: stock.quantity,
        logoUrl: `/api/logo/${stock.domain}`,
      },
    });
    console.log(`   ✅ ${stock.ticker}`);
  }
}

/**
 * Seed demo market data with a random-walk historical series.
 */
async function seedDemoMarketData(): Promise<void> {
  console.log('\n📊 Seeding demo market data...');

  let rngState = 99;
  function seededRandom(): number {
    rngState = (rngState * 1664525 + 1013904223) & 0x7fffffff;
    return rngState / 0x7fffffff;
  }

  for (const stock of DEMO_STOCKS) {
    // Build 30-day random-walk historical data
    const historicalData: { date: string; close: number }[] = [];
    let price = stock.buyPrice;

    for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      const dateStr = d.toISOString().split('T')[0];
      const dailyChange = (seededRandom() - 0.48) * 0.04;
      price = price * (1 + dailyChange);
      historicalData.push({
        date: dateStr,
        close: Math.round(price * 100) / 100,
      });
    }

    const currentPrice = historicalData[historicalData.length - 1].close;
    const previousClose = Math.round(currentPrice * 0.99 * 100) / 100;
    const change = Math.round((currentPrice - previousClose) * 100) / 100;
    const changePercent = Math.round((change / previousClose) * 10000) / 100;

    await prisma.marketData.upsert({
      where: { ticker: stock.ticker },
      update: {
        price: currentPrice,
        previousClose,
        change,
        changePercent,
        historicalData,
      },
      create: {
        ticker: stock.ticker,
        price: currentPrice,
        previousClose,
        change,
        changePercent,
        historicalData,
      },
    });
    console.log(`   ✅ ${stock.ticker} — price: ${currentPrice}`);
  }
}

/**
 * Seed demo settings into SystemConfig.
 */
async function seedDemoSettings(): Promise<void> {
  console.log('\n⚙️  Seeding demo settings...');

  const settings: { key: string; value: string }[] = [
    { key: 'chart.portfolio.timeframe', value: '1mo' },
    { key: 'chart.portfolio.change', value: '1mo' },
    { key: 'chart.ticker.timeframe', value: '1mo' },
    { key: 'chart.ticker.change', value: '1d' },
    { key: 'chart.gauge.change', value: '1d' },
    { key: 'app.theme', value: 'retro-ink' },
  ];

  for (const setting of settings) {
    await prisma.systemConfig.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
    console.log(`   ✅ ${setting.key} = ${setting.value}`);
  }
}

/**
 * Seed demo news cache with dummy articles and summaries.
 */
async function seedDemoNews(): Promise<void> {
  console.log('\n📰 Seeding demo news...');

  const demoNews: {
    ticker: string;
    articles: { title: string; content: string; summary: string }[];
  }[] = [
    {
      ticker: 'TSLA',
      articles: [
        {
          title:
            'Tesla expands Megapack production to meet grid storage demand',
          content: 'Tesla energy division ramps up production.',
          summary:
            'Tesla is scaling Megapack manufacturing capacity to address surging demand for grid-scale battery storage solutions.',
        },
        {
          title: 'Tesla FSD v13 rolls out with improved city driving',
          content: 'New software update for Full Self-Driving.',
          summary:
            'Full Self-Driving version 13 introduces enhanced urban navigation and reduced intervention rates across the fleet.',
        },
      ],
    },
    {
      ticker: 'AAPL',
      articles: [
        {
          title: 'Apple Vision Pro gains enterprise traction',
          content: 'Enterprise adoption accelerates for spatial computing.',
          summary:
            'Fortune 500 companies are adopting Vision Pro for design reviews and remote collaboration, driving enterprise revenue.',
        },
      ],
    },
    {
      ticker: 'NVDA',
      articles: [
        {
          title: 'NVIDIA Blackwell GPUs see record data center orders',
          content: 'Next-gen GPU demand exceeds supply.',
          summary:
            'Blackwell architecture GPUs are seeing unprecedented demand from hyperscalers, with order backlogs extending into next quarter.',
        },
        {
          title: 'NVIDIA partners with sovereign AI initiatives',
          content: 'Government AI infrastructure deals expand.',
          summary:
            'Multiple governments are partnering with NVIDIA to build domestic AI compute infrastructure, diversifying revenue streams.',
        },
      ],
    },
    {
      ticker: 'META',
      articles: [
        {
          title: 'Meta AI assistant reaches 1B monthly users',
          content: 'AI integration across Meta platforms grows.',
          summary:
            'Meta AI surpasses one billion monthly active users across WhatsApp, Instagram and Facebook, boosting engagement metrics.',
        },
      ],
    },
  ];

  for (const entry of demoNews) {
    await prisma.newsCache.upsert({
      where: { ticker: entry.ticker },
      update: { articles: entry.articles },
      create: { ticker: entry.ticker, articles: entry.articles },
    });
    console.log(`   ✅ ${entry.ticker} — ${entry.articles.length} article(s)`);
  }
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Upsert the MVP user (create if not exists, otherwise update)
  const user = await prisma.user.upsert({
    where: { email: MVP_USER.email },
    update: {}, // No updates needed if user exists
    create: {
      email: MVP_USER.email,
    },
  });

  console.log(`✅ MVP user seeded successfully:`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Created: ${user.createdAt.toISOString()}`);

  // Seed default system config for pipeline timing
  const pipelineConfig = await prisma.systemConfig.upsert({
    where: { key: 'PIPELINE_START_HOUR' },
    update: {}, // No updates needed if config exists
    create: {
      key: 'PIPELINE_START_HOUR',
      value: '6', // 6 AM default
    },
  });

  console.log(`✅ System config seeded successfully:`);
  console.log(`   Key: ${pipelineConfig.key}`);
  console.log(`   Value: ${pipelineConfig.value}`);

  // Demo mode: seed stocks, market data, and settings
  const isDemoMode = process.env.DEMO_MODE === 'true';
  if (isDemoMode) {
    console.log('\n🎭 Demo mode enabled — seeding demo data...');
    await seedDemoStocks(user.id);
    await seedDemoMarketData();
    await seedDemoNews();
    await seedDemoSettings();
  }

  // Seed 30 days of portfolio snapshots
  await seedPortfolioSnapshots(user.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n🌱 Seed completed successfully!');
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
