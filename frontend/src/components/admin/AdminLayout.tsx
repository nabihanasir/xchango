import {
  LayoutDashboard, Users, FileText, School,
  BookOpen, Settings
} from 'lucide-react';
import GlobalLayout from '../GlobalLayout';

const AdminLayout = () => {
  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Applications', path: '/admin/applications', icon: FileText },
    { name: 'Universities', path: '/admin/universities', icon: School },
    { name: 'Courses', path: '/admin/courses', icon: BookOpen },
    { name: 'Messages', path: '/dashboard/communicate', icon: FileText },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const userProfile = {
    initials: 'AD',
    name: 'Admin User',
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
