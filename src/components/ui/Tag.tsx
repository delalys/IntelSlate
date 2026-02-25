import type { HTMLAttributes, ReactNode } from 'react';

interface ITagProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function Tag({ children, className = '', ...rest }: ITagProps) {
  return (
    <div
      className={`tag rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-white ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
