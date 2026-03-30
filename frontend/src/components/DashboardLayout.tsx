import {
  Home, School, FileText, MessageSquare, BookOpenCheck, ListChecks
} from 'lucide-react';
import GlobalLayout from './GlobalLayout';

const DashboardLayout = () => {
  const navItems = [
    { name: 'Dashboard',               path: '/dashboard',              icon: Home },
    { name: 'University & Programmes', path: '/dashboard/programmes',   icon: School },
    { name: 'Your Application',        path: '/dashboard/applications', icon: FileText },
    { name: 'Browse Equivalency',      path: '/dashboard/equivalency/courses', icon: BookOpenCheck },
    { name: 'My Equivalency Requests', path: '/dashboard/equivalency/requests', icon: ListChecks },
    { name: 'Communicate',             path: '/dashboard/communicate',  icon: MessageSquare },
  ];

  const userProfile = {
    initials: 'ST',
    name: 'Student Name',
    role: 'Undergraduate'
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
