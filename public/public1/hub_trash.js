/* Hub Inventario — Cestino (Trash)
   - Injects UI (menu + overlay view)
   - Soft-delete for: Prodotti (anagrafica), Fornitori (con cascata DDT), Flussi (DDT caricati)
   - Restore / Permanent delete from Trash
   Requirements: expects a global bridge: globalThis.__HUB = { fb, ORG_ID } (set from main module).
*/
;(function(){
  "use strict";

  if (globalThis.__HUB_TRASH_LOADED__) return;
  globalThis.__HUB_TRASH_LOADED__ = true;

  const KIND_LABEL = {
    product: "Prodotto",
    supplier: "Fornitore",
    flow: "Flusso"
  };

  const SORT_OPTS = {
    date_desc: "Data (più recenti)",
    date_asc: "Data (più vecchi)",
    type_asc: "Tipo",
    name_asc: "Nome"
  };

  const SAFE = {
    str(v){ return String(v ?? ""); },
    trim(v){ return String(v ?? "").trim(); },
    low(v){ return String(v ?? "").trim().toLowerCase(); },
    int(v){ const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }
  };

  // Bridge resolver (main app runs in a module: we need a global handle)
  function __getHub(){
    try{ return (typeof globalThis !== "undefined" && globalThis.__HUB) ? globalThis.__HUB : null; }catch(_){}
    return null;
  }
  function __getFB(){
    const h = __getHub();
    if (h && h.fb) return h.fb;
    try{ if (typeof globalThis !== "undefined" && globalThis.fb) return globalThis.fb; }catch(_){}
    // last resort: classic global var (works only if app is not module-scoped)
    try{ if (typeof fb !== "undefined") return fb; }catch(_){}
    return null;
  }
  function __getORG(){
    const h = __getHub();
    if (h && h.ORG_ID) return h.ORG_ID;
    try{ if (typeof globalThis !== "undefined" && globalThis.ORG_ID) return globalThis.ORG_ID; }catch(_){}
    try{ if (typeof ORG_ID !== "undefined") return ORG_ID; }catch(_){}
    return null;
  }
  function __getDB(){
    const FB = __getFB();
    return FB && FB.db ? FB.db : null;
  }
  function __getUser(){
    const FB = __getFB();
    if (!FB) return null;
    return FB.user || (FB.auth && FB.auth.currentUser) || null;
  }


  function __h(s){
    const t = SAFE.str(s);
    return t
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
  function __ha(s){ return __h(s).replaceAll("\n"," "); }

  function __qs(sel, root=document){ return root.querySelector(sel); }
  function __qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function __nowIso(){ return new Date().toISOString(); }

  function __getUserTag(){
    try{
      const u = (typeof fb !== "undefined" && fb && fb.user) ? fb.user : null;
      return (u && (u.email || u.uid)) ? (u.email || u.uid) : "";
    }catch(_){ return ""; }
  }

  function __tsToIsoMaybe(ts){
    try{
      if (typeof tsToIso === "function") return tsToIso(ts);
    }catch(_){}
    try{
      if (ts && typeof ts.toDate === "function") return ts.toDate().toISOString();
    }catch(_){}
    return SAFE.str(ts);
  }

  function __orgTrashCol(){
    try{
      if (typeof orgCol === "function") return orgCol("trash");
    }catch(_){/* ignore */}
    // fallback (via global bridge)
    try{
      const db = __getDB();
      const org = __getORG();
      if (typeof collection === "function" && db && org) return collection(db, "orgs", org, "trash");
    }catch(_){/* ignore */}
    return null;
  }
function __ensureFirebaseOrExplain(){
    const FB = __getFB();
    const db = __getDB();
    const org = __getORG();
    const user = __getUser();

    // Se il codice principale gira in un modulo, senza bridge qui FB/db/org risultano null.
    if (!FB || !db || !org){
      const msg = "Il Cestino non riesce a leggere la sessione/Firebase. Nel modulo principale aggiungi: globalThis.__HUB = { fb, ORG_ID } (o aggiorna __HUB.fb e __HUB.ORG_ID).";
      try{ openModal("Cestino non collegato", msg); }catch(_){ alert(msg); }
      return false;
    }

    // Auth non ancora agganciata (capita per qualche istante al reload)
    if (!user){
      try{ showToast("Accesso in corso… apri il Cestino tra un attimo", "warn"); }catch(_){}
      return false;
    }

    return true;
  }

  function __sanitizeMovForTrash(mv){
    const m = (mv && typeof mv === "object") ? mv : {};
    const out = {};
    // keep only serializable primitive + arrays/objects used by app
    [
      "id","type","customer","code","item","qty","date","note","source","rawText",
      "warehouse","docType","docNum","docDateRaw","lineIndex","supplierVat","docNumKey","ddtTripletKey",
      "createdAt","createdAtIso"
    ].forEach(k => { if (m[k] != null) out[k] = m[k]; });

    // pages
    try{
      const pages = (typeof __sanitizeDocPages === "function")
        ? __sanitizeDocPages(m.docPages || m.docImages || [])
        : (Array.isArray(m.docPages) ? m.docPages : (Array.isArray(m.docImages) ? m.docImages : []));
      if (pages && pages.length) out.docPages = pages;
    }catch(_){}

    // keep any extra meta that helps reconstruct docs (best-effort)
    ["vat","piva","supplierName","ddtKey","docKey","ddtTripletKey","ddtTriplet","ddtTripletKey"].forEach(k => {
      if (m[k] != null && out[k] == null) out[k] = m[k];
    });

    // normalize qty
    try{ out.qty = SAFE.int(out.qty); }catch(_){}

    return out;
  }

  function __collectStoragePathsFromMovements(movs){
    const set = new Set();
    for (const mv of (Array.isArray(movs) ? movs : [])){
      try{
        const pages = (typeof __sanitizeDocPages === "function")
          ? __sanitizeDocPages(mv.docPages || mv.docImages || [])
          : (Array.isArray(mv.docPages) ? mv.docPages : (Array.isArray(mv.docImages) ? mv.docImages : []));
        for (const p of (pages || [])){
          if (!p) continue;
          const path = SAFE.trim(p.path || p.storagePath || p.gsPath || "");
          if (path) set.add(path);
        }
      }catch(_){}
    }
    return set;
  }

  function __collectTripletKeysFromMovements(movs){
    const set = new Set();
    for (const mv of (Array.isArray(movs) ? movs : [])){
      const k = SAFE.trim(mv && (mv.ddtTripletKey || mv.ddtKey) || "");
      if (k) set.add(k);
    }
    return set;
  }

  async function __trashWrite(payload){
    if (!__ensureFirebaseOrExplain()) return { ok:false, err:"NO_AUTH" };
    const colRef = __orgTrashCol();
    if (!colRef) return { ok:false, err:"NO_COL" };
    try{
      const docRef = await addDoc(colRef, payload);
      return { ok:true, id: docRef.id };
    }catch(e){
      console.error("trash write failed", e);
      try{ showToast("Errore: non riesco a scrivere nel Cestino", "err"); }catch(_){}
      return { ok:false, err: String(e?.code || e?.message || e || "ERR") };
    }
  }

  async function __trashDelete(trashId){
    if (!__ensureFirebaseOrExplain()) return false;
    const id = SAFE.trim(trashId);
    if (!id) return false;
    try{
      await deleteDoc(doc(__getDB(), "orgs", __getORG(), "trash", id));
      return true;
    }catch(e){
      console.error("trash delete failed", e);
      try{ showToast("Errore eliminazione dal Cestino", "err"); }catch(_){}
      return false;
    }
  }

  async function __deleteMovementsBulkSoft(ids){
    const list = (Array.isArray(ids) ? ids : []).map(x => SAFE.trim(x)).filter(Boolean);
    if (!list.length) return;

    const set = new Set(list);

    // optimistic update
    try{
      state.movements = (state.movements || []).filter(m => !set.has(SAFE.trim(m && m.id)));
      try{ renderAll(); }catch(_){}
    }catch(_){}

    // realtime (Firestore)
    const __FB__ = __getFB();
    if (__FB__ && (__FB__.user || (__FB__.auth && __FB__.auth.currentUser)) && __FB__.db) {
      await Promise.all(list.map(async (id) => {
        try{
          await deleteDoc(doc(__getDB(), "orgs", __getORG(), "inventoryMovements", id));
        }catch(e){
          console.warn("soft delete movement failed", id, e);
        }
      }));
      return;
    }

    // local fallback
    try{ saveLocalData && saveLocalData(); }catch(_){}
  }

  async function __restoreMovementsFromTrash(movs){
    const arr = Array.isArray(movs) ? movs : [];
    if (!arr.length) return;

    if (!__ensureFirebaseOrExplain()) return;

    const createdBy = __getUserTag();
    // Best effort: restore triplet keys in index (if function exists)
    const tripletKeys = new Set();

    for (const m0 of arr){
      const m = (m0 && typeof m0 === "object") ? m0 : {};
      const payload = {
        type: SAFE.trim(m.type) || "IN",
        customer: SAFE.trim(m.customer),
        code: SAFE.trim(m.code),
        item: SAFE.trim(m.item),
        qty: SAFE.int(m.qty),
        date: SAFE.trim(m.date),
        note: SAFE.trim(m.note),
        source: SAFE.trim(m.source) || "OCR",
        rawText: SAFE.trim(m.rawText),

        warehouse: (typeof normalizeWarehouse === "function") ? normalizeWarehouse(m.warehouse || "") : SAFE.trim(m.warehouse),

        docType: SAFE.trim(m.docType),
        docNum: SAFE.trim(m.docNum),
        docDateRaw: SAFE.trim(m.docDateRaw),
        lineIndex: SAFE.int(m.lineIndex),

        docPages: (typeof __sanitizeDocPages === "function") ? __sanitizeDocPages(m.docPages || []) : (Array.isArray(m.docPages) ? m.docPages : []),

        supplierVat: SAFE.trim(m.supplierVat),
        docNumKey: SAFE.trim(m.docNumKey),
        ddtTripletKey: SAFE.trim(m.ddtTripletKey),

        createdAt: serverTimestamp(),
        createdBy: createdBy
      };

      const oldIso = SAFE.trim(m.createdAt || m.createdAtIso || "");
      if (oldIso) payload.createdAtIso = oldIso;

      if (payload.ddtTripletKey) tripletKeys.add(payload.ddtTripletKey);

      try{
        await addDoc(orgCol("inventoryMovements"), payload);
      }catch(e){
        console.warn("restore movement failed", e);
      }
    }

    // re-reserve index (best effort, ignore errors)
    try{
      if (typeof __reserveDocTripletKey === "function"){
        for (const k of tripletKeys){
          try{ await __reserveDocTripletKey(k, {}); }catch(_){}
        }
      }
    }catch(_){}
  }

  async function __purgeImagesAndIndexFromMovements(movs){
    const paths = __collectStoragePathsFromMovements(movs);
    const keys = __collectTripletKeysFromMovements(movs);

    // delete images
    try{
      if (typeof deleteStoragePaths === "function"){
        await deleteStoragePaths(paths);
      }
    }catch(e){
      console.warn("purge deleteStoragePaths failed", e);
    }

    // release anti-dup index
    try{
      if (typeof __releaseDocTripletKey === "function"){
        await Promise.all(Array.from(keys).map(k => __releaseDocTripletKey(k)));
      }
    }catch(e){
      console.warn("purge releaseDocTripletKey failed", e);
    }
  }

  // =============================
  // UI Injection
  // =============================
  function __injectMenuButton(){
    const wrap = __qs(".sideMenuAccordionContent");
    if (!wrap) return;
    if (__qs("#menuGoTrash", wrap)) return;

    const btn = document.createElement("button");
    btn.className = "sideMenuLink";
    btn.id = "menuGoTrash";
    btn.type = "button";
    btn.textContent = "Cestino";

    // insert after Movimenti if present
    const ref = __qs("#menuGoMovements", wrap);
    if (ref && ref.parentNode) {
      ref.parentNode.insertBefore(btn, ref.nextSibling);
    } else {
      wrap.appendChild(btn);
    }
  }

  function __injectTrashView(){
    if (__qs("#viewTrash")) return;

    const html = `
<div id="viewTrash" class="view modalOverlay">
  <article class="card" id="trashCard">
    <div class="hd">
      <div class="overlayHeaderTitle">
        <button class="iconBtn overlayBack" id="btnBackTrash" type="button" aria-label="Indietro">‹</button>
        <h2>Cestino</h2>
      </div>
      <div class="inlineRow" style="gap:8px; justify-content:flex-end;">
        <div class="pill" id="pillTrashCount">0</div>
        <button class="iconBtn" id="btnCloseTrash" type="button" aria-label="Chiudi">×</button>
      </div>
    </div>
    <div class="bd">
      <div class="inlineRow listStickyBar" style="justify-content:space-between; align-items:flex-end; gap:12px;">
        <div class="field" style="flex: 1 1 auto; min-width: 220px;">
          <label for="trashSearch">Cerca</label>
          <input id="trashSearch" placeholder="Nome, codice, note…" />
        </div>

        <div class="field" style="width: 180px;">
          <label for="trashTypeFilter">Tipo</label>
          <select id="trashTypeFilter">
            <option value="">Tutto</option>
            <option value="product">Prodotti</option>
            <option value="supplier">Fornitori</option>
            <option value="flow">Flussi</option>
          </select>
        </div>

        <div class="field" style="width: 200px;">
          <label for="trashSort">Ordina</label>
          <select id="trashSort">
            <option value="date_desc">Data (più recenti)</option>
            <option value="date_asc">Data (più vecchi)</option>
            <option value="type_asc">Tipo</option>
            <option value="name_asc">Nome</option>
          </select>
        </div>

        <div class="inlineRow" style="gap:8px; justify-content:flex-end; align-items:flex-end; flex-wrap:wrap;">
          <button class="btn btn-secondary" id="btnTrashRestoreSel" type="button" disabled>Ripristina</button>
          <button class="btn btn-danger" id="btnTrashDeleteSel" type="button" disabled>Elimina definitivamente</button>
        </div>
      </div>

      <div class="tableWrap">
        <table class="dataGrid" id="trashTable">
          <thead>
            <tr>
              <th style="width:46px;"><input type="checkbox" id="trashCheckAll" aria-label="Seleziona tutto"></th>
              <th style="width:120px;">Tipo</th>
              <th>Elemento</th>
              <th class="colHideSm" style="width:220px;">ID / Codice</th>
              <th style="width:180px;">Eliminato il</th>
              <th style="width:210px;">Azioni</th>
            </tr>
          </thead>
          <tbody id="trashTbody">
            <tr><td class="td-muted" colspan="6">Nessun elemento nel cestino.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="td-muted" id="trashHint">Seleziona più righe per ripristinare o eliminare definitivamente.</div>
    </div>
  </article>
</div>`;

    document.body.insertAdjacentHTML("beforeend", html);
  }

  function __inject(){
    __injectMenuButton();
    __injectTrashView();
  }

  // =============================
  // View / Navigation patching
  // =============================
  function __patchSetView(){
    if (globalThis.__HUB_TRASH_SETVIEW_PATCHED__) return;
    globalThis.__HUB_TRASH_SETVIEW_PATCHED__ = true;

    const original = (typeof setView === "function") ? setView : null;
    if (!original) return;

    globalThis.setView = function(name){
      const key = SAFE.low(name || "home");
      const viewTrash = __qs("#viewTrash");

      if (key === "trash") {
        // Use original home reset, then activate trash overlay
        original("home");
        try{
          if (viewTrash) viewTrash.classList.add("active");
          // header/back
          const btnBack = document.getElementById("btnNavBack");
          if (btnBack) btnBack.style.display = "inline-flex";
          const hdr = document.getElementById("hdrPageTitle");
          if (hdr) hdr.textContent = "Cestino";
        }catch(_){}
        try{ globalThis.HubTrash && globalThis.HubTrash.refresh && globalThis.HubTrash.refresh(); }catch(_){}
        return;
      }

      // Normal views
      original(name);

      // Ensure trash closes
      try{ if (viewTrash) viewTrash.classList.remove("active"); }catch(_){}
    };
  }

  function __bindTrashNav(){
    const btnMenu = __qs("#menuGoTrash");
    const btnBack = __qs("#btnBackTrash");
    const btnClose = __qs("#btnCloseTrash");
    const v = __qs("#viewTrash");

    if (btnMenu && !btnMenu.__trashBound){
      btnMenu.__trashBound = true;
      btnMenu.addEventListener("click", () => {
        try{ typeof closeSideMenu === "function" && closeSideMenu(); }catch(_){}
        try{ setView("trash"); }catch(_){}
      });
    }
    if (btnBack && !btnBack.__trashBound){
      btnBack.__trashBound = true;
      btnBack.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
        try{ setView("home"); }catch(_){}
      });
    }
    if (btnClose && !btnClose.__trashBound){
      btnClose.__trashBound = true;
      btnClose.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
        try{ setView("home"); }catch(_){}
      });
    }

    // click outside closes (same pattern as other overlays)
    if (v && !v.__trashBound){
      v.__trashBound = true;
      v.addEventListener("click", (e) => {
        if (e.target === v) {
          try{ setView("home"); }catch(_){}
        }
      });
    }
  }

  // =============================
  // Trash module (state + render)
  // =============================
  const HubTrash = {
    items: [],
    lastUserKey: "",
    unsub: null,
    selected: new Set(),

    els: {},

    _cacheEls(){
      const root = __qs("#viewTrash");
      this.els = {
        root,
        pillCount: __qs("#pillTrashCount", root),
        tbody: __qs("#trashTbody", root),
        chkAll: __qs("#trashCheckAll", root),
        search: __qs("#trashSearch", root),
        type: __qs("#trashTypeFilter", root),
        sort: __qs("#trashSort", root),
        btnRestore: __qs("#btnTrashRestoreSel", root),
        btnDelete: __qs("#btnTrashDeleteSel", root)
      };
    },

    _bindEls(){
      const E = this.els;
      if (!E.root) return;

      const rerender = () => this.render();

      if (E.search && !E.search.__trashBound){
        E.search.__trashBound = true;
        E.search.addEventListener("input", () => { this.selected.clear(); if (E.chkAll) E.chkAll.checked = false; rerender(); });
      }
      if (E.type && !E.type.__trashBound){
        E.type.__trashBound = true;
        E.type.addEventListener("change", () => { this.selected.clear(); if (E.chkAll) E.chkAll.checked = false; rerender(); });
      }
      if (E.sort && !E.sort.__trashBound){
        E.sort.__trashBound = true;
        E.sort.addEventListener("change", rerender);
      }

      if (E.chkAll && !E.chkAll.__trashBound){
        E.chkAll.__trashBound = true;
        E.chkAll.addEventListener("change", () => {
          const checked = !!E.chkAll.checked;
          this.selected.clear();
          if (checked){
            const ids = this._getVisibleIds();
            ids.forEach(id => this.selected.add(id));
          }
          rerender();
        });
      }

      if (E.btnRestore && !E.btnRestore.__trashBound){
        E.btnRestore.__trashBound = true;
        E.btnRestore.addEventListener("click", async () => {
          const ids = Array.from(this.selected);
          if (!ids.length) return;
          const ok = confirm(`Ripristinare ${ids.length} elementi?`);
          if (!ok) return;
          await this.restoreMany(ids);
        });
      }

      if (E.btnDelete && !E.btnDelete.__trashBound){
        E.btnDelete.__trashBound = true;
        E.btnDelete.addEventListener("click", async () => {
          const ids = Array.from(this.selected);
          if (!ids.length) return;
          const ok = confirm(`Eliminare definitivamente ${ids.length} elementi?\n\nOperazione irreversibile.`);
          if (!ok) return;
          await this.purgeMany(ids);
        });
      }

      // Table delegation
      if (E.tbody && !E.tbody.__trashBound){
        E.tbody.__trashBound = true;
        E.tbody.addEventListener("click", async (e) => {
          const cb = e.target && e.target.closest ? e.target.closest("input.jsTrashRowCheck") : null;
          if (cb) return;

          const btn = e.target && e.target.closest ? e.target.closest("button[data-trash-action]") : null;
          if (!btn) return;

          const id = SAFE.trim(btn.getAttribute("data-id") || "");
          const act = SAFE.trim(btn.getAttribute("data-trash-action") || "");
          if (!id || !act) return;

          e.preventDefault(); e.stopPropagation();

          if (act === "restore"){
            const ok = confirm("Ripristinare questo elemento?");
            if (!ok) return;
            await this.restoreMany([id]);
          } else if (act === "purge"){
            const ok = confirm("Eliminare definitivamente questo elemento?\n\nOperazione irreversibile.");
            if (!ok) return;
            await this.purgeMany([id]);
          }
        });

        E.tbody.addEventListener("change", (e) => {
          const cb = e.target && e.target.closest ? e.target.closest("input.jsTrashRowCheck") : null;
          if (!cb) return;
          const id = SAFE.trim(cb.getAttribute("data-id") || "");
          if (!id) return;
          if (cb.checked) this.selected.add(id);
          else this.selected.delete(id);

          // sync check-all
          try{
            if (E.chkAll){
              const visible = this._getVisibleIds();
              E.chkAll.checked = (visible.length > 0) && visible.every(v => this.selected.has(v));
            }
          }catch(_){}
          this._syncActionButtons();
        });
      }
    },

    _syncActionButtons(){
      const E = this.els;
      const n = this.selected.size;
      if (E.btnRestore) E.btnRestore.disabled = (n === 0);
      if (E.btnDelete) E.btnDelete.disabled = (n === 0);
    },

    _getVisibleIds(){
      const E = this.els;
      if (!E.tbody) return [];
      const ids = [];
      __qsa("input.jsTrashRowCheck", E.tbody).forEach(cb => {
        const id = SAFE.trim(cb.getAttribute("data-id") || "");
        if (id) ids.push(id);
      });
      return ids;
    },

    async ensureWatch(){
      if (!__ensureFirebaseOrExplain()) return;

      const userKey = __getUserTag();
      if (this.unsub && this.lastUserKey === userKey) return;

      try{ this.unsub && this.unsub(); }catch(_){}
      this.unsub = null;
      this.lastUserKey = userKey;

      const colRef = __orgTrashCol();
      if (!colRef) return;

      try{
        this.unsub = onSnapshot(
          query(colRef, orderBy("deletedAt", "desc")),
          (snap) => {
            const arr = (snap && snap.docs) ? snap.docs.map(d => {
              const data = d.data ? (d.data() || {}) : {};
              return {
                id: d.id,
                kind: SAFE.trim(data.kind),
                title: SAFE.trim(data.title),
                refId: SAFE.trim(data.refId),
                payload: data.payload || null,
                movements: Array.isArray(data.movements) ? data.movements : [],
                meta: data.meta || {},
                deletedAtIso: __tsToIsoMaybe(data.deletedAt) || SAFE.trim(data.deletedAtIso) || ""
              };
            }) : [];
            this.items = arr;
            this.render();
          },
          (err) => {
            console.error("trash watch error", err);
            try{ showToast("Sync cestino: permessi mancanti", "warn"); }catch(_){}
          }
        );
      }catch(e){
        console.error("trash watch init failed", e);
      }
    },

    refresh(){
      try{ this._cacheEls(); this._bindEls(); }catch(_){}
      try{ this.ensureWatch(); }catch(_){}
      this.render();
    },

    _getFilteredSorted(){
      const E = this.els;
      const q = SAFE.low(E.search ? E.search.value : "");
      const kind = SAFE.trim(E.type ? E.type.value : "");
      const sort = SAFE.trim(E.sort ? E.sort.value : "date_desc");

      let arr = Array.isArray(this.items) ? this.items.slice() : [];

      if (kind) arr = arr.filter(it => SAFE.trim(it.kind) === kind);

      if (q){
        arr = arr.filter(it => {
          const parts = [];
          parts.push(it.kind, it.title, it.refId, it.deletedAtIso);
          try{
            const p = it.payload || {};
            parts.push(p.code, p.name, p.alias, p.category, p.vat, p.fiscalCode, p.city, p.province);
          }catch(_){}
          try{
            const m = it.meta || {};
            parts.push(m.customer, m.note, m.date, m.rows, m.docs);
          }catch(_){}
          const hay = SAFE.low(parts.filter(Boolean).join(" | "));
          return hay.includes(q);
        });
      }

      arr.sort((a,b) => {
        const ad = SAFE.trim(a.deletedAtIso);
        const bd = SAFE.trim(b.deletedAtIso);
        if (sort === "date_asc") return ad.localeCompare(bd);
        if (sort === "type_asc") return SAFE.trim(KIND_LABEL[a.kind] || a.kind).localeCompare(SAFE.trim(KIND_LABEL[b.kind] || b.kind)) || SAFE.trim(a.title).localeCompare(SAFE.trim(b.title));
        if (sort === "name_asc") return SAFE.trim(a.title).localeCompare(SAFE.trim(b.title)) || bd.localeCompare(ad);
        // date_desc default
        return bd.localeCompare(ad);
      });

      return arr;
    },

    render(){
      if (!this.els || !this.els.root) this._cacheEls();
      const E = this.els;
      if (!E || !E.tbody) return;

      const list = this._getFilteredSorted();
      const total = list.length;

      if (E.pillCount) E.pillCount.textContent = String(total);

      // If selection includes items not visible, keep it (for multi actions), but checkAll should reflect visible
      const visibleIds = list.map(x => x.id);
      try{
        if (E.chkAll){
          E.chkAll.checked = (visibleIds.length > 0) && visibleIds.every(id => this.selected.has(id));
        }
      }catch(_){}

      if (!total){
        E.tbody.innerHTML = `<tr><td class="td-muted" colspan="6">Nessun elemento nel cestino.</td></tr>`;
        this._syncActionButtons();
        return;
      }

      const rows = list.slice(0, 400).map(it => {
        const kindLbl = KIND_LABEL[it.kind] || it.kind || "—";
        const title = it.title || "—";
        const ref = it.refId || "—";
        const when = it.deletedAtIso ? (typeof formatDateIT === "function" ? formatDateIT(it.deletedAtIso) : it.deletedAtIso) : "—";

        const meta = it.meta || {};
        let sub = "";
        if (it.kind === "flow"){
          const c = SAFE.trim(meta.customer || "");
          const d = SAFE.trim(meta.date || "");
          const r = SAFE.int(meta.rows);
          sub = [c ? ("• " + c) : "", d ? ("• " + d) : "", r ? (`• Righe: ${r}`) : ""].filter(Boolean).join(" ");
        } else if (it.kind === "supplier"){
          const p = it.payload || {};
          const vat = SAFE.trim(p.vat || p.vatNumber || p.piva || "");
          const docs = SAFE.int(meta.docs);
          const rows = SAFE.int(meta.rows);
          sub = [vat ? ("• P.IVA: " + vat) : "", docs ? (`• Doc: ${docs}`) : "", rows ? (`• Righe: ${rows}`) : ""].filter(Boolean).join(" ");
        } else if (it.kind === "product"){
          const p = it.payload || {};
          const al = SAFE.trim(p.alias || p.aliasName || "");
          const cat = SAFE.trim(p.category || "");
          sub = [al ? ("• Alias: " + al) : "", cat ? ("• Cat: " + cat) : ""].filter(Boolean).join(" ");
        }

        const checked = this.selected.has(it.id) ? "checked" : "";

        return `
<tr data-trash-row="${__ha(it.id)}">
  <td><input class="jsTrashRowCheck" type="checkbox" data-id="${__ha(it.id)}" ${checked}></td>
  <td><span class="badge">${__h(kindLbl)}</span></td>
  <td>
    <div><strong>${__h(title)}</strong></div>
    ${sub ? `<div class="td-muted">${__h(sub)}</div>` : ``}
  </td>
  <td class="colHideSm"><span class="kbd">${__h(ref)}</span></td>
  <td>${__h(when)}</td>
  <td>
    <div class="inlineRow" style="justify-content:flex-end; gap:8px; flex-wrap:wrap;">
      <button class="btn btn-secondary btn-xs" type="button" data-trash-action="restore" data-id="${__ha(it.id)}">Ripristina</button>
      <button class="btn btn-danger btn-xs" type="button" data-trash-action="purge" data-id="${__ha(it.id)}">Elimina</button>
    </div>
  </td>
</tr>`;
      }).join("");

      E.tbody.innerHTML = rows;
      this._syncActionButtons();
    },

    async restoreMany(ids){
      const list = (Array.isArray(ids) ? ids : []).map(x => SAFE.trim(x)).filter(Boolean);
      if (!list.length) return;

      if (!__ensureFirebaseOrExplain()) return;

      // disable actions while running
      try{ this.els.btnRestore && (this.els.btnRestore.disabled = true); }catch(_){}
      try{ this.els.btnDelete && (this.els.btnDelete.disabled = true); }catch(_){}

      for (const id of list){
        const it = (this.items || []).find(x => x.id === id);
        if (!it) continue;
        try{
          await this._restoreOne(it);
          await __trashDelete(it.id);
          this.selected.delete(it.id);
        }catch(e){
          console.error("restore item failed", it, e);
          try{ showToast("Ripristino fallito (vedi console)", "err"); }catch(_){}
        }
      }

      try{ showToast("Ripristinato"); }catch(_){}
      this.render();
    },

    async purgeMany(ids){
      const list = (Array.isArray(ids) ? ids : []).map(x => SAFE.trim(x)).filter(Boolean);
      if (!list.length) return;

      if (!__ensureFirebaseOrExplain()) return;

      // disable actions while running
      try{ this.els.btnRestore && (this.els.btnRestore.disabled = true); }catch(_){}
      try{ this.els.btnDelete && (this.els.btnDelete.disabled = true); }catch(_){}

      for (const id of list){
        const it = (this.items || []).find(x => x.id === id);
        if (!it) continue;
        try{
          await this._purgeOne(it);
          await __trashDelete(it.id);
          this.selected.delete(it.id);
        }catch(e){
          console.error("purge item failed", it, e);
          try{ showToast("Eliminazione definitiva fallita (vedi console)", "err"); }catch(_){}
        }
      }

      try{ showToast("Eliminato definitivamente"); }catch(_){}
      this.render();
    },

    async _restoreOne(it){
      const kind = SAFE.trim(it.kind);
      const payload = (it.payload && typeof it.payload === "object") ? it.payload : {};

      if (kind === "product"){
        const code = SAFE.trim(payload.code || payload.id || it.refId);
        if (!code) return;

        const low = code.toLowerCase();
        const docId = (typeof keyToDocId === "function") ? keyToDocId(low) : encodeURIComponent(low);

        const patch = Object.assign({}, payload);
        patch.code = code;
        patch.codeLower = low;
        patch.nameLower = SAFE.low(patch.name || code);
        if (patch.alias) patch.aliasLower = SAFE.low(patch.alias);
        patch.updatedAt = serverTimestamp();
        patch.updatedBy = __getUserTag();
        if (!patch.createdAt) patch.createdAt = serverTimestamp();
        if (!patch.createdBy) patch.createdBy = __getUserTag();

        await setDoc(doc(__getDB(), "orgs", __getORG(), "products", docId), patch, { merge: true });

        // restore local category fallback
        try{
          const cat = SAFE.trim(payload.__localCategory || payload.category || "");
          if (cat && state && state.productCategories){
            state.productCategories[low] = cat;
            saveLocalData && saveLocalData();
          }
        }catch(_){}

        try{ renderAll && renderAll(); renderAnag && renderAnag(); }catch(_){}
        return;
      }

      if (kind === "supplier"){
        const sid = SAFE.trim(payload.id || it.refId);
        if (!sid) return;

        const patch = Object.assign({}, payload);
        patch.updatedAt = serverTimestamp();
        patch.updatedBy = __getUserTag();
        if (!patch.createdAt) patch.createdAt = serverTimestamp();
        if (!patch.createdBy) patch.createdBy = __getUserTag();

        await setDoc(doc(__getDB(), "orgs", __getORG(), "suppliers", sid), patch, { merge: true });

        // restore movements (docs)
        await __restoreMovementsFromTrash(it.movements || []);

        try{ renderAll && renderAll(); renderAnag && renderAnag(); }catch(_){}
        return;
      }

      if (kind === "flow"){
        // restore movements only (flow is derived from movements)
        await __restoreMovementsFromTrash(it.movements || []);
        try{ renderAll && renderAll(); }catch(_){}
        return;
      }
    },

    async _purgeOne(it){
      const kind = SAFE.trim(it.kind);

      if (kind === "flow" || kind === "supplier"){
        // remove images + index keys now (because soft delete kept them)
        await __purgeImagesAndIndexFromMovements(it.movements || []);
      }
      // product: nothing else to purge (it's already deleted from products)
      return;
    }
  };

  globalThis.HubTrash = HubTrash;

  // =============================
  // Soft delete wrappers
  // =============================
  async function __softDeleteFlowByKey(docKey){
    if (!__ensureFirebaseOrExplain()) return;

    const g = (typeof __docGroupsMap !== "undefined" && __docGroupsMap && __docGroupsMap.get)
      ? __docGroupsMap.get(SAFE.trim(docKey))
      : null;
    if (!g) { try{ showToast("Flusso non trovato"); }catch(_){ } return; }

    const label = (typeof formatDocLabel === "function") ? formatDocLabel(g) : (g.note || g.key || "Flusso");
    const movs = (Array.isArray(g.movements) ? g.movements : []).filter(Boolean);
    const ids = movs.map(m => SAFE.trim(m.id)).filter(Boolean);
    const n = ids.length;

    const ok = confirm(`Spostare il flusso nel Cestino?\n\n${label}\n\nRighe: ${n}`);
    if (!ok) return;

    // payload for trash
    const packMovs = movs.map(__sanitizeMovForTrash);

    const trashPayload = {
      kind: "flow",
      title: SAFE.trim(label) || "Flusso",
      refId: SAFE.trim(g.key || docKey || ""),
      payload: {
        key: SAFE.trim(g.key || ""),
        customer: SAFE.trim(g.customer || ""),
        supplierVat: SAFE.trim(g.supplierVat || ""),
        date: SAFE.trim(g.date || ""),
        note: SAFE.trim(g.note || ""),
        source: SAFE.trim(g.source || ""),
        docNum: SAFE.trim(g.docNum || "")
      },
      movements: packMovs,
      meta: {
        customer: SAFE.trim(g.customer || ""),
        date: SAFE.trim(g.date || ""),
        note: SAFE.trim(g.note || ""),
        rows: n
      },
      deletedAt: serverTimestamp(),
      deletedAtIso: __nowIso(),
      deletedBy: __getUserTag()
    };

    const wrote = await __trashWrite(trashPayload);
    if (!wrote.ok) {
      openModal("Cestino non disponibile", "Non riesco a salvare nel Cestino, quindi blocco l’eliminazione per sicurezza.");
      return;
    }

    await __deleteMovementsBulkSoft(ids);

    try{ showToast("Flusso spostato nel cestino"); }catch(_){}
    try{ closeFlowEdit && closeFlowEdit(); }catch(_){}
  }

  async function __softDeleteSupplierCascade(supplierId){
    const sid = SAFE.trim(supplierId);
    if (!sid) return;

    if (!__ensureFirebaseOrExplain()) return;

    // prevent double click
    try{ if (typeof __deletingSupplier !== "undefined" && __deletingSupplier) return; }catch(_){}

    const sup = (typeof getSupplierByIdLocal === "function") ? getSupplierByIdLocal(sid) : null;
    if (!sup) { try{ showToast("Fornitore non trovato"); }catch(_){ } return; }

    try{ typeof rebuildDocGroupsCache === "function" && rebuildDocGroupsCache(); }catch(_){}

    const linkedDocs = (typeof supplierMatchesCustomer === "function" && typeof __docGroups !== "undefined" && Array.isArray(__docGroups))
      ? __docGroups.filter(g => supplierMatchesCustomer(sup, g.customer))
      : [];

    const idSet = new Set();
    linkedDocs.forEach(g => (g.movements || []).forEach(mv => {
      const id = SAFE.trim(mv && mv.id);
      if (id) idSet.add(id);
    }));
    const ids = Array.from(idSet);

    const labelName = SAFE.trim(sup.name || "Fornitore");
    const nDocs = linkedDocs.length;
    const nRows = ids.length;

    const ok = confirm(
      `Spostare il fornitore nel Cestino?\n\n${labelName}\n\n` +
      `Verranno rimossi anche i documenti associati (cascata).\nDocumenti: ${nDocs}\nRighe: ${nRows}`
    );
    if (!ok) return;

    // lock UI
    try{ if (typeof __deletingSupplier !== "undefined") __deletingSupplier = true; }catch(_){}
    try{ if (typeof btnSupDelete !== "undefined" && btnSupDelete) btnSupDelete.disabled = true; }catch(_){}

    try{
      // collect movement objects before deletion (for restore)
      const idLook = new Set(ids);
      const mvObjs = (Array.isArray(state && state.movements) ? state.movements : [])
        .filter(m => idLook.has(SAFE.trim(m && m.id)));
      const packMovs = mvObjs.map(__sanitizeMovForTrash);

      const trashPayload = {
        kind: "supplier",
        title: labelName,
        refId: sid,
        payload: Object.assign({}, sup),
        movements: packMovs,
        meta: { docs: nDocs, rows: nRows },
        deletedAt: serverTimestamp(),
        deletedAtIso: __nowIso(),
        deletedBy: __getUserTag()
      };

      const wrote = await __trashWrite(trashPayload);
      if (!wrote.ok) {
        openModal("Cestino non disponibile", "Non riesco a salvare nel Cestino, quindi blocco l’eliminazione per sicurezza.");
        return;
      }

      // delete movements WITHOUT deleting images + docIndex
      if (ids.length) await __deleteMovementsBulkSoft(ids);

      // delete supplier doc (no legacy attachments deletion for soft delete)
      try{
        await deleteDoc(doc(__getDB(), "orgs", __getORG(), "suppliers", sid));
      }catch(e){
        console.error("soft supplier delete failed", e);
        openModal("Errore", "Ho salvato nel Cestino ma non riesco a eliminare il fornitore. Controlla i permessi.");
        return;
      }

      // optimistic local UI
      try{
        suppliers = (suppliers || []).filter(x => SAFE.trim(x && x.id) !== sid);
        try{ renderAnag && renderAnag(); }catch(_){}
      }catch(_){}

      try{
        if (typeof currentSupplierId !== "undefined" && currentSupplierId === sid) {
          try{ closeSupplierModal && closeSupplierModal(); }catch(_){}
        }
      }catch(_){}

      try{ showToast("Fornitore spostato nel cestino"); }catch(_){}
    } finally {
      try{ if (typeof __deletingSupplier !== "undefined") __deletingSupplier = false; }catch(_){}
      try{ if (typeof btnSupDelete !== "undefined" && btnSupDelete) btnSupDelete.disabled = false; }catch(_){}
    }
  }

  async function __softDeleteProductByCode(code, opts){
    const key = SAFE.trim(code);
    if (!key) return false;
    const low = key.toLowerCase();
    const silent = !!(opts && opts.silent);
    const skipConfirm = !!(opts && opts.skipConfirm);

    if (!__ensureFirebaseOrExplain()) return false;

    const p0 = (typeof findProductByCode === "function") ? findProductByCode(key) : null;

    const nm = SAFE.trim((p0 && p0.name) || "") || "—";
    const al = SAFE.trim((p0 && (p0.alias || p0.aliasName)) || "") || "—";
    const catLabel = (typeof macroCatLabel === "function" && typeof getMacroCategoryForCode === "function")
      ? (macroCatLabel(getMacroCategoryForCode(key)) || "—")
      : "—";

    // confirm (same as original)
    if (!skipConfirm) {
      let nMov = 0;
      let stockSum = 0;
      try {
        nMov = (state && Array.isArray(state.movements))
          ? state.movements.filter(m => SAFE.low(m && m.code) === low).length
          : 0;
      } catch(_) {}

      try {
        const rows = (typeof computeStock === "function") ? computeStock() : [];
        stockSum = (rows || []).filter(r => SAFE.low(r && r.code) === low).reduce((s, r) => s + SAFE.int(r && r.qty), 0);
      } catch(_) {}

      const ok = confirm(
        `Spostare il prodotto nel Cestino?\n\n` +
        `Codice: ${key}\n` +
        `Nome: ${nm}\n` +
        `Alias: ${al}\n` +
        `Categoria: ${catLabel}\n\n` +
        `Nota: elimina SOLO l’anagrafica prodotto (nome/alias/categoria). Movimenti e stock restano.\n` +
        `Movimenti che lo contengono: ${nMov}\n` +
        `Stock totale attuale: ${Number(stockSum||0).toLocaleString("it-IT")}`
      );
      if (!ok) return false;
    }

    // build payload for restore
    const payload = Object.assign({}, p0 || {});
    payload.code = payload.code || key;
    payload.name = payload.name || nm;
    payload.alias = payload.alias || payload.aliasName || "";
    payload.category = payload.category || "";

    // also save local category fallback if present
    try{
      if (state && state.productCategories && (low in state.productCategories)) {
        payload.__localCategory = state.productCategories[low];
      }
    }catch(_){}

    const wrote = await __trashWrite({
      kind: "product",
      title: SAFE.trim(payload.name || payload.code || key) || key,
      refId: key,
      payload,
      movements: [],
      meta: {},
      deletedAt: serverTimestamp(),
      deletedAtIso: __nowIso(),
      deletedBy: __getUserTag()
    });

    if (!wrote.ok) {
      openModal("Cestino non disponibile", "Non riesco a salvare nel Cestino, quindi blocco l’eliminazione per sicurezza.");
      return false;
    }

    // optimistic local (same as original)
    try {
      products = (products || []).filter(pp => {
        const a = SAFE.low(pp && (pp.code || pp.id || ""));
        const b = (typeof safeDecodeUri === "function") ? SAFE.low(safeDecodeUri(SAFE.str(pp && pp.id))) : SAFE.low(pp && pp.id);
        return !(a === low || b === low);
      });
    } catch(_) {}

    try {
      if (state && state.productCategories && (low in state.productCategories)) {
        delete state.productCategories[low];
        try{ saveLocalData && saveLocalData(); }catch(_){}
      }
    } catch(_) {}

    try { renderAll && renderAll(); renderAnag && renderAnag(); } catch(_) {}

    // Firestore delete
    try {
      const docId = (typeof keyToDocId === "function") ? keyToDocId(low) : encodeURIComponent(low);
      await deleteDoc(doc(__getDB(), "orgs", __getORG(), "products", docId));
      try { renderAll && renderAll(); renderAnag && renderAnag(); } catch(_) {}
      if (!silent) showToast("Prodotto spostato nel cestino");
      return true;
    } catch (e) {
      console.error("soft deleteProductByCode failed", e);
      if (!silent) showToast("Errore eliminazione prodotto", "err");
      return false;
    }
  }

  function __patchDeleteFunctions(){
    if (globalThis.__HUB_TRASH_DELETE_PATCHED__) return;
    globalThis.__HUB_TRASH_DELETE_PATCHED__ = true;

    // Flow
    try{
      if (typeof deleteFlowByKey === "function") {
        globalThis.deleteFlowByKey = __softDeleteFlowByKey;
      }
    }catch(_){}

    // Supplier
    try{
      if (typeof deleteSupplierCascade === "function") {
        globalThis.deleteSupplierCascade = __softDeleteSupplierCascade;
      }
    }catch(_){}

    // Products
    try{
      if (typeof deleteProductByCode === "function") {
        globalThis.deleteProductByCode = __softDeleteProductByCode;
      }
    }catch(_){}
  }

  // =============================
  // Boot
  // =============================
  function __boot(){
    try{ __inject(); }catch(e){ console.warn("trash inject failed", e); }
    try{ __patchSetView(); }catch(e){ console.warn("trash setView patch failed", e); }
    try{ __bindTrashNav(); }catch(_){}
    try{ __patchDeleteFunctions(); }catch(_){}
    try{ HubTrash.refresh(); }catch(_){}
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", __boot, { once:true });
  } else {
    __boot();
  }
})();