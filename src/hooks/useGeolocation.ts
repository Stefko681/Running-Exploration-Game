import { useEffect, useRef, useState } from "react";

type GeoStatus =
  | { kind: "idle" }
  | { kind: "watching" }
  | { kind: "error"; message: string };

export type GeoReading = {
  lat: number;
  lng: number;
  accuracy?: number;
  t: number;
};

export function useGeolocation(enabled: boolean, opts?: PositionOptions) {
  const [status, setStatus] = useState<GeoStatus>({ kind: "idle" });
  const [reading, setReading] = useState<GeoReading | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      setStatus({ kind: "idle" });
      return;
    }

    if (!("geolocation" in navigator)) {
      setStatus({ kind: "error", message: "Geolocation is not supported." });
      return;
    }

    // Helper to start watching
    const startWatch = (highAccuracy: boolean) => {
      // Clear existing watch if any
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }

      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          setReading({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            t: pos.timestamp
          });
          setStatus({ kind: "watching" });
        },
        (err) => {
          console.warn("Geolocation error:", err);
          // Retry with low accuracy if high accuracy fails (timeout or unavailable)
          if (highAccuracy && (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
            console.log("Falling back to low accuracy geolocation...");
            startWatch(false);
            return;
          }

          let msg = err.message || "Unknown error acquiring position";
          if (err.code === err.PERMISSION_DENIED) {
            msg = "Location permission denied. Please enable it in browser settings.";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = "Location unavailable. GPS signal lost or weak.";
          }
          setStatus({ kind: "error", message: msg });
        },
        {
          enableHighAccuracy: highAccuracy,
          maximumAge: 10000,
          timeout: 20000,
          ...opts
        }
      );
    };

    setStatus({ kind: "watching" });
    startWatch(true);

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [enabled, opts?.enableHighAccuracy, opts?.maximumAge, opts?.timeout]);

  return { status, reading };
}
