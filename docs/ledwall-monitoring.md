# Dolci LED wall monitoring

Six fixed JPEGs, 3 Timbra and 3 Buste paga, one unique QR per installation. The authoritative QR registry and delivery SHA-256 values are in `generalcopper/cedoly-crm`, `services/crm/src/ledwall-campaign.json` (PR 214). The monitor reads its private CRM endpoint using the existing signed-in user's Google token.

The public `/Q/<id>` URLs on ilovepaghe.com redirect to CRM `/q/<id>`, then the fixed iLovePaghe landing with campaign tags. Only recognized browser navigation GETs count; HEAD, crawler, fetch and prefetch requests are excluded. `?test=1` separates technical tests; dates use Europe/Rome. Counts describe link openings, not unique people or camera recognition. Event hashes verify record content, not visitor identity.

## Release

The production backend is CRM PR 214; manual production run 40321851074 updated only API and alert worker. No business source, IAM role, user membership or auth rule was changed.

Hosting was cloned from the current live versions. The QR release preserved all 446 files and added six exact redirect paths. The tabellone release preserved all other paths and its config, changing only the two iLovePaghe assets, new monitor module, import cache keys, worker and release manifest.

`node scripts/publish-ledwall.cjs prepare ui "$PWD"` stages a version after comparing changed files with origin/main and the current live baseline. `release ui "$PWD"` refuses publication if another deployment intervened. The `qr` mode takes the backend registry as the last argument and refuses to overwrite existing redirects. Do not republish a stale full Hosting directory.

## Verification

- `node scripts/check-ordered-warehouse.mjs`
- `LEDWALL_REGISTRY=/path/to/cedoly-crm/services/crm/src/ledwall-campaign.json PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/test-ledwall-ui.mjs`
- Existing cockpit regressions with a synthetic payroll fixture, Chromium, light/dark themes.
- Live six-QR redirect chain, Firestore test events and SHA-256 verification; campaign counters remain zero before campaign start.

The vendor ZIP contains only the six JPEGs, delivery instructions and SHA256SUMS.txt. Images retain their approved artwork apart from the exact QR replacement. Physical LED wall scan distance still requires an on-site check.

## Production evidence · 26 October 2026

All 240 repository assets were downloaded from the live site and compared byte for byte; no differences. Hosting configuration also matches. The two additional Hosting paths are reserved Firebase init resources. The reviewed source is therefore safe to merge through the existing guarded Hosting workflow.

QR Hosting version: `sites/ilovepaghe-ludo-2026/versions/22aad5c27f2801fb`. Monitoring version before repository merge: `sites/tabellone-produzione-liv-e313e/versions/400bcc5d0c9e9d2a`. Six live technical events (one per wall) were verified in the CRM ledger with valid SHA-256 values; campaign and outside-period counters were all zero.
