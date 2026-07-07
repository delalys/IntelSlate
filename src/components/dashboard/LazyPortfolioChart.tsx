'use client';

import dynamic from 'next/dynamic';
import type { IPortfolioChartProps } from './PortfolioChart';

const PortfolioChartNoSsr = dynamic(
  () => import('./PortfolioChart').then((mod) => mod.PortfolioChart),
  { ssr: false },
);

// Pre-rendered variant for screenshot mode: the chart SVG is part of the
// initial HTML so headless captures (TRMNL) see it without running JS.
const PortfolioChartSsr = dynamic(() =>
  import('./PortfolioChart').then((mod) => mod.PortfolioChart),
);

export interface ILazyPortfolioChartProps extends IPortfolioChartProps {
  /** Render the chart during SSR (screenshot mode) */
  ssr?: boolean;
}

export function LazyPortfolioChart({
  ssr = false,
  ...props
}: ILazyPortfolioChartProps) {
  const Chart = ssr ? PortfolioChartSsr : PortfolioChartNoSsr;
  return <Chart {...props} />;
}
