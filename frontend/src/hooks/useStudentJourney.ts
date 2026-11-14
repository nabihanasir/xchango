import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { applicationApi } from '../lib/applicationApi';
import { equivalencyApi, resultsApi, visaApi } from '../lib/api';
import { documentApi } from '../lib/documentApi';
import { studentProfileApi } from '../lib/studentProfileApi';
import { pickJourneyApplication, type JourneyInput } from '../utils/studentJourney';

/**
 * Loads everything the student's progress steps are built from. Pass a value that changes (for example the
 * current path) as `refreshKey` to load it again.
 */
export function useStudentJourney(refreshKey?: unknown) {
  const { user } = useAuth();
  const [journey, setJourney] = useState<JourneyInput | null>(null);
  const studentId = user?._id;
  const token = user?.token;

  useEffect(() => {
    if (!studentId || !token) {
      return;
    }

    let cancelled = false;

    // Each source is optional: a failed request just leaves that step unfinished.
    Promise.all([
      applicationApi.getStudentApplications(studentId).catch(() => []),
      equivalencyApi.getStudentRequests(token).catch(() => []),
      documentApi.getStudentDocuments(studentId).catch(() => []),
      studentProfileApi.getStudentProfile(studentId).catch(() => null),
      visaApi.getStudentVisa(token).catch(() => null),
      resultsApi.getStudentResults(token).catch(() => []),
    ]).then(([applications, requests, documents, profile, visa, results]) => {
      if (!cancelled) {
        setJourney({
          application: pickJourneyApplication(applications),
          requests,
          documents,
          transcriptUploaded: Boolean(profile?.transcript?.fileUrl),
          visa,
          results,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [studentId, token, refreshKey]);

  return [journey, setJourney] as const;
}
