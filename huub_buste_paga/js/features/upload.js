import { state, resetPayrollState, COLLECTIONS } from "../state.js";
import { firestore, storage, serverTimestamp } from "../services/firebase.js";
import { extractPayrollPdf } from "../services/gemini.js";
import { ensurePdfLib, splitPdf } from "../services/pdf.js";

const normalizeNameStrict = (e) => String(e || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z\s]/g, " ").replace(/\s+/g, " ").trim();
const normalizeFiscalCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const normalizeMonthKey = (val) => {
  const t = String(val || "").trim();
  if (!t) return "";
  if (/^\d{4}-\d{2}$/.test(t)) return t;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t.slice(0, 7);
  const n = t.match(/(20[0-9]{2})\D(\d{1,2})/);
  return n ? `${n[1]}-${String(n[2]).padStart(2, "0")}` : "";
};
const isValidEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || "").trim());

export function initUploadFeature() {
  wireUploadInteractions();
}

function setAdminStep(step) {
  state.payroll.admin.step = step;
  const steps = {
    idle: document.getElementById("payrollStepIdle"),
    extracting: document.getElementById("payrollStepExtract"),
    preview: document.getElementById("payrollStepPreview"),
    match: document.getElementById("payrollStepMatch"),
    sending: document.getElementById("payrollStepSending"),
    directory: document.getElementById("payrollDirectoryPane")
  };
  Object.entries(steps).forEach(([key, node]) => {
    if (node) node.style.display = key === step ? "block" : "none";
  });
  const lab = document.getElementById("payrollAdminStepLabel");
  if (lab) lab.textContent = step === "directory" ? "Dipendenti" : step.charAt(0).toUpperCase() + step.slice(1);
  document.getElementById("payrollTabUpload")?.classList.toggle("active", step !== "directory");
  document.getElementById("payrollTabDirectory")?.classList.toggle("active", step === "directory");
}

function updateGroupedValidation() {
  const rows = state.payroll?.admin?.groupedRows || [];
  const btn = document.getElementById("btnPayrollSend");
  const banner = document.getElementById("payrollConflictBanner");
  const summary = document.getElementById("payrollMatchSummary");
  const conflictPages = state.payroll?.admin?.match?.conflictPages || [];
  const unassignedPages = state.payroll?.admin?.match?.unassignedPages || [];
  const messages = [];
  rows.forEach((r) => {
    r.missingEmail = !isValidEmail(r.email);
    r.missingMonth = !r.monthKey;
    if (!r.fiscalCode) r.warning = "CF mancante: raggruppo per nome";
    const escKey = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(r.key) : r.key;
    const noteCell = document.querySelector(`[data-row-note="${escKey}"]`);
    if (noteCell) noteCell.innerHTML = payrollNotesHtml(r);
    if (r.missingEmail) messages.push(`Email mancante per ${r.displayName || r.fiscalCode || r.key}`);
    if (r.missingMonth) messages.push(`Data/mese mancante per pagine ${r.pages?.map((p) => p.pageIndex + 1).join(", ") || ""}`);
    if (r.conflict) messages.push(`Conflitto su ${r.displayName || r.fiscalCode || r.key}`);
  });
  if (conflictPages.length) messages.push(`Pagine in conflitto: ${conflictPages.map((p) => p + 1).join(", ")}`);
  if (unassignedPages.length) messages.push(`Pagine non assegnate: ${unassignedPages.map((p) => p + 1).join(", ")}`);
  if (btn) btn.disabled = !(rows.length && messages.length === 0);
  if (banner) {
    banner.style.display = messages.length ? "block" : "none";
    banner.textContent = messages.join(" · ");
  }
  if (summary) {
    const totalPages = rows.reduce((a, r) => a + (r.pageNos?.length || r.pages?.length || 0), 0);
    summary.textContent = `${rows.length} righe · ${totalPages} pagine`;
  }
}

function payrollNotesHtml(row) {
  const notes = [];
  if (row.warning) notes.push(`<span class="payrollBadgeWarn">⚠️ ${row.warning}</span>`);
  if (row.conflict) notes.push(`<span class="payrollBadgeError">⚠️ Conflitto (${row.dirCandidatesCount || 2} possibili)</span>`);
  if (row.missingMonth) notes.push("<span class=\"payrollBadgeError\">⚠️ Data/Mese obbligatoria</span>");
  if (row.missingEmail) notes.push("<span class=\"payrollBadgeError\">⚠️ Email obbligatoria/valida</span>");
  const pages = Array.isArray(row.pages) ? row.pages.length : 0;
  const pageList = Array.isArray(row.pageNos) && row.pageNos.length ? row.pageNos.join(", ") : (row.pages || []).map((p) => p.pageIndex + 1).join(", ");
  notes.push(`<span class="payrollInfo">Pagine: ${pages}${pageList ? ` (${pageList})` : ""}</span>`);
  return notes.join("<br/>");
}

function renderGroupedTable() {
  const rows = state.payroll?.admin?.groupedRows || [];
  const t = document.getElementById("payrollGroupedBody");
  if (t) {
    t.innerHTML = rows.length
      ? rows
          .map((r) => {
            const pagesCount = Array.isArray(r.pages) ? r.pages.length : 0;
            const pageText = r.pageNos?.length ? r.pageNos.join(", ") : (r.pages || []).map((p) => p.pageIndex + 1).join(", ");
            const monthBadge = r.monthKey ? `<span class="badgeTone tone-ok">${r.monthKey}</span>` : '<span class="badgeTone tone-bad">Obbligatoria</span>';
            const emailLockedTag = r.emailLocked ? '<span class="payrollLockTag">Directory</span>' : "";
            return `<tr data-row="${r.key}">
        <td><input class="payrollInlineInput" data-payroll-field="displayName" data-key="${r.key}" value="${r.displayName || ""}" placeholder="Nome cognome"></td>
        <td><input class="payrollInlineInput" data-payroll-field="fiscalCode" data-key="${r.key}" value="${r.fiscalCode || ""}" placeholder="CF"></td>
        <td>${monthBadge}</td>
        <td>${r.netPayText || "—"}</td>
        <td><div class="payrollInlineCell"><input class="payrollInlineInput" data-payroll-field="email" data-key="${r.key}" value="${r.email || ""}" placeholder="nome@azienda.it" ${r.emailLocked ? "disabled" : ""}><button class="miniBtn" type="button" data-payroll-email-action="${r.emailLocked ? "unlock" : "save"}" data-key="${r.key}">${r.emailLocked ? "Modifica" : "Salva"}</button>${emailLockedTag}</div></td>
        <td><div class="payrollInlineCell"><span class="badgeTone tone-ok">Pagine: ${pagesCount}</span> <span class="pcHint" style="font-weight:800">${pageText || "—"}</span></div><button class="payrollBtn ghost" data-payroll-open-pages="${r.key}" type="button">Apri PDF</button></td>
        <td data-row-note="${r.key}">${payrollNotesHtml(r)}</td>
      </tr>`;
          })
          .join("")
      : '<tr><td colspan="7" class="muted">Nessuna pagina rilevata.</td></tr>';
  }
  updateGroupedValidation();
  const r = document.getElementById("payrollAdminMatchLabel");
  if (r) r.textContent = `Righe ${rows.length || 0}`;
}

