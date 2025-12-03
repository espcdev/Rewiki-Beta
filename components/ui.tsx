import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'destructive';
  icon?: LucideIcon;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  icon: Icon,
  loading = false,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-full px-6 py-3 shadow-lg hover:shadow-xl",
    secondary: "bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full px-6 py-3 border border-transparent",
    ghost: "bg-transparent text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-full px-4 py-2",
    icon: "p-3 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black dark:text-white",
    destructive: "bg-red-500 text-white hover:bg-red-600 rounded-full px-6 py-3",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : Icon && <Icon className={`w-5 h-5 ${children ? 'mr-2' : ''}`} />}
      {children}
    </button>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6 md:p-8 ${className} ${onClick ? 'cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow' : ''}`}
    >
      {children}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 ${className}`}>
    {children}
  </span>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-2xl ${className}`} />
);

export const ArticleSkeleton: React.FC = () => (
  <div className="space-y-8 max-w-4xl mx-auto w-full pt-12">
    <div className="space-y-4">
      <Skeleton className="h-16 w-3/4 rounded-[2rem]" />
      <div className="flex gap-3">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>
    </div>
    <Skeleton className="h-[400px] w-full rounded-[2.5rem]" />
    <div className="space-y-4">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-5/6" />
    </div>
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode, title: string }> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-lg p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};