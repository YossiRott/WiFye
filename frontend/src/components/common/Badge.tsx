import type { ReactNode } from 'react';

interface BadgeProps {
  className?: string;
  children: ReactNode;
}

export function Badge({ className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}