function renderPreviewTable() {
  const e = state.payroll.admin.gemini.pages || [];
  const t = document.getElementById("payrollPreviewTable");
  const n = document.getElementById("payrollMissingPages");
  const o = document.getElementById("payrollMissingList");
  if (!t) return;
  const i = e
    .map((p) => {
      const t = p.fields || {};
      const n = p.errorReason ? "tone-bad" : t.fullName && t.monthKey && t.netPayText ? "tone-ok" : "tone-warn";
      const o = p.errorReason ? "ERRORE" : t.fullName && t.monthKey && t.netPayText ? "OK" : "CAMPI MANCANTI";
      const s = String(p.rawText || "").slice(0, 180).replace(/\s+/g, " ").trim();
      return `<tr><td>${p.pageIndex + 1}</td><td>${t.fullName || "—"}</td><td>${t.fiscalCode || "—"}</td><td>${t.monthKey || "—"}</td><td>${t.netPayText || "—"}</td><td>${p.confidence != null ? (100 * p.confidence).toFixed(0) + "%" : "—"}</td><td><div class="snippet">${s}</div></td><td><span class="badgeTone ${n}">${o}</span></td></tr>`;
    })
    .join("");
  t.innerHTML = "<tr><th>#</th><th>Nome</th><th>Codice fiscale</th><th>Mese</th><th>Netto</th><th>Conf.</th><th>Snippet</th><th>Stato</th></tr>" + i;
  const a = e.filter((p) => !p.fields || !p.fields.monthKey || !p.fields.netPayText);
  if (n) {
    n.style.display = a.length ? "block" : "none";
    if (o) o.textContent = a.map((p) => p.pageIndex + 1).join(", ");
  }
  const r = document.getElementById("payrollPreviewMeta");
  if (r) r.textContent = `${e.length} pagine dal file`;
  const s = document.getElementById("payrollPreviewBadge");
  if (s) s.textContent = a.length ? "Campi mancanti" : "OK";
}

function buildGroupedRows() {
  const pages = state.payroll?.admin?.gemini?.pages || [];
  const docs = state.payroll?.admin?.gemini?.docs || [];
  const totalPages = state.payroll?.admin?.gemini?.totalPages || 0;
  const dirEntries = state.payroll?.directory?.entries || [];
  const existing = new Map((state.payroll?.admin?.groupedRows || []).map((r) => [r.key, r]));
  const dirByFiscal = new Map();
  const dirByName = new Map();
  dirEntries.forEach((e) => {
    const fiscal = normalizeFiscalCode(e.fiscalCode || e.id || "");
    const nameNorm = normalizeNameStrict(e.displayName || e.fullName || "");
    if (fiscal) dirByFiscal.set(fiscal, e);
    if (nameNorm) {
      if (!dirByName.has(nameNorm)) dirByName.set(nameNorm, []);
      dirByName.get(nameNorm).push(e);
    }
  });
  const items = docs && docs.length
    ? docs
    : pages.map((p) => ({
        ...p,
        pageIndices: [p.pageIndex],
        fullName: p.fields?.fullName || "",
        fiscalCode: p.fields?.fiscalCode || "",
        documentDate: p.fields?.monthKey || "",
        netPayText: p.fields?.netPayText || "",
        netPayCents: p.fields?.netPayCents ?? null
      }));
  const fallbackNameCounts = new Map();
  items.forEach((item) => {
    const fiscalCode = normalizeFiscalCode(item.fiscalCode || item.fields?.fiscalCode || item.fields?.codiceFiscale || item.fields?.taxCode || "");
    if (fiscalCode) return;
    const nameNorm = normalizeNameStrict(item.fullName || item.fields?.fullName || "");
    if (!nameNorm) return;
    fallbackNameCounts.set(nameNorm, (fallbackNameCounts.get(nameNorm) || 0) + 1);
  });
  const pageOwners = new Map();
  const conflictPages = new Set();
  const groups = new Map();
  items.forEach((item, idx) => {
    const fields = item.fields || {};
    const fullName = (item.fullName || fields.fullName || "").trim();
    const fiscalCodeRaw = item.fiscalCode || fields.fiscalCode || fields.codiceFiscale || fields.taxCode || "";
    const fiscalCode = normalizeFiscalCode(fiscalCodeRaw);
    const monthKey = normalizeMonthKey(item.documentDate || item.monthKey || fields.monthKey || fields.documentDate || "");
    const netPayText = item.netPayText || fields.netPayText || "";
    const netPayCents = item.netPayCents ?? fields.netPayCents ?? null;
    const nameNorm = normalizeNameStrict(fullName || "");
    const employeeKey = fiscalCode ? `cf:${fiscalCode.toLowerCase()}` : nameNorm ? `name:${nameNorm}` : `anon:${idx}`;
    const prev = existing.get(employeeKey);
    let row = groups.get(employeeKey);
    const dirCandidates = fiscalCode ? (dirByFiscal.get(fiscalCode) ? [dirByFiscal.get(fiscalCode)] : []) : nameNorm ? dirByName.get(nameNorm) || [] : [];
    const dirMatch = dirCandidates[0];
    if (!row) {
      const emailLower = (prev?.email || dirMatch?.emailLower || "").toLowerCase();
      row = {
        key: employeeKey,
        displayName: prev?.displayName || fullName || dirMatch?.displayName || dirMatch?.fullName || "",
        fiscalCode: prev?.fiscalCode || fiscalCode || dirMatch?.fiscalCode || "",
        monthKey: prev?.monthKey || monthKey || "",
        documentDate: prev?.documentDate || monthKey || "",
        netPayText: prev?.netPayText || netPayText,
        netPayCents: prev?.netPayCents ?? netPayCents ?? null,
        email: emailLower || "",
        emailLocked: prev?.emailLocked ?? Boolean(dirMatch && emailLower),
        emailSource: prev?.emailSource || (dirMatch ? (fiscalCode ? "directory-cf" : "directory-name") : ""),
        pages: [],
        pageNos: [],
        sources: [],
        warning: "",
        conflict: false,
        missingMonth: false,
        missingEmail: false,
        dirCandidatesCount: dirCandidates.length
      };
    }
    const pageIndices = Array.from(new Set((item.pageIndices || []).filter((v) => Number.isFinite(v)).map((v) => Math.max(0, Math.round(v))))).sort((a, b) => a - b);
    pageIndices.forEach((pi) => {
      const owner = pageOwners.get(pi);
      if (owner && owner !== employeeKey) {
        conflictPages.add(pi);
      } else {
        pageOwners.set(pi, employeeKey);
      }
    });
    row.pages.push(...pageIndices.map((pi) => ({ pageIndex: pi, monthKey, netPayText, netPayCents, fields })));
    row.sources.push(item);
    if (!row.netPayText && netPayText) row.netPayText = netPayText;
    if (row.netPayCents == null && netPayCents != null) row.netPayCents = netPayCents;
    if (!row.monthKey && monthKey) row.monthKey = monthKey;
    if (!row.documentDate && monthKey) row.documentDate = monthKey;
    if (!row.fiscalCode && fiscalCode) row.fiscalCode = fiscalCode;
    if (!row.displayName && fullName) row.displayName = fullName;
    row.dirCandidatesCount = dirCandidates.length || row.dirCandidatesCount;
    groups.set(employeeKey, row);
  });
  const rows = Array.from(groups.values()).map((r) => {
    const fiscalNorm = normalizeFiscalCode(r.fiscalCode);
    const nameNorm = normalizeNameStrict(r.displayName || "");
    const uniquePages = Array.from(new Set(r.pages.map((p) => p.pageIndex)))
      .filter((pi) => !conflictPages.has(pi))
      .sort((a, b) => a - b);
    r.pages = uniquePages.map((pi) => ({ pageIndex: pi }));
    r.pageNos = uniquePages.map((pi) => pi + 1);
    const monthValues = Array.from(new Set((r.sources || []).map((src) => normalizeMonthKey(src.documentDate || src.monthKey || src.fields?.monthKey || "")))).filter(Boolean);
    if (!r.monthKey && monthValues[0]) r.monthKey = monthValues[0];
    let warning = fiscalNorm ? "" : "CF mancante: raggruppo per nome";
    if (monthValues.length > 1) warning = warning ? `${warning}; date multiple rilevate` : "Date multiple rilevate";
    if (!r.email) {
      const dirMatch = fiscalNorm ? dirByFiscal.get(fiscalNorm) : nameNorm ? (dirByName.get(nameNorm) || [])[0] : null;
      if (dirMatch?.emailLower) {
        r.email = dirMatch.emailLower;
        r.emailLocked = true;
        r.emailSource = r.emailSource || "directory-auto";
      }
    }
    r.warning = warning;
    const nameCollision = !fiscalNorm && nameNorm && (fallbackNameCounts.get(nameNorm) || 0) > 1;
    r.conflict = nameCollision || (!fiscalNorm && r.dirCandidatesCount > 1) || r.conflict || uniquePages.some((pi) => conflictPages.has(pi)) || uniquePages.length === 0;
    r.missingMonth = !r.monthKey;
    r.missingEmail = !isValidEmail(r.email);
    return r;
  });
  const assignedPages = Array.from(pageOwners.entries())
    .filter(([pi]) => !conflictPages.has(pi))
    .map(([pi]) => pi);
  const unassignedPages = totalPages ? Array.from({ length: totalPages }, (_v, i) => i).filter((pi) => !assignedPages.includes(pi) && !conflictPages.has(pi)) : [];
  state.payroll.admin.groupedRows = rows;
  state.payroll.admin.match = {
    pages,
    grouped: rows,
    unmatched: unassignedPages,
    matchedCount: rows.length,
    ambiguousCount: rows.filter((r) => r.conflict).length,
    unmatchedCount: unassignedPages.length,
    conflictPages: Array.from(conflictPages).sort((a, b) => a - b),
    unassignedPages
  };
  renderGroupedTable();
}

