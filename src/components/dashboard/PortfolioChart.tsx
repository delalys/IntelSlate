'use client';

import { Bar, ResponsiveBar } from '@nivo/bar';
import { Line, ResponsiveLine } from '@nivo/line';
import { useTranslations } from 'next-intl';
import { getThemeChartColor } from '@/theme-engine/chart-colors';
import { useTheme } from '@/theme-engine/ThemeProvider';

export interface IHistoricalDataPoint {
  date: string;
  value: number;
}

export interface IPortfolioChartProps {
  historicalData: IHistoricalDataPoint[];
  dailyChange?: number;
  className?: string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Optional timeframe label displayed at the bottom-left of the chart */
  chartTimeframe?: string;
  /** Fixed chart width (screenshot mode): disables client-side re-measuring
      so the SSR-rendered SVG never changes after hydration */
  defaultWidth?: number;
  /** Fixed chart height (screenshot mode), see defaultWidth */
  defaultHeight?: number;
}

/**
 * Reads --chart-line-color from the computed style of a given element.
 * Falls back to the JS-derived color when unavailable (e.g. in tests).
 */
function resolveChartColor(el: HTMLElement | null, fallback: string): string {
  if (!el) return fallback;
  const css = getComputedStyle(el)
    .getPropertyValue('--chart-line-color')
    .trim();
  return css || fallback;
}

