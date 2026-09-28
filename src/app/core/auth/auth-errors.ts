const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Email o contraseña incorrectos.'],
  [/already registered|already been registered/i, 'Ya existe una cuenta con ese email.'],
  [/email not confirmed/i, 'Confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.'],
  [/password should be at least/i, 'La contraseña es demasiado corta.'],
  [/rate limit|too many requests/i, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'],
  [/same password|different from the old/i, 'La nueva contraseña debe ser distinta a la anterior.'],
  [/failed to fetch|network/i, 'No pudimos conectarnos. Revisa tu conexión a internet.'],
];

export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return MESSAGES.find(([pattern]) => pattern.test(message))?.[1] ?? 'Ocurrió un error. Inténtalo de nuevo.';
}