function renderDirectoryUI() {
  const e = state.payroll.directory.entries || [];
  const t = document.getElementById("payrollDirectoryBody");
  const n = document.getElementById("payrollDirectoryCount");
  const o = document.getElementById("dirCfSuggestions");
  const i = document.getElementById("dirEmailSuggestions");
  const r = document.getElementById("payrollDirectoryError");
  if (r) {
    const msg = state.payroll?.directory?.error || "";
    r.style.display = msg ? "block" : "none";
    r.textContent = msg ? "Accesso negato a payrollDirectory (Firestore rules). " + msg : "";
  }
  if (n) n.textContent = `${e.length} dipendenti whitelist`;
  if (t)
    t.innerHTML = e.length
      ? e.map((e) => `<tr><td>${e.displayName || "—"}</td><td>${e.fiscalCode || "—"}</td><td>${e.emailLower || "—"}</td><td>${e.enabled === false ? "Off" : "On"}</td><td><button class="miniBtn bad" data-dir-delete="${e.emailLower || ""}">Elimina</button></td></tr>`).join("")
      : '<tr><td colspan="5" class="muted">Nessun dipendente whitelist.</td></tr>';
  if (o) o.innerHTML = e.map((e) => `<option value="${e.fiscalCode || ""}"></option>`).join("");
  if (i) i.innerHTML = e.map((e) => `<option value="${e.emailLower || ""}"></option>`).join("");
}

async function saveDirectoryEntry() {
  if (!(state.firebase?.ok && state.user?.isAdmin)) return;
  const cfInput = document.getElementById("dirCfInput");
  const emailInput = document.getElementById("dirEmailInput");
  const feedback = document.getElementById("dirFeedback");
  const firstInput = document.getElementById("dirFirstNameInput");
  const lastInput = document.getElementById("dirLastNameInput");
  const emailLower = (emailInput?.value || "").trim().toLowerCase();
  const fiscalCode = (cfInput?.value || "").replace(/\s+/g, " ").trim().toUpperCase();
  const firstName = (firstInput?.value || "").trim();
  const lastName = (lastInput?.value || "").trim();
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || fiscalCode;
  const fullNameNorm = normalizeNameStrict(displayName || fiscalCode || emailLower);
  if (!emailLower || !fiscalCode) {
    if (feedback) feedback.textContent = "Inserisci email e codice fiscale (nome/cognome facoltativi)";
    return;
  }
  const payload = {
    emailLower,
    fiscalCode,
    firstName,
    lastName,
    displayName,
    fullName: displayName,
    fullNameNorm: fullNameNorm || normalizeNameStrict(emailLower),
    enabled: true,
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || "",
    createdAt: serverTimestamp()
  };
  try {
    const { api, db } = firestore();
    await api.setDoc(api.doc(db, COLLECTIONS.PAYROLL_DIRECTORY, emailLower), payload, { merge: true });
    if (feedback) feedback.textContent = "Salvato";
    setTimeout(() => {
      if (feedback) feedback.textContent = "";
    }, 2200);
  } catch (e) {
    console.warn("save directory", e);
    if (feedback) feedback.textContent = "Errore salvataggio";
  }
}

