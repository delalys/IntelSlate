/**
 * Regenerate 30 days of coherent portfolio snapshots.
 *
 * Deletes all existing snapshots for the MVP user, then creates
 * a realistic random-walk history anchored to today's actual
 * portfolio value (stocks x current market prices).
 *
 * Run with:  npm run reseed-snapshots
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const MVP_USER_EMAIL = 'thomas@intelslate.local';
const SNAPSHOT_DAYS = 30;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function seededRandom(): () => number {
  let state = Date.now() & 0x7fffffff;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

async function run(): Promise<void> {
  const random = seededRandom();

  const user = await prisma.user.findUnique({
    where: { email: MVP_USER_EMAIL },
  });
  if (!user) {
    console.error(`User ${MVP_USER_EMAIL} not found. Run the full seed first.`);
    process.exit(1);
  }

  const stocks = await prisma.stock.findMany({ where: { userId: user.id } });
  if (stocks.length === 0) {
    console.error('No stocks found — add stocks before seeding snapshots.');
    process.exit(1);
  }

  const tickers = stocks.map((s) => s.ticker);
  const marketData = await prisma.marketData.findMany({
    where: { ticker: { in: tickers } },
  });
  const priceMap = new Map(marketData.map((m) => [m.ticker, m.price]));

  const todayValue = stocks.reduce((sum, s) => {
    const price = priceMap.get(s.ticker) ?? s.buyPrice;
    return sum + price * s.quantity;
  }, 0);

  if (todayValue <= 0) {
    console.error('Portfolio value is 0 — refresh market data first.');
    process.exit(1);
  }

  // Delete existing snapshots
  const deleted = await prisma.portfolioSnapshot.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted ${deleted.count} old snapshots.`);

  // Walk backwards from today's value with daily swings of -2% to +2%
  const rows: { date: string; totalValue: number }[] = [];
  let value = todayValue;

  for (let daysAgo = 0; daysAgo < SNAPSHOT_DAYS; daysAgo++) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    rows.push({
      date: d.toISOString().split('T')[0],
      totalValue: Math.round(value * 100) / 100,
    });

    const swing = (random() - 0.47) * 0.04;
    value = value / (1 + swing);
  }

  rows.reverse();

  // Batch insert
  await prisma.portfolioSnapshot.createMany({
    data: rows.map((r) => ({
      userId: user.id,
      date: r.date,
      totalValue: r.totalValue,
    })),
  });

  const first = rows[0];
  const last = rows[rows.length - 1];
  const changePct =
    ((last.totalValue - first.totalValue) / first.totalValue) * 100;

  console.log(`Created ${rows.length} snapshots.`);
  console.log(
    `Range: ${first.date} -> ${last.date}  |  ` +
      `${first.totalValue.toFixed(2)} -> ${last.totalValue.toFixed(2)}  ` +
      `(${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`,
  );
}

run()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
