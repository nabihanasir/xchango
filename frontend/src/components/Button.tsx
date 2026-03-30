import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
}

export default function Button({ 
  variant = 'primary', 
  children, 
  className = '', 
  ...props 
}: ButtonProps) {
  
  const baseClasses = "w-full flex justify-center items-center py-3.5 px-6 rounded-xl focus:outline-none transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 active:scale-[0.98]";
  
  const variants = {
    primary: "text-white bg-gradient-to-r from-dark-blue to-dark-blue-light hover:scale-[1.02] shadow-lg shadow-dark-blue/20 focus:ring-4 focus:ring-dark-blue/20 font-bold tracking-wide border border-white/10",
    secondary: "text-dark-blue bg-gradient-to-r from-accent-yellow to-yellow-default hover:scale-[1.02] shadow-lg shadow-accent-yellow/30 focus:ring-4 focus:ring-accent-yellow/20 font-bold tracking-wide",
    ghost: "bg-slate-100/50 hover:bg-slate-100 text-slate-700 font-bold transition-all border border-transparent hover:border-slate-200"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
