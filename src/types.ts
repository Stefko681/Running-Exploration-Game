export type LatLngPoint = {
  lat: number;
  lng: number;
  /** epoch ms */
  t: number;
};

export type RunSummary = {
  /** Stable id for lists and preview selection */
  id: string;
  startedAt: number;
  endedAt: number;
  distanceMeters: number;
  points: LatLngPoint[];
};


