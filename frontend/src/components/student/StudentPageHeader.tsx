import { useLocation } from 'react-router-dom';
import PageBanner from '../PageBanner';

interface PageInfo {
  title: string;
  description: string;
}

/**
 * Titles match the sidebar. The dashboard, a single university and the application form pages have their own
 * headers, so they are not listed (the lookup is an exact match on the address).
 */
const PAGES: Record<string, PageInfo> = {
  '/dashboard/programmes': { title: 'University & Programmes', description: 'Browse partner universities, their programmes, fees and application details.' },
  '/dashboard/international-office': { title: 'International Office', description: 'Guidance and contact details for your exchange.' },
  '/dashboard/profile': { title: 'Student Profile', description: 'Manage your profile details and review your transcript.' },
  '/dashboard/applications': { title: 'Registration', description: 'Start a new mobility application, continue drafts and follow its progress.' },
  '/dashboard/interview': { title: 'Interview', description: 'Book your interview with your advisor and see the outcome.' },
  '/dashboard/documents': { title: 'Documents', description: 'Upload the documents your advisor needs to review your application.' },
  '/dashboard/courses': { title: 'Courses', description: "Choose your host courses and follow your advisor's decision." },
  '/dashboard/visa': { title: 'Visa Status', description: 'Follow your visa application from document collection to approval.' },
  '/dashboard/arrival': { title: 'Arrival', description: 'Tell your advisor you have arrived and follow the confirmation.' },
  '/dashboard/online-classes': { title: 'Online Classes', description: 'Join the live classes for your exchange.' },
  '/dashboard/results': { title: 'Results', description: 'Grades your advisor has published for your host courses.' },
};

/** The same slim banner on every student page except the dashboard. */
export default function StudentPageHeader() {
  const { pathname } = useLocation();
  const page = PAGES[pathname.replace(/\/+$/, '')];

  if (!page) {
    return null;
  }

  return <PageBanner {...page} toneClass="bg-student-hero shadow-dark-blue/20" />;
}
