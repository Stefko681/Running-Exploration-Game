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
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          setReading({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            t: pos.timestamp
          });
          // If we recovered from an error, clear it
          setStatus({ kind: "watching" });
        },
        (err) => {
          // If high accuracy failed, try low accuracy
          if (highAccuracy) {
            console.warn("High accuracy GPS failed, falling back to low accuracy...", err);
            if (watchId.current !== null) {
              navigator.geolocation.clearWatch(watchId.current);
            }
            startWatch(false);
          } else {
            setStatus({ kind: "error", message: err.message || "Unknown error acquiring position" });
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          maximumAge: 1000,
          timeout: 15000,
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

