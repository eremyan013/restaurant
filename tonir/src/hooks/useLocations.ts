import { useState, useEffect } from 'react';
import { fetchLocations } from '../lib/api';
import { LocationRow } from '../lib/database.types';

export function useLocations() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations()
      .then(setLocations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const defaultLocationId = locations[0]?.id ?? null;

  return { locations, loading, defaultLocationId };
}
