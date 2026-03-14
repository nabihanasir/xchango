import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ReactNode;
  rightIcon?: ReactNode;
  onRightIconClick?: () => void;
}

export default function InputField({ 
  label, 
  icon, 
  rightIcon, 
  onRightIconClick, 
  className = '',
  ...props 
}: InputFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-small font-bold text-dark-blue uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
        <input
          {...props}
          className="block w-full pl-10 pr-10 py-3 border border-light-color rounded-lg focus:outline-none focus:ring-2 focus:ring-dark-blue focus:border-transparent transition-all text-body-text placeholder-gray-400"
        />
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-body-text hover:text-dark-blue focus:outline-none transition-colors"
          >
            {rightIcon}
          </button>
        )}
      </div>
    </div>
  );
}