export function PortfolioChart({
  historicalData,
  dailyChange = 0,
  className,
  margin = { top: 8, right: 0, bottom: 0, left: 0 },
  chartTimeframe,
  defaultWidth,
  defaultHeight,
}: IPortfolioChartProps) {
  const t = useTranslations('dashboard');
  const { themeId } = useTheme();
  const hasChartData = historicalData.length > 0;
  const chartLineVariant =
    dailyChange > 0 ? 'positive' : dailyChange < 0 ? 'negative' : 'neutral';
  const isBarChart = themeId === 'retro-ink';
  // Theme-aware so SSR (and the first client render) already matches what
  // resolveChartColor later reads from --chart-line-color
  const jsFallbackColor = getThemeChartColor(themeId, dailyChange);

  if (!hasChartData) {
    return (
      <figure
        data-testid="portfolio-chart"
        className={`flex h-full w-full items-center justify-center ${className ?? ''}`}
      >
        <p className="text-sm text-gray-500">{t('noHistoricalData')}</p>
      </figure>
    );
  }

  if (isBarChart) {
    const barData = historicalData.map((point) => ({
      id: point.date,
      value: point.value,
    }));
    const values = historicalData.map((p) => p.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const range = dataMax - dataMin;
    const padding = range > 0 ? range * 0.1 : Math.abs(dataMin) * 0.1 || 1;
    const valueScale = {
      type: 'linear' as const,
      min: dataMin - padding,
      max: dataMax + padding,
    };
    return (
      <BarChartFigure
        barData={barData}
        valueScale={valueScale}
        jsFallbackColor={jsFallbackColor}
        chartLineVariant={chartLineVariant}
        className={className}
        margin={margin}
        chartTimeframe={chartTimeframe}
        defaultWidth={defaultWidth}
        defaultHeight={defaultHeight}
      />
    );
  }

  const data = [
    {
      id: 'portfolio',
      data: historicalData.map((point) => ({
        x: point.date,
        y: point.value,
      })),
    },
  ];

  return (
    <LineChartFigure
      data={data}
      jsFallbackColor={jsFallbackColor}
      chartLineVariant={chartLineVariant}
      className={className}
      margin={margin}
      chartTimeframe={chartTimeframe}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
    />
  );
}

/**
 * Bar chart sub-component that resolves --chart-line-color from CSS
 * so retro-ink gets monochrome bars without any hardcoded color check.
 */
import { useCallback, useState } from 'react';

interface IBarChartFigureProps {
  barData: { id: string; value: number }[];
  valueScale: { type: 'linear'; min: number; max: number };
  jsFallbackColor: string;
  chartLineVariant: string;
  className?: string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  chartTimeframe?: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

function BarChartFigure({
  barData,
  valueScale,
  jsFallbackColor,
  chartLineVariant,
  className,
  margin,
  chartTimeframe,
  defaultWidth,
  defaultHeight,
}: IBarChartFigureProps) {
  const [chartColor, setChartColor] = useState(jsFallbackColor);

  const figureRef = useCallback(
    (node: HTMLElement | null) => {
      if (node) {
        setChartColor(resolveChartColor(node, jsFallbackColor));
      }
    },
    [jsFallbackColor],
  );

  return (
    <figure
      ref={figureRef}
      data-testid="portfolio-chart"
      data-chart-type="bar"
      data-chart-line={chartLineVariant}
      className={`relative h-full w-full filter-(--chart-shadow) ${className ?? ''}`}
      aria-label="Portfolio value chart"
    >
      {(() => {
        const chartProps = {
          data: barData,
          indexBy: 'id',
          keys: ['value'],
          valueScale,
          colors: [chartColor],
          enableLabel: false,
          enableGridX: false,
          enableGridY: false,
          axisTop: null,
          axisRight: null,
          axisBottom: null,
          axisLeft: null,
          isInteractive: false,
          animate: false,
          margin,
          padding: 0.2,
        };
        // Fixed size (screenshot mode): the chart is drawn at a known size
        // and stretched to the container by a wrapper svg's viewBox, so the
        // markup is correct without any client JS (TRMNL re-renders the
        // fetched HTML) and never shifts after hydration. foreignObject is
        // required because nivo wraps its svg in a div, which is invalid
        // (and dropped) directly inside svg.
        return defaultWidth && defaultHeight ? (
          <svg
            viewBox={`0 0 ${defaultWidth} ${defaultHeight}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block' }}
            aria-hidden="true"
          >
            <foreignObject
              x={0}
              y={0}
              width={defaultWidth}
              height={defaultHeight}
            >
              <Bar
                {...chartProps}
                width={defaultWidth}
                height={defaultHeight}
              />
            </foreignObject>
          </svg>
        ) : (
          <ResponsiveBar {...chartProps} />
        );
      })()}
      {chartTimeframe && (
        <div className="chart-timeframe absolute bottom-2 left-4 text-xs font-medium">
          {chartTimeframe}
        </div>
      )}
    </figure>
  );
}

/**
 * Line chart sub-component that resolves --chart-line-color from CSS.
 */
interface ILineChartFigureProps {
  data: { id: string; data: { x: string; y: number }[] }[];
  jsFallbackColor: string;
  chartLineVariant: string;
  className?: string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  chartTimeframe?: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

function LineChartFigure({
  data,
  jsFallbackColor,
  chartLineVariant,
  className,
  margin,
  chartTimeframe,
  defaultWidth,
  defaultHeight,
}: ILineChartFigureProps) {
  const [chartColor, setChartColor] = useState(jsFallbackColor);

  const figureRef = useCallback(
    (node: HTMLElement | null) => {
      if (node) {
        setChartColor(resolveChartColor(node, jsFallbackColor));
      }
    },
    [jsFallbackColor],
  );

  const colorId = chartColor.replace('#', '');
  const gradientId = `areaGradient-${colorId}`;

  return (
    <figure
      ref={figureRef}
      data-testid="portfolio-chart"
      data-chart-type="line"
      data-chart-line={chartLineVariant}
      className={`relative h-full w-full filter-(--chart-shadow) ${className ?? ''}`}
      aria-label="Portfolio value chart"
    >
      {(() => {
        const chartProps = {
          data,
          yScale: {
            type: 'linear' as const,
            min: 'auto' as const,
            max: 'auto' as const,
            stacked: false,
            reverse: false,
          },
          curve: 'monotoneX' as const,
          enableArea: true,
          areaOpacity: 1,
          colors: [chartColor],
          lineWidth: 2,
          enablePoints: false,
          enableGridX: false,
          enableGridY: false,
          axisTop: null,
          axisRight: null,
          axisBottom: null,
          axisLeft: null,
          isInteractive: false,
          animate: false,
          margin,
          defs: [
            {
              id: gradientId,
              type: 'linearGradient' as const,
              colors: [
                { offset: 0, color: chartColor, opacity: 0.1 },
                { offset: 100, color: chartColor, opacity: 0 },
              ],
            },
          ],
          fill: [{ match: '*' as const, id: gradientId }],
        };
        // Fixed size (screenshot mode): the chart is drawn at a known size
        // and stretched to the container by a wrapper svg's viewBox, so the
        // markup is correct without any client JS (TRMNL re-renders the
        // fetched HTML) and never shifts after hydration. foreignObject is
        // required because nivo wraps its svg in a div, which is invalid
        // (and dropped) directly inside svg.
        return defaultWidth && defaultHeight ? (
          <svg
            viewBox={`0 0 ${defaultWidth} ${defaultHeight}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block' }}
            aria-hidden="true"
          >
            <foreignObject
              x={0}
              y={0}
              width={defaultWidth}
              height={defaultHeight}
            >
              <Line
                {...chartProps}
                width={defaultWidth}
                height={defaultHeight}
              />
            </foreignObject>
          </svg>
        ) : (
          <ResponsiveLine {...chartProps} />
        );
      })()}
      {chartTimeframe && (
        <div className="chart-timeframe absolute bottom-2 left-4 text-xs font-medium">
          {chartTimeframe}
        </div>
      )}
    </figure>
  );
}
