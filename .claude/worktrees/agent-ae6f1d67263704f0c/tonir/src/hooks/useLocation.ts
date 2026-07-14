import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Requests foreground location permission once and returns the user's
 * current position. Returns null while loading or if permission is denied.
 */
export function useLocation(): UserLocation | null {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        // Permission denied or location unavailable — distances stay static
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return location;
}
