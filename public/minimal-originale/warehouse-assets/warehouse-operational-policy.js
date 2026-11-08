// Authorized 8 November 2026: K7 is intentionally off during weekends.
// This is a display policy, not a successful health check. Signed source objects
// and their diagnostic proofs stay untouched; all weekday failures remain visible.
const romeDay = new Intl.DateTimeFormat('en-US', {timeZone:'Europe/Rome', weekday:'short'});
export function serviceDisplayState(service, observedState, now = Date.now()) {
  if (service?.id !== 'node-k7' || observedState === 'ok' || !Number.isFinite(now)) return observedState;
  const day = romeDay.format(now);
  return day === 'Sat' || day === 'Sun' ? 'paused' : observedState;
}
