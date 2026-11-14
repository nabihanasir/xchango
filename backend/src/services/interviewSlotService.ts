import mongoose from 'mongoose';
import Application, { ApplicationStatus, IApplication } from '../models/Application';
import AdvisorUnavailableSlot from '../models/AdvisorUnavailableSlot';
import { UserRole } from '../models/User';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors/AppError';
import { assertObjectId, readIsoDate, readString } from '../utils/validators';
import { appUrl, formatDateTime, notifyUserSafely } from './notificationService';

/** Interview hours are fixed in Pakistan time (UTC+5, no daylight saving). */
export const INTERVIEW_TIMEZONE = 'Asia/Karachi';
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const SLOT_MINUTES = 30;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;
const DAY_START_MINUTE = 8 * 60;
const DAY_END_MINUTE = 17 * 60;
const BOOKING_WINDOW_DAYS = 14;
const MAX_UNAVAILABLE_BATCH = 400;

export const CANCEL_REASONS = [
  'schedule_conflict',
  'illness',
  'emergency',
  'technical_issue',
  'other',
] as const;
type CancelReason = (typeof CANCEL_REASONS)[number];

const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  schedule_conflict: 'Schedule conflict',
  illness: 'Illness',
  emergency: 'Emergency',
  technical_issue: 'Technical issue',
  other: 'Other',
};

export type SlotState = 'available' | 'unavailable' | 'held' | 'booked';

interface Actor {
  _id: string;
  role: string;
}

const idOf = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'object' && '_id' in (value as object)) return String((value as { _id: unknown })._id);
  return String(value);
};

/** Wall-clock parts of an instant in Pakistan time. */
const pktParts = (ms: number) => {
  const shifted = new Date(ms + TZ_OFFSET_MS);
  return {
    weekday: shifted.getUTCDay(),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds() + shifted.getUTCMilliseconds(),
  };
};

const isValidSlotStart = (ms: number) => {
  const { weekday, minuteOfDay, seconds } = pktParts(ms);
  return (
    seconds === 0 &&
    weekday >= 1 &&
    weekday <= 5 &&
    minuteOfDay % SLOT_MINUTES === 0 &&
    minuteOfDay >= DAY_START_MINUTE &&
    minuteOfDay <= DAY_END_MINUTE - SLOT_MINUTES
  );
};

/** Start (as epoch ms) of today 00:00 Pakistan time. */
const startOfTodayPkt = () => {
  const now = Date.now();
  return Math.floor((now + TZ_OFFSET_MS) / 86400000) * 86400000 - TZ_OFFSET_MS;
};

/** Every bookable slot start in the booking window, in order (past slots today excluded). */
const windowSlotStarts = () => {
  const now = Date.now();
  const first = startOfTodayPkt();
  const starts: number[] = [];
  for (let day = 0; day < BOOKING_WINDOW_DAYS; day += 1) {
    for (let minute = DAY_START_MINUTE; minute < DAY_END_MINUTE; minute += SLOT_MINUTES) {
      const ms = first + day * 86400000 + minute * 60000;
      if (ms > now && isValidSlotStart(ms)) starts.push(ms);
    }
  }
  return starts;
};

const slotsCovered = (startMs: number, durationMinutes: number) =>
  Array.from({ length: durationMinutes / SLOT_MINUTES }, (_, index) => startMs + index * SLOT_MS);

/** Slot starts taken by an advisor's pending or confirmed interview requests (optionally ignoring one application). */
const getHeldSlots = async (advisorId: string, excludeApplicationId?: string) => {
  const applications = await Application.find({
    advisorId,
    'interviewRequest.status': { $in: ['requested', 'accepted'] },
    ...(excludeApplicationId ? { _id: { $ne: excludeApplicationId } } : {}),
  }).select('interviewRequest');

  const held = new Map<number, 'held' | 'booked'>();
  for (const application of applications) {
    const request = application.interviewRequest;
    if (!request) continue;
    for (const slot of slotsCovered(new Date(request.start).getTime(), request.durationMinutes)) {
      held.set(slot, request.status === 'accepted' ? 'booked' : 'held');
    }
  }
  return held;
};

const getUnavailableSlots = async (advisorId: string) => {
  const rows = await AdvisorUnavailableSlot.find({ advisorId, start: { $gte: new Date() } }).select('start');
  return new Set(rows.map((row) => row.start.getTime()));
};

