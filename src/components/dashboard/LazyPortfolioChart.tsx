'use client';

import dynamic from 'next/dynamic';
import type { IPortfolioChartProps } from './PortfolioChart';

const PortfolioChart = dynamic(
  () => import('./PortfolioChart').then((mod) => mod.PortfolioChart),
  { ssr: false },
);

export function LazyPortfolioChart(props: IPortfolioChartProps) {
  return <PortfolioChart {...props} />;
}
