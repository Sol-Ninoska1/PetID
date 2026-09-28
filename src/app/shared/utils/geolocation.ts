export class GeolocationError extends Error {
  constructor(readonly reason: 'unsupported' | 'denied' | 'unavailable') {
    super(reason);
  }
}

export const GEOLOCATION_MESSAGES: Record<GeolocationError['reason'], string> = {
  unsupported: 'Tu navegador no permite compartir la ubicación.',
  denied: 'No diste permiso para usar tu ubicación. Puedes activarlo en la configuración del navegador.',
  unavailable: 'No pudimos obtener tu ubicación. Inténtalo de nuevo al aire libre.',
};

/**
 * Phones often report a rough fix first (Wi-Fi/cell, hundreds of metres) and a GPS one seconds later.
 * Keeps listening for up to `settleMs` after the first fix and resolves with the most accurate one,
 * or right away once it's within `goodEnoughM`.
 */
export function getCurrentPosition(settleMs = 8000, goodEnoughM = 50): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeolocationError('unsupported'));
      return;
    }

    let best: GeolocationPosition | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let watchId: number | undefined;
    let done = false;

    const finish = (error?: GeolocationError) => {
      if (done) return;
      done = true;
      clearTimeout(settleTimer);
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      if (best && !error) resolve(best);
      else reject(error ?? new GeolocationError('unavailable'));
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!best || position.coords.accuracy < best.coords.accuracy) best = position;
        if (position.coords.accuracy <= goodEnoughM) finish();
        else settleTimer ??= setTimeout(() => finish(), settleMs);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) finish(new GeolocationError('denied'));
        else if (!best) finish(new GeolocationError('unavailable'));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}
