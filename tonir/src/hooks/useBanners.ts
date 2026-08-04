import { useState, useEffect } from 'react';
import { fetchBanners } from '../lib/api';
import type { BannerRow } from '../lib/database.types';
import { useTranslation } from './useTranslation';

export function useBanners() {
  const { language } = useTranslation();
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBanners(language)
      .then((data) => { if (!cancelled) { setBanners(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [language]);

  return { banners, loading };
}