async function deleteDirectoryEntry(emailLower) {
  if (!(state.firebase?.ok && state.user?.isAdmin) || !emailLower) return;
  const n = document.getElementById("dirFeedback");
  try {
    const { api, db } = firestore();
    await api.deleteDoc(api.doc(db, COLLECTIONS.PAYROLL_DIRECTORY, emailLower));
    if (n) n.textContent = "Dipendente eliminato";
    setTimeout(() => {
      if (n) n.textContent = "";
    }, 1800);
  } catch (err) {
    console.warn("delete directory", err);
    if (n) n.textContent = "Errore eliminazione";
  }
}

async function deletePayrollDocs(mode = "last") {
  if (!(state.firebase?.ok && state.user?.isAdmin)) return;
  const feedback = document.getElementById("payrollDeleteFeedback");
  const email = (document.getElementById("dirEmailInput")?.value || "").trim().toLowerCase();
  if (!email) {
    if (feedback) feedback.textContent = "Inserisci l'email del dipendente prima di eliminare.";
    return;
  }
  try {
    if (feedback) feedback.textContent = "Eliminazione in corso…";
    const { api, db } = firestore();
    const q = api.query(api.collection(db, COLLECTIONS.PAYROLL_DOCS), api.where("emailLower", "==", email));
    const snap = await api.getDocs(q);
    let docs = snap.docs || [];
    docs.sort((a, b) => String(a.data()?.monthKey || "").localeCompare(String(b.data()?.monthKey || "")) * -1);
    if (!docs.length) {
      if (feedback) feedback.textContent = "Nessun documento trovato.";
      return;
    }
    const targets = mode === "all" ? docs : docs.slice(0, 1);
    const { api: stApi, bucket } = storage();
    for (const d of targets) {
      const data = d.data() || {};
      if (data.storagePath && stApi && bucket) {
        try {
          const ref = stApi.ref(bucket, data.storagePath);
          await stApi.deleteObject(ref);
        } catch (err) {
          console.warn("storage delete", err);
        }
      }
      try {
        await api.deleteDoc(d.ref);
      } catch (err) {
        console.warn("doc delete", err);
      }
    }
    if (feedback) feedback.textContent = mode === "all" ? "Tutti i documenti eliminati." : "Ultimo documento eliminato.";
    setTimeout(() => {
      if (feedback) feedback.textContent = "";
    }, 2200);
  } catch (err) {
    console.warn("delete docs", err);
    if (feedback) feedback.textContent = "Errore durante l'eliminazione.";
  }
}

async function startDirectoryWatch() {
  if (!state.firebase?.ok) return;
  state.payroll = state.payroll || {};
  state.payroll.directory = state.payroll.directory || { entries: [], ready: false, unsub: null, suggestions: [], error: "" };
  state.payroll.admin = state.payroll.admin || { users: [], files: [], gemini: null, sending: false };
  const { api, db } = firestore();
  if (state.payroll.directory.unsub) {
    try {
      state.payroll.directory.unsub();
    } catch (_) {}
  }
  const n = api.query(api.collection(db, COLLECTIONS.PAYROLL_DIRECTORY), api.where("enabled", "==", true));
  state.payroll.directory.unsub = api.onSnapshot(
    n,
    (snap) => {
      const list = snap.docs.map((doc) => {
        const t = doc.data() || {};
        const n = (t.emailLower || doc.id || "").toLowerCase();
        const o = (t.fiscalCode || t.fullName || t.displayName || n || "").toUpperCase();
        const r = (t.firstName || "").trim();
        const s = (t.lastName || "").trim();
        const l = (t.displayName || [r, s, o].filter(Boolean).join(" ")).trim() || o;
        return {
          id: doc.id,
          ...t,
          emailLower: n,
          fiscalCode: o,
          firstName: r,
          lastName: s,
          displayName: l,
          fullName: l,
          fullNameNorm: t.fullNameNorm || normalizeNameStrict(l || o)
        };
      });
      state.payroll.directory.entries = list;
      state.payroll.directory.ready = true;
      state.payroll.directory.error = "";
      state.payroll.directory.suggestions = list.map((e) => e.emailLower);
      state.payroll.admin.users = list.map((e) => ({
        uid: e.emailLower,
        id: e.emailLower,
        displayName: e.displayName || e.fullName || e.fiscalCode,
        emailLower: e.emailLower,
        fullNameNorm: e.fullNameNorm,
        fiscalCode: e.fiscalCode
      }));
      if (state.payroll.admin.gemini?.pages?.length) {
        buildGroupedRows();
      }
      renderDirectoryUI();
    },
    (err) => {
      console.warn("directory watch error", err);
      state.payroll.directory.entries = [];
      state.payroll.directory.suggestions = [];
      state.payroll.directory.ready = true;
      state.payroll.directory.error = err?.message || String(err);
      state.payroll.admin.users = [];
      renderDirectoryUI();
    }
  );
}

async function loadDirectory() {
  if (!(state.firebase?.ok && state.user && state.user.isAdmin)) return;
  const e = state.payroll.admin;
  if (state.payroll?.directory?.ready && e.users?.length) return;
  e.loadingUsers = true;
  try {
    await startDirectoryWatch();
  } catch (t) {
    console.warn("load payroll directory", t);
  }
  e.loadingUsers = false;
}

async function loadUserDocs(emailLower) {
  if (!state.firebase?.ok || !emailLower) return;
  const e = state.payroll.userView;
  e.loading = true;
  try {
    const { api, db } = firestore();
    let snap;
    try {
      snap = await api.getDocs(api.query(api.collection(db, COLLECTIONS.PAYROLL_DOCS), api.where("emailLower", "==", emailLower), api.orderBy("updatedAt", "desc")));
    } catch (err) {
      snap = await api.getDocs(api.query(api.collection(db, COLLECTIONS.PAYROLL_DOCS), api.where("emailLower", "==", emailLower)));
    }
    const raw = snap.docs.map((d) => {
      const data = d.data() || {};
      const ts = data.updatedAt?.toMillis?.()
        ? data.updatedAt.toMillis()
        : data.createdAt?.toMillis?.()
        ? data.createdAt.toMillis()
        : Date.parse(data.updatedAt || data.createdAt || "") || 0;
      return { id: d.id, ...data, updatedAtMs: ts };
    });
    raw.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0) || String(b.monthKey || "").localeCompare(String(a.monthKey || "")));
    const dedup = new Map();
    for (const doc of raw) {
      const key = doc.monthKey || doc.id;
      if (!dedup.has(key)) dedup.set(key, doc);
    }
    const list = Array.from(dedup.values());
    e.docs = list;
    e.months = list.map((d) => d.monthKey).filter(Boolean);
    e.selectedMonth = e.selectedMonth || e.months[0] || "";
    e.error = "";
    e.ready = true;
    e.searchTerm = e.searchTerm || "";
    e.filteredMonths = e.filteredMonths || [];
  } catch (t) {
    console.warn("load payroll docs error", t);
    e.error = "Storico non disponibile";
  }
  e.loading = false;
  renderUserSummary();
}

