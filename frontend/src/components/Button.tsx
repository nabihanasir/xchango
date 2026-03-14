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
  
  const baseClasses = "w-full flex justify-center items-center py-3 px-4 rounded-lg focus:outline-none transition-colors disabled:cursor-not-allowed";
  
  const variants = {
    primary: "border border-transparent text-white bg-dark-blue hover:bg-navy-hover focus:ring-2 focus:ring-offset-2 focus:ring-dark-blue disabled:bg-blue-faded font-bold",
    secondary: "border border-transparent text-white bg-yellow-default hover:bg-accent-yellow disabled:bg-yellow-faded font-medium",
    ghost: "bg-transparent border border-body-text text-dark-blue hover:border-transparent hover:text-opacity-80 disabled:bg-light-color disabled:text-gray-500 disabled:border-transparent"
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
