import bcrypt from 'bcryptjs';
import Course, { CourseType, ICourse } from '../models/Course';
import User, { UserRole } from '../models/User';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors/AppError';

export interface CourseInput {
  title: string;
  description?: string;
  creditHours: number;
  instructorName?: string;
  instructorEmail?: string;
}

export interface InstructorInput {
  instructorName?: string;
  instructorEmail?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEMO_ADMIN_EMAIL = 'admin@xchango.com';
const DEMO_ADMIN_PASSWORD = 'Admin@123';

const DEMO_HOME_COURSES: CourseInput[] = [
  {
    title: 'Data Structures',
    description: 'Introduction to arrays, linked lists, trees, heaps, hashing, and graph fundamentals.',
    creditHours: 3,
  },
  {
    title: 'Database Systems',
    description: 'Relational design, SQL, transactions, normalization, indexing, and query optimization.',
    creditHours: 3,
  },
  {
    title: 'Operating Systems',
    description: 'Processes, threads, memory management, synchronization, scheduling, and file systems.',
    creditHours: 4,
  },
  {
    title: 'Artificial Intelligence',
    description: 'Search, knowledge representation, basic machine learning, and intelligent systems.',
    creditHours: 3,
  },
  {
    title: 'Software Engineering',
    description: 'Requirements, design, testing, version control, and team-based software delivery.',
    creditHours: 3,
  },
  {
    title: 'Computer Networks',
    description: 'Network models, routing, protocols, transport, and practical internet architecture.',
    creditHours: 3,
  },
  {
    title: 'Human Computer Interaction',
    description: 'User-centered design, usability, accessibility, and interface evaluation.',
    creditHours: 3,
  },
];

const normalizeTitle = (value?: string) => value?.trim() || '';

const validateCourseInput = (payload: CourseInput) => {
  const title = normalizeTitle(payload.title);
  const creditHours = Number(payload.creditHours);

  if (!title) {
    throw new ValidationError(
      'Title is required.',
      'The course title was not provided.',
      'Enter a course title and try again.',
      'COURSE_TITLE_REQUIRED'
    );
  }

  if (!Number.isFinite(creditHours) || creditHours <= 0) {
    throw new ValidationError(
      'Credit hours must be greater than zero.',
      'The course credit hours value is invalid.',
      'Enter a positive credit hour value and try again.',
      'COURSE_CREDIT_HOURS_INVALID'
    );
  }

  return { title, creditHours };
};

const validateInstructorInput = (payload: InstructorInput) => {
  const instructorName = payload.instructorName?.trim() || '';
  const instructorEmail = payload.instructorEmail?.trim().toLowerCase() || '';

  if (instructorEmail && !EMAIL_PATTERN.test(instructorEmail)) {
    throw new ValidationError(
      'Instructor email is invalid.',
      'The instructor email address is not in a valid format.',
      'Enter an address like name@university.edu or leave it empty.',
      'COURSE_INSTRUCTOR_EMAIL_INVALID'
    );
  }

  return { instructorName, instructorEmail };
};

const populateCourse = <T>(query: T) =>
  (query as any).populate('createdBy', 'name email role');

const ensureAdminUser = async () => {
  const existingAdmin = await User.findOne({ role: UserRole.ADMIN }).sort({ createdAt: 1 });
  if (existingAdmin) {
    return existingAdmin;
  }

  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash(DEMO_ADMIN_PASSWORD, salt);

  return User.create({
    name: 'System Admin',
    email: DEMO_ADMIN_EMAIL,
    password,
    role: UserRole.ADMIN,
    phone: '+92-300-0000001',
    sapId: 'ADM0001',
    isActive: true,
  });
};

export const listHomeCourses = async () =>
  populateCourse(
    Course.find({ $or: [{ isHomeCourse: true }, { type: CourseType.HOME }] }).sort({ title: 1, name: 1 })
  );

export const getCourseById = async (courseId: string) => {
  const course = await populateCourse(Course.findById(courseId));
  if (!course) {
    throw new NotFoundError(
      'Course not found.',
      'No course exists for the provided identifier.',
      'Verify the course id and try again.',
      'COURSE_NOT_FOUND'
    );
  }

  return course;
};

export const createHomeCourse = async (adminId: string, payload: CourseInput) => {
  const admin = await User.findById(adminId);
  if (!admin || admin.role !== UserRole.ADMIN) {
    throw new ForbiddenError(
      'Access denied.',
      'Only administrators can create home courses.',
      'Sign in with an administrator account and try again.',
      'ROLE_NOT_ALLOWED'
    );
  }

  const { title, creditHours } = validateCourseInput(payload);
  const instructor = validateInstructorInput(payload);

  const course = await Course.create({
    title,
    name: title,
    description: payload.description?.trim() || '',
    creditHours,
    ...instructor,
    code: '',
    universityId: null,
    type: CourseType.HOME,
    isHomeCourse: true,
    createdBy: admin._id,
  });

  return getCourseById(course._id.toString());
};

export const updateHomeCourse = async (courseId: string, payload: CourseInput) => {
  const { title, creditHours } = validateCourseInput(payload);
  const instructor = validateInstructorInput(payload);
  const course = await Course.findOne({
    _id: courseId,
    $or: [{ isHomeCourse: true }, { type: CourseType.HOME }],
  });

  if (!course) {
    throw new NotFoundError(
      'Course not found.',
      'The requested home course could not be located.',
      'Refresh the list and try again.',
      'COURSE_NOT_FOUND'
    );
  }

  course.title = title;
  course.name = title;
  course.description = payload.description?.trim() || '';
  course.creditHours = creditHours;
  course.instructorName = instructor.instructorName;
  course.instructorEmail = instructor.instructorEmail;
  course.isHomeCourse = true;
  course.type = CourseType.HOME;
  await course.save();

  return getCourseById(courseId);
};

export const listHostCourses = async () =>
  Course.find({ type: CourseType.HOST }).populate('universityId', 'name').sort({ code: 1, title: 1 });

/** Sets who teaches a course (home or host). Empty values clear the instructor. */
export const updateCourseInstructor = async (courseId: string, payload: InstructorInput) => {
  const instructor = validateInstructorInput(payload);
  const course = await Course.findById(courseId);

  if (!course) {
    throw new NotFoundError(
      'Course not found.',
      'No course exists for the provided identifier.',
      'Refresh the list and try again.',
      'COURSE_NOT_FOUND'
    );
  }

  course.instructorName = instructor.instructorName;
  course.instructorEmail = instructor.instructorEmail;
  await course.save();

  return course.populate('universityId', 'name');
};

export const deleteHomeCourse = async (courseId: string) => {
  const deleted = await Course.findOneAndDelete({
    _id: courseId,
    $or: [{ isHomeCourse: true }, { type: CourseType.HOME }],
  });

  if (!deleted) {
    throw new NotFoundError(
      'Course not found.',
      'The requested home course could not be located.',
      'Refresh the list and try again.',
      'COURSE_NOT_FOUND'
    );
  }

  return deleted;
};

export const seedDemoHomeCoursesIfNeeded = async () => {
  const existingCourses = await Course.countDocuments();
  if (existingCourses > 0) {
    return false;
  }

  const admin = await ensureAdminUser();
  const coursesToCreate = DEMO_HOME_COURSES.map((course) => ({
    title: course.title,
    name: course.title,
    description: course.description || '',
    creditHours: course.creditHours,
    code: '',
    universityId: null,
    type: CourseType.HOME,
    isHomeCourse: true,
    createdBy: admin._id,
  }));

  await Course.insertMany(coursesToCreate);
  return true;
};