function renderMonthSelect() {
  const e = state.payroll.userView;
  const select = document.getElementById("payrollMonthSelect");
  if (!select) return;
  const list = e.filteredMonths && e.filteredMonths.length ? e.filteredMonths : e.months;
  select.innerHTML = list.map((m) => `<option value="${m}">${m}</option>`).join("");
  if (list.length && !list.includes(e.selectedMonth)) e.selectedMonth = list[0];
  if (e.selectedMonth) select.value = e.selectedMonth;
  select.onchange = () => {
    e.selectedMonth = select.value;
    loadSelectedMonth();
  };
  loadSelectedMonth();
}

async function loadSelectedMonth() {
  const view = state.payroll.userView;
  const doc = view.docs.find((d) => d.monthKey === view.selectedMonth) || view.docs[0];
  if (!doc) {
    const net = document.getElementById("payrollUserNet");
    if (net) net.textContent = "Nessuna busta paga";
    return;
  }
  view.selectedMonth = doc.monthKey;
  document.getElementById("payrollUserMonthBadge")?.textContent = doc.monthKey;
  document.getElementById("payrollUserAmountBadge")?.textContent = doc.netPayText || "—";
  const net = document.getElementById("payrollUserNet");
  if (net) net.textContent = `Questo mese hai guadagnato: ${doc.netPayText || "—"}`;
  const fallbackName = (state.user?.email || "").split("@")[0] || "utente";
  const displayName = (state.user?.displayName || state.user?.name || "").trim() || fallbackName;
  const greet = document.getElementById("payrollGreeting");
  const sub = document.getElementById("payrollGreetingSub");
  if (greet) greet.textContent = `Ciao ${displayName}, questo mese hai guadagnato ${doc.netPayText || "—"} euro.`;
  if (sub) sub.textContent = "Grazie per il tuo contributo.";
  document.getElementById("payrollUserDocMeta")?.textContent = `Documento: ${doc.monthKey}`;
  document.getElementById("payrollUserDate")?.textContent = doc.updatedAt ? "Aggiornato" : "Caricato";
  renderUserChart();
  const frame = document.getElementById("payrollUserPdfFrame");
  if (frame) {
    try {
      const { api, bucket } = storage();
      if (!api || !bucket) {
        frame.src = "";
        view.currentUrl = "";
        return;
      }
      if (doc.storagePath) {
        const url = await api.getDownloadURL(api.ref(bucket, doc.storagePath));
        const cleaned = url.includes("#") ? url : `${url}#toolbar=0&navpanes=0&scrollbar=0`;
        frame.src = cleaned;
        view.currentUrl = cleaned;
      } else {
        frame.src = "";
        view.currentUrl = "";
      }
    } catch (err) {
      console.warn("load payroll pdf", err);
      frame.src = "";
    }
  }
}

