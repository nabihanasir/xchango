import {
  formatDisplayDate,
  getItemStatusClasses,
  getRequestStatusClasses,
  getScoreBadgeClasses,
  getScoreTrackClasses,
  getUniversityName,
} from './equivalency';

describe('equivalency helpers', () => {
  it('formats dates for display', () => {
    expect(formatDisplayDate('2026-04-29T10:30:00.000Z')).toContain('2026');
  });

  it('returns the expected request status classes', () => {
    expect(getRequestStatusClasses('approved')).toContain('emerald');
    expect(getRequestStatusClasses('under_review')).toContain('blue');
    expect(getRequestStatusClasses('pending')).toContain('amber');
  });

  it('returns the expected item status classes', () => {
    expect(getItemStatusClasses('approved')).toContain('emerald');
    expect(getItemStatusClasses('rejected')).toContain('red');
    expect(getItemStatusClasses('pending')).toContain('slate');
  });

  it('returns consistent score colors for badge and track helpers', () => {
    expect(getScoreBadgeClasses(85)).toContain('emerald');
    expect(getScoreBadgeClasses(65)).toContain('amber');
    expect(getScoreBadgeClasses(25)).toContain('red');
    expect(getScoreTrackClasses(85)).toBe('bg-emerald-500');
    expect(getScoreTrackClasses(65)).toBe('bg-amber-500');
    expect(getScoreTrackClasses(25)).toBe('bg-red-500');
  });

  it('resolves university names from strings, objects, and empty values', () => {
    expect(getUniversityName('FAST')).toBe('FAST');
    expect(getUniversityName({ name: 'NUST' })).toBe('NUST');
    expect(getUniversityName(undefined)).toBe('University not set');
  });
});
