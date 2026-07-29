import { useState, useEffect } from 'react';
import { fetchOccasions } from '../lib/api';
import { useStore } from '../store';
import type { OccasionRow } from '../lib/database.types';

export type OccasionOption = { id: string; name: string };

export function useOccasions(): { options: OccasionOption[]; loading: boolean } {
  const { language } = useStore();
  const [rows, setRows] = useState<OccasionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOccasions()
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const options: OccasionOption[] = rows.map((r) => ({
    id: r.id,
    name: language === 'hy' ? r.name_hy : language === 'ru' ? r.name_ru : r.name_en,
  }));

  return { options, loading };
}
