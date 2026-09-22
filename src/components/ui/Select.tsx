'use client';

import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, value, onChange, placeholder, error, className = '', ...props }, ref) => {
    return (
      <div className={className}>
        {label && (
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`
              w-full appearance-none rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 
              transition-all duration-300 focus:outline-none focus:ring-2
              ${!value ? 'text-slate-400' : ''}
              ${error 
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                : 'border-slate-200 focus:border-[#B8D8C5] focus:ring-[#B8D8C5]/20'
              }
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="text-slate-900">
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
export { Select };
