import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Home, School, FileText, MessageSquare,
  LogOut, User as UserIcon, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

const DashboardLayout = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { name: 'Dashboard',               path: '/dashboard',              icon: Home },
    { name: 'University & Programmes', path: '/dashboard/programmes',   icon: School },
    { name: 'Your Application',        path: '/dashboard/applications', icon: FileText },
    { name: 'Communicate',             path: '/dashboard/communicate',  icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen text-body-text overflow-hidden relative">
      {/* Background & Overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ backgroundImage: `url('/bg.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-dark-blue/80 mix-blend-multiply" />
      </div>

      {/* ── Sidebar ── */}
      <aside
        className={`${collapsed ? 'w-20' : 'w-80'} bg-white shadow-xl flex flex-col transition-all duration-300 z-20 flex-shrink-0`}
      >
        {/* Sidebar top: collapse toggle only */}
        <div className={`flex items-center border-b border-light-color/50 h-24 ${collapsed ? 'justify-center px-2' : 'justify-end px-4'}`}>
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-2 rounded-xl text-body-text hover:bg-light-color hover:text-dark-blue transition-colors"
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {navItems.map(item => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-dark-blue text-white shadow-md shadow-dark-blue/20 translate-x-0.5'
                    : 'text-body-text hover:bg-light-color hover:text-dark-blue hover:translate-x-0.5'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className={`h-6 w-6 flex-shrink-0 ${isActive ? 'text-accent-yellow' : ''}`} />
                {!collapsed && (
                  <span className={`font-semibold text-[15px] whitespace-nowrap ${isActive ? 'text-white' : ''}`}>
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-light-color/50">
          <Link
            to="/login"
            title={collapsed ? 'Logout' : undefined}
            className={`flex items-center gap-3 px-3 py-3 text-body-text hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium text-sm">Logout</span>}
          </Link>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-yellow/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-dark-blue/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Header */}
        <header className="h-32 bg-white/80 backdrop-blur-md border-b border-light-color/50 flex items-center justify-between px-8 z-10 sticky top-0">
          {/* Left: Logo + Page title */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex-shrink-0 h-28 flex items-center py-2 group">
              <img
                src="/logo.png"
                alt="Xchango Logo"
                className="h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
            <div className="w-px h-10 bg-light-color" />
            <h1 className="text-2xl font-bold text-dark-blue tracking-tight">
              {navItems.find(
                item =>
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
              )?.name || 'Dashboard'}
            </h1>
          </div>

          {/* Right: actions + profile */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-body-text hover:text-dark-blue transition-colors">
              <MessageSquare className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-light-color mx-2" />
            <div className="flex items-center gap-3 bg-light-color/30 py-1.5 px-3 rounded-full border border-light-color/50 cursor-pointer hover:bg-light-color/60 transition-colors">
              <div className="bg-dark-blue h-8 w-8 rounded-full flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block pr-2">
                <p className="text-sm font-bold text-dark-blue leading-none">Student Name</p>
                <p className="text-xs text-body-text">Computer Science</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-8 z-10">
          <div className="max-w-6xl mx-auto h-full space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
