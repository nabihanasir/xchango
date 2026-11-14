import mongoose from 'mongoose';
import { NotFoundError, ValidationError } from '../errors/AppError';
import Semester from '../models/Semester';

interface SemesterInput {
  name?: unknown;
  startDate?: unknown;
  endDate?: unknown;
}

const MAX_NAME_LENGTH = 60;

const readDate = (value: unknown, label: string) => {
  const date = typeof value === 'string' || value instanceof Date ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new ValidationError(
      `${label} is not a valid date.`,
      `${label} must be a calendar date.`,
      `Pick the ${label.toLowerCase()} from the date picker.`,
      'SEMESTER_DATE_INVALID'
    );
  }
  return date;
};

const parseInput = (input: SemesterInput) => {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(
      'Semester name is required.',
      `The name must be 1 to ${MAX_NAME_LENGTH} characters, for example "Fall 2026".`,
      'Enter a short name for the semester.',
      'SEMESTER_NAME_INVALID'
    );
  }

  const startDate = readDate(input.startDate, 'Start date');
  const endDate = readDate(input.endDate, 'End date');
  if (endDate.getTime() <= startDate.getTime()) {
    throw new ValidationError(
      'The end date must be after the start date.',
      'A semester cannot end before it starts.',
      'Choose an end date after the start date.',
      'SEMESTER_DATES_INVALID'
    );
  }

  return { name, startDate, endDate };
};

const assertNoOverlap = async (startDate: Date, endDate: Date, excludeId?: string) => {
  const overlapping = await Semester.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  }).select('name');

  if (overlapping) {
    throw new ValidationError(
      `These dates overlap with ${overlapping.name}.`,
      'Semesters cannot share days, because a student must belong to exactly one semester.',
      'Adjust the dates so they do not overlap another semester.',
      'SEMESTER_OVERLAP'
    );
  }
};

const assertValidId = (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(
      'Invalid semester ID.',
      'The semester identifier is not in the expected format.',
      'Refresh the list and try again.',
      'SEMESTER_ID_INVALID'
    );
  }
};

export const listSemesters = async () => Semester.find().sort({ startDate: -1 }).lean();

export const createSemester = async (input: SemesterInput) => {
  const data = parseInput(input);
  await assertNoOverlap(data.startDate, data.endDate);
  try {
    return await Semester.create(data);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new ValidationError(
        `A semester named ${data.name} already exists.`,
        'Semester names must be unique.',
        'Choose a different name or edit the existing semester.',
        'SEMESTER_NAME_TAKEN'
      );
    }
    throw error;
  }
};

export const updateSemester = async (id: string, input: SemesterInput) => {
  assertValidId(id);
  const data = parseInput(input);
  await assertNoOverlap(data.startDate, data.endDate, id);

  const semester = await Semester.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!semester) {
    throw new NotFoundError('Semester not found.', 'No semester matches this identifier.', 'Refresh the list and try again.', 'SEMESTER_NOT_FOUND');
  }
  return semester;
};

export const deleteSemester = async (id: string) => {
  assertValidId(id);
  const semester = await Semester.findByIdAndDelete(id);
  if (!semester) {
    throw new NotFoundError('Semester not found.', 'No semester matches this identifier.', 'Refresh the list and try again.', 'SEMESTER_NOT_FOUND');
  }
};

/**
 * The semester an application closed in, if the admin has defined one covering that day. A student whose
 * application closed cannot start a new one until that semester has ended.
 */
export const findSemesterContaining = async (date: Date) =>
  Semester.findOne({ startDate: { $lte: date }, endDate: { $gte: date } }).lean();
