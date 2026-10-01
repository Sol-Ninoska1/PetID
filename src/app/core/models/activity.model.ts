export interface GeoPoint {
  lat: number;
  lng: number;
}

export type ScanDevice = 'mobile' | 'tablet' | 'desktop';

/** ip: city-level estimate from the visitor's connection; gps: shared by the visitor (rounded to ~1 km). */
export type ScanLocationSource = 'ip' | 'gps';

export interface Scan {
  id: string;
  petId: string | null;
  scannedAt: string;
  approximateLocation: GeoPoint | null;
  locationSource: ScanLocationSource | null;
  place: string | null;
  userAgent: string | null;
  device: ScanDevice | null;
}

export type FoundReportStatus = 'new' | 'read' | 'resolved';

export interface FoundReport {
  id: string;
  petId: string;
  petName?: string;
  status: FoundReportStatus;
  /** Older reports asked for a name; new ones only an optional phone. */
  reporterName: string | null;
  reporterPhone: string | null;
  reporterEmail: string | null;
  message: string | null;
  location: { text: string | null; point: GeoPoint | null };
  createdAt: string;
  readAt: string | null;
}

/** Sent by the person who found the pet (public page). The GPS is attached automatically when allowed. */
export interface FoundReportInput {
  reporterPhone: string | null;
  message: string | null;
  point: GeoPoint | null;
}

export interface LocationShare {
  id: string;
  petId: string;
  petName?: string;
  point: GeoPoint;
  accuracyM: number | null;
  createdAt: string;
  readAt: string | null;
}

/** One entry of the owner's notification history: the same events that send a push. */
export type OwnerNotification = { id: string; createdAt: string; petName: string; unseen: boolean } & (
  | { kind: 'found_report'; data: FoundReport }
  | { kind: 'location_share'; data: LocationShare }
  | { kind: 'scan'; data: Scan }
);
