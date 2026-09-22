'use client';

import React from 'react';
import { Info, AlertTriangle, XCircle, CheckCircle, LucideIcon } from 'lucide-react';

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';

interface AlertProps {
  children: React.ReactNode;
  variant: AlertVariant;
  icon?: LucideIcon;
  className?: string;
}

const variantStyles: Record<AlertVariant, { container: string; defaultIcon: LucideIcon }> = {
  info: { container: 'bg-blue-50 border-blue-200 text-blue-800', defaultIcon: Info },
  warning: { container: 'bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]', defaultIcon: AlertTriangle },
  error: { container: 'bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]', defaultIcon: XCircle },
  success: { container: 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]', defaultIcon: CheckCircle },
};

export default function Alert({ children, variant, icon, className = '' }: AlertProps) {
  const { container, defaultIcon: DefaultIcon } = variantStyles[variant];
  const Icon = icon || DefaultIcon;

  return (
    <div className={`border rounded-lg p-4 flex items-start gap-3 ${container} ${className}`}>
      <Icon size={18} className="flex-shrink-0 mt-0.5" />
      <div className="text-sm leading-relaxed w-full">
        {children}
      </div>
    </div>
  );
}

export { Alert };
