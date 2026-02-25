import type { HTMLAttributes, ReactNode } from 'react';

interface IGlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function GlassCard({
  children,
  className = '',
  ...rest
}: IGlassCardProps) {
  return (
    <div
      className={`glass-card relative rounded-2xl bg-color-card-bg ${className} overflow-hidden`}
      {...rest}
    >
      <div className="relative h-full">{children}</div>
    </div>
  );
}
