import { inject, Injectable } from '@angular/core';
import { IpLocation } from '../../shared/utils/ip-location';
import { FoundReportInput, GeoPoint, PublicPetIdState } from '../models';
import { SupabaseService } from '../supabase/supabase.service';
import { toPublicPetIdState } from './mappers';

/** Anonymous visitor API: only goes through the SQL functions exposed to `anon`, never touches tables. */
@Injectable({ providedIn: 'root' })
export class PublicPetRepository {
  private readonly db = inject(SupabaseService).client;

  /** Null when the token doesn't match any PetID. */
  async getByToken(token: string): Promise<PublicPetIdState | null> {
    const { data, error } = await this.db.rpc('get_public_pet_id', { p_token: token });
    if (error) throw error;
    return data ? toPublicPetIdState(data) : null;
  }

  async recordScan(token: string, geo: IpLocation | null): Promise<string | null> {
    const { data, error } = await this.db.rpc('record_scan', {
      p_token: token,
      p_user_agent: navigator.userAgent,
      p_geo: geo,
    });
    if (error) throw error;
    return data;
  }

  async shareLocation(token: string, scanId: string | null, point: GeoPoint, accuracyM: number | null): Promise<void> {
    const { error } = await this.db.rpc('share_location', {
      p_token: token,
      p_scan_id: scanId,
      p_latitude: point.lat,
      p_longitude: point.lng,
      p_accuracy_m: accuracyM,
    });
    if (error) throw error;
  }

  async submitFoundReport(token: string, input: FoundReportInput): Promise<void> {
    const { error } = await this.db.rpc('submit_found_report', {
      p_token: token,
      p_reporter_name: input.reporterName,
      p_reporter_phone: input.reporterPhone,
      p_reporter_email: input.reporterEmail,
      p_message: input.message,
      p_location_text: input.locationText,
      p_latitude: input.point?.lat ?? null,
      p_longitude: input.point?.lng ?? null,
    });
    if (error) throw error;
  }
}
