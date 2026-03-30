import {
  Home, FileText, User as UserIcon, GraduationCap, ClipboardCheck
} from 'lucide-react';
import GlobalLayout from '../GlobalLayout';

const AdvisorLayout = () => {
  const navItems = [
    { name: 'Dashboard',    path: '/advisor',              icon: Home },
    { name: 'Applications', path: '/advisor/applications', icon: FileText },
    { name: 'Equivalency Requests', path: '/advisor/requests', icon: ClipboardCheck },
    { name: 'Students',     path: '/advisor/students',     icon: GraduationCap },
    { name: 'Messages',     path: '/dashboard/communicate', icon: FileText },
    { name: 'Profile',      path: '/advisor/profile',      icon: UserIcon },
  ];

  const userProfile = {
    initials: 'AV',
    name: 'Advisor Name',
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
