/**
 * Canonical mock/demo portfolio data.
 *
 * This is the "reset" state for the public demo instance — visitors can
 * freely add/edit/remove stocks via the UI, but nothing here is real
 * financial data, so it's safe to snap back to this on a schedule.
 *
 * Keep in sync with DEMO_STOCKS / seedDemoSettings in prisma/seed.ts —
 * duplicated rather than shared because prisma/seed.ts runs outside the
 * src/ module resolution context.
 */

export interface IDemoStock {
  ticker: string;
  buyPrice: number;
  quantity: number;
  domain: string;
}

export const DEMO_STOCKS: IDemoStock[] = [
  { ticker: 'TSLA', buyPrice: 220.0, quantity: 10, domain: 'tesla.com' },
  { ticker: 'AAPL', buyPrice: 175.0, quantity: 15, domain: 'apple.com' },
  { ticker: 'SFTBY', buyPrice: 21.0, quantity: 50, domain: 'softbank.co.jp' },
  { ticker: 'NVDA', buyPrice: 800.0, quantity: 5, domain: 'nvidia.com' },
  { ticker: 'META', buyPrice: 480.0, quantity: 8, domain: 'meta.com' },
];

export const DEMO_SYSTEM_CONFIG: { key: string; value: string }[] = [
  { key: 'chart.portfolio.timeframe', value: '1mo' },
  { key: 'chart.portfolio.change', value: '1mo' },
  { key: 'chart.ticker.timeframe', value: '1mo' },
  { key: 'chart.ticker.change', value: '1d' },
  { key: 'chart.gauge.change', value: '1d' },
  { key: 'app.theme', value: 'retro-ink' },
];
