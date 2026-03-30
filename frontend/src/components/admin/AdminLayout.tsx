import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, School,
  BookOpen, Settings, LogOut, Search, Bell,
  Menu, X, ChevronRight
} from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Applications', path: '/admin/applications', icon: FileText },
    { name: 'Universities', path: '/admin/universities', icon: School },
    { name: 'Courses', path: '/admin/courses', icon: BookOpen },
    { name: 'Messages', path: '/dashboard/communicate', icon: FileText },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden font-sans relative">
      {/* Background & Overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ backgroundImage: `url('/bg.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-dark-blue/85 backdrop-blur-[2px]" />
      </div>

      {/* ── Sidebar (Desktop) ── */}
      <aside
        className={`${
          collapsed ? 'w-20' : 'w-72'
        } bg-dark-blue hidden lg:flex flex-col transition-all duration-300 z-30 shadow-2xl relative shadow-dark-blue/20`}
      >
        {/* Sidebar Header */}
        <div className="h-24 flex items-center px-6 border-b border-white/5">
          <Link to="/admin" className="flex items-center gap-3 overflow-hidden">
            <div className="bg-accent-yellow h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-yellow/20">
              <span className="font-black text-dark-blue text-lg">X</span>
            </div>
            {!collapsed && (
              <span className="text-white font-black text-xl tracking-tight uppercase">
                Admin Panel
              </span>
            )}
          </Link>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-10 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 relative group ${
                  isActive
                    ? 'bg-accent-yellow text-dark-blue shadow-lg shadow-accent-yellow/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-dark-blue' : ''}`} />
                {!collapsed && (
                  <span className="font-bold text-[14px]">
                    {item.name}
                  </span>
                )}
                {!collapsed && isActive && (
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                )}
                {collapsed && (
                   <div className="absolute left-full ml-4 px-2 py-1 bg-dark-blue text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-bold uppercase tracking-widest border border-white/10 z-50 whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all outline-none"
          >
            <Menu className={`h-5 w-5 transition-transform duration-500 ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span className="text-sm font-bold">Collapse</span>}
          </button>
          <Link
            to="/login"
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="text-sm font-bold">Logout</span>}
          </Link>
        </div>
      </aside>

      {/* ── Mobile Sidebar (Overlay) ── */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm z-[100] lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-dark-blue z-[101] lg:hidden transition-transform duration-300 ease-out transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-24 flex items-center justify-between px-6 border-b border-white/5">
           <Link to="/admin" className="flex items-center gap-3">
            <div className="bg-accent-yellow h-10 w-10 rounded-xl flex items-center justify-center">
              <span className="font-black text-dark-blue text-lg">X</span>
            </div>
            <span className="text-white font-black text-xl tracking-tight uppercase">Admin</span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/60 p-2">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-4 space-y-2 mt-6">
          {navItems.map((item) => {
             const isActive = location.pathname === item.path;
             const Icon = item.icon;
             return (
               <Link
                 key={item.name}
                 to={item.path}
                 onClick={() => setIsMobileMenuOpen(false)}
                 className={`flex items-center gap-4 px-4 py-4 rounded-xl font-bold ${
                   isActive ? 'bg-accent-yellow text-dark-blue' : 'text-white/60 hover:bg-white/5'
                 }`}
               >
                 <Icon className="h-5 w-5" />
                 <span>{item.name}</span>
               </Link>
             );
          })}
        </nav>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-24 bg-white/70 backdrop-blur-xl border-b border-light-color/60 flex items-center justify-between px-6 lg:px-10 z-20 sticky top-0 shrink-0">
          <div className="flex items-center gap-4 lg:gap-8">
            <button 
              className="lg:hidden p-2 text-dark-blue bg-light-color/40 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-blue/40 group-focus-within:text-dark-blue transition-colors" />
              <input 
                type="text" 
                placeholder="Global Search..." 
                className="pl-12 pr-6 py-3 bg-slate-100/50 rounded-2xl w-64 lg:w-96 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-yellow/20 focus:bg-white transition-all border border-transparent focus:border-accent-yellow/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <button className="relative p-3 text-dark-blue/60 hover:text-dark-blue bg-slate-100 hover:bg-white rounded-2xl transition-all shadow-sm">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            </button>
            
            <div className="h-8 w-px bg-dark-blue/5 hidden sm:block" />
            
            <div className="flex items-center gap-3 bg-white border border-light-color/80 py-1.5 pl-1.5 pr-4 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none">
              <div className="bg-dark-blue h-10 w-10 rounded-full flex items-center justify-center font-bold text-white text-xs ring-4 ring-slate-50">
                AD
              </div>
              <div className="hidden sm:block">
                <p className="text-[13px] font-black text-dark-blue leading-none">Admin User</p>
                <p className="text-[11px] font-bold text-accent-yellow uppercase tracking-tighter mt-1">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-6 lg:p-10 custom-scrollbar relative">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-yellow/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none -z-0" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-dark-blue/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none -z-0" />
          
          <div className="max-w-7xl mx-auto space-y-8 relative z-10 animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { 
          from { opacity: 0; transform: translateY(20px) scale(0.98); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default AdminLayout;