function renderUserChart() {
  const canvas = document.getElementById("summaryChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const docs = state.payroll?.userView?.docs || [];
  const bars = docs
    .map((d) => {
      const cents = Number(d.netPayCents);
      let val = Number.isFinite(cents) ? cents / 100 : NaN;
      if (!Number.isFinite(val)) {
        const txt = String(d.netPayText || "").replace(/[€.]/g, "").replace(",", ".");
        const num = parseFloat(txt);
        val = Number.isFinite(num) ? num : 0;
      }
      return { month: d.monthKey || "—", value: Math.max(0, val) };
    })
    .filter((b) => b.month);
  const max = bars.reduce((a, b) => Math.max(a, b.value), 0) || 1;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const padding = 12;
  const barW = Math.max(8, (canvas.width - padding * 2) / Math.max(1, bars.length) - 6);
  bars.slice(-12).forEach((bar, idx) => {
    const x = padding + idx * (barW + 6);
    const h = Math.max(8, (bar.value / max) * (canvas.height - 40));
    const y = canvas.height - h - 18;
    ctx.fillStyle = "#0a84ff";
    ctx.beginPath();
    ctx.roundRect(x, y, barW, h, 6);
    ctx.fill();
    ctx.fillStyle = "#0c101a";
    ctx.font = "10px 'Inter', system-ui";
    ctx.textAlign = "center";
    ctx.fillText(bar.month, x + barW / 2, canvas.height - 6);
  });
}

function renderUserSummary() {
  const badge = document.getElementById("payrollUserBadge");
  const hint = document.getElementById("payrollUserHint");
  const i = state.payroll?.userView || {};
  if (badge) badge.textContent = i.ready ? `Ultimo: ${i.months?.[0] || "—"}` : "Sync";
  if (hint) hint.textContent = i.error ? i.error : "Accesso riservato al tuo profilo.";
  renderMonthSelect();
}

async function uploadPayroll(file) {
  const admin = state.payroll.admin;
  if (!file) return;
  state.payroll.admin.gemini = { loading: true, error: "", pages: [], docs: [], totalPages: 0 };
  setAdminStep("extracting");
  const status = document.getElementById("payrollAdminStatus");
  const dbg = document.getElementById("payrollGeminiDebug");
  const progressBar = document.getElementById("payrollProgressFill");
  const progressLabel = document.getElementById("payrollProgressLabel");
  const setProgress = (p = 0, label = "") => {
    if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, p))}%`;
    if (progressLabel) progressLabel.textContent = label || "Caricamento…";
  };
  status && (status.textContent = "Analisi…");
  dbg && (dbg.textContent = "Analisi PDF: avvio…");
  try {
    const result = await extractPayrollPdf(file, setProgress);
    admin.originalPdfBytes = result.originalPdfBytes;
    admin.sourceFileName = result.sourceFileName;
    admin.sourceFileHash = result.sourceFileHash;
    admin.gemini.totalPages = result.totalPages;
    admin.gemini.docs = result.docs;
    admin.gemini.pages = result.pages;
    status && (status.textContent = `PREVIEW (${result.pages.length})`);
    dbg && (dbg.textContent = `Estrazione OK · pagine ${result.pages.length}`);
    renderPreviewTable();
    buildGroupedRows();
    setAdminStep("match");
  } catch (err) {
    admin.gemini.error = err?.message || String(err);
    dbg && (dbg.textContent = `Estrazione ERRORE\n${admin.gemini.error}`);
    console.warn("payroll extract error", err);
    setProgress(0, "Errore");
    setAdminStep("idle");
  } finally {
    admin.gemini.loading = false;
  }
}

async function persistRow(row) {
  const { api, db } = firestore();
  const { api: stApi, bucket } = storage();
  const pageIndices = (row.pages || []).map((p) => p.pageIndex);
  if (!pageIndices.length) throw new Error("Nessuna pagina associata");
  const emailLower = (row.email || "").toLowerCase();
  const baseId = `${emailLower}_${row.monthKey}`;
  let existingSnapshot = null;
  try {
    const q = api.query(
      api.collection(db, COLLECTIONS.PAYROLL_DOCS),
      api.where("emailLower", "==", emailLower),
      api.where("monthKey", "==", row.monthKey),
      api.orderBy("updatedAt", "desc"),
      api.limit(1)
    );
    const snap = await api.getDocs(q);
    existingSnapshot = snap.docs?.[0] || null;
  } catch (err) {
    try {
      const legacy = await api.getDoc(api.doc(db, COLLECTIONS.PAYROLL_DOCS, baseId));
      existingSnapshot = legacy.exists() ? legacy : null;
    } catch (_) {}
  }
  const existingData = existingSnapshot?.data ? existingSnapshot.data() : existingSnapshot && typeof existingSnapshot.get === "function" ? existingSnapshot.data() : null;
  const existingId = existingSnapshot?.id || baseId;
  const sameHash = existingData && existingData.sourceFileHash === state.payroll.admin.sourceFileHash;
  const samePages = existingData && Array.isArray(existingData.pageIndices) && Array.isArray(row.pages) && existingData.pageIndices.join(",") === row.pages.map((p) => p.pageIndex).join(",");
  let docId = existingId;
  let uploaded = { path: existingData?.storagePath || `payroll/${row.monthKey}/${existingId}.pdf`, url: existingData?.downloadUrl };
  if (!sameHash || !samePages) {
    docId = `${baseId}_${Date.now()}`;
    const nBytes = await splitPdf(state.payroll.admin.originalPdfBytes, pageIndices);
    if (!stApi || !bucket) throw new Error("Storage non disponibile");
    const storageRef = stApi.ref(bucket, `payroll/${row.monthKey}/${docId}.pdf`);
    const uploadedSnap = await stApi.uploadBytes(storageRef, nBytes, { contentType: "application/pdf" });
    uploaded = { path: `payroll/${row.monthKey}/${docId}.pdf`, url: await stApi.getDownloadURL(uploadedSnap.ref) };
  }
  await api.setDoc(
    api.doc(db, COLLECTIONS.PAYROLL_DOCS, docId),
    {
      docId,
      emailLower,
      uid: "",
      fullName: row.displayName || row.fiscalCode || "",
      fiscalCode: row.fiscalCode || "",
      monthKey: row.monthKey,
      netPayCents: row.netPayCents,
      netPayText: row.netPayText,
      storagePath: uploaded.path,
      downloadUrl: uploaded.url || existingData?.downloadUrl || "",
      source: "gemini",
      sourceFileName: state.payroll.admin.sourceFileName,
      sourceFileHash: state.payroll.admin.sourceFileHash,
      pageIndices,
      matchScore: row.matchScore || 0,
      updatedAt: serverTimestamp(),
      createdAt: existingData?.createdAt || serverTimestamp()
    },
    { merge: true }
  );
}

async function sendRows() {
  const e = state.payroll.admin;
  const rows = e.groupedRows || [];
  if (!rows.length) {
    toast("Nessun dato", "Esegui l’estrazione prima di inviare.");
    return;
  }
  const invalid = rows.filter((r) => r.missingEmail || r.missingMonth || r.conflict);
  if (invalid.length) {
    toast("Completa i dati", "Email valida e data/mese obbligatoria per tutte le righe. Risolvi conflitti.");
    return;
  }
  if (!e.originalPdfBytes) {
    toast("PDF mancante", "Riesegui l’estrazione.");
    setAdminStep("preview");
    return;
  }
  setAdminStep("sending");
  const summary = { matched: rows.length, ambiguous: rows.filter((r) => r.conflict).length, unmatched: 0, status: "ok" };
  try {
    for (const row of rows) {
      await persistRow(row);
    }
    try {
      const { api, db } = firestore();
      await api.addDoc(api.collection(db, COLLECTIONS.PAYROLL_LOGS), {
        createdAt: serverTimestamp(),
        adminUid: state.user?.uid || "",
        sourceFileName: e.sourceFileName,
        sourceFileHash: e.sourceFileHash,
        totalPages: e.gemini.pages?.length || 0,
        matchedCount: summary.matched,
        ambiguousCount: summary.ambiguous,
        unmatchedCount: summary.unmatched,
        details: rows
      });
    } catch (_) {}
    toast("Inviato", "Buste paga inviate.");
  } catch (err) {
    console.warn("payroll send error", err);
    summary.status = err?.message || String(err);
    toast("Errore invio", summary.status);
  }
  e.sendSummary = summary;
  const o = document.getElementById("payrollSendSummary");
  if (o) o.textContent = `Esito: ${summary.status || "—"} · Righe ${summary.matched}`;
}

function toast(title, body) {
  const banner = document.getElementById("errorBanner");
  if (!banner) return;
  banner.querySelector(".error-title").textContent = title;
  banner.querySelector(".error-body").textContent = body || "";
  banner.classList.add("show");
}

function clearToast() {
  document.getElementById("errorBanner")?.classList.remove("show");
}

function resetUpload() {
  const bar = document.getElementById("payrollProgressFill");
  const lab = document.getElementById("payrollProgressLabel");
  if (bar) bar.style.width = "0%";
  if (lab) lab.textContent = "Pronto";
  resetPayrollState();
  setAdminStep("idle");
  renderPreviewTable();
  renderGroupedTable();
}

function wireUploadInteractions() {
  const drop = document.getElementById("payrollDrop");
  const input = document.getElementById("payrollFileInput");
  const handleFiles = (files) => {
    state.payroll.admin.files = files && files.length ? [files[0]] : [];
    renderFileLabel();
    if (state.payroll.admin.files[0]) uploadPayroll(state.payroll.admin.files[0]);
  };
  if (drop) {
    ["dragover", "dragenter"].forEach((ev) => drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("drag");
    }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("drag");
    }));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      e.dataTransfer?.files?.length && handleFiles(e.dataTransfer.files);
    });
    drop.addEventListener("click", () => input?.click());
  }
  input?.addEventListener("change", () => handleFiles(input.files));
  document.getElementById("btnPayrollUpload")?.addEventListener("click", () => {
    const f = state.payroll.admin.files?.[0];
    if (!f) {
      input?.click();
      return;
    }
    uploadPayroll(f);
  });
  document.getElementById("btnPayrollRetry")?.addEventListener("click", () => {
    const f = state.payroll.admin.files?.[0];
    if (f) uploadPayroll(f);
  });
  document.getElementById("btnPayrollReset")?.addEventListener("click", resetUpload);
  document.getElementById("btnPayrollReset2")?.addEventListener("click", resetUpload);
  document.getElementById("btnPayrollReset3")?.addEventListener("click", resetUpload);
  document.getElementById("btnPayrollMatch")?.addEventListener("click", () => {
    buildGroupedRows();
    setAdminStep("match");
  });
  document.getElementById("btnPayrollBackPreview")?.addEventListener("click", () => setAdminStep("preview"));
  document.getElementById("btnPayrollSend")?.addEventListener("click", () => sendRows());
  document.getElementById("btnToggleDirForm")?.addEventListener("click", () => {
    document.getElementById("dirForm")?.classList.toggle("isOpen");
  });
  document.getElementById("btnSaveDirectory")?.addEventListener("click", () => saveDirectoryEntry());
  document.getElementById("btnPayrollReloadUsers")?.addEventListener("click", () => loadDirectory());
  document.getElementById("btnPayrollDeleteLast")?.addEventListener("click", () => deletePayrollDocs("last"));
  document.getElementById("btnPayrollDeleteAll")?.addEventListener("click", () => deletePayrollDocs("all"));
  document.getElementById("payrollTabDirectory")?.addEventListener("click", () => {
    if (state.payroll?.admin?.step !== "directory") state.payroll.admin.lastFlowStep = state.payroll.admin.step || "idle";
    setAdminStep("directory");
  });
  document.getElementById("payrollTabUpload")?.addEventListener("click", () => {
    const s = state.payroll?.admin?.lastFlowStep || state.payroll?.admin?.step || "idle";
    setAdminStep(s === "directory" ? "idle" : s);
  });
  document.addEventListener("click", async (evt) => {
    const delBtn = evt.target?.closest?.("[data-dir-delete]");
    if (delBtn) {
      const email = delBtn.getAttribute("data-dir-delete");
      if (email && confirm("Eliminare il dipendente selezionato?")) {
        await deleteDirectoryEntry(email);
      }
    }
    const emailBtn = evt.target?.closest?.("[data-payroll-email-action]");
    if (emailBtn) {
      const key = emailBtn.getAttribute("data-key");
      const mode = emailBtn.getAttribute("data-payroll-email-action");
      const row = (state.payroll?.admin?.groupedRows || []).find((r) => r.key === key);
      if (row) {
        if (mode === "unlock") {
          row.emailLocked = false;
          renderGroupedTable();
        } else if (mode === "save") {
          if (!isValidEmail(row.email)) {
            toast("Email obbligatoria", "Inserisci un indirizzo email valido.");
            return;
          }
          await persistRowToDirectory(row);
          renderGroupedTable();
        }
      }
    }
    const openBtn = evt.target?.closest?.("[data-payroll-open-pages]");
    if (openBtn) {
      const key = openBtn.getAttribute("data-payroll-open-pages");
      if (key) await openPayrollPages(key);
    }
  });
  document.addEventListener("input", (evt) => {
    const field = evt.target?.dataset?.payrollField;
    const key = evt.target?.dataset?.key;
    if (field && key) {
      updateGroupedRowField(key, field, evt.target.value);
    }
  });
  const search = document.getElementById("payrollSearchInput");
  if (search) {
    search.value = state.payroll.userView.searchTerm || "";
    search.addEventListener("input", () => {
      const term = (search.value || "").toLowerCase();
      const view = (state.payroll.userView = state.payroll.userView || {});
      view.searchTerm = term;
      view.filteredMonths = term ? (view.months || []).filter((m) => String(m || "").toLowerCase().includes(term)) : [];
      renderMonthSelect();
    });
  }
  document.getElementById("payrollPagesClose")?.addEventListener("click", () => closePayrollPages());
  document.getElementById("errorBannerClose")?.addEventListener("click", clearToast);
}

function renderFileLabel() {
  const label = document.getElementById("payrollAdminFileLabel");
  if (!label) return;
  const t = state.payroll.admin.files?.[0];
  label.textContent = t ? t.name : "Nessun file";
}

function updateGroupedRowField(key, field, value) {
  const rows = state.payroll?.admin?.groupedRows || [];
  const row = rows.find((r) => r.key === key);
  if (!row) return;
  if (field === "displayName") {
    row.displayName = value;
    const dirEntries = state.payroll?.directory?.entries || [];
    const nameNorm = normalizeNameStrict(row.displayName || "");
    const dirCandidates = nameNorm ? dirEntries.filter((d) => normalizeNameStrict(d.displayName || d.fullName || "") === nameNorm) : [];
    row.dirCandidatesCount = row.fiscalCode ? row.dirCandidatesCount : dirCandidates.length;
    if (!row.fiscalCode && dirCandidates.length === 1 && (!row.email || row.emailSource === "")) {
      row.email = (dirCandidates[0].emailLower || "").toLowerCase();
      row.emailLocked = Boolean(row.email);
      row.emailSource = "directory-name";
    }
    row.conflict = !row.fiscalCode && row.dirCandidatesCount > 1;
  }
  if (field === "fiscalCode") {
    row.fiscalCode = normalizeFiscalCode(value);
    const dirEntries = state.payroll?.directory?.entries || [];
    const dirMatch = row.fiscalCode ? dirEntries.find((d) => normalizeFiscalCode(d.fiscalCode || d.id || "") === row.fiscalCode) : null;
    row.dirCandidatesCount = dirMatch ? 1 : 0;
    row.conflict = false;
    if (dirMatch) {
      if (!row.emailLocked || !row.email) {
        row.email = (dirMatch.emailLower || "").toLowerCase();
        row.emailSource = "directory-cf";
      }
      row.emailLocked = Boolean(row.email);
    } else {
      row.emailLocked = false;
    }
  }
  if (field === "email") {
    row.email = String(value || "").trim().toLowerCase();
    row.emailLocked = false;
    row.emailSource = row.emailSource || "manual";
  }
  row.warning = row.fiscalCode ? "" : "CF mancante: raggruppo per nome";
  row.missingEmail = !isValidEmail(row.email);
  updateGroupedValidation();
}

async function persistRowToDirectory(row) {
  if (!(row && state.firebase?.ok && state.user?.isAdmin)) return;
  try {
    const { api, db } = firestore();
    const payload = {
      emailLower: (row.email || "").toLowerCase(),
      fiscalCode: normalizeFiscalCode(row.fiscalCode || row.displayName || row.email || row.key),
      displayName: row.displayName || row.fiscalCode || row.email,
      fullName: row.displayName || row.fiscalCode || row.email,
      fullNameNorm: normalizeNameStrict(row.displayName || row.fiscalCode || row.email || ""),
      enabled: true,
      updatedAt: serverTimestamp(),
      updatedBy: state.user?.uid || "",
      createdAt: serverTimestamp()
    };
    await api.setDoc(api.doc(db, COLLECTIONS.PAYROLL_DIRECTORY, payload.emailLower), payload, { merge: true });
    row.emailLocked = true;
    row.emailSource = row.emailSource || "directory-manual";
    renderDirectoryUI();
    toast("Email salvata", "Contatto aggiornato in directory.");
  } catch (err) {
    console.warn("persistRowToDirectory", err);
    toast("Errore salvataggio", "Impossibile salvare l'email in directory.");
  }
}

async function openPayrollPages(key) {
  const row = (state.payroll?.admin?.groupedRows || []).find((r) => r.key === key);
  if (!row) return;
  if (!(row.pages && row.pages.length)) return toast("Pagine mancanti", "Nessuna pagina associata a questa riga.");
  if (!state.payroll?.admin?.originalPdfBytes) return toast("PDF non caricato", "Carica un PDF prima di aprire le pagine.");
  try {
    await ensurePdfLib();
    const bytes = await splitPdf(state.payroll.admin.originalPdfBytes, row.pages.map((p) => p.pageIndex));
    row.previewUrl && URL.revokeObjectURL(row.previewUrl);
    row.previewUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const frame = document.getElementById("payrollPagesFrame");
    const title = document.getElementById("payrollPagesTitle");
    const meta = document.getElementById("payrollPagesMeta");
    if (frame) frame.src = `${row.previewUrl}#toolbar=0&navpanes=0`;
    if (title) title.textContent = row.displayName || row.fiscalCode || "Pagine busta paga";
    const pageList = row.pageNos?.length ? row.pageNos.join(", ") : row.pages.map((p) => p.pageIndex + 1).join(", ");
    if (meta) meta.textContent = `Pagine: ${pageList} · Mese ${row.monthKey || "—"}`;
    document.getElementById("payrollPageViewer")?.classList.add("show");
    state.payroll.admin.previewRowKey = row.key;
  } catch (err) {
    console.warn("openPayrollPages", err);
    toast("Preview non disponibile", err?.message || String(err));
  }
}

