import type { InputHTMLAttributes } from 'react';

interface IInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className = '', ...props }: IInputProps) {
  return (
    <input
      className={`w-full px-4 py-2 border border-primary/25 rounded-lg bg-primary/5 text-primary placeholder:text-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      {...props}
    />
  );
}
