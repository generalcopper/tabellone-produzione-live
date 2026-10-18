# Warehouse cyber core Hosting release

User request, 18 October 2026 14:59 Europe/Rome: "ecco zipettino con interfaccia aggironata verifica e se tuto ok deploy".

Input archive SHA-256: 4c8854ce803b300cf537f815067ea8465db27bffe2eefb2a93dd2bd197fd805e.
Source: generalcopper/cedoly-crm PR #205, commit 228a22d0dd9c8be80ba3ba504775f529c6b40573.
Hosting baseline: 929a1dc1b337f3f88014b41e91f4ce0f34512051.

The supplied holographic core replaces the previous Dot artwork on /capannone_3d.html. Existing dt-dot state classes remain as compatibility aliases. The user design, names of source files, authentication, data integrity, queue counts, FBA pickup warning, receipts, toolbar, polling and Paola voice are preserved. The uploaded stylesheet is reproduced byte for byte; only the compiled JavaScript changes additionally for the compatibility aliases.

The existing exporter generated four new content-addressed assets and updated only the primary HTML and its two release manifests. Earlier assets remain available. The full voice models omitted from the input ZIP remain in Hosting unchanged. No changes to firebase.json, backend functions, permissions, or /minimal-originale/.

Validation:
- Source foundations, contract, typecheck and 673 regressions passed.
- Minimal UI passed in light/dark at 1920x1080, 1366x768 and 390x844, including verified counts, receipts, messages, theme/refresh and stale data.
- FBA pickup checks passed.
- Core WebGL rendering pixels, errors, inputs, state clearing, moods/gestures, reduced motion, context recovery and CSS fallback passed.
- Compiled Hosting assets verified on both Firebase domains, including login, redirects and real Paola neural audio (2.566 seconds, peak 0.612).
- Original ordered layout, security, PWA, reconnect behavior, vehicles and Amazon continuity checks passed.

Release file hashes are recorded in public/warehouse-release.json and public/minimal/warehouse-release.json. The CRM protected contract remains dd3508ce9b28710da143a2fca830fda99cd88320e93f87b5120d0d4f82889730; no CRM API or alert service deployment is part of this change.
