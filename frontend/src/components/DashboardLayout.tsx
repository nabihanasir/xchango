import {
  Home, School, FileText, BookOpenCheck, UserRoundCog, Video, GraduationCap, Stamp, Building2, CalendarClock, PlaneLanding
} from 'lucide-react';
import GlobalLayout from './GlobalLayout';
import NextStepBar from './student/NextStepBar';
import StudentPageHeader from './student/StudentPageHeader';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudentJourney } from '../hooks/useStudentJourney';
import { buildStudentJourney, type JourneyStepKey } from '../utils/studentJourney';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/httpClient';

const DashboardLayout = () => {
  const { user } = useAuth();
  const [offboarded, setOffboarded] = useState(Boolean(user?.offboarded));
  const { pathname } = useLocation();
  const [journey] = useStudentJourney(pathname);

  // Interview and arrival come at fixed points of the journey, so the sidebar shows whether they are open yet.
  const stepStates = useMemo(() => {
    const steps = journey ? buildStudentJourney(journey) : [];
    const stateOf = (key: JourneyStepKey) => {
      const step = steps.find((item) => item.key === key);
      if (!step) return {};
      if (step.state === 'done') return { state: 'done' as const };
      if (step.state === 'locked') return { state: 'locked' as const, hint: step.description };
      return {};
    };
    return { interview: stateOf('interview'), arrival: stateOf('arrival') };
  }, [journey]);

  // Refresh from the server: the semester may have ended since the user signed in.
  useEffect(() => {
    apiClient
      .get('/auth/me')
      .then((response) => setOffboarded(Boolean(response.data?.data?.offboardedAt)))
      .catch(() => undefined);
  }, []);
  const navItems = [
    { name: 'Dashboard',               path: '/dashboard',              icon: Home },
    { name: 'University & Programmes', path: '/dashboard/programmes',   icon: School },
    { name: 'International Office',    path: '/dashboard/international-office', icon: Building2 },
    { name: 'Student Profile',         path: '/dashboard/profile',      icon: UserRoundCog },
    { name: 'Registration',            path: '/dashboard/applications', icon: FileText },
    { name: 'Interview',               path: '/dashboard/interview',    icon: CalendarClock, ...stepStates.interview },
    { name: 'Documents',               path: '/dashboard/documents',    icon: FileText },
    { name: 'Courses',                 path: '/dashboard/courses', icon: BookOpenCheck },
    { name: 'Visa Status',             path: '/dashboard/visa', icon: Stamp },
    { name: 'Arrival',                 path: '/dashboard/arrival', icon: PlaneLanding, ...stepStates.arrival },
    { name: 'Online Classes',          path: '/dashboard/online-classes', icon: Video },
    { name: 'Results',                 path: '/dashboard/results', icon: GraduationCap },
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
      profilePath="/dashboard/profile"
      header={<StudentPageHeader />}
      footer={<NextStepBar />}
      notice={
        offboarded
          ? 'Your exchange semester is complete. Your account is now read-only: you can view your records but not make changes. Contact the International Office if you need access restored.'
          : undefined
      }
    />
  );
};

export default DashboardLayout;


