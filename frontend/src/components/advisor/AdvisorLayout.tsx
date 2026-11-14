import {
  Home, FileText, User as UserIcon, ClipboardCheck, Users, Video, GraduationCap, CalendarClock
} from 'lucide-react';
import GlobalLayout from '../GlobalLayout';
import AdvisorNextStepBar from './AdvisorNextStepBar';
import { useAuth } from '../../context/AuthContext';

const AdvisorLayout = () => {
  const { user } = useAuth();
  const navItems = [
    { name: 'Dashboard',    path: '/advisor',              icon: Home },
    { name: 'My Students',  path: '/advisor/students',     icon: Users },
    { name: 'Applications', path: '/advisor/applications', icon: FileText },
    { name: 'Interviews', path: '/advisor/interviews', icon: CalendarClock },
    { name: 'Course Approval', path: '/advisor/requests', icon: ClipboardCheck },
    { name: 'Results', path: '/advisor/results', icon: GraduationCap },
    { name: 'Online Classes', path: '/advisor/online-classes', icon: Video },
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
      role="advisor"
      navItems={navItems}
      userProfile={userProfile}
      profilePath="/advisor/profile"
      footer={<AdvisorNextStepBar />}
    />
  );
};

export default AdvisorLayout;
