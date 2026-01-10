/* Hub Inventario — Sezione Categorie
   - UI + eventi
   - CRUD via HubInv (main module)
*/
(function(){
  "use strict";

  const $ = (id) => document.getElementById(id);

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }
  function escAttr(s){
    return esc(s).replace(/\n/g, " ");
  }
  function safeColor(v){
    const s = String(v || "").trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : "";
  }

  let hub = null;
  let selectedKey = "";
  let selectedSnapshot = { name: "", color: "" };

  function closeSideMenuSafe(){
    try{
      document.body.classList.remove("menu-open");
      const sideMenu = $("sideMenu");
      const sideMenuOverlay = $("sideMenuOverlay");
      sideMenu && sideMenu.setAttribute("aria-hidden", "true");
      sideMenuOverlay && sideMenuOverlay.setAttribute("aria-hidden", "true");
    }catch(_){}
  }

  function setCreateOpen(open){
    const row = $("catCreateRow");
    if (!row) return;
    row.style.display = open ? "" : "none";
    if (open) {
      try{ $("catNewName")?.focus(); }catch(_){}
    } else {
      try{ $("catNewName").value = ""; }catch(_){}
    }
  }

  function setDetailOpen(open){
    const modal = $("modalCategory");
    if (!modal) return;

    if (open) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
      try{ setTimeout(() => $("catEditName")?.focus(), 0); }catch(_){}
    } else {
      modal.classList.remove("open");
      // Rimuovi lock scroll solo se nessun altro modale è aperto
      try{
        if (!document.querySelector(".modal.open")) document.body.classList.remove("modal-open");
      }catch(_){ document.body.classList.remove("modal-open"); }

      selectedKey = "";
      selectedSnapshot = { name:"", color:"" };
      try{ $("catProdTbody").innerHTML = '<tr><td class="td-muted" colspan="2">Seleziona una categoria.</td></tr>'; }catch(_){}
    }
  }

  function pickCategory(key){
    selectedKey = String(key || "").trim().toLowerCase();
    setDetailOpen(!!selectedKey);
    renderDetail();
  }

  function isActive(){
    const v = $("viewCategories");
    return !!(v && v.classList.contains("active"));
  }

  function renderList(){
    if (!hub) return;
    const tbody = $("catTbody");
    const pill = $("pillCategoriesCount");
    if (!tbody) return;

    const q = String($("catSearch")?.value || "").trim().toLowerCase();

    const cats = (hub.getCategories && hub.getCategories()) || [];
    const filtered = q
      ? cats.filter(c => String(c.name || c.key || "").toLowerCase().includes(q))
      : cats;

    if (pill) pill.textContent = String(filtered.length || 0);

    if (!filtered.length){
      tbody.innerHTML = '<tr><td class="td-muted" colspan="4">Nessuna categoria.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(c => {
      const key = String(c.key || "").trim().toLowerCase();
      const name = String(c.name || key || "").trim() || "—";
      const col = safeColor(c.color || "") || "";
      const used = (typeof hub.categoryUsageCount === "function") ? (hub.categoryUsageCount(key) || 0) : 0;

      const dot = `<span class="catDot" style="${col ? ("background:" + escAttr(col) + ";") : ""}"></span>`;
      const isSel = selectedKey && key === selectedKey;

      return `
        <tr data-catkey="${escAttr(key)}" style="${isSel ? "background: rgba(10,132,255,.08);" : ""}" title="Apri dettaglio">
          <td data-label="Colore">
            <div class="inlineRow" style="justify-content:flex-start; gap:10px;">
              ${dot}
              <span class="td-muted">${esc(col || "—")}</span>
            </div>
          </td>
          <td data-label="Categoria"><strong>${esc(name)}</strong></td>
          <td data-label="Articoli" class="qty">${Number(used||0).toLocaleString("it-IT")}</td>
          <td data-label="Azioni" class="td-actions" style="text-align:right;">
            <button class="btn btn-ghost btn-xs jsCatOpen" type="button" data-catkey="${escAttr(key)}">Apri</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderDetail(){
    if (!hub) return;
    if (!selectedKey) return;

    const cats = (hub.getCategories && hub.getCategories()) || [];
    const cat = cats.find(x => String(x.key||"").toLowerCase() === selectedKey) || null;

    const nm = String(cat?.name || selectedKey || "").trim();
    const col = safeColor(cat?.color || "") || "#1c6fe6";

    const used = (typeof hub.categoryUsageCount === "function") ? (hub.categoryUsageCount(selectedKey) || 0) : 0;

    const nameInp = $("catEditName");
    const colorInp = $("catEditColor");
    const pill = $("catDetailCount");
    const btnSave = $("btnCatSave");
    const btnDel = $("btnCatDelete");
    const hint = $("catDeleteHint");

    if (pill) pill.textContent = `${Number(used||0).toLocaleString("it-IT")} articol${used===1 ? "o" : "i"}`;

    // snapshot base per enable/disable
    if (!selectedSnapshot || selectedSnapshot.key !== selectedKey){
      selectedSnapshot = { key: selectedKey, name: nm, color: col };
    }

    if (nameInp) nameInp.value = nm;
    if (colorInp) colorInp.value = col;

    const canDelete = (Number(used||0) === 0);

    if (btnDel) btnDel.disabled = !canDelete;
    if (hint){
      hint.textContent = canDelete
        ? "Puoi eliminare questa categoria: non ci sono articoli assegnati."
        : "Questa categoria è già assegnata ad articoli: puoi modificarne nome e colore, ma non eliminarla.";
    }

    // products list
    const prodTbody = $("catProdTbody");
    if (prodTbody){
      if (!used){
        prodTbody.innerHTML = '<tr><td class="td-muted" colspan="2">Nessun articolo assegnato.</td></tr>';
      } else {
        const list = (typeof hub.categoryProducts === "function") ? (hub.categoryProducts(selectedKey) || []) : [];
        const show = list.slice(0, 600);
        prodTbody.innerHTML = show.map(p => `
          <tr class="jsCatProdRow" data-code="${escAttr(p.code || "")}" title="Apri prodotto">
            <td data-label="Codice"><span class="kbd">${esc(p.code || "—")}</span></td>
            <td data-label="Nome">${esc(p.name || "—")}</td>
          </tr>
        `).join("") + (list.length > show.length ? `<tr><td colspan="2" class="td-muted">+${list.length - show.length} altri…</td></tr>` : "");
      }
    }

    // Save enable
    const syncSave = () => {
      if (!btnSave || !nameInp || !colorInp) return;
      const curName = String(nameInp.value || "").trim();
      const curCol = safeColor(colorInp.value || "") || "";
      btnSave.disabled = (curName === String(selectedSnapshot.name||"")) && (curCol === safeColor(selectedSnapshot.color||""));
    };
    syncSave();
  }

  function render(){
    if (!hub) return;
    if (!isActive()) return;
    renderList();
    if (selectedKey) renderDetail();
  }

  function bindEvents(){
    // menu open
    $("menuGoCategories")?.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      closeSideMenuSafe();
      try{ hub.setView("categories"); }catch(_){}
      setCreateOpen(false);
      render();
    });

    // back/close
    $("btnBackCategories")?.addEventListener("click", () => { setDetailOpen(false); try{ hub.setView("home"); }catch(_){ } });
    $("btnCloseCategories")?.addEventListener("click", () => { setDetailOpen(false); try{ hub.setView("home"); }catch(_){ } });

    // search
    $("catSearch")?.addEventListener("input", () => render());

    // new category toggle
    $("btnCatNew")?.addEventListener("click", () => {
      const row = $("catCreateRow");
      const open = !!(row && row.style.display === "none");
      setCreateOpen(open);
    });
    $("btnCatCancelCreate")?.addEventListener("click", () => setCreateOpen(false));

    // create
    $("btnCatCreate")?.addEventListener("click", async () => {
      const name = String($("catNewName")?.value || "").trim();
      const color = String($("catNewColor")?.value || "").trim();
      if (!name) { try{ hub.showToast("Inserisci un nome categoria", "warn"); }catch(_){ } return; }

      try{
        const created = await hub.createCategory(name, color);
        setCreateOpen(false);
        if (created && created.key) {
          pickCategory(created.key);
        }
        render();
      }catch(e){
        console.error(e);
        try{ hub.showToast("Errore creazione categoria", "err"); }catch(_){ }
      }
    });

    // table click (open row)
    $("catTbody")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button.jsCatOpen");
      const tr = e.target?.closest?.("tr[data-catkey]");
      const key = (btn?.getAttribute("data-catkey") || tr?.getAttribute("data-catkey") || "").trim();
      if (!key) return;
      if (btn) { e.preventDefault(); e.stopPropagation(); }
      pickCategory(key);
      render();
    });

    // detail close

    // modal close (categoria)
    $("btnCatDone")?.addEventListener("click", () => { setDetailOpen(false); renderList(); });
    $("catModalClose")?.addEventListener("click", () => { setDetailOpen(false); renderList(); });
    $("modalCategory")?.addEventListener("click", (e) => {
      if (e.target === $("modalCategory")) { setDetailOpen(false); renderList(); }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("modalCategory")?.classList.contains("open")) {
        setDetailOpen(false); renderList();
      }
    });
// detail inputs
    $("catEditName")?.addEventListener("input", () => renderDetail());
    $("catEditColor")?.addEventListener("input", () => renderDetail());

    // save
    $("btnCatSave")?.addEventListener("click", async () => {
      if (!selectedKey) return;
      const name = String($("catEditName")?.value || "").trim();
      const color = String($("catEditColor")?.value || "").trim();
      if (!name) { try{ hub.showToast("Nome categoria non valido", "warn"); }catch(_){ } return; }

      try{
        await hub.updateCategory(selectedKey, { name, color });
        selectedSnapshot = { key: selectedKey, name, color };
        render();
      }catch(e){
        console.error(e);
        try{ hub.showToast("Errore salvataggio categoria", "err"); }catch(_){ }
      }
    });

    // delete
    $("btnCatDelete")?.addEventListener("click", async () => {
      if (!selectedKey) return;
      const used = (typeof hub.categoryUsageCount === "function") ? (hub.categoryUsageCount(selectedKey) || 0) : 0;
      if (used > 0) { try{ hub.showToast("Categoria usata: non eliminabile", "warn"); }catch(_){ } return; }

      const ok = confirm("Eliminare questa categoria? Operazione irreversibile.");
      if (!ok) return;

      try{
        const done = await hub.deleteCategory(selectedKey);
        if (done) {
          setDetailOpen(false);
          render();
        }
      }catch(e){
        console.error(e);
        try{ hub.showToast("Errore eliminazione categoria", "err"); }catch(_){ }
      }
    });

    // products click
    $("catProdTbody")?.addEventListener("click", (e) => {
      const tr = e.target?.closest?.("tr.jsCatProdRow");
      if (!tr) return;
      const code = String(tr.getAttribute("data-code") || "").trim();
      if (!code) return;
      e.preventDefault(); e.stopPropagation();
      try{
        hub.openProductModal(code, { __mode: "master", code: code });
      }catch(_){}
    });
  }

  function onHubReady(h){
    hub = h || window.HubInv;
    if (!hub) return;
    bindEvents();

    // expose render so main renderAll can call it
    window.HubCategories = {
      render
    };

    // if view already active (rare), render now
    try{ render(); }catch(_){}
  }

  // Wait HubInv
  if (window.HubInv) onHubReady(window.HubInv);
  window.addEventListener("HubInvReady", (e) => onHubReady(e?.detail));
})();
