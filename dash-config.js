/**
 * Dashboard config (NO UI fields).
 * - apiBase: Cloud Function URL (amzAnalyticsApi)
 * - apiKey: Secret AMZ_DASH_API_KEY (used by backend to authorize reads)
 *
 * NOTE: If you rotate AMZ_DASH_API_KEY, update apiKey here and redeploy hosting.
 */
window.AMZ_DASH = {
  apiBase: "https://europe-west8-tabellone-produzione-liv-e313e.cloudfunctions.net/amzAnalyticsApi",
  apiKey: "8d6788cee99e0a6493fde6c0ecaabcc8afcb758b20b4030e"
};
