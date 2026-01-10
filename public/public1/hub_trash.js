/* hub_trash.js - Cestino (soft delete + restore)
   Richiede: globalThis.__HUB = { fb, ORG_ID, setView, closeSideMenu, FS, orgCol }
*/
(function(){
  "use strict";

  const S = {
    ready: false,
    unsub: null,
    items: [],
    selected: new Set(),
    ui: {},
    lastFilter: { q:"", kind:"", sort:"deletedDesc" }
  };

  function hub(){ return globalThis.__HUB || null; }

  function $(id){ return document.getElementById(id); }

  function safeStr(v){ return (v == null) ? "" : String(v); }

  function fmtDate(ts){
    try{
      if (!ts) return "—";
      // Firestore Timestamp
      if (typeof ts.toDate === "function") return ts.toDate().toLocaleString("it-IT");
      if (ts instanceof Date) return ts.toLocaleString("it-IT");
      if (typeof ts === "number") return new Date(ts).toLocaleString("it-IT");
      return "—";
    }catch(_){ return "—"; }
  }

  function ensureUI(){
    S.ui.view = $("viewTrash");
    if (!S.ui.view) return false;

    S.ui.search = $("trashSearch");
    S.ui.kind = $("trashKind");
    S.ui.sort = $("trashSort");
    S.ui.selAll = $("trashSelAll");
    S.ui.tbody = $("trashTbody");
    S.ui.pillCount = $("pillTrashCount");
    S.ui.selInfo = $("trashSelInfo");
    S.ui.btnRestore = $("btnTrashRestore");
    S.ui.btnDelete = $("btnTrashDelete");

    return true;
  }

  function updateSelectionUI(){
    const n = S.selected.size;
    if (S.ui.selInfo) S.ui.selInfo.textContent = "Selezionati: " + n;
    if (S.ui.btnRestore) S.ui.btnRestore.disabled = (n === 0);
    if (S.ui.btnDelete) S.ui.btnDelete.disabled = (n === 0);
  }

  function applyFilters(items){
    let out = items.slice();

    const q = safeStr(S.ui.search && S.ui.search.value).trim().toLowerCase();
    const kind = safeStr(S.ui.kind && S.ui.kind.value).trim();

    if (kind){
      out = out.filter(x => safeStr(x.kind).toLowerCase() === kind);
    }
    if (q){
      out = out.filter(x => {
        const label = safeStr(x.label).toLowerCase();
        const k = safeStr(x.kind).toLowerCase();
        const target = safeStr((x.target && (x.target.code || x.target.id || x.target.col)) || "").toLowerCase();
        return label.includes(q) || k.includes(q) || target.includes(q);
      });
    }

    const sort = safeStr(S.ui.sort && S.ui.sort.value) || "deletedDesc";
    out.sort((a,b) => {
      const ad = a.deletedAt && (typeof a.deletedAt.toMillis==="function" ? a.deletedAt.toMillis() : (a.deletedAt.toDate? a.deletedAt.toDate().getTime():0)) || 0;
      const bd = b.deletedAt && (typeof b.deletedAt.toMillis==="function" ? b.deletedAt.toMillis() : (b.deletedAt.toDate? b.deletedAt.toDate().getTime():0)) || 0;
      const al = safeStr(a.label).toLowerCase();
      const bl = safeStr(b.label).toLowerCase();
      if (sort === "deletedAsc") return ad - bd;
      if (sort === "labelAsc") return al.localeCompare(bl, "it");
      if (sort === "labelDesc") return bl.localeCompare(al, "it");
      return bd - ad; // deletedDesc
    });

    return out;
  }

  function render(){
    if (!ensureUI()) return;

    const filtered = applyFilters(S.items);

    if (S.ui.pillCount) S.ui.pillCount.textContent = String(filtered.length);

    // Keep selection consistent with filtered view
    const filteredIds = new Set(filtered.map(x => x._id));
    for (const id of Array.from(S.selected)){
      if (!filteredIds.has(id)) S.selected.delete(id);
    }
    updateSelectionUI();

    if (!S.ui.tbody) return;

    if (!filtered.length){
      S.ui.tbody.innerHTML = '<tr><td colspan="5" class="muted" style="padding:14px;">Nessun elemento nel cestino.</td></tr>';
      if (S.ui.selAll) S.ui.selAll.checked = false;
      return;
    }

    const rows = filtered.map(item => {
      const checked = S.selected.has(item._id) ? "checked" : "";
      const kind = safeStr(item.kind || "—");
      const label = safeStr(item.label || "—");
      const when = fmtDate(item.deletedAt);
      return `
        <tr data-id="${item._id}">
          <td><input type="checkbox" class="trashSel" data-id="${item._id}" ${checked}></td>
          <td>${kind}</td>
          <td style="white-space:normal; line-height:1.25;">${label}</td>
          <td>${when}</td>
          <td style="text-align:right;">
            <button class="btn btn-ghost btn-sm trashRestoreOne" data-id="${item._id}" type="button">Ripristina</button>
            <button class="btn btn-danger btn-sm trashDeleteOne" data-id="${item._id}" type="button">Elimina</button>
          </td>
        </tr>
      `;
    }).join("");

    S.ui.tbody.innerHTML = rows;

    // selAll status
    if (S.ui.selAll){
      const allOn = filtered.length > 0 && filtered.every(x => S.selected.has(x._id));
      S.ui.selAll.checked = allOn;
    }
  }

  async function restoreItem(item){
    const H = hub();
    if (!H || !H.fb || !H.fb.db || !H.FS) throw new Error("Firebase non pronto");
    const { doc, setDoc, deleteDoc } = H.FS;

    const kind = safeStr(item.kind).toLowerCase();
    const t = item.target || {};
    if (kind === "product"){
      const id = safeStr(t.id);
      if (!id) throw new Error("Target mancante (product)");
      const ref = doc(H.fb.db, "orgs", H.ORG_ID, "products", id);
      const data = item.data || {};
      await setDoc(ref, data, { merge: true });
    } else if (kind === "supplier"){
      const id = safeStr(t.id);
      if (!id) throw new Error("Target mancante (supplier)");
      const ref = doc(H.fb.db, "orgs", H.ORG_ID, "suppliers", id);
      const data = (item.data && (item.data.supplier || item.data)) || {};
      await setDoc(ref, data, { merge: true });
      // NB: eventuali linkedDocs/attachments non vengono ripristinati automaticamente
    } else if (kind === "flow"){
      const movements = (item.data && (item.data.movements || item.data.movement || item.data.rows)) || [];
      if (Array.isArray(movements) && movements.length){
        for (const mv of movements){
          const mid = safeStr(mv && mv.id);
          if (!mid) continue;
          const ref = doc(H.fb.db, "orgs", H.ORG_ID, "movements", mid);
          const payload = Object.assign({}, mv);
          // Firestore doc non deve contenere id duplicato per forza, ma non fa danni
          await setDoc(ref, payload, { merge: true });
        }
      } else {
        throw new Error("Nessuna riga movimento da ripristinare");
      }
    } else {
      throw new Error("Tipo non ripristinabile: " + kind);
    }

    // rimuovi dal cestino
    await deleteDoc(doc(H.fb.db, "orgs", H.ORG_ID, "trash", item._id));
  }

  async function deleteTrashItem(item){
    const H = hub();
    if (!H || !H.fb || !H.fb.db || !H.FS) throw new Error("Firebase non pronto");
    const { doc, deleteDoc } = H.FS;
    await deleteDoc(doc(H.fb.db, "orgs", H.ORG_ID, "trash", item._id));
  }

  function bindEvents(){
    if (S.ready) return;
    if (!ensureUI()) return;

    // Menu click (se esiste)
    const btnMenu = $("menuGoTrash");
    if (btnMenu){
      btnMenu.addEventListener("click", () => {
        try{ hub()?.closeSideMenu && hub().closeSideMenu(); }catch(_){}
        try{ hub()?.setView && hub().setView("trash"); }catch(_){}
        refresh();
      });
    }

    // Close/back
    $("btnCloseTrash")?.addEventListener("click", (e) => {
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
      try{ hub()?.setView && hub().setView("home"); }catch(_){}
    });
    $("btnBackTrash")?.addEventListener("click", (e) => {
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
      try{ hub()?.setView && hub().setView("home"); }catch(_){}
    });

    // Filters
    S.ui.search?.addEventListener("input", () => render());
    S.ui.kind?.addEventListener("change", () => render());
    S.ui.sort?.addEventListener("change", () => render());

    // Select all
    S.ui.selAll?.addEventListener("change", () => {
      const filtered = applyFilters(S.items);
      if (S.ui.selAll.checked){
        filtered.forEach(x => S.selected.add(x._id));
      }else{
        filtered.forEach(x => S.selected.delete(x._id));
      }
      render();
    });

    // Table delegated events
    S.ui.tbody?.addEventListener("click", async (e) => {
      const t = e.target;
      if (!t) return;

      // checkbox
      if (t.classList && t.classList.contains("trashSel")){
        const id = t.getAttribute("data-id");
        if (!id) return;
        if (t.checked) S.selected.add(id);
        else S.selected.delete(id);
        updateSelectionUI();
        // update selAll state
        render();
        return;
      }

      // restore one
      if (t.classList && t.classList.contains("trashRestoreOne")){
        const id = t.getAttribute("data-id");
        const item = S.items.find(x => x._id === id);
        if (!item) return;
        if (!confirm("Ripristinare questo elemento?")) return;
        try{
          await restoreItem(item);
        }catch(err){
          console.warn(err);
          alert("Ripristino non riuscito: " + (err && err.message ? err.message : err));
        }
        return;
      }

      // delete one
      if (t.classList && t.classList.contains("trashDeleteOne")){
        const id = t.getAttribute("data-id");
        const item = S.items.find(x => x._id === id);
        if (!item) return;
        if (!confirm("Eliminare definitivamente questo elemento?")) return;
        try{
          await deleteTrashItem(item);
        }catch(err){
          console.warn(err);
          alert("Eliminazione non riuscita: " + (err && err.message ? err.message : err));
        }
        return;
      }
    });

    // Mass actions
    S.ui.btnRestore?.addEventListener("click", async () => {
      const ids = Array.from(S.selected);
      if (!ids.length) return;
      if (!confirm("Ripristinare gli elementi selezionati?")) return;
      for (const id of ids){
        const item = S.items.find(x => x._id === id);
        if (!item) continue;
        try{
          await restoreItem(item);
          S.selected.delete(id);
        }catch(err){
          console.warn(err);
          alert("Ripristino non riuscito per un elemento: " + (err && err.message ? err.message : err));
        }
      }
      render();
    });

    S.ui.btnDelete?.addEventListener("click", async () => {
      const ids = Array.from(S.selected);
      if (!ids.length) return;
      if (!confirm("Eliminare definitivamente gli elementi selezionati?")) return;
      for (const id of ids){
        const item = S.items.find(x => x._id === id);
        if (!item) continue;
        try{
          await deleteTrashItem(item);
          S.selected.delete(id);
        }catch(err){
          console.warn(err);
          alert("Eliminazione non riuscita per un elemento: " + (err && err.message ? err.message : err));
        }
      }
      render();
    });

    S.ready = true;
  }

  function subscribe(){
    const H = hub();
    if (!H || !H.fb || !H.fb.db || !H.FS) return false;

    if (S.unsub) return true;

    const { collection, query, orderBy, onSnapshot } = H.FS;
    try{
      const col = collection(H.fb.db, "orgs", H.ORG_ID, "trash");
      const q = query(col, orderBy("deletedAt", "desc"));
      S.unsub = onSnapshot(q, (snap) => {
        const items = [];
        snap.forEach(docu => {
          const d = docu.data() || {};
          items.push(Object.assign({_id: docu.id}, d));
        });
        S.items = items;
        render();
      }, (err) => {
        console.warn("Trash snapshot error:", err);
      });
      return true;
    }catch(e){
      console.warn("subscribe failed", e);
      return false;
    }
  }

  function refresh(){
    bindEvents();
    if (!subscribe()){
      // fallback: just render (empty) + message
      render();
    }
  }

  function waitForHub(attempt){
    attempt = attempt || 0;
    const H = hub();
    if (H && H.fb && H.fb.db && H.FS){
      refresh();
      return;
    }
    if (attempt > 200) return; // ~20s max
    setTimeout(() => waitForHub(attempt+1), 100);
  }

  // expose API
  globalThis.HubTrash = globalThis.HubTrash || {};
  globalThis.HubTrash.refresh = refresh;

  // init
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => waitForHub(0));
  } else {
    waitForHub(0);
  }
})();
