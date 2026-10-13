# Approved ordered warehouse page

The production /minimal-originale/capannone_3d.html uses the layout supplied in capannone_3d-riordinato.zip on 12 October 2026 (hosting commit 0c6bb5631baf191d0735b41c6fc5e5bac2798c34). The CRM apps/control-center-original-web source predates that redesign. Do not export that older application over this page.

The 13 October Wazuh export accidentally replaced the approved layout. The corrected release preserves the supplied stylesheet, assets and all presentation code. Only the two security projection functions are delegated to the readable warehouse-wazuh-security.js module, retaining Wazuh freshness and coverage inside the approved security interface.

Run node scripts/restore-ordered-warehouse.mjs to reproduce the adaptation from the approved git artifact, then node scripts/check-ordered-warehouse.mjs. The deployment workflow requires this check. It rejects replacement with the old layout and validates stale security data.

Existing filenames remain unchanged. The entry and module import include content SHA-256 query parameters so browsers do not reuse previously cached immutable JavaScript after its security-only adaptation. The manifest records current hashes and original layout provenance. Other pages, Amazon pickup banner and backend services are unchanged.
