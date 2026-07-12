/**
 * PortfolioGauge Component
 *
 * Custom SVG octagonal gauge that visualizes portfolio change percentage
 * across 6 performance band sections along a partial octagonal path.
 * All sections use filled style with progressive grayscale coloring.
 */

import { ChangeIndicator } from '@/components/ui/ChangeIndicator';

// =============================================================================
// Types
// =============================================================================

export interface IPortfolioGaugeProps {
  changePercent: number;
  timeframe?: string;
  className?: string;
}

interface IPoint {
  x: number;
  y: number;
}

interface IGaugeSection {
  min: number;
  max: number;
  color: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Number of polygon sides (8 = octagon, 6 = hexagon, etc.) */
const SIDES = 8;

/** Rounded corner radius in SVG units */
const CORNER_RADIUS = 4;

/** Outer ring radius */
const OUTER_RADIUS = 44;

/** Inner ring radius (controls ring thickness) */
const INNER_RADIUS = 30;

/** Fraction of perimeter where gauge starts (top-right vertex) */
const GAUGE_START = 0.125;

/** Fraction of perimeter where gauge ends (top-left vertex, 6 sides covered) */
const GAUGE_END = 0.875;

/** Gap between sections as a fraction of perimeter (creates visible dividers) */
const SECTION_GAP = 0.006;

/** SVG center point */
const CENTER: IPoint = { x: 50, y: 50 };

/** Fill color for inactive (empty) sections */
const INACTIVE_COLOR = '#dbdbd8';

/**
 * 6 performance band sections with progressive grayscale palette.
 * Colors go light → dark: the strongest section is the darkest.
 * Inactive sections use #dbdbd8.
 */
const GAUGE_SECTIONS: IGaugeSection[] = [
  { min: -Infinity, max: -3, color: '#7e7e7c' },
  { min: -3, max: 0, color: '#626260' },
  { min: 0, max: 3, color: '#474745' },
  { min: 3, max: 5, color: '#2d2d2c' },
  { min: 5, max: 10, color: '#161615' },
  { min: 10, max: Infinity, color: '#030303' },
];

// =============================================================================
// SVG Geometry Helpers (pure functions)
// =============================================================================

/**
 * Compute vertices of a regular polygon centered at `center`.
 * Vertices are counter-clockwise starting from the top (angle offset -π/2),
 * with Y-axis mirrored so the gauge opening faces downward.
 */
function getPolygonVertices(
  sides: number,
  radius: number,
  center: IPoint,
): IPoint[] {
  const vertices: IPoint[] = [];
  const angleStep = (2 * Math.PI) / sides;
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < sides; i++) {
    const angle = startAngle - i * angleStep;
    vertices.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y - radius * Math.sin(angle),
    });
  }

  return vertices;
}

/**
 * Interpolate a point along the polygon edge at a given fraction (0–1)
 * of the total perimeter.
 */
