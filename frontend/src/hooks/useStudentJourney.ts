import { useContext, useEffect, useRef } from 'react';
import { JourneyContext } from './studentJourneyContext';

/**
 * The student's journey, shared across the student area (see StudentJourneyProvider). Pass a value that changes as
 * `refreshKey` to load it again, for example after the student does something that changes their progress.
 */
export function useStudentJourney(refreshKey?: unknown) {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error('useStudentJourney must be used inside StudentJourneyProvider.');
  }

  const { journey, setJourney, reload } = context;
  const first = useRef(true);

  useEffect(() => {
    // The provider already loads on mount, so only a changed key asks for another load.
    if (first.current) {
      first.current = false;
      return;
    }
    reload();
  }, [refreshKey, reload]);

  return [journey, setJourney] as const;
}
