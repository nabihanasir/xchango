export type OnlineClassStatus = 'Live now' | 'Upcoming' | 'Ended' | 'Ready to start';

export type OnlineClassRole = 'student' | 'host';

export interface OnlineClass {
  id: string;
  course: string;
  instructor: string;
  day: string;
  time: string;
  duration: string;
  status: OnlineClassStatus;
  provider: 'Jitsi Meet';
  roomName: string;
  joinUrl: string;
  hostUrl: string;
  canJoin: boolean;
  canStart: boolean;
  isHostSession: boolean;
  startedAt?: string;
  weekday: number;
  startMinutes: number;
  durationMinutes: number;
}

interface ClassTemplate {
  id: string;
  course: string;
  instructor: string;
  /** JS getDay(): 0 = Sunday … 6 = Saturday */
  weekday: number;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
}

interface ActiveSession {
  startedBy: string;
  startedAt: Date;
  endsAt: Date;
}

const JITSI_BASE_URL = process.env.JITSI_BASE_URL || 'https://meet.jit.si';
const ROOM_PREFIX = process.env.VIDEO_ROOM_PREFIX || 'xchango-classroom';
const ROOM_PASSWORD = process.env.JITSI_ROOM_PASSWORD || 'xchango-class';
const MANUAL_SESSION_MINUTES = 120;
const EARLY_JOIN_MINUTES = 15;

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Fixed weekly demo timetable — free Jitsi rooms, no paid APIs. */
const weeklySchedule: ClassTemplate[] = [
  {
    id: 'fm-401',
    course: 'Formal Methods',
    instructor: 'Dr. Ayesha Malik',
    weekday: 1,
    startHour: 10,
    startMinute: 0,
    durationMinutes: 60,
  },
  {
    id: 'se-302',
    course: 'Software Engineering',
    instructor: 'Mr. Hamza Tariq',
    weekday: 3,
    startHour: 14,
    startMinute: 30,
    durationMinutes: 75,
  },
  {
    id: 'db-211',
    course: 'Database Systems',
    instructor: 'Ms. Sara Khan',
    weekday: 5,
    startHour: 11,
    startMinute: 0,
    durationMinutes: 60,
  },
];

const activeSessions = new Map<string, ActiveSession>();

const pad = (value: number) => value.toString().padStart(2, '0');

