import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { applicationApi } from '../lib/applicationApi';
import { equivalencyApi, resultsApi, verificationApi } from '../lib/api';
import { buildAdvisorOverview, type AdvisorOverview } from '../utils/advisorOverview';
import { buildAdvisorTasks, type AdvisorTask } from '../utils/advisorTasks';

export interface AdvisorDashboardData {
  tasks: AdvisorTask[];
  overview: AdvisorOverview;
}

/** Loads everything the advisor dashboard shows in one go. Returns null until the first load finishes. */
export function useAdvisorDashboard() {
  const { user } = useAuth();
  const token = user?.token;
  const [data, setData] = useState<AdvisorDashboardData | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    // Each source is optional: a failed request just leaves its part of the dashboard empty.
    Promise.all([
      applicationApi.getAdvisorApplications().catch(() => []),
      equivalencyApi.getAdvisorRequests(token).catch(() => []),
      resultsApi.getAdvisorGradableItems(token).catch(() => []),
      verificationApi.getAdvisorVerifications(token).catch(() => []),
    ]).then(([applications, requests, gradable, verifications]) => {
      if (!cancelled) {
        setData({
          tasks: buildAdvisorTasks({ applications, requests, gradable, verifications }),
          overview: buildAdvisorOverview(applications, requests),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return data;
}
