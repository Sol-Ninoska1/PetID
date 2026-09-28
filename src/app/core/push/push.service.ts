import { inject, Injectable, isDevMode, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';

export type PushAvailability = 'available' | 'dev' | 'ios-install' | 'unsupported';

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** Owner-side Web Push: subscribe this device to scan / location / found-report notifications. */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly swPush = inject(SwPush);
  private readonly db = inject(SupabaseService).client;

  readonly availability: PushAvailability = this.detectAvailability();
  readonly permission = signal<NotificationPermission>('Notification' in window ? Notification.permission : 'denied');
  readonly subscribed = toSignal(this.swPush.subscription.pipe(map(Boolean)), { initialValue: false });

  async enable(): Promise<void> {
    const subscription = await this.swPush.requestSubscription({ serverPublicKey: environment.vapidPublicKey });
    this.permission.set(Notification.permission);
    try {
      await this.save(subscription);
    } catch (e) {
      await this.swPush.unsubscribe().catch(() => undefined);
      throw e;
    }
  }

  /** Re-links an existing subscription to the signed-in account (account switches, cleaned-up rows). */
  async sync(): Promise<void> {
    if (this.availability !== 'available' || this.permission() !== 'granted') return;
    const subscription = await firstValueFrom(this.swPush.subscription);
    if (subscription) await this.save(subscription);
  }

  /** Removes this device's subscription. Call before signing out so the next user doesn't get the alerts. */
  async disable(): Promise<void> {
    if (!this.swPush.isEnabled) return;
    const subscription = await firstValueFrom(this.swPush.subscription);
    if (!subscription) return;
    await this.db.rpc('delete_push_subscription', { p_endpoint: subscription.endpoint });
    await this.swPush.unsubscribe();
  }

  private async save(subscription: PushSubscription) {
    const { endpoint, keys } = subscription.toJSON();
    const { error } = await this.db.rpc('save_push_subscription', {
      p_endpoint: endpoint,
      p_p256dh: keys?.['p256dh'],
      p_auth: keys?.['auth'],
      p_user_agent: navigator.userAgent,
    });
    if (error) throw error;
  }

  private detectAvailability(): PushAvailability {
    if (isDevMode()) return 'dev';
    if (isIos() && !isStandalone()) return 'ios-install';
    if (!this.swPush.isEnabled || !('Notification' in window) || !environment.vapidPublicKey) return 'unsupported';
    return 'available';
  }
}