const buildCalendar = async (advisorId: string, excludeApplicationId?: string) => {
  const [unavailable, held] = await Promise.all([
    getUnavailableSlots(advisorId),
    getHeldSlots(advisorId, excludeApplicationId),
  ]);
  return windowSlotStarts().map((ms) => {
    const state: SlotState = unavailable.has(ms) ? 'unavailable' : (held.get(ms) ?? 'available');
    return { start: new Date(ms).toISOString(), state };
  });
};

const loadApplication = async (applicationId: string) => {
  assertObjectId(applicationId, 'Application', 'INVALID_APPLICATION_ID');
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new NotFoundError(
      'Application not found.',
      'No application exists for the provided identifier.',
      'Verify the application id and try again.',
      'APPLICATION_NOT_FOUND'
    );
  }
  return application;
};

const assertOwnsApplication = (application: IApplication, actor: Actor) => {
  const allowed =
    actor.role === UserRole.ADMIN ||
    (actor.role === UserRole.STUDENT && idOf(application.studentId) === actor._id) ||
    (actor.role === UserRole.ADVISOR && idOf(application.advisorId) === actor._id);
  if (!allowed) {
    throw new ForbiddenError(
      'You are not authorized to access this application.',
      'The application belongs to someone else.',
      'Use the account that owns this application.',
      'APPLICATION_ACCESS_DENIED'
    );
  }
};

const requireAdvisor = (application: IApplication) => {
  if (!application.advisorId) {
    throw new ValidationError(
      'No advisor assigned yet.',
      'Interview slots depend on your advisor’s availability.',
      'Wait until an advisor has been assigned to your application.',
      'ADVISOR_NOT_ASSIGNED'
    );
  }
  return idOf(application.advisorId);
};

const plainRequest = (request: unknown) => {
  const raw = request as { toObject?: () => object };
  return (raw.toObject ? raw.toObject() : request) as object;
};

const notifyOther = (
  application: IApplication,
  to: 'student' | 'advisor',
  subject: string,
  message: string,
  type: string
) =>
  notifyUserSafely({
    userId: to === 'student' ? application.studentId : (application.advisorId as mongoose.Types.ObjectId),
    subject,
    type,
    message,
    metadata: { applicationId: application._id },
    action:
      to === 'student'
        ? { label: 'View application', url: appUrl(`/dashboard/applications`) }
        : { label: 'Open interviews', url: appUrl('/advisor/interviews') },
  });

/** Slots a student (or the advisor / admin) can see for one application. */
export const getApplicationSlots = async (applicationId: string, actor: Actor) => {
  const application = await loadApplication(applicationId);
  assertOwnsApplication(application, actor);
  const advisorId = requireAdvisor(application);
  // The student's own pending request should still look selectable so they can move it.
  const slots = await buildCalendar(advisorId, applicationId);
  return {
    timezone: INTERVIEW_TIMEZONE,
    // Students only learn that a slot is taken, not why.
    slots:
      actor.role === UserRole.STUDENT
        ? slots.map((slot) => ({ start: slot.start, state: slot.state === 'available' ? 'available' : 'unavailable' }))
        : slots,
    request: application.interviewRequest ?? null,
  };
};

