# Warehouse monolith interface

User authorization, 18 October 2026 at 15:46 Europe/Rome: "ho aggiornato questa deploy".

Input archive SHA-256: 4b93d246d858328a9bcaada07a52287da39a28e24e35e63b8e6fcaeb607b3fca (capannone_3d(5).zip).

Apply the supplied black glass monolith artwork, per-queue slabs, verified snapshot receipt and power ruler. The new visor reads the actual Paola audio waveform through the existing analyser. Preserve the authenticated read paths, verified snapshots, expiry rules, queue counts, FBA pickup notice, chat, controls, voice model and pitch, and existing filenames.

Integration adjustments: retain the dt-dot state/talking compatibility classes already in production; provide extra canvas margins and clearance for mobile annotations; fit the engraved state within the glass. No other design or business logic changes.

Scope: minimal web presentation, README and frontend regression scripts. Review against all 21 protected feature groups found no changes to protected source, contract inventory, API, alert service, collectors, production configuration or permissions. The original /minimal-originale/ dashboard remains separate and unchanged.

Protected contract remains dd3508ce9b28710da143a2fca830fda99cd88320e93f87b5120d0d4f82889730. Hosting-only frontend release; no CRM backend deployment or pin update.

Validation before release:
- npm run verify: functional contract, typecheck and all 673 tests passed.
- Minimal UI: light/dark at 1920x1080, 1366x768 and 390x844; actual native canvas dimensions; annotations inside canvas; counts, chat, receipts, refresh, theme, unavailable and expired data passed. Desktop and mobile screenshots inspected.
- Existing FBA pickup regression passed unchanged.
- Core regression updated for Canvas 2D: painted pixels, native DPR and resize, actual count/power/receipt labels, waveform input, 80-row overflow, null versus zero, state classes, moods/gestures, reduced motion, hidden-page pause/resume, unmount cleanup and CSS fallback passed.
- Real Paola speech: waveform amplitude observed during playback and absent while muted; pitch preserved; 400 repeated utterances, crash recovery, cache repair and no-system-voice fallback passed.

Build from this committed source through scripts/export-warehouse-minimal.mjs. Preserve all existing immutable Hosting assets, voice models and unrelated files. Run compiled Hosting/speech checks and the ordered-warehouse release gate, then publish through the existing Firebase Hosting GitHub workflow.

Compiled release validation: all 28 manifest assets matched; fresh-browser login and legacy map/minimal redirects passed on both Firebase hostnames; exact bundled Paola worker produced and played neural PCM. Mandatory ordered-layout, security, PWA, reconnect, vehicle and Amazon-continuity checks passed. Source revision: 97ae8e6cef9e907d1652fa623db1d54e0bbbe172.
