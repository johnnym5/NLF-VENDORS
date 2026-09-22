'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, className = '', ...props }, ref) => {
    return (
      <div className={className}>
        {label && (
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-5 w-5 text-slate-400" />
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 
              transition-all duration-300 focus:outline-none focus:ring-2
              ${Icon ? 'pl-10' : ''}
              ${error 
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                : 'border-slate-200 focus:border-[#B8D8C5] focus:ring-[#B8D8C5]/20'
              }
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
export { Input };