const formatClock = (hour: number, minute: number) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${pad(minute)} ${period}`;
};

const buildRoomName = (classId: string) => `${ROOM_PREFIX}-${classId}`.replace(/[^a-zA-Z0-9-]/g, '-');

const buildMeetingUrl = (roomName: string, displayName?: string, role: OnlineClassRole = 'student') => {
  const url = new URL(`${JITSI_BASE_URL.replace(/\/$/, '')}/${roomName}`);

  if (displayName) {
    const label = role === 'host' ? `${displayName} (Host)` : displayName;
    url.searchParams.set('userInfo.displayName', label);
  }

  const hashParts = [
    'config.prejoinPageEnabled=false',
    role === 'host' ? 'config.startWithAudioMuted=false' : 'config.startWithAudioMuted=true',
    'config.startWithVideoMuted=true',
  ];

  if (ROOM_PASSWORD) {
    hashParts.push(`config.roomPassword=${encodeURIComponent(ROOM_PASSWORD)}`);
  }

  url.hash = hashParts.join('&');
  return url.toString();
};

const getWindowForWeek = (template: ClassTemplate, now: Date) => {
  const start = new Date(now);
  const dayDelta = template.weekday - now.getDay();
  start.setDate(now.getDate() + dayDelta);
  start.setHours(template.startHour, template.startMinute, 0, 0);

  const end = new Date(start.getTime() + template.durationMinutes * 60_000);
  const earlyJoin = new Date(start.getTime() - EARLY_JOIN_MINUTES * 60_000);

  return { start, end, earlyJoin };
};

const purgeExpiredSessions = (now = new Date()) => {
  for (const [classId, session] of activeSessions.entries()) {
    if (session.endsAt.getTime() <= now.getTime()) {
      activeSessions.delete(classId);
    }
  }
};

/** Always include a same-day demo session so school demos can join without waiting for the weekly slot. */
const getSchedule = (now: Date): ClassTemplate[] => {
  const demoStartHour = Math.max(0, now.getHours() - 1);

  return [
    ...weeklySchedule,
    {
      id: 'ex-101',
      course: 'Exchange Orientation',
      instructor: 'RIO Faculty Desk',
      weekday: now.getDay(),
      startHour: demoStartHour,
      startMinute: 0,
      durationMinutes: 180,
    },
  ];
};

const resolveStatus = (
  template: ClassTemplate,
  now: Date,
): {
  status: OnlineClassStatus;
  canJoin: boolean;
  canStart: boolean;
  isHostSession: boolean;
  startedAt?: string;
} => {
  purgeExpiredSessions(now);

  const manual = activeSessions.get(template.id);
  if (manual) {
    return {
      status: 'Live now',
      canJoin: true,
      canStart: false,
      isHostSession: true,
      startedAt: manual.startedAt.toISOString(),
    };
  }

  const { start, end, earlyJoin } = getWindowForWeek(template, now);

  if (now >= start && now <= end) {
    return {
      status: 'Live now',
      canJoin: true,
      canStart: true,
      isHostSession: false,
    };
  }

  if (now >= earlyJoin && now < start) {
    return {
      status: 'Ready to start',
      canJoin: true,
      canStart: true,
      isHostSession: false,
    };
  }

  if (now > end && template.weekday === now.getDay()) {
    return {
      status: 'Ended',
      canJoin: true,
      canStart: true,
      isHostSession: false,
    };
  }

  return {
    status: 'Upcoming',
    canJoin: true,
    canStart: true,
    isHostSession: false,
  };
};

const toOnlineClass = (classItem: ClassTemplate, displayName: string | undefined, now: Date): OnlineClass => {
  const roomName = buildRoomName(classItem.id);
  const resolved = resolveStatus(classItem, now);

  return {
    id: classItem.id,
    course: classItem.course,
    instructor: classItem.instructor,
    day: WEEKDAY_LABELS[classItem.weekday],
    time: formatClock(classItem.startHour, classItem.startMinute),
    duration: `${classItem.durationMinutes} min`,
    status: resolved.status,
    provider: 'Jitsi Meet',
    roomName,
    joinUrl: buildMeetingUrl(roomName, displayName, 'student'),
    hostUrl: buildMeetingUrl(roomName, displayName, 'host'),
    canJoin: resolved.canJoin,
    canStart: resolved.canStart,
    isHostSession: resolved.isHostSession,
    startedAt: resolved.startedAt,
    weekday: classItem.weekday,
    startMinutes: classItem.startHour * 60 + classItem.startMinute,
    durationMinutes: classItem.durationMinutes,
  };
};

export const listOnlineClasses = (displayName?: string): OnlineClass[] => {
  const now = new Date();
  return getSchedule(now).map((classItem) => toOnlineClass(classItem, displayName, now));
};

const findTemplate = (classId: string, now = new Date()) => getSchedule(now).find((item) => item.id === classId);

export const startOnlineClass = (classId: string, startedBy: string) => {
  const now = new Date();
  const template = findTemplate(classId, now);
  if (!template) {
    const error = new Error('Online class not found');
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  purgeExpiredSessions(now);

  activeSessions.set(classId, {
    startedBy,
    startedAt: now,
    endsAt: new Date(now.getTime() + MANUAL_SESSION_MINUTES * 60_000),
  });

  return toOnlineClass(template, startedBy, now);
};

export const endOnlineClass = (classId: string, displayName?: string) => {
  const now = new Date();
  const template = findTemplate(classId, now);
  if (!template) {
    const error = new Error('Online class not found');
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  activeSessions.delete(classId);
  return toOnlineClass(template, displayName, now);
};

export const getRoomPasswordHint = () => ROOM_PASSWORD;
