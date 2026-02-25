import type { SelectHTMLAttributes } from 'react';

interface ISelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function Select({ className = '', ...props }: ISelectProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        className="w-full pl-4 pr-8 py-2 border border-primary/25 rounded-lg bg-primary/5 text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors appearance-none"
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-primary">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6 8L1 3h10z" />
        </svg>
      </span>
    </div>
  );
}
