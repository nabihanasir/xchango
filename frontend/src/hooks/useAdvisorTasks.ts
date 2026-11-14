import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { applicationApi } from '../lib/applicationApi';
import { equivalencyApi, resultsApi, verificationApi } from '../lib/api';
import { buildAdvisorTasks, type AdvisorTask } from '../utils/advisorTasks';

/**
 * Loads what the advisor has waiting. Pass a value that changes (for example the current path) as
 * `refreshKey` to load it again. Returns null until the first load finishes.
 */
export function useAdvisorTasks(refreshKey?: unknown) {
  const { user } = useAuth();
  const token = user?.token;
  const [tasks, setTasks] = useState<AdvisorTask[] | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    // Each source is optional: a failed request just leaves its tasks out.
    Promise.all([
      applicationApi.getAdvisorApplications().catch(() => []),
      equivalencyApi.getAdvisorRequests(token).catch(() => []),
      resultsApi.getAdvisorGradableItems(token).catch(() => []),
      verificationApi.getAdvisorVerifications(token).catch(() => []),
    ]).then(([applications, requests, gradable, verifications]) => {
      if (!cancelled) {
        setTasks(buildAdvisorTasks({ applications, requests, gradable, verifications }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  return tasks;
}
