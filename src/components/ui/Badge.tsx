'use client';

import React from 'react';

export type BadgeVariant = 'sage' | 'champagne' | 'slate' | 'active' | 'revoked' | 'warning' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  sage: 'bg-[#D8EADF] text-[#1E4D38]',
  champagne: 'bg-[#FEF3D6] text-[#8D6B1B]',
  slate: 'bg-[#E5E7EB] text-[#1F2937]',
  active: 'bg-[#DCFCE7] text-[#166534]',
  revoked: 'bg-[#FEE2E2] text-[#991B1B]',
  warning: 'bg-[#FEF3C7] text-[#92400E]',
  neutral: 'bg-gray-100 text-gray-600',
};

export default function Badge({ children, variant, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export { Badge };