function getPointOnPolygon(vertices: IPoint[], fraction: number): IPoint {
  const sides = vertices.length;
  const totalFraction = ((fraction % 1) + 1) % 1;
  const exactSide = totalFraction * sides;
  const sideIndex = Math.floor(exactSide);
  const t = exactSide - sideIndex;

  const p1 = vertices[sideIndex % sides];
  const p2 = vertices[(sideIndex + 1) % sides];

  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

/**
 * Build a rounded corner path segment from vertex `prev` through `current`
 * to `next` using a quadratic Bezier curve.
 */
function getRoundedCorner(
  prev: IPoint,
  current: IPoint,
  next: IPoint,
  radius: number,
): { start: IPoint; control: IPoint; end: IPoint } {
  const dx1 = prev.x - current.x;
  const dy1 = prev.y - current.y;
  const dx2 = next.x - current.x;
  const dy2 = next.y - current.y;

  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  const maxRadius = Math.min(len1, len2) / 2;
  const r = Math.min(radius, maxRadius);

  return {
    start: {
      x: current.x + (dx1 / len1) * r,
      y: current.y + (dy1 / len1) * r,
    },
    control: current,
    end: {
      x: current.x + (dx2 / len2) * r,
      y: current.y + (dy2 / len2) * r,
    },
  };
}

/**
 * Build a closed SVG path for a ring segment (wedge) between two radial
 * fractions on the polygon perimeter.
 *
 * The segment is a closed polygon formed by:
 *   outer edge → end radial → inner edge (reversed) → start radial
 *
 * Intermediate polygon vertices that fall within the fraction range are
 * included with rounded corners.
 */
function getPathSegment(
  outerVertices: IPoint[],
  innerVertices: IPoint[],
  cornerRadius: number,
  startFraction: number,
  endFraction: number,
): string {
  const sides = outerVertices.length;

  const outerStart = getPointOnPolygon(outerVertices, startFraction);
  const outerEnd = getPointOnPolygon(outerVertices, endFraction);
  const innerStart = getPointOnPolygon(innerVertices, startFraction);
  const innerEnd = getPointOnPolygon(innerVertices, endFraction);

  // Collect intermediate outer vertices between start and end fractions
  const outerMidPoints: IPoint[] = [];
  for (let i = 0; i < sides; i++) {
    const vertexFraction = i / sides;
    if (vertexFraction > startFraction && vertexFraction < endFraction) {
      outerMidPoints.push(outerVertices[i]);
    }
  }

  // Collect intermediate inner vertices (reversed for path direction)
  const innerMidPoints: IPoint[] = [];
  for (let i = 0; i < sides; i++) {
    const vertexFraction = i / sides;
    if (vertexFraction > startFraction && vertexFraction < endFraction) {
      innerMidPoints.push(innerVertices[i]);
    }
  }
  innerMidPoints.reverse();

  // Build outer edge path points
  const outerPoints = [outerStart, ...outerMidPoints, outerEnd];
  // Build inner edge path points (reversed direction)
  const innerPoints = [innerEnd, ...innerMidPoints, innerStart];

  // Build SVG path with rounded corners at intermediate vertices
  const allPoints = [...outerPoints, ...innerPoints];

  let d = `M ${allPoints[0].x.toFixed(2)} ${allPoints[0].y.toFixed(2)}`;

  for (let i = 1; i < allPoints.length; i++) {
    const prev = allPoints[i - 1];
    const current = allPoints[i];
    const next = allPoints[(i + 1) % allPoints.length];

    // Apply rounding at intermediate polygon vertices only
    const isIntermediateOuter =
      i > 0 && i < outerPoints.length - 1 && outerMidPoints.includes(current);
    const isIntermediateInner =
      i >= outerPoints.length &&
      i < allPoints.length - 1 &&
      innerMidPoints.includes(current);

    if ((isIntermediateOuter || isIntermediateInner) && cornerRadius > 0) {
      const corner = getRoundedCorner(prev, current, next, cornerRadius);
      d += ` L ${corner.start.x.toFixed(2)} ${corner.start.y.toFixed(2)}`;
      d += ` Q ${corner.control.x.toFixed(2)} ${corner.control.y.toFixed(2)} ${corner.end.x.toFixed(2)} ${corner.end.y.toFixed(2)}`;
    } else {
      d += ` L ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
    }
  }

  d += ' Z';
  return d;
}

// =============================================================================
// Active Section Logic
// =============================================================================

/**
 * Determine which section index the change percent falls into.
 * Returns index clamped to [0, sections.length - 1].
 * NaN/Infinity values are treated as 0.
 */
function getActiveSectionIndex(
  changePercent: number,
  sections: IGaugeSection[],
): number {
  const safePercent = Number.isFinite(changePercent) ? changePercent : 0;

  for (let i = 0; i < sections.length; i++) {
    if (safePercent >= sections[i].min && safePercent < sections[i].max) {
      return i;
    }
  }

  // Value at or above last section max → last section
  return sections.length - 1;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Format the change percent with sign and 1 decimal.
 */
function formatSignedPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (safe === 0) return '0.0%';
  const sign = safe > 0 ? '+' : '';
  return `${sign}${safe.toFixed(1)}%`;
}

export function PortfolioGauge({
  changePercent,
  timeframe,
  className,
}: IPortfolioGaugeProps) {
  const outerVertices = getPolygonVertices(SIDES, OUTER_RADIUS, CENTER);
  const innerVertices = getPolygonVertices(SIDES, INNER_RADIUS, CENTER);

  const activeSectionIndex = getActiveSectionIndex(
    changePercent,
    GAUGE_SECTIONS,
  );

  const gaugeSpan = GAUGE_END - GAUGE_START;
  const totalGap = SECTION_GAP * (GAUGE_SECTIONS.length - 1);
  const sectionSpan = (gaugeSpan - totalGap) / GAUGE_SECTIONS.length;

  const safePercent = Number.isFinite(changePercent) ? changePercent : 0;

  return (
    <figure
      data-testid="portfolio-gauge"
      aria-label="Portfolio change gauge"
      className={`relative h-full pt-5 sm:p-8 lg:p-0 ${className ?? ''}`}
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Portfolio change gauge"
        className="relative top-[1em] h-full w-auto aspect-square"
      >
        {/* Gauge sections */}
        {GAUGE_SECTIONS.map((section, index) => {
          const sectionStart =
            GAUGE_START + index * (sectionSpan + SECTION_GAP);
          const sectionEnd = sectionStart + sectionSpan;
          const isActive = index <= activeSectionIndex;
          const fillColor = isActive ? section.color : INACTIVE_COLOR;
          const sectionKey = `${section.min}-${section.max}`;

          const d = getPathSegment(
            outerVertices,
            innerVertices,
            CORNER_RADIUS,
            sectionStart,
            sectionEnd,
          );

          return (
            <path
              key={sectionKey}
              data-testid={`gauge-section-${index}`}
              d={d}
              fill={fillColor}
            />
          );
        })}
      </svg>

      {/* Center content: positioned over the gauge */}
      <ChangeIndicator
        value={safePercent}
        testId="gauge-indicator-value"
        className="absolute inset-0 flex items-center justify-center mt-5"
        textSizeClass="text-lg"
      >
        {formatSignedPercent(safePercent)}
      </ChangeIndicator>

      {/* Timeframe tag */}
      {timeframe && (
        <div
          data-testid="gauge-timeframe-tag"
          className="chart-timeframe absolute left-1/2 top-[calc(50%_+_26%)] -translate-x-1/2 text-xs font-medium"
        >
          {timeframe}
        </div>
      )}
    </figure>
  );
}
