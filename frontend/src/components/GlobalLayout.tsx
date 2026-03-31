import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Menu, X, Bell, ChevronRight, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: any;
}

interface UserProfile {
  initials: string;
  name: string;
  role: string;
}

interface GlobalLayoutProps {
  panelName: string;
  navItems: NavItem[];
  userProfile: UserProfile;
}

const GlobalLayout = ({ panelName, navItems, userProfile }: GlobalLayoutProps) => {
  const location = useLocation();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans relative bg-slate-100/50">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent-yellow/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-dark-blue/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-30 m-4 rounded-[2rem] glass-sidebar ${
          collapsed ? 'w-24' : 'w-72'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-28 flex items-center px-8 border-b border-white/10 shrink-0">
          <Link to={navItems[0]?.path || '/'} className="flex items-center gap-4 overflow-hidden group">
            {!collapsed && (
              <div className="flex flex-col animate-fade-in py-2">
                <span className="text-white font-black text-2xl tracking-tight leading-tight">
                  Xchango
                </span>
                <span className="text-accent-yellow/80 text-[11px] uppercase font-bold tracking-widest mt-1">
                  {panelName}
                </span>
              </div>
            )}
            {collapsed && (
              <div className="flex items-center justify-center w-full">
                <span className="text-white font-black text-2xl tracking-tight">X</span>
              </div>
            )}
          </Link>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-8 px-4 space-y-2.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== navItems[0].path && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 relative group ${
                  isActive
                    ? 'bg-accent-yellow/10 text-accent-yellow shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.name : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 w-1.5 h-8 bg-accent-yellow rounded-r-full shadow-[0_0_10px_rgba(251,210,19,0.5)]" />
                )}
                
                <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(251,210,19,0.3)]' : 'group-hover:scale-110'}`} />
                
                {!collapsed && (
                  <span className={`font-semibold text-[15px] ${isActive ? 'text-white' : ''}`}>
                    {item.name}
                  </span>
                )}
                
                {!collapsed && isActive && (
                  <ChevronRight className="h-4 w-4 ml-auto text-accent-yellow transition-transform" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-2 shrink-0 mb-2">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-white/40 hover:text-white hover:bg-white/5 transition-all outline-none"
          >
            <Menu className={`h-5 w-5 transition-transform duration-500 ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span className="text-sm font-semibold">Collapse Nav</span>}
          </button>
          <Link
            to="/login"
            onClick={logout}
            className="flex items-center gap-4 px-4 py-4 rounded-2xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="text-sm font-semibold">Sign Out</span>}
          </Link>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-dark-blue/80 backdrop-blur-md z-[100] lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 w-80 bg-[#060424] z-[101] lg:hidden transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-white/10 shadow-2xl shadow-dark-blue`}
      >
        <div className="h-28 flex items-center justify-between px-8 border-b border-white/10">
           <Link to={navItems[0]?.path || '/'} className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-white font-black text-xl tracking-tight leading-tight">Xchango</span>
              <span className="text-accent-yellow/80 text-[10px] uppercase font-bold tracking-widest">{panelName}</span>
            </div>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/50 hover:text-white p-2 bg-white/5 rounded-xl transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-4 space-y-2 mt-4 overflow-y-auto h-[calc(100vh-140px)]">
          {navItems.map((item) => {
             const isActive = location.pathname === item.path || (item.path !== navItems[0].path && location.pathname.startsWith(item.path));
             const Icon = item.icon;
             return (
               <Link
                 key={item.name}
                 to={item.path}
                 onClick={() => setIsMobileMenuOpen(false)}
                 className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold transition-all ${
                   isActive ? 'bg-accent-yellow/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' : 'text-white/50 hover:text-white hover:bg-white/5'
                 }`}
               >
                 {isActive && <div className="absolute left-0 w-1.5 h-8 bg-accent-yellow rounded-r-full shadow-[0_0_10px_rgba(251,210,19,0.5)]" />}
                 <Icon className={`h-5 w-5 ${isActive ? 'text-accent-yellow drop-shadow-[0_0_8px_rgba(251,210,19,0.3)]' : ''}`} />
                 <span>{item.name}</span>
               </Link>
             );
          })}
        </nav>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top Navbar */}
        <header className="h-24 m-4 lg:ml-0 rounded-[2rem] glass-panel flex items-center justify-between px-6 lg:px-8 shrink-0 transition-all z-20">
          <div className="flex items-center gap-4 lg:gap-8">
            <button 
              className="lg:hidden p-3 text-dark-blue bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to={navItems[0]?.path || '/'} className="hidden md:block">
              <img 
                src="/logo.png" 
                alt="Xchango Logo" 
                className="h-12 w-auto object-contain transition-transform duration-300 hover:scale-105"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <button className="relative p-3.5 text-slate-500 hover:text-dark-blue bg-slate-100/50 hover:bg-slate-100 rounded-[1.25rem] transition-all">
              <Bell className="h-5 w-5" />
              <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
            </button>
            
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            
            <div className="flex items-center gap-3 bg-white border border-slate-100 py-1.5 pl-1.5 pr-5 rounded-full shadow-sm hover:shadow-soft transition-all cursor-pointer select-none group">
              <div className="bg-gradient-to-br from-dark-blue to-[#1A1558] h-11 w-11 rounded-full flex items-center justify-center font-bold text-white text-[13px] ring-2 ring-white shadow-md group-hover:scale-105 transition-transform">
                {userProfile.initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-[14px] font-bold text-slate-800 leading-none group-hover:text-dark-blue transition-colors">{userProfile.name}</p>
                <p className="text-[11px] font-bold text-accent-yellow uppercase tracking-widest mt-1.5 leading-none">{userProfile.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Scrollable Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 lg:px-8 pb-8 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default GlobalLayout;
