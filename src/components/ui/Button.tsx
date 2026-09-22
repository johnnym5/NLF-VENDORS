'use client';

import React, { ButtonHTMLAttributes } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#1E4D38] hover:bg-[#163d2c] text-white',
  secondary: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700',
  outline: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700',
  danger: 'bg-[#991B1B] hover:bg-[#7f1d1d] text-white',
  ghost: 'hover:bg-slate-100 text-slate-600',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E4D38]';
  const disabledStyles = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!loading && Icon && <Icon className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
}

export { Button };
