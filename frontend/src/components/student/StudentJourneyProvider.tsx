import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { JourneyContext } from '../../hooks/studentJourneyContext';
import { applicationApi } from '../../lib/applicationApi';
import type { JourneyInput } from '../../utils/studentJourney';

/** Shown when the journey cannot be loaded at all, so pages do not wait forever. Every step then reads as not started. */
const EMPTY_JOURNEY: JourneyInput = {
  application: null,
  requests: [],
  documents: [],
  transcriptUploaded: false,
  visa: null,
  results: [],
};

/**
 * Loads everything the student's progress steps are built from, once for the whole student area, in a single
 * request. The Next-step bar, the page guards and the pages all read this one copy, instead of each loading it on
 * every page change. It refreshes in the background after each navigation, so the data stays current without
 * blocking a page.
 */
export default function StudentJourneyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [journey, setJourney] = useState<JourneyInput | null>(null);
  const studentId = user?._id;
  const token = user?.token;
  const loading = useRef(false);
  const again = useRef(false);

  const reload = useCallback(() => {
    if (!studentId || !token) {
      return;
    }

    // One load at a time. A request made meanwhile runs right after the current one, so it sees the newest data.
    if (loading.current) {
      again.current = true;
      return;
    }

    loading.current = true;

    const run = async () => {
      do {
        again.current = false;
        try {
          setJourney(await applicationApi.getMyJourney());
        } catch {
          // Keep what is already on screen. Only fall back to an empty journey when there is nothing yet.
          setJourney((current) => current ?? EMPTY_JOURNEY);
        }
      } while (again.current);

      loading.current = false;
    };

    void run();
  }, [studentId, token]);

  useEffect(() => {
    reload();
  }, [reload, pathname]);

  const value = useMemo(() => ({ journey, setJourney, reload }), [journey, reload]);
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}
