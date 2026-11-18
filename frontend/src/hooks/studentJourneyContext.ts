import { createContext } from 'react';
import type { JourneyInput } from '../utils/studentJourney';

export interface JourneyContextValue {
  journey: JourneyInput | null;
  setJourney: (value: JourneyInput | null) => void;
  /** Loads the journey again in the background. The current value stays on screen until the new one arrives. */
  reload: () => void;
}

export const JourneyContext = createContext<JourneyContextValue | null>(null);
