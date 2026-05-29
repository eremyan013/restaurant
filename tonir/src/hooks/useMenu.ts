import { useState, useEffect } from 'react';
import { fetchMenuByVenue } from '../lib/api';
import type { MenuCategoryRow, MenuItemRow } from '../lib/database.types';

export function useMenu(venueId: string) {
  const [categories, setCategories] = useState<MenuCategoryRow[]>([]);
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMenuByVenue(venueId)
      .then(({ categories, items }) => {
        if (cancelled) return;
        setCategories(categories);
        setItems(items);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [venueId]);

  return { categories, items, loading, error };
}
