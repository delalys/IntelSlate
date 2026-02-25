'use server';

import type { IStockQuote } from '@/lib/api/yahooFinanceClient';
import { getDefaultYahooFinanceClient } from '@/lib/api/yahooFinanceClient';

export async function getStockQuote(
  ticker: string,
): Promise<IStockQuote | null> {
  const client = getDefaultYahooFinanceClient();
  return client.getQuote(ticker);
}
