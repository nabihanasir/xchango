import {
  Home, FileText, User as UserIcon, ClipboardCheck
} from 'lucide-react';
import GlobalLayout from '../GlobalLayout';
import { useAuth } from '../../context/AuthContext';

const AdvisorLayout = () => {
  const { user } = useAuth();
  const navItems = [
    { name: 'Dashboard',    path: '/advisor',              icon: Home },
    { name: 'Applications', path: '/advisor/applications', icon: FileText },
    { name: 'Equivalency Requests', path: '/advisor/requests', icon: ClipboardCheck },
    { name: 'Messages',     path: '/dashboard/communicate', icon: FileText },
    { name: 'Profile',      path: '/advisor/profile',      icon: UserIcon },
  ];

  const initials = (user?.name || 'Advisor')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const userProfile = {
    initials: initials || 'AV',
    name: user?.name || 'Advisor Name',
    role: 'Academic Advisor'
  };

  return (
    <GlobalLayout 
      panelName="Advisor Panel"
      navItems={navItems}
      userProfile={userProfile}
    />
  );
};

export default AdvisorLayout;
