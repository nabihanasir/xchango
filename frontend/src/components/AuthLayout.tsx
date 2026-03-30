import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-50 font-sans">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent-yellow/15 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 animate-float" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-dark-blue/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Main Card Container */}
      <div className="glass-panel rounded-[2.5rem] w-full max-w-[540px] p-8 sm:p-12 relative z-10 animate-fade-in-up border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
        
        {/* Header Logo & Typography */}
        <div className="text-center mb-10 flex flex-col items-center">
          <img 
            src="/logo.png" 
            alt="Xchango Logo" 
            className="h-24 w-auto object-contain mb-6 transform hover:scale-105 transition-transform duration-500 drop-shadow-xl"
          />
          <h2 className="text-[2rem] font-black text-slate-800 mb-3 tracking-tight leading-none">
            {title}
          </h2>
          <p className="text-slate-500 font-medium text-[15px]">{subtitle}</p>
        </div>

        {/* Injected Form Content */}
        {children}

      </div>
    </div>
  );
}
