import CountryHeroCarousel from '../CountryHeroCarousel';

/** Admin welcome banner: partner-country photos, no ticker. */
export default function AdminHeroCarousel() {
  return (
    <CountryHeroCarousel
      title="Welcome Back, Admin!"
      scrimClass="bg-admin-deep/60"
      minHeightClass="min-h-[200px]"
      showTicker={false}
    />
  );
}
