import type { ReactNode } from 'react';

type TSideLabelAlign = 'left' | 'right';

interface ISideLabelProps {
  children: ReactNode;
  align?: TSideLabelAlign;
  className?: string;
}

/**
 * SideLabel — decorative rotated text label positioned on the side of a section.
 *
 * The parent element must have `position: relative` so the absolute
 * positioning anchors correctly.
 *
 * - `left` (default): reads bottom-to-top, anchored on the left edge.
 * - `right`: reads top-to-bottom, anchored on the right edge.
 */
export function SideLabel({
  children,
  align = 'left',
  className = '',
}: ISideLabelProps) {
  const positionClasses =
    align === 'right'
      ? '-right-7 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl]'
      : '-left-7 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] rotate-180';

  return (
    <span
      className={`side-label absolute ${positionClasses} text-xs font-bold italic uppercase tracking-[0.2em] whitespace-nowrap select-none text-white ${className}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
