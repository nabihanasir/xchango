import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  labelRight?: ReactNode;
  icon: ReactNode;
  rightIcon?: ReactNode;
  onRightIconClick?: () => void;
  error?: string;
}

export default function InputField({ 
  label, 
  labelRight,
  icon, 
  rightIcon, 
  onRightIconClick, 
  error,
  className = '',
  ...props 
}: InputFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between items-end px-1">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          {label}
        </label>
        {labelRight && <div>{labelRight}</div>}
      </div>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-dark-blue transition-colors">
          {icon}
        </div>
        <input
          {...props}
          aria-invalid={Boolean(error)}
          className={`block w-full pl-12 pr-12 py-3.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border rounded-xl focus:outline-none transition-all text-slate-800 placeholder-slate-400 font-medium shadow-sm ${
            error
              ? 'border-red-300 focus:border-red-300 focus:ring-4 focus:ring-red-100'
              : 'border-slate-200 focus:border-accent-yellow/50 focus:ring-4 focus:ring-accent-yellow/10'
          }`}
        />
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-dark-blue focus:outline-none transition-colors"
          >
            {rightIcon}
          </button>
        )}
      </div>
      {error ? <p className="px-1 text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
