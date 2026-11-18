import { getDocumentsForStudent } from '../modules/documents/document.service';
import StudentProfile from '../models/StudentProfile';
import { getLatestStudentApplication } from './applicationService';
import { getStudentRequests } from './courseEquivalencyService';
import { getStudentResults } from './resultService';
import { getStudentVisaProcess } from './visaService';

/**
 * Everything the student's progress steps are built from, in one call. Each part is the same data its own endpoint
 * returns (applications, course requests, documents, visa, results), so the frontend can build the tracker from this
 * one response instead of making six requests on every page change.
 */
export const getStudentJourneyData = async (studentId: string) => {
  const [application, requests, documents, profile, visa, results] = await Promise.all([
    getLatestStudentApplication(studentId),
    getStudentRequests(studentId),
    getDocumentsForStudent(studentId),
    StudentProfile.findOne({ userId: studentId }).select('transcript.fileUrl').lean(),
    getStudentVisaProcess(studentId),
    getStudentResults(studentId),
  ]);

  return {
    application,
    requests,
    documents,
    transcriptUploaded: Boolean(profile?.transcript?.fileUrl),
    visa,
    results,
  };
};
