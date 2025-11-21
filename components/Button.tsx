import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  icon,
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variants = {
    primary: "bg-sle-blue text-white hover:bg-sle-navy hover:shadow-lg hover:shadow-sle-blue/30 focus:ring-sle-blue",
    secondary: "bg-white dark:bg-white/10 text-sle-navy dark:text-white border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/20 focus:ring-slate-200",
    danger: "bg-sle-red text-white hover:bg-sle-redDark hover:shadow-lg hover:shadow-sle-red/30 focus:ring-sle-red",
    outline: "border border-sle-blue text-sle-blue hover:bg-blue-50 dark:hover:bg-sle-blue/10 focus:ring-sle-blue",
    ghost: "text-sle-navy dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5",
  };

  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};