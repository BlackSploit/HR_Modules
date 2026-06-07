import { useCallback } from "react";
import { toast } from "sonner";

interface GeoResult {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const getLocation = useCallback((): Promise<GeoResult | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast.warning("Geolocation not supported by this browser");
        return resolve(null);
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          if (err.code === 1) {
            toast.warning("Location permission denied — attendance will be saved without location");
          } else {
            toast.warning("Could not capture location — attendance will be saved without it");
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  return { getLocation };
}
