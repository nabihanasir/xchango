import {
  LayoutDashboard, Users, FileText, School,
  BookOpen, Settings
} from 'lucide-react';
import GlobalLayout from '../GlobalLayout';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = () => {
  const { user } = useAuth();
  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Applications', path: '/admin/applications', icon: FileText },
    { name: 'Universities', path: '/admin/universities', icon: School },
    { name: 'Courses', path: '/admin/courses', icon: BookOpen },
    { name: 'Messages', path: '/dashboard/communicate', icon: FileText },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const initials = (user?.name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const userProfile = {
    initials: initials || 'AD',
    name: user?.name || 'Admin User',
    role: 'Super Admin'
  };

  return (
    <GlobalLayout 
      panelName="Admin Panel"
      navItems={navItems}
      userProfile={userProfile}
    />
  );
};

export default AdminLayout;
