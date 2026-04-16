export interface CourseCreatorSummary {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

export interface CourseRecord {
  _id: string;
  title?: string;
  name?: string;
  code?: string;
  description?: string;
  outlineText?: string;
  outlineFileUrl?: string;
  creditHours: number;
  type?: 'home' | 'host';
  isHomeCourse?: boolean;
  universityId?:
    | {
        _id: string;
        name: string;
      }
    | string
    | null;
  createdBy?: CourseCreatorSummary | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseInput {
  title: string;
  description?: string;
  creditHours: number;
}

export const getCourseDisplayTitle = (course?: CourseRecord | null) =>
  course?.title?.trim() || course?.name?.trim() || course?.code?.trim() || 'Untitled course';
