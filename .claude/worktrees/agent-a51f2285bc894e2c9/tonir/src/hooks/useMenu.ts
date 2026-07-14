import { useState, useEffect, useMemo } from 'react';
import { fetchMenuByVenue } from '../lib/api';
import type { MenuCategoryRow, MenuItemRow } from '../lib/database.types';
import { useStore } from '../store';
import { localizeCategory, localizeItem } from '../lib/localize';

export function useMenu(venueId: string) {
  const [rawCats, setRawCats] = useState<MenuCategoryRow[]>([]);
  const [rawItems, setRawItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useStore();

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMenuByVenue(venueId)
      .then(({ categories, items }) => {
        if (cancelled) return;
        setRawCats(categories);
        setRawItems(items);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [venueId]);

  const categories = useMemo(() => rawCats.map(c => localizeCategory(c, language)), [rawCats, language]);
  const items = useMemo(() => rawItems.map(i => localizeItem(i, language)), [rawItems, language]);

  return { categories, items, loading, error };
}