function closePayrollPages() {
  document.getElementById("payrollPageViewer")?.classList.remove("show");
  const frame = document.getElementById("payrollPagesFrame");
  if (frame) frame.src = "";
  try {
    const key = state.payroll?.admin?.previewRowKey;
    if (key) {
      const row = (state.payroll?.admin?.groupedRows || []).find((r) => r.key === key);
      if (row?.previewUrl) {
        URL.revokeObjectURL(row.previewUrl);
        row.previewUrl = "";
      }
    }
    if (state.payroll?.admin) state.payroll.admin.previewRowKey = "";
  } catch (_) {}
}

export async function onSignedIn() {
  resetPayrollState();
  state.user = state.user || {};
  if (state.user && state.user.email) state.user.emailLower = String(state.user.email).toLowerCase();
  state.payroll.userView.emailLower = state.user?.emailLower || state.payroll.userView.emailLower || "";
  await loadDirectory();
  await loadUserDocs(state.payroll.userView.emailLower);
  renderUserSummary();
}

export function onSignedOut() {
  closePayrollPages();
  try {
    if (state.payroll?.directory?.unsub) {
      state.payroll.directory.unsub();
      state.payroll.directory.unsub = null;
    }
  } catch (_) {}
  resetPayrollState();
  renderGroupedTable();
  renderPreviewTable();
}

