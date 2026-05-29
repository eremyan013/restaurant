import { useState, useEffect, useCallback } from 'react';
import { fetchGuides } from '../lib/api';
import type { GuideRow } from '../lib/database.types';

export function useGuides() {
  const [guides, setGuides] = useState<GuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGuides()
      .then(data => { if (!cancelled) setGuides(data); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);
  return { guides, loading, error, retry };
}
