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

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeolocationError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) =>
      reject(new GeolocationError(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}
