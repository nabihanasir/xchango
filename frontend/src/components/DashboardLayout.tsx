import {
  Home, School, FileText, MessageSquare, BookOpenCheck, ListChecks, UserRoundCog
} from 'lucide-react';
import GlobalLayout from './GlobalLayout';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = () => {
  const { user } = useAuth();
  const navItems = [
    { name: 'Dashboard',               path: '/dashboard',              icon: Home },
    { name: 'Student Profile',         path: '/dashboard/profile',      icon: UserRoundCog },
    { name: 'Documents',               path: '/dashboard/documents',    icon: FileText },
    { name: 'University & Programmes', path: '/dashboard/programmes',   icon: School },
    { name: 'Your Application',        path: '/dashboard/applications', icon: FileText },
    { name: 'Browse Equivalency',      path: '/dashboard/equivalency/courses', icon: BookOpenCheck },
    { name: 'My Equivalency Requests', path: '/dashboard/equivalency/requests', icon: ListChecks },
  ];

  const initials = (user?.name || 'Student Name')
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const userProfile = {
    initials: initials || 'ST',
    name: user?.name || 'Student Name',
    role: 'Student'
  };

  return (
    <GlobalLayout 
      panelName="Student Panel"
      navItems={navItems}
      userProfile={userProfile}
    />
  );
};

export default DashboardLayout;
