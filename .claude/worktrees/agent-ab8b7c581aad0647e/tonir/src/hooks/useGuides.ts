import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchGuides } from '../lib/api';
import type { GuideRow } from '../lib/database.types';
import { useStore } from '../store';
import { localizeGuide } from '../lib/localize';

export function useGuides() {
  const [raw, setRaw] = useState<GuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { language } = useStore();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGuides()
      .then(data => { if (!cancelled) setRaw(data); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const guides = useMemo(() => raw.map(g => localizeGuide(g, language)), [raw, language]);
  const retry = useCallback(() => setAttempt(n => n + 1), []);

  return { guides, loading, error, retry };
}
