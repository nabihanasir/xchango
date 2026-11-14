import { useLocation } from 'react-router-dom';
import PageBanner from '../PageBanner';

interface PageInfo {
  title: string;
  description: string;
}

/** Titles match the sidebar. The dashboard and the single-request page have their own headers, so they are not listed. */
const PAGES: Record<string, PageInfo> = {
  '/advisor/students': { title: 'My Students', description: 'Students assigned to you and their academic profiles.' },
  '/advisor/applications': { title: 'Applications', description: "Review each student's application, transcript and documents." },
  '/advisor/interviews': { title: 'Interviews', description: 'Answer booking requests, run your interviews, and set when you are unavailable.' },
  '/advisor/requests': { title: 'Course Approval', description: 'Review the course matches your students have requested.' },
  '/advisor/results': { title: 'Results', description: "Check each student's document, then enter their grades." },
  '/advisor/online-classes': { title: 'Online Classes', description: 'Host live classes for your students.' },
  '/advisor/profile': { title: 'Profile', description: 'Your account details and the countries you supervise.' },
};

/** The same slim banner on every advisor page except the dashboard. */
export default function AdvisorPageHeader() {
  const { pathname } = useLocation();
  const page = PAGES[pathname.replace(/\/+$/, '')];

  if (!page) {
    return null;
  }

  return <PageBanner {...page} toneClass="bg-advisor-hero shadow-advisor-side/10" />;
}
