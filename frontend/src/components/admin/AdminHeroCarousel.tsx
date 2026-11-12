import { useMemo } from 'react';
import CountryHeroCarousel from '../CountryHeroCarousel';
import type { AdminStatCard } from '../../lib/adminApi';

const statValue = (stats: AdminStatCard[], title: string) =>
  stats.find((stat) => stat.title.toLowerCase() === title.toLowerCase())?.value;

/** Admin welcome banner: partner-country photos with live admission stats in the ticker. */
export default function AdminHeroCarousel({ stats }: { stats: AdminStatCard[] }) {
  const extraFacts = useMemo(() => {
    const items: string[] = [];
    const total = statValue(stats, 'Total Applications');
    const approved = statValue(stats, 'Approved');
    const pending = statValue(stats, 'Pending');
    if (total) items.push(`${total} applications received`);
    if (approved) items.push(`${approved} admissions approved`);
    if (pending) items.push(`${pending} awaiting review`);
    items.push(
      'Credit transfer and course equivalency',
      'Exam verification by country advisors',
      'Visa guidance from application to arrival',
      'Exchange placements at partner universities abroad',
    );
    return items;
  }, [stats]);

  return <CountryHeroCarousel title="Welcome Back, Admin!" extraFacts={extraFacts} scrimClass="bg-admin-deep/60" />;
}
