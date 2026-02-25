/**
 * Test utilities: next-intl provider wrapper for component tests.
 */

import type { ReactElement, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

const defaultMessages = {
  common: {
    loading: 'Loading...',
    error: 'Something went wrong',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
  },
  app: {
    title: 'IntelSlate',
    description: 'Stock portfolio intelligence dashboard',
  },
  dashboard: {
    noHistoricalData: 'No historical data yet',
    dataUnavailable: 'Data unavailable',
    openConfiguration: 'Open configuration',
    portfolioZone: 'Portfolio zone',
    bullWatermark: 'Bull watermark',
    bearWatermark: 'Bear watermark',
    justNow: 'Just now',
    relativeTime: {
      justNow: 'just now',
      fewMinutesAgo: 'a few minutes ago',
      minutesAgo: '{count} minutes ago',
      oneHourAgo: '1 hour ago',
      hoursAgo: '{count} hours ago',
      yesterday: 'yesterday',
      daysAgo: '{count} days ago',
    },
  },
  config: {
    searchFailed: 'Search failed',
    stockSearch: 'Stock search',
    deleteStock: 'Delete stock',
    pipelineFailed: 'Pipeline failed',
    quantityPlaceholder: '0',
    stockAddedNewsFetchFailed: 'Stock added, but news fetch failed: {error}',
  },
} as Record<string, Record<string, unknown>>;

export function NextIntlWrapper({
  children,
  messages = defaultMessages,
}: {
  children: ReactNode;
  messages?: Record<string, Record<string, unknown>>;
}): ReactElement {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