export const requestInterview = async (
  applicationId: string,
  studentId: string,
  input: { start?: unknown; durationMinutes?: unknown }
) => {
  const application = await loadApplication(applicationId);
  assertOwnsApplication(application, { _id: studentId, role: UserRole.STUDENT });
  const advisorId = requireAdvisor(application);

  if (application.status !== ApplicationStatus.ASSIGNED) {
    throw new ValidationError(
      'Interview booking is not available.',
      application.status === ApplicationStatus.INTERVIEW_SCHEDULED
        ? 'Your interview is already confirmed. Cancel it first (with a reason) to pick another time.'
        : 'You can request an interview once an advisor is assigned and before it is confirmed.',
      'Check your application status.',
      'INTERVIEW_REQUEST_NOT_ALLOWED'
    );
  }

  const durationMinutes = Number(input.durationMinutes ?? SLOT_MINUTES);
  if (![30, 60].includes(durationMinutes)) {
    throw new ValidationError(
      'Invalid interview length.',
      'An interview can be 30 or 60 minutes.',
      'Choose 30 or 60 minutes.',
      'INTERVIEW_DURATION_INVALID'
    );
  }

  const start = readIsoDate(input.start, 'Interview time') as Date;
  const covered = slotsCovered(start.getTime(), durationMinutes);
  const windowStarts = new Set(windowSlotStarts());
  if (!covered.every((ms) => isValidSlotStart(ms) && windowStarts.has(ms))) {
    throw new ValidationError(
      'That time cannot be booked.',
      'Interviews run Monday to Friday, 8:00–17:00 Pakistan time, within the next two weeks, and must finish by 17:00.',
      'Pick a slot shown on the calendar.',
      'INTERVIEW_SLOT_INVALID'
    );
  }

  const [unavailable, held] = await Promise.all([
    getUnavailableSlots(advisorId),
    getHeldSlots(advisorId, applicationId),
  ]);
  if (covered.some((ms) => unavailable.has(ms) || held.has(ms))) {
    throw new ValidationError(
      'That slot is not available.',
      'Your advisor is unavailable or already booked for part of this time.',
      'Pick another slot.',
      'INTERVIEW_SLOT_UNAVAILABLE'
    );
  }

  application.interviewRequest = {
    start,
    durationMinutes,
    status: 'requested',
    requestedAt: new Date(),
  };
  await application.save();

  await notifyOther(
    application,
    'advisor',
    'Interview requested',
    `A student requested an interview on ${formatDateTime(start)} (${durationMinutes} min). Please accept or decline it.`,
    'interview_requested'
  );
  return application;
};

const readCancelReason = (input: { reason?: unknown; details?: unknown }) => {
  const reason = String(input?.reason ?? '') as CancelReason;
  if (!CANCEL_REASONS.includes(reason)) {
    throw new ValidationError(
      'A reason is required.',
      'Cancelling a confirmed interview needs a reason chosen from the list.',
      'Choose one of the listed reasons.',
      'INTERVIEW_CANCEL_REASON_REQUIRED'
    );
  }
  const details = readString(input?.details, 'Details', { max: 300 });
  return { reason, details };
};

/** Student or advisor withdraws a request. A confirmed interview needs a listed reason. */
export const cancelInterviewRequest = async (
  applicationId: string,
  actor: Actor,
  input: { reason?: unknown; details?: unknown }
) => {
  const application = await loadApplication(applicationId);
  assertOwnsApplication(application, actor);
  const request = application.interviewRequest;
  const role = actor.role === UserRole.ADVISOR ? 'advisor' : 'student';

  if (!request || !['requested', 'accepted'].includes(request.status)) {
    throw new ValidationError(
      'Nothing to cancel.',
      'There is no pending or confirmed interview for this application.',
      'Refresh the page.',
      'INTERVIEW_REQUEST_NOT_FOUND'
    );
  }

  const confirmed = request.status === 'accepted';
  const { reason, details } = confirmed ? readCancelReason(input) : { reason: undefined, details: '' };
  const previousStart = request.start;

  if (!confirmed && role === 'advisor') {
    throw new ValidationError(
      'Use decline instead.',
      'A pending request is declined, not cancelled, by the advisor.',
      'Decline the request.',
      'INTERVIEW_USE_DECLINE'
    );
  }

  application.interviewRequest = {
    ...plainRequest(request),
    status: 'cancelled',
    respondedAt: new Date(),
    cancelledBy: role,
    cancelReason: reason,
    cancelDetails: details || undefined,
  } as IApplication['interviewRequest'];

  if (confirmed) {
    application.interview = undefined;
    application.interviewDate = undefined;
    application.status = ApplicationStatus.ASSIGNED;
  }
  await application.save();

  const label = reason ? CANCEL_REASON_LABELS[reason] : '';
  await notifyOther(
    application,
    role === 'student' ? 'advisor' : 'student',
    confirmed ? 'Interview cancelled' : 'Interview request withdrawn',
    confirmed
      ? `The interview on ${formatDateTime(previousStart)} was cancelled by the ${role}. Reason: ${label}${details ? ` — ${details}` : ''}.${
          role === 'advisor' ? ' Please pick a new slot.' : ''
        }`
      : `The student withdrew their interview request for ${formatDateTime(previousStart)}.`,
    'interview_cancelled'
  );
  return application;
};

