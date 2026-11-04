import { useCallback, useEffect, useState } from 'react';
import { catalogApi } from '../lib/catalogApi';
import type { CatalogCountry, CatalogUniversity } from '../types/university';

interface CatalogState {
  countries: CatalogCountry[];
  universities: CatalogUniversity[];
  loading: boolean;
  error: string;
}

/** Loads the countries and universities admins maintain. Students and advisors only receive published ones. */
export function useCatalog() {
  const [state, setState] = useState<CatalogState>({ countries: [], universities: [], loading: true, error: '' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([catalogApi.getCountries(), catalogApi.getUniversities()])
      .then(([countries, universities]) => {
        if (!cancelled) setState({ countries, universities, loading: false, error: '' });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            countries: [],
            universities: [],
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load destinations',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true }));
    setVersion((current) => current + 1);
  }, []);

  return { ...state, reload };
}

export const universitiesInCountry = (universities: CatalogUniversity[], countryName: string) =>
  universities.filter((university) => university.countryId?.name === countryName);
