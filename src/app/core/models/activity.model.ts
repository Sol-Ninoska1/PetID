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
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string | null;
  message: string | null;
  location: { text: string | null; point: GeoPoint | null };
  createdAt: string;
  readAt: string | null;
}

/** Sent by the person who found the pet (public page). */
export interface FoundReportInput {
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string | null;
  message: string | null;
  locationText: string | null;
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

/** Unread item shown on the owner's dashboard. */
export type OwnerAlert =
  | { kind: 'found_report'; createdAt: string; data: FoundReport }
  | { kind: 'location_share'; createdAt: string; data: LocationShare };