export const respondToInterviewRequest = async (
  applicationId: string,
  advisorId: string,
  input: { accept?: unknown; note?: unknown; location?: unknown }
) => {
  const application = await loadApplication(applicationId);
  assertOwnsApplication(application, { _id: advisorId, role: UserRole.ADVISOR });
  const request = application.interviewRequest;

  if (!request || request.status !== 'requested' || application.status !== ApplicationStatus.ASSIGNED) {
    throw new ValidationError(
      'No pending request.',
      'There is no interview request waiting for your response.',
      'Refresh the page.',
      'INTERVIEW_REQUEST_NOT_PENDING'
    );
  }

  const accept = input.accept === true || input.accept === 'true';
  const note = readString(input.note, 'Note', { max: 300 });
  const start = new Date(request.start);

  if (accept) {
    const covered = slotsCovered(start.getTime(), request.durationMinutes);
    const unavailable = await getUnavailableSlots(advisorId);
    if (covered.some((ms) => unavailable.has(ms))) {
      throw new ValidationError(
        'You marked this time unavailable.',
        'Part of the requested time is blocked in your availability.',
        'Decline the request or unblock the slot first.',
        'INTERVIEW_SLOT_UNAVAILABLE'
      );
    }
    application.interview = {
      date: start,
      location: readString(input.location, 'Location', { max: 200 }) || 'Advisor Office',
      stakeholders: [],
      durationMinutes: request.durationMinutes,
    };
    application.interviewDate = start;
    application.interviewRequest = {
      ...plainRequest(request),
      status: 'accepted',
      respondedAt: new Date(),
    } as IApplication['interviewRequest'];
    application.status = ApplicationStatus.INTERVIEW_SCHEDULED;
  } else {
    application.interviewRequest = {
      ...plainRequest(request),
      status: 'declined',
      respondedAt: new Date(),
      note: note || undefined,
    } as IApplication['interviewRequest'];
  }
  await application.save();

  await notifyOther(
    application,
    'student',
    accept ? 'Interview confirmed' : 'Interview request declined',
    accept
      ? `Your interview is confirmed for ${formatDateTime(start)} (${request.durationMinutes} min) at ${application.interview?.location}. To change it later you will need to give a reason.`
      : `Your advisor could not take the interview on ${formatDateTime(start)}.${note ? ` Note: ${note}` : ''} Please pick another slot.`,
    accept ? 'interview_scheduled' : 'interview_declined'
  );
  return application;
};

/** The advisor's own calendar: unavailable, held (pending) and booked slots. */
export const getAdvisorAvailability = async (advisorId: string) => ({
  timezone: INTERVIEW_TIMEZONE,
  slots: await buildCalendar(advisorId),
});

export const setAdvisorAvailability = async (
  advisorId: string,
  input: { slots?: unknown; unavailable?: unknown }
) => {
  if (!Array.isArray(input.slots) || input.slots.length === 0 || input.slots.length > MAX_UNAVAILABLE_BATCH) {
    throw new ValidationError(
      'Slots are invalid.',
      `Send between 1 and ${MAX_UNAVAILABLE_BATCH} slot start times.`,
      'Select some slots and try again.',
      'AVAILABILITY_SLOTS_INVALID'
    );
  }
  const advisorObjectId = new mongoose.Types.ObjectId(advisorId);
  const starts = [...new Set(input.slots.map((slot) => (readIsoDate(slot, 'Slot') as Date).getTime()))];
  if (!starts.every(isValidSlotStart)) {
    throw new ValidationError(
      'Invalid slot.',
      'Slots must be 30-minute blocks between 8:00 and 17:00 on weekdays (Pakistan time).',
      'Pick slots from the calendar.',
      'AVAILABILITY_SLOT_INVALID'
    );
  }

  if (input.unavailable === false) {
    await AdvisorUnavailableSlot.deleteMany({ advisorId, start: { $in: starts.map((ms) => new Date(ms)) } });
  } else {
    const held = await getHeldSlots(advisorId);
    const clash = starts.filter((ms) => held.has(ms));
    if (clash.length) {
      throw new ValidationError(
        'Some slots already have an interview.',
        'A pending or confirmed interview is booked in part of your selection.',
        'Decline or cancel that interview first.',
        'AVAILABILITY_SLOT_BOOKED'
      );
    }
    await AdvisorUnavailableSlot.bulkWrite(
      starts.map((ms) => ({
        updateOne: {
          filter: { advisorId: advisorObjectId, start: new Date(ms) },
          update: { $setOnInsert: { advisorId: advisorObjectId, start: new Date(ms) } },
          upsert: true,
        },
      }))
    );
  }
  return getAdvisorAvailability(advisorId);
};
