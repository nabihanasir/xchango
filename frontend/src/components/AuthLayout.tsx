import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div 
      className="min-h-screen flex flex-col justify-center items-center p-4 relative"
      style={{
        backgroundImage: `url('/bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark Overlay for better contrast */}
      <div className="absolute inset-0 bg-dark-blue/80 mix-blend-multiply"></div>

      {/* Container - Made larger and squarer */}
      <div className="bg-white p-12 rounded-3xl shadow-2xl w-full max-w-2xl min-h-[600px] flex flex-col justify-center relative z-10 my-8">
        
        {/* Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <img 
            src="/logo.png" 
            alt="Xchango Logo" 
            className="h-[350px] w-auto max-w-full -mb-12 object-contain" 
          />
          <h2 className="text-h2 font-bold text-dark-blue mb-2 leading-tight relative z-10">
            {title}
          </h2>
          <p className="text-body text-body-text relative z-10">{subtitle}</p>
        </div>

        {/* Form Content */}
        {children}

      </div>
    </div>
  );
}
