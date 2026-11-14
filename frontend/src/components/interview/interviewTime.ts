import type { InterviewSlot } from '../../types/application';

export const INTERVIEW_TZ = 'Asia/Karachi';

export const formatSlotTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { timeZone: INTERVIEW_TZ, hour: '2-digit', minute: '2-digit' });

export const formatSlotDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { timeZone: INTERVIEW_TZ, weekday: 'short', day: 'numeric', month: 'short' });

export const formatSlotFull = (iso: string, durationMinutes = 30) => {
  const end = new Date(new Date(iso).getTime() + durationMinutes * 60000).toISOString();
  return `${formatSlotDay(iso)}, ${formatSlotTime(iso)}–${formatSlotTime(end)} PKT`;
};

/** Groups slots by their Pakistan-time calendar day, in order. */
export const groupSlotsByDay = (slots: InterviewSlot[]) => {
  const days = new Map<string, InterviewSlot[]>();
  for (const slot of slots) {
    const key = new Date(slot.start).toLocaleDateString('en-CA', { timeZone: INTERVIEW_TZ });
    days.set(key, [...(days.get(key) ?? []), slot]);
  }
  return [...days.entries()].map(([key, daySlots]) => ({ key, label: formatSlotDay(daySlots[0].start), slots: daySlots }));
};

/** Splits the per-day groups into Monday-based weeks (the booking window spans up to three). */
export const groupDaysByWeek = <T extends { key: string }>(days: T[]) => {
  const weeks = new Map<string, T[]>();
  for (const day of days) {
    const date = new Date(`${day.key}T00:00:00Z`);
    const monday = new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * 86400000);
    const key = monday.toISOString().slice(0, 10);
    weeks.set(key, [...(weeks.get(key) ?? []), day]);
  }
  return [...weeks.entries()].map(([key, weekDays]) => ({
    key,
    label: `${new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' })} – ${new Date(
      new Date(`${key}T00:00:00Z`).getTime() + 4 * 86400000
    ).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' })}`,
    days: weekDays,
  }));
};

/** 'Morning' before 12:00 PKT, 'Afternoon' after. */
export const slotPeriod = (iso: string) =>
  Number(new Date(iso).toLocaleTimeString('en-GB', { timeZone: INTERVIEW_TZ, hour: '2-digit', hour12: false })) < 12
    ? 'Morning'
    : 'Afternoon';
