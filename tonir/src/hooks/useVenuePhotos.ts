import { useState, useEffect } from 'react';
import { fetchVenuePhotos } from '../lib/api';
import type { VenuePhotoRow } from '../lib/database.types';

export function useVenuePhotos(venueId: string) {
  const [photos, setPhotos] = useState<VenuePhotoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchVenuePhotos(venueId)
      .then((data) => {
        if (cancelled) return;
        setPhotos(data);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [venueId]);

  return { photos, loading, error };
}
