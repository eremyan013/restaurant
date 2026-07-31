import { useState, useEffect } from 'react';
import { fetchBanners } from '../lib/api';
import type { BannerRow } from '../lib/database.types';

export function useBanners() {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBanners()
      .then((data) => { if (!cancelled) { setBanners(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { banners, loading };
}
