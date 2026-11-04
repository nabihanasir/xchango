import { DEFAULT_GRADIENT, buildMilestones, shiftDate, toUniversityProfile } from './universityProfile';
import type { CatalogUniversity } from '../types/university';

describe('buildMilestones', () => {
  const milestones = buildMilestones('2027-09-01', { shortName: 'EXU', city: 'Tokyo' });

  it('creates the standard timeline in date order, ending with the semester', () => {
    expect(milestones.length).toBeGreaterThanOrEqual(10);
    const dates = milestones.map((milestone) => milestone.date);
    expect(dates).toEqual([...dates].sort());
    expect(milestones.find((milestone) => milestone.title === 'Classes begin')?.date).toBe('2027-09-01');
    expect(milestones[milestones.length - 1].title).toBe('Exchange semester ends');
  });

  it('names the university and city', () => {
    expect(milestones.some((milestone) => milestone.description.includes('EXU'))).toBe(true);
    expect(milestones.some((milestone) => milestone.title === 'Travel to Tokyo')).toBe(true);
  });

  it('shifts dates without timezone drift', () => {
    expect(shiftDate('2027-03-01', -1)).toBe('2027-02-28');
    expect(shiftDate('2027-12-31', 1)).toBe('2028-01-01');
  });
});

describe('toUniversityProfile', () => {
  const base: CatalogUniversity = {
    _id: 'u1',
    name: 'Example University',
    countryId: { _id: 'c1', name: 'Japan', code: 'JP', flag: '🇯🇵' },
    seatLimit: 10,
  };

  it('fills safe defaults for everything an admin left empty', () => {
    const profile = toUniversityProfile(base);
    expect(profile.slug).toBe('u1');
    expect(profile.shortName).toBe('Example University');
    expect(profile.country).toBe('Japan');
    expect(profile.flag).toBe('🇯🇵');
    expect(profile.gradient).toBe(DEFAULT_GRADIENT);
    expect([profile.about, profile.facts, profile.programmes, profile.intakes, profile.costs, profile.faqs]).toEqual([[], [], [], [], [], []]);
    expect(profile.visa).toEqual({ title: 'Student visa', summary: '', steps: [] });
    expect(profile.contact).toEqual({ email: '', phone: '', address: '', website: '' });
  });

  it('generates milestones for an intake that has none, and keeps stored ones', () => {
    const profile = toUniversityProfile({
      ...base,
      shortName: 'EXU',
      city: 'Tokyo',
      intakes: [
        { id: 'a', label: 'Fall 2027', season: 'Fall', startDate: '2027-09-01', applicationDeadline: '2027-05-01', seatsTotal: 5, seatsTaken: 0, milestones: [] },
        {
          id: 'b',
          label: 'Spring 2028',
          season: 'Spring',
          startDate: '2028-02-01',
          applicationDeadline: '2027-10-01',
          seatsTotal: 5,
          seatsTaken: 0,
          milestones: [{ title: 'Custom', date: '2028-01-01', description: '', owner: 'Student' }],
        },
      ],
    });

    expect(profile.intakes[0].milestones.length).toBeGreaterThan(5);
    expect(profile.intakes[1].milestones).toHaveLength(1);
    expect(profile.intakes[1].milestones[0].title).toBe('Custom');
  });

  it('falls back to the website for the contact address', () => {
    expect(toUniversityProfile({ ...base, website: 'https://example.edu' }).contact.website).toBe('https://example.edu');
  });
});