export function showAdminUI(isAdmin) {
  document.getElementById("uploadSection")?.classList.toggle("hidden", !isAdmin);
  const badge = document.getElementById("payrollAdminStatus");
  if (badge) badge.textContent = state.payroll?.admin?.step?.toUpperCase?.() || "IDLE";
}

export function refreshUserPanel() {
  renderUserSummary();
}

export function handleManualBack(defaultUrl) {
  if (history.length > 1) {
    history.back();
  } else if (document.referrer) {
    location.href = document.referrer;
  } else {
    location.href = defaultUrl;
  }
}

export function getUserEmailLower() {
  return state.payroll.userView.emailLower;
}

export function updateUserEmailLower(val) {
  state.payroll.userView.emailLower = val;
}

export function getUserDocsCount() {
  const docs = state.payroll?.userView?.docs || [];
  const pages = docs.reduce((acc, d) => acc + (d.pageIndices?.length || 1), 0);
  return { docs: docs.length, pages };
}

export function getLastElaboration() {
  const docs = state.payroll?.userView?.docs || [];
  if (!docs.length) return "—";
  const ts = docs[0].updatedAtMs || Date.now();
  return new Date(ts).toLocaleString("it-IT");
}

export function getCurrentPayrollUrl() {
  return state.payroll?.userView?.currentUrl || "";
}

export function openPayrollPdfWindow() {
  const url = getCurrentPayrollUrl();
  if (!url) {
    toast("PDF non pronto", "Seleziona un mese disponibile.");
    return;
  }
  const displayName = (state.user?.displayName || state.user?.name || (state.user?.email || "").split("@")[0] || "utente").trim();
  const month = state.payroll?.userView?.selectedMonth || "";
  const safeUrl = url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const win = window.open("", "_blank", "noopener");
  if (!win) {
    toast("Apertura bloccata", "Consenti pop-up per aprire il PDF.");
    return;
  }
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Busta paga ${month}</title><style>
    body{margin:0;background:linear-gradient(180deg,#f2f5fb,#e7ecf7);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#0c101a;}
    .shell{max-width:1200px;margin:0 auto;padding:18px;}
    .topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}
    .title{font-weight:900;font-size:18px;letter-spacing:-.01em;color:#0c101a;}
    .actions{display:flex;gap:10px;flex-wrap:wrap;}
    .btn{border:1px solid rgba(12,16,26,.12);background:linear-gradient(180deg,#0a84ff,#0a6be0);color:#fff;font-weight:900;padding:10px 14px;border-radius:12px;cursor:pointer;box-shadow:0 12px 26px rgba(10,132,255,.25);}
    .btn.ghost{background:#fff;color:#0a84ff;border-color:rgba(10,132,255,.25);}
    .btn:active{transform:translateY(1px);}
    .frameWrap{border:1px solid rgba(12,16,26,.08);border-radius:16px;overflow:hidden;box-shadow:0 18px 38px rgba(15,23,42,.12);}
    iframe{width:100%;height:82vh;border:0;background:#fff;}
  </style></head><body><div class="shell"><div class="topbar"><div class="title">Busta paga ${month ? "· " + month : ""} · ${displayName}</div><div class="actions"><button class="btn" id="printBtn" type="button">Stampa</button><button class="btn ghost" id="shareBtn" type="button">Condividi</button></div></div><div class="frameWrap"><iframe src="${safeUrl}"></iframe></div></div><script>
    (function(){
      const url = ${JSON.stringify(url)};
      document.getElementById('printBtn')?.addEventListener('click', ()=>{ try{ window.print(); }catch(_e){} });
      document.getElementById('shareBtn')?.addEventListener('click', async()=>{
        try{
          if(navigator.share){ await navigator.share({ title: 'Busta paga ${month}', url }); return; }
          if(navigator.clipboard){ await navigator.clipboard.writeText(url); alert('Link copiato negli appunti'); return; }
          alert('Condivisione non disponibile nel browser.');
        }catch(err){ console.warn('share err', err); alert('Condivisione non riuscita'); }
      });
    })();
  <\\/script></body></html>`;
  win.document.write(html);
  win.document.close();
}
