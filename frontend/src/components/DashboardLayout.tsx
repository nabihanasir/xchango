import {
  Home, School, FileText, BookOpenCheck, ListChecks, UserRoundCog, Video, GraduationCap, Stamp
} from 'lucide-react';
import GlobalLayout from './GlobalLayout';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/httpClient';

const DashboardLayout = () => {
  const { user } = useAuth();
  const [offboarded, setOffboarded] = useState(Boolean(user?.offboarded));

  // Refresh from the server: the semester may have ended since the user signed in.
  useEffect(() => {
    apiClient
      .get('/auth/me')
      .then((response) => setOffboarded(Boolean(response.data?.data?.offboardedAt)))
      .catch(() => undefined);
  }, []);
  const navItems = [
    { name: 'Dashboard',               path: '/dashboard',              icon: Home },
    { name: 'Student Profile',         path: '/dashboard/profile',      icon: UserRoundCog },
    { name: 'Documents',               path: '/dashboard/documents',    icon: FileText },
    { name: 'University & Programmes', path: '/dashboard/programmes',   icon: School },
    { name: 'Your Application',        path: '/dashboard/applications', icon: FileText },
    { name: 'Online Classes',          path: '/dashboard/online-classes', icon: Video },
    { name: 'Browse Equivalency',      path: '/dashboard/equivalency/courses', icon: BookOpenCheck },
    { name: 'My Equivalency Requests', path: '/dashboard/equivalency/requests', icon: ListChecks },
    { name: 'Results',                 path: '/dashboard/results', icon: GraduationCap },
    { name: 'Visa Status',             path: '/dashboard/visa', icon: Stamp },
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
      role="student"
      navItems={navItems}
      userProfile={userProfile}
      notice={
        offboarded
          ? 'Your exchange semester is complete. Your account is now read-only: you can view your records but not make changes. Contact the International Office if you need access restored.'
          : undefined
      }
    />
  );
};

export default DashboardLayout;


