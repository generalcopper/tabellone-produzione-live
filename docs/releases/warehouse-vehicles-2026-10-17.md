# Vehicle monitor inside the approved dashboard

User request, 17 October 2026: add an insurance/inspection monitor and cost table with per-vehicle details; keep the new compact card inside the dashboard, without occupying the hero or header or rearranging the interface.

The new card is appended inside the existing Activity column. A dialog provides a cost overview, deadline calendar, individual vehicle information, coverage conditions, suspensions, inspection evidence, payments and agency contacts. It reuses the existing authenticated, bounded polling helper. Registry data is served only by the admin-only CRM API, never embedded in Hosting. The existing PWA continues to avoid caching any authenticated response.

Three narrowly scoped additions in the bundle import, instantiate and render the independent module. The compatibility guard removes only these exact hooks and requires the previous complete bundle SHA-256. Every existing layout, security, iLovePaghe, polling and PWA guard then runs unchanged. The original stylesheet, hero, header, grid, security and iLovePaghe assets remain byte-identical.

The vehicle module and scoped stylesheet have independently pinned hashes. Tests reject modified/stale snapshots and verify per-vehicle detail selection. All existing names remain unchanged.
