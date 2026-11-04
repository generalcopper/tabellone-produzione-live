import { createPickingHomeDashboard } from "/picking-home.js?v=51f33bf4b2d8";
import { createWarehouseMap, locationLabelHTML, parseLocationCode } from "/picking-map.js?v=45be2460360e";
import { uiConfirm, uiQuantity } from "/picking-dialogs.js?v=3faf41adf290";
let pickingHomeDashboard = null;
// === Firebase config ===
const firebaseConfig = {
  apiKey: "AIzaSyBiyB4pilnPpVj8vImD4PI6LF2_RtyDnv4",
  authDomain: "tabellone-produzione-liv-e313e.firebaseapp.com",
  projectId: "tabellone-produzione-liv-e313e",
  storageBucket: "tabellone-produzione-liv-e313e.firebasestorage.app",
  messagingSenderId: "537555699968",
  appId: "1:537555699968:web:4d04cb9596b67bfb0e4be5",
};

// === Backend endpoint (API separata) ===
const DEFAULT_EXTRACT_ENDPOINT =
  "https://amz-inventory-backend-537555699968.europe-west1.run.app/extract";
const BRT_LABEL_PRODUCTS_ENDPOINT =
  "https://brt-label-products-537555699968.europe-west1.run.app/process";
// Shopify FBM: sync manuale frontend rimosso. La sincronizzazione deve restare lato backend schedulato.
const CAPANNONE_VOICE_AGENT_URL =
  "https://us-central1-tabellone-produzione-liv-e313e.cloudfunctions.net/capannoneVoiceAgentNow";
const UBI_VOICE_DIALOG_URL =
  "https://us-central1-tabellone-produzione-liv-e313e.cloudfunctions.net/ubiVoiceDialog";
const CAPANNONE_VOICE_AGENT_DOC_ID = "capannoneVoiceAgent";
const UBI_LIVE_MP3_ONE_SOURCE_V20260705 = true;
let _ubiVoiceAgentLastClickAt = 0;
let _ubiInterruptLastSentAt = 0;
let _ubiRecorder = null;
let _ubiAudioStream = null;
let _ubiAudioChunks = [];
let _ubiRecordTimer = null;
let _ubiSending = false;
let _ubiSpeechRec = null;
let _ubiSpeechTranscript = "";
let _ubiSpeechCancelled = false;

// === Auth/roles ===
const ADMIN_EMAILS = ["ludovico@generalcoppersrl.com"];

const state = {
  user: null,
  authGateState: "unknown", // unknown | restoring | signed_out | signed_in
  authGateMessage: "",
  firebase: { ok: false, app: null, auth: null, db: null, api: null, authApi: null },
  boot: { waitingForData: false, ready: false, readyTimer: null, startedAt: 0 },
  route: { view: "home", loc: null },
  inventory: {
    cerea: { unsub: null, items: [], meta: { count: 0, lastUpdatedAt: null, loaded: false } },
    concamarise: { unsub: null, items: [], meta: { count: 0, lastUpdatedAt: null, loaded: false } },
  },
  logs: {
    cerea: {
      unsub: null,
      flows: [],
      meta: { count: 0, loaded: false, expected: 0, seen: 0 },
      _mergeTimer: null,
    },
    concamarise: {
      unsub: null,
      flows: [],
      meta: { count: 0, loaded: false, expected: 0, seen: 0 },
      _mergeTimer: null,
    },
  },
  pickingPreview: {
    fbm: { count: null, loaded: false, loading: false, updatedAtClient: 0, source: "" },
    fba: { count: null, loaded: false, loading: false, updatedAtClient: 0, source: "" },
    busy: false,
    timer: null,
  },
  activityLogs: {
    unsubMovements: null,
    movements: [],
    error: "",
    loaded: false,
    _refreshTimer: null,
  },
  flows: {
    carica: { file: null, lines: [], busy: false, workflow: null },
    scarica: { file: null, lines: [], busy: false, workflow: null },
  },
  ui: {
    sheet: null,
    sheetStack: [],
    sottoscortaLoc: null,
    wfOpen: false,
    flowId: null,
    flowSearch: "",
    productsSearch: "",
    homeLocatedSearch: "",
    homeNoLocationSearch: "",
    pickingHomeView: "home",
    productEditSku: null,
    productDetailsSku: null,
    productDetailsLot: "",
    productDetailsEditMode: false,
    caricaMode: "pdf",
    flowsModalLoc: "concamarise",
    skuPick: { lineIdx: null, q: "" },
  },
  manual: { carica: { text: "", lines: [], busy: false } },
  actionLocks: new Set(),

  movements: { unsub: null, sku: null, items: [], error: "" },
  combo: {
    unsub: null,
    sku: null,
    doc: null,
    children: [],
    draft: [],
    dirty: false,
    search: "",
    saving: false,
    error: "",
  },
  comboCache: new Map(),

  // Riordini Tabellone WRITE: lettura cloud live + backfill flag RIORDINATO sui pregressi
  twReorders: {
    unsub: null,
    bySku: new Map(),
    ready: false,
    error: "",
    backfillTimer: null,
    backfilledKeys: new Set(),
  },
  twCompletedAmazon: {
    unsub: null,
    busy: false,
    timer: null,
    items: [],
    error: "",
    touchedKeys: new Set(),
  },

  shopifySync: {
    unsub: null,
    meta: null,
    error: "",
    busy: false,
    lastManualAtClient: 0,
  },
};

// --- utilities ---
const $ = (id) => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// Responsabilità applicativa: Picking gestisce ubicazioni e prelievi.
// Flussi in ingresso, rettifiche inventario e sottoscorta restano nell'Hub Inventario Amazon.
const PICKING_CAPABILITIES = Object.freeze({ rackWrite: true });

// --- iOS Press Effect (CARD / RIGHE / BOTTONI) ---
// Implementazione con event delegation: niente listener duplicati, niente memory leak.
(function installPressEffect() {
  try {
    if (window.__pressFxInstalled) return;
    window.__pressFxInstalled = true;

    const PRESS_SELECTOR = "button";

    const isDisabled = (el) => {
      try {
        if (!el) return true;
        if (el.matches("button:disabled, .btn:disabled")) return true;
        if (el.matches("[aria-disabled='true']")) return true;
        if (el.closest("[aria-disabled='true']")) return true;
        return false;
      } catch (_e) {
        return true;
      }
    };

    let active = null;
    let pid = null;
    let startX = 0;
    let startY = 0;
    let cancelled = false;

    const clear = () => {
      if (active) active.classList.remove("is-pressed");
      active = null;
      pid = null;
      cancelled = false;
    };

    const onDown = (e) => {
      try {
        if (e.defaultPrevented) return;
        if (e.isPrimary === false) return;

        // mouse: solo left click
        if (e.pointerType === "mouse" && e.button !== 0) return;

        const pressable = e.target?.closest?.(PRESS_SELECTOR);
        if (!pressable) return;
        if (isDisabled(pressable)) return;
        if (pressable.classList.contains("no-press") || pressable.hasAttribute("data-no-press"))
          return;

        // evita press su input/textarea/select (ma lascia i bottoni)
        const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
        if (
          (tag === "input" || tag === "textarea" || tag === "select") &&
          !pressable.matches(".btn,button")
        )
          return;

        // una sola interazione alla volta
        if (pid !== null) return;

        pid = e.pointerId;
        active = pressable;
        startX = e.clientX;
        startY = e.clientY;
        cancelled = false;

        active.classList.add("is-pressed");

        // cattura il pointer per ricevere sempre pointerup/cancel
        try {
          active.setPointerCapture?.(pid);
        } catch (_e) {}
      } catch (_e) {}
    };

    const onMove = (e) => {
      try {
        if (pid === null || e.pointerId !== pid || !active) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!cancelled && dx * dx + dy * dy > 12 * 12) {
          cancelled = true;
          active.classList.remove("is-pressed");
        }
      } catch (_e) {}
    };

    const onOut = (e) => {
      try {
        if (pid === null || e.pointerId !== pid || !active) return;

        // se sto uscendo dall'elemento "attivo" verso fuori, tolgo press
        const to = e.relatedTarget;
        if (to && active.contains(to)) return;

        // solo se l'evento riguarda l'elemento attivo (o un suo figlio)
        if (e.target && (e.target === active || active.contains(e.target))) {
          active.classList.remove("is-pressed");
        }
      } catch (_e) {}
    };

    const onUp = (e) => {
      try {
        if (pid === null || e.pointerId !== pid) return;
        clear();
      } catch (_e) {}
    };

    const onCancel = (e) => {
      try {
        if (pid === null || e.pointerId !== pid) return;
        clear();
      } catch (_e) {}
    };

    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    document.addEventListener("pointermove", onMove, { capture: true, passive: true });
    document.addEventListener("pointerup", onUp, { capture: true, passive: true });
    document.addEventListener("pointercancel", onCancel, { capture: true, passive: true });
    document.addEventListener("pointerout", onOut, { capture: true, passive: true });

    // safety: se perdi focus (tab switch / app in background)
    window.addEventListener("blur", clear, { passive: true });
  } catch (_e) {}
})();

// Normalizza spazi (PDF spesso spezza su più righe)
const squashWhitespace = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim();
const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Pulizia forte: rimuove rumore Seller Central che a volte finisce nel "nome prodotto"
function cleanProductMainName(s) {
  try {
    let t = squashWhitespace(s || "");
    if (!t) return "";

    // header tabella Seller Central (capita che venga concatenato al titolo)
    t = t.replace(/^\s*Dettagli\s+SKU\s+Informazioni\/azione\s+Quantit[aà]\s+da\s+inviare\s*/i, "");
    t = t.replace(
      /^\s*(?:Dettagli\s+SKU\s+)?Informazioni\/azione\s+Quantit[aà]\s+da\s+inviare\s*/i,
      "",
    );
    t = t.replace(/^\s*Dettagli\s+SKU\s*/i, "");
    t = t.replace(/^\s*Informazioni\/azione\s*/i, "");
    t = t.replace(/^\s*Quantit[aà]\s+da\s+inviare\s*/i, "");

    // prefissi quantità/pacchi (es: "Unità: 35 <titolo>")
    t = t.replace(/^\s*(?:Pacchi|Unit[aà]|Unita)\s*:\s*\d+\s*/i, "");
    t = t.replace(/^\s*(?:Pacchi|Unit[aà]|Unita)\s*:\s*\d+\s*/i, "");

    // rumore "Unità per pacco: 24" (se per errore finisce nel nome)
    t = t.replace(/^\s*Unit[aà]\s+per\s+pacco\s*:\s*\d+\s*/i, "");
    t = t.replace(/^\s*Unit[aà]\s+per\s+pacco\s*:\s*\d+\s*/i, "");

    // rumore generico (best effort)
    t = t.replace(/\bPreparazione\s+non\s+richiesta\b/gi, "");
    t = t.replace(/\bCodice\s+a\s+barre\s+del\s+produttore\b/gi, "");
    t = t.replace(/\bPronto\s+per\s+la\s+spedizione\b/gi, "");
    t = t.replace(/\bIdoneo\s+al\s+risparmio\s+sulla\s+tariffa\s+di\s+gestione\b/gi, "");

    // separators
    t = t.replace(/^[\|\-–•·]+\s*/g, "");
    t = t.replace(/[\|\-–•·]+\s*$/g, "");

    return squashWhitespace(t);
  } catch (_e) {
    return squashWhitespace(s || "");
  }
}

// App height (iOS)

const updateAppHeight = () => {
  try {
    const h = Math.max(window.innerHeight || 0, document.documentElement?.clientHeight || 0);
    if (h) document.documentElement.style.setProperty("--app-height", `${h}px`);
  } catch (_e) {}
};
window.addEventListener("resize", updateAppHeight, { passive: true });
window.addEventListener("orientationchange", () => setTimeout(updateAppHeight, 160), {
  passive: true,
});
updateAppHeight();
setTimeout(updateAppHeight, 240);

// Blocca zoom/selection/copy in modo robusto (senza rompere input)
(function lockInteractions() {
  try {
    const isEditableTarget = (t) => {
      if (!t) return false;
      if (t.isContentEditable) return true;
      if (typeof t.closest === "function") {
        return !!t.closest(
          'input, textarea, [contenteditable="true"], [contenteditable=""], .allow-copy-paste',
        );
      }
      const tag = (t.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea";
    };

    const stopUnlessEditable = (e) => {
      if (isEditableTarget(e.target)) return;
      try {
        e.preventDefault();
      } catch (_e) {}
    };
    const stopAlways = (e) => {
      try {
        e.preventDefault();
      } catch (_e) {}
    };

    // Clipboard/menu: ora permettiamo la copia nelle righe (SKU, nomi prodotti, ecc.).
    // Manteniamo solo il blocco zoom gesture su iOS.

    // Blocca gesture zoom (iOS)
    document.addEventListener("gesturestart", stopAlways, { passive: false });
    document.addEventListener("gesturechange", stopAlways, { passive: false });
    document.addEventListener("gestureend", stopAlways, { passive: false });

    // evita doppio tap zoom (iOS)
    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 250) {
          stopAlways(e);
        }
        lastTouchEnd = now;
      },
      { passive: false },
    );
  } catch (_e) {}
})();

// toast
let toastTimer = null;
function showToast(title, body = "", ms = 2600) {
  const toast = $("toast");
  const t = $("toastTitle");
  const b = $("toastBody");
  if (!toast || !t || !b) return;
  if (toastTimer) clearTimeout(toastTimer);
  t.textContent = title || "Info";
  b.textContent = body || "";
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), ms);
}

let __brtLabelUploadBusy = false;
let __brtLabelUploadButton = null;

function setBrtLabelUploadBusy(busy, btn = null) {
  __brtLabelUploadBusy = !!busy;
  if (btn) __brtLabelUploadButton = btn;
  const current =
    __brtLabelUploadButton && document.contains(__brtLabelUploadButton)
      ? __brtLabelUploadButton
      : document.querySelector('[data-action="uploadBrtLabels"]');
  if (!current) return;
  current.disabled = !!busy;
  current.classList.toggle("is-busy", !!busy);
  const label = current.querySelector("[data-brt-label]");
  if (label) label.textContent = busy ? "Elaborazione etichette…" : "Carica etichette BRT";
}

function openBrtLabelFilePicker(btn) {
  if (__brtLabelUploadBusy) return;
  if (pickingHomeView() !== "pickingFbm") {
    showToast("Etichette BRT", "La funzione è disponibile solo in Picking FBM.", 2400);
    return;
  }
  if (!state.firebase?.auth?.currentUser || !state.user?.isWhitelisted) {
    showToast("Accesso richiesto", "Accedi prima di elaborare le etichette BRT.", 2600);
    return;
  }
  __brtLabelUploadButton = btn || null;
  const input = $("brtLabelUploadInput");
  if (!input) return;
  input.value = "";
  input.click();
}

function brtOpenPrintWindow() {
  try {
    const w = window.open("about:blank", "_blank");
    if (!w) return null;
    w.document.open();
    w.document.write(
      `<!doctype html><html><head><title>Etichette BRT</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,sans-serif;color:#334155;background:#fff}.box{text-align:center}.spin{width:32px;height:32px;margin:0 auto 14px;border-radius:50%;border:3px solid #e2e8f0;border-top-color:#f97316;animation:s .8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}</style></head><body><div class="box"><div class="spin"></div><div>Preparazione etichette BRT…</div></div></body></html>`,
    );
    w.document.close();
    return w;
  } catch (_e) {
    return null;
  }
}

function printBrtPdfBlob(blob, printWindow = null) {
  const url = URL.createObjectURL(blob);
  let printed = false;
  const tryPrintWindow = () => {
    if (printed || !printWindow || printWindow.closed) return false;
    try {
      printed = true;
      printWindow.focus();
      printWindow.print();
      return true;
    } catch (_e) {
      printed = false;
      return false;
    }
  };

  if (printWindow && !printWindow.closed) {
    try {
      printWindow.onload = () => setTimeout(tryPrintWindow, 350);
      printWindow.location.replace(url);
      setTimeout(() => {
        if (!printed) tryPrintWindow();
      }, 2600);
    } catch (_e) {}
  } else {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    frame.onload = () => {
      setTimeout(() => {
        try {
          frame.contentWindow?.focus?.();
          frame.contentWindow?.print?.();
        } catch (_e) {}
      }, 450);
    };
    frame.src = url;
    document.body.appendChild(frame);
    setTimeout(() => {
      try {
        frame.remove();
      } catch (_e) {}
    }, 90000);
  }
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch (_e) {}
  }, 120000);
}

async function processBrtLabelFile(file) {
  if (__brtLabelUploadBusy || !file) return;
  const name = String(file.name || "").toLowerCase();
  if (file.type !== "application/pdf" && !name.endsWith(".pdf")) {
    showToast("File non valido", "Seleziona il PDF delle etichette BRT.", 2800);
    return;
  }
  if (Number(file.size || 0) > 25 * 1024 * 1024) {
    showToast("PDF troppo grande", "Il file supera 25 MB.", 2800);
    return;
  }

  const printWindow = brtOpenPrintWindow();
  setBrtLabelUploadBusy(true);
  showToast("Etichette BRT", "Lettura etichette e abbinamento prodotti in corso…", 3200);
  try {
    const currentUser = state.firebase?.auth?.currentUser;
    if (!currentUser) throw new Error("Sessione Firebase non attiva.");
    const token = await currentUser.getIdToken();
    const body = new FormData();
    body.append("file", file, file.name || "etichette_brt.pdf");

    const response = await fetch(BRT_LABEL_PRODUCTS_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });

    if (!response.ok) {
      let message = `Errore backend BRT (${response.status}).`;
      try {
        const data = await response.json();
        message = String(data?.message || data?.error || message);
      } catch (_e) {}
      throw new Error(message);
    }

    const blob = await response.blob();
    if (!blob || blob.size < 100 || !String(blob.type || "").includes("pdf")) {
      throw new Error("Il backend non ha restituito un PDF valido.");
    }

    printBrtPdfBlob(blob, printWindow);
    const pages = response.headers.get("X-BRT-Pages") || "";
    showToast(
      "Etichette pronte",
      pages ? `${pages} etichette abbinate. Apertura stampa…` : "Apertura stampa…",
      4200,
    );
  } catch (err) {
    try {
      if (printWindow && !printWindow.closed) printWindow.close();
    } catch (_e) {}
    const message = String(err?.message || err || "Errore etichette BRT").slice(0, 320);
    console.error("BRT label products", err);
    showToast("Etichette non generate", message, 6500);
  } finally {
    setBrtLabelUploadBusy(false);
    const input = $("brtLabelUploadInput");
    if (input) input.value = "";
  }
}

async function callUbiVoiceAgentFromPicking() {
  try {
    const _nowUbi = Date.now();
    if (_nowUbi - _ubiVoiceAgentLastClickAt < 1800) return;
    _ubiVoiceAgentLastClickAt = _nowUbi;
    setPickingMobileMenu(false);

    await enqueueUbiAgentEventFromPicking({
      type: "ubi_online",
      notificationKey: `ubi_call_${_nowUbi}_${Math.random().toString(36).slice(2, 8)}`,
      priority: "high",
      text: "UBI online. Operatore Picking pronto a interagire.",
      audioKey: "ubi_online",
      source: "picking_call_ubi",
    });
    showToast("UBI chiamato", "Richiesta inviata all'agente locale.", 1700);
  } catch (err) {
    console.warn("call UBI local agent", err);
    showToast("UBI non risponde", String(err?.message || err).slice(0, 160), 2600);
  }
}

function ubiSetStatus(text) {
  const el = $("ubiStatusText");
  if (el) el.textContent = text || "";
}
function ubiSetTranscript(text) {
  const el = $("ubiTranscriptText");
  if (el) el.textContent = text || "—";
}
function ubiSetReply(text) {
  const el = $("ubiReplyText");
  if (el) el.textContent = text || "—";
}
function ubiTalkBtn() {
  return $("btnUbiTalk");
}
function ubiTextInput() {
  return $("ubiTextPrompt");
}
function ubiSendBtn() {
  return $("btnUbiSendText");
}

function safeUbiEventKey(v) {
  return (
    String(v || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || "ubi_" + Date.now()
  );
}

async function enqueueUbiAgentEventFromPicking(payload = {}) {
  const api = state.firebase?.api;
  const db = state.firebase?.db;
  if (!api || !db) throw new Error("Firebase non inizializzato");
  if (!state.firebase?.auth?.currentUser) throw new Error("Accesso Firebase non attivo");

  const now = Date.now();
  const type = safeUbiEventKey(payload.type || "ubi_question");
  const key = safeUbiEventKey(
    payload.notificationKey || `${type}_${now}_${Math.random().toString(36).slice(2, 8)}`,
  );
  const ref = api.doc(db, "amzInventoryProducts", CAPANNONE_VOICE_AGENT_DOC_ID, "events", key);
  const user = state.firebase.auth.currentUser || {};
  const text = squashWhitespace(payload.text || payload.question || "");

  await api.setDoc(
    ref,
    {
      status: "pending",
      type,
      notificationKey: key,
      requestId: key,
      forceAnnounce: payload.forceAnnounce !== false,
      priority: payload.priority || "high",
      question: payload.question || text,
      text,
      source: payload.source || "picking_ubi_text",
      byEmail: state.user?.email || state.user?.emailLower || user.email || "",
      byUid: state.user?.uid || user.uid || "",
      clientPage: "picking",
      createdAt: api.serverTimestamp ? api.serverTimestamp() : null,
      createdAtClient: now,
      context: payload.context || {
        pickingView: state.ui?.pickingHomeView || "",
        routeView: state.route?.view || "",
        loc: state.route?.loc || "",
      },
    },
    { merge: true },
  );

  return { ref, key };
}

async function sendUbiTextToCloud(sourceOverride = "picking_ubi_text") {
  const input = ubiTextInput();
  const sendBtn = ubiSendBtn();
  const question = squashWhitespace(input?.value || "");

  if (!question) {
    ubiSetStatus("Scrivi prima una richiesta per UBI.");
    try {
      input?.focus?.({ preventScroll: true });
    } catch (_e) {}
    return;
  }
  if (_ubiSending) return;

  let unsub = null;
  let timer = null;
  try {
    _ubiSending = true;
    if (sendBtn) sendBtn.disabled = true;
    ubiSetTranscript(question);
    ubiSetReply("—");
    ubiSetStatus("Richiesta inviata alla coda UBI…");
    void interruptCapannoneUbiSpeech("new_ubi_text_question");

    const { ref, key } = await enqueueUbiAgentEventFromPicking({
      type: "ubi_question",
      notificationKey: `ubi_question_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      question,
      text: question,
      priority: "high",
      forceAnnounce: true,
      liveAudio: true,
      expectAudioFormat: "mp3",
      source: sourceOverride || "picking_ubi_text",
    });

    ubiSetStatus("UBI sta ragionando sull'agente locale…");
    showToast("UBI", "Richiesta inviata all'agente locale", 1800);

    timer = setTimeout(() => {
      try {
        if (unsub) unsub();
      } catch (_e) {}
      ubiSetStatus("Richiesta inviata. La risposta arriverà nel centro notifiche/capannone.");
      _ubiSending = false;
      if (sendBtn) sendBtn.disabled = false;
    }, 45000);

    unsub = state.firebase.api.onSnapshot(
      ref,
      (snap) => {
        const d = snap.exists() ? snap.data() || {} : {};
        const st = String(d.status || "");
        if (st === "processing") ubiSetStatus("UBI sta preparando la risposta…");
        if (st === "done") {
          const ann =
            d && d.announcement && typeof d.announcement === "object" ? d.announcement : null;
          const answer = squashWhitespace(
            ann?.text || d?.answer || "Risposta inviata al Capannone 3D.",
          );
          ubiSetReply(answer);
          const audioTxt = ann?.audioUrl ? " MP3 live generato." : " Audio in preparazione.";
          ubiSetStatus("Stessa risposta inviata al Capannone 3D." + audioTxt);
          try {
            if (input) input.value = "";
          } catch (_e) {}
          try {
            if (timer) clearTimeout(timer);
          } catch (_e) {}
          try {
            if (unsub) unsub();
          } catch (_e) {}
          _ubiSending = false;
          if (sendBtn) sendBtn.disabled = false;
        } else if (st === "error") {
          const errMsg = squashWhitespace(d.error || "Errore UBI");
          ubiSetStatus("Errore UBI: " + errMsg.slice(0, 160));
          try {
            if (timer) clearTimeout(timer);
          } catch (_e) {}
          try {
            if (unsub) unsub();
          } catch (_e) {}
          _ubiSending = false;
          if (sendBtn) sendBtn.disabled = false;
        }
      },
      (err) => {
        console.warn("UBI event watch", err);
        ubiSetStatus("Richiesta inviata, ma non riesco a seguire lo stato in tempo reale.");
        try {
          if (timer) clearTimeout(timer);
        } catch (_e) {}
        _ubiSending = false;
        if (sendBtn) sendBtn.disabled = false;
      },
    );
  } catch (err) {
    console.warn("UBI text dialog", err);
    const msg = String(err?.message || err || "Errore UBI").slice(0, 180);
    ubiSetStatus("Errore cloud: " + msg);
    showToast("UBI non risponde", msg, 3000);
    try {
      if (timer) clearTimeout(timer);
    } catch (_e) {}
    try {
      if (unsub) unsub();
    } catch (_e) {}
    _ubiSending = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

// Se UBI sta già parlando sul Capannone 3D, quando l'operatore riclicca "Parla"
// mando subito un comando cloud di interruzione. Poi la nuova registrazione continua normalmente.
async function interruptCapannoneUbiSpeech(reason = "new_ubi_talk") {
  try {
    const now = Date.now();
    if (now - _ubiInterruptLastSentAt < 650) return false;
    _ubiInterruptLastSentAt = now;

    const api = state.firebase?.api;
    const db = state.firebase?.db;
    if (!api || !db) return false;

    const ref = api.doc(db, "amzInventoryProducts", CAPANNONE_VOICE_AGENT_DOC_ID);
    const user = state.firebase?.auth?.currentUser || {};
    const byEmail = state.user?.email || state.user?.emailLower || user.email || "";
    const byUid = state.user?.uid || user.uid || "";
    const seq = `${now}-${Math.random().toString(36).slice(2, 8)}`;

    await api.setDoc(
      ref,
      {
        control: {
          interruptSeq: seq,
          interruptAt: api.serverTimestamp ? api.serverTimestamp() : null,
          interruptAtClient: now,
          reason: String(reason || "new_ubi_talk"),
          source: "picking_ubi_talk",
          byEmail,
          byUid,
        },
      },
      { merge: true },
    );

    return true;
  } catch (err) {
    console.warn("UBI interrupt capannone voice", err);
    return false;
  }
}

function openUbiModeFullscreen() {
  try {
    setPickingMobileMenu(false);
    const shell = $("ubiModeFullscreenShell");
    if (!shell) return;
    document.body.classList.add("ubi-mode-active");
    shell.setAttribute("aria-hidden", "false");
    ubiSetStatus("Pronto. Tieni premuto Parla oppure scrivi una richiesta.");
    const btn = $("ubiTextPrompt") || ubiTalkBtn();
    setTimeout(() => {
      try {
        btn?.focus?.({ preventScroll: true });
      } catch (_e) {}
    }, 80);
    try {
      if (shell.requestFullscreen && !document.fullscreenElement) {
        const p = shell.requestFullscreen({ navigationUI: "hide" });
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    } catch (_e) {}
  } catch (err) {
    console.warn("open UBI mode", err);
    showToast("UBI", "Non riesco ad aprire la schermata UBI.", 2200);
  }
}

async function closeUbiModeFullscreen(opts = {}) {
  try {
    await stopUbiRecording({ cancel: true });
  } catch (_e) {}
  const shell = $("ubiModeFullscreenShell");
  if (shell) shell.setAttribute("aria-hidden", "true");
  document.body.classList.remove("ubi-mode-active");
  try {
    if (!opts.skipExitFullscreen && document.fullscreenElement && document.exitFullscreen) {
      const p = document.exitFullscreen();
      if (p && typeof p.catch === "function") await p.catch(() => {});
    }
  } catch (_e) {}
}

function ubiSpeechCtor() {
  try {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  } catch (_e) {
    return null;
  }
}

async function startUbiRecording() {
  try {
    if (_ubiSending || _ubiSpeechRec || _ubiRecorder) return;
    if (!state.firebase?.ok || !state.firebase?.auth?.currentUser) {
      showToast("UBI non disponibile", "Accesso Firebase non ancora attivo.", 2400);
      ubiSetStatus("Accesso Firebase non ancora attivo.");
      return;
    }

    const Ctor = ubiSpeechCtor();
    if (!Ctor) {
      ubiSetStatus("Riconoscimento vocale non supportato da questo browser. Usa il campo testo.");
      showToast("Microfono", "Questo browser non supporta SpeechRecognition.", 2600);
      return;
    }

    void interruptCapannoneUbiSpeech("new_ubi_voice_question");

    _ubiSpeechTranscript = "";
    _ubiSpeechCancelled = false;
    _ubiRecorder = { kind: "speech_recognition" };

    const rec = new Ctor();
    _ubiSpeechRec = rec;
    rec.lang = "it-IT";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    ubiSetTranscript("Sto ascoltando…");
    ubiSetReply("—");
    ubiSetStatus("Sto ascoltando. Rilascia quando hai finito.");

    const btn = ubiTalkBtn();
    if (btn) btn.classList.add("is-recording");

    rec.onresult = (ev) => {
      try {
        let finalText = "";
        let interimText = "";
        for (let i = ev.resultIndex || 0; i < ev.results.length; i++) {
          const res = ev.results[i];
          const txt = squashWhitespace(res?.[0]?.transcript || "");
          if (!txt) continue;
          if (res.isFinal) finalText += " " + txt;
          else interimText += " " + txt;
        }
        finalText = squashWhitespace(finalText);
        interimText = squashWhitespace(interimText);
        if (finalText) {
          _ubiSpeechTranscript = squashWhitespace((_ubiSpeechTranscript || "") + " " + finalText);
        }
        const shown = squashWhitespace(
          [_ubiSpeechTranscript, interimText].filter(Boolean).join(" "),
        );
        if (shown) ubiSetTranscript(shown);
      } catch (err) {
        console.warn("UBI speech result", err);
      }
    };

    rec.onerror = (ev) => {
      try {
        const code = String(ev?.error || "errore_microfono");
        console.warn("UBI speech recognition", ev);
        if (code === "no-speech") ubiSetStatus("Non ho sentito nulla. Tieni premuto e riprova.");
        else if (code === "not-allowed" || code === "service-not-allowed")
          ubiSetStatus("Permesso microfono negato o riconoscimento vocale bloccato dal browser.");
        else ubiSetStatus("Errore riconoscimento vocale: " + code);
      } catch (_e) {}
    };

    rec.onend = () => {
      const btn2 = ubiTalkBtn();
      if (btn2) btn2.classList.remove("is-recording");
      _ubiSpeechRec = null;
      _ubiRecorder = null;
      if (_ubiRecordTimer) {
        clearTimeout(_ubiRecordTimer);
        _ubiRecordTimer = null;
      }

      if (_ubiSpeechCancelled) {
        _ubiSpeechCancelled = false;
        ubiSetStatus("Registrazione annullata.");
        return;
      }

      const question = squashWhitespace(_ubiSpeechTranscript || "");
      _ubiSpeechTranscript = "";
      if (!question) {
        ubiSetStatus("Audio vuoto. Tieni premuto e parla di nuovo.");
        return;
      }

      const input = ubiTextInput();
      if (input) input.value = question;
      ubiSetTranscript(question);
      ubiSetStatus("Trascrizione pronta. Invio a UBI locale…");
      void sendUbiTextToCloud("picking_ubi_voice");
    };

    try {
      rec.start();
    } catch (err) {
      _ubiSpeechRec = null;
      _ubiRecorder = null;
      if (btn) btn.classList.remove("is-recording");
      throw err;
    }

    _ubiRecordTimer = setTimeout(() => {
      stopUbiRecording().catch(() => {});
    }, 14000);
  } catch (err) {
    console.warn("UBI speech start", err);
    _ubiSpeechRec = null;
    _ubiRecorder = null;
    if (_ubiRecordTimer) {
      clearTimeout(_ubiRecordTimer);
      _ubiRecordTimer = null;
    }
    const btn = ubiTalkBtn();
    if (btn) btn.classList.remove("is-recording");
    const msg = String(err?.message || err || "").slice(0, 160);
    ubiSetStatus("Microfono non avviato: " + msg);
    showToast("Microfono", msg || "Permesso microfono negato.", 2600);
  }
}

async function stopUbiRecording(opts = {}) {
  try {
    if (_ubiRecordTimer) {
      clearTimeout(_ubiRecordTimer);
      _ubiRecordTimer = null;
    }
    const btn = ubiTalkBtn();
    if (btn) btn.classList.remove("is-recording");

    if (_ubiSpeechRec) {
      if (opts.cancel) {
        _ubiSpeechCancelled = true;
        try {
          _ubiSpeechRec.abort();
        } catch (_e) {}
      } else {
        ubiSetStatus("Elaboro la trascrizione…");
        try {
          _ubiSpeechRec.stop();
        } catch (_e) {}
      }
      return;
    }

    _ubiRecorder = null;
    try {
      _ubiAudioStream?.getTracks?.().forEach((t) => t.stop());
    } catch (_e) {}
    _ubiAudioStream = null;
  } catch (err) {
    console.warn("UBI speech stop", err);
  }
}

function bindUbiMode() {
  try {
    window.__openUbiVoiceModeFromPicking = (ev) => {
      try {
        ev?.preventDefault?.();
        ev?.stopPropagation?.();
      } catch (_e) {}
      openUbiModeFullscreen();
    };
    window.__callUbiVoiceAgentFromPicking = (ev) => {
      try {
        ev?.preventDefault?.();
        ev?.stopPropagation?.();
      } catch (_e) {}
      openUbiModeFullscreen();
    };

    $("btnPickingCallUbi")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openUbiModeFullscreen();
    });
    $("btnCloseUbiMode")?.addEventListener("click", () => {
      void closeUbiModeFullscreen();
    });
    const talk = ubiTalkBtn();
    if (talk) {
      talk.addEventListener(
        "pointerdown",
        (ev) => {
          ev.preventDefault();
          talk.setPointerCapture?.(ev.pointerId);
          void startUbiRecording();
        },
        { passive: false },
      );
      talk.addEventListener(
        "pointerup",
        (ev) => {
          ev.preventDefault();
          void stopUbiRecording();
        },
        { passive: false },
      );
      talk.addEventListener(
        "pointercancel",
        (ev) => {
          ev.preventDefault();
          void stopUbiRecording({ cancel: true });
        },
        { passive: false },
      );
      talk.addEventListener("lostpointercapture", () => {
        if (_ubiRecorder) void stopUbiRecording();
      });
      talk.addEventListener("contextmenu", (ev) => ev.preventDefault());
      talk.addEventListener("keydown", (ev) => {
        if (ev.code === "Space" || ev.code === "Enter") {
          ev.preventDefault();
          if (!_ubiRecorder) void startUbiRecording();
        }
      });
      talk.addEventListener("keyup", (ev) => {
        if (ev.code === "Space" || ev.code === "Enter") {
          ev.preventDefault();
          void stopUbiRecording();
        }
      });
    }
    const sendText = ubiSendBtn();
    if (sendText) {
      sendText.addEventListener("click", (ev) => {
        ev.preventDefault();
        void sendUbiTextToCloud();
      });
    }
    const textInput = ubiTextInput();
    if (textInput) {
      textInput.addEventListener("keydown", (ev) => {
        if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") {
          ev.preventDefault();
          void sendUbiTextToCloud();
        }
      });
    }
    document.addEventListener("fullscreenchange", () => {
      try {
        const shell = $("ubiModeFullscreenShell");
        if (shell && shell.getAttribute("aria-hidden") === "false" && !document.fullscreenElement) {
          // se l'utente esce dal fullscreen col tasto ESC, tengo comunque la shell aperta a schermo.
          document.body.classList.add("ubi-mode-active");
        }
      } catch (_e) {}
    });
  } catch (err) {
    console.warn("bind UBI mode", err);
  }
}
bindUbiMode();

// auth overlay
function releaseColdBoot() {
  try {
    document.documentElement.classList.remove("bootCold");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  } catch (_e) {}
}

function toggleAuthOverlay(show) {
  const ov = $("authOverlay");
  if (!ov) return;

  const isBusy = !!(
    state.boot?.waitingForData ||
    state.authGateState === "restoring" ||
    state.authGateState === "loading_data" ||
    (!state.firebase.ok && state.authGateState !== "signed_out")
  );

  // Se sto chiudendo dopo lo spinner, tengo la classe spinnerOnly fino a fine fade.
  // Altrimenti per un frame la shell torna alla card di accesso e si vede il riquadro.
  const wasSpinner = ov.classList.contains("spinnerOnly");
  const keepSpinner = show ? isBusy : wasSpinner || isBusy;

  try {
    if (ov.__authCloseTimer) {
      clearTimeout(ov.__authCloseTimer);
      ov.__authCloseTimer = null;
    }
  } catch (_e) {}

  if (keepSpinner) ov.classList.add("spinnerOnly");
  else ov.classList.remove("spinnerOnly");

  ov.classList.toggle("authClosing", !show && keepSpinner);
  ov.setAttribute("aria-hidden", show ? "false" : "true");

  // Rimuovi il cold-boot solo quando il loader DOM è già attivo
  // oppure quando lo stato non è più busy. Così non si vede mai la UI prima dello spinner.
  if (show || !isBusy) {
    releaseColdBoot();
  }

  if (!show) {
    // sicurezza: all'uscita dallo spinner l'avvio non deve lasciare scroll bloccati.
    try {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    } catch (_e) {}

    if (keepSpinner) {
      try {
        ov.__authCloseTimer = setTimeout(() => {
          try {
            if (ov.getAttribute("aria-hidden") === "true") {
              ov.classList.remove("spinnerOnly", "authClosing");
            }
            ov.__authCloseTimer = null;
          } catch (_e) {}
        }, 320);
      } catch (_e) {}
    }
  }

  const sp = $("authOverlaySpinner");
  const btn = $("btnGoogleLoginOverlay");
  const msg = $("authOverlayMessage");
  const title = ov.querySelector?.(".authTitle");
  const foot = ov.querySelector?.(".authFoot");

  // Avvio pulito: nessuna didascalia durante restore/auth/data-load.
  if (title) title.textContent = "";
  if (msg) msg.textContent = "";
  if (foot) foot.textContent = "";

  if (sp) sp.style.display = keepSpinner ? "block" : "none";
  if (btn) btn.style.display = keepSpinner ? "none" : "inline-flex";
}

function isInitialDataReady() {
  try {
    return !!(
      state.user?.isWhitelisted && state.inventory?.[INVENTORY_CANONICAL_LOC]?.meta?.loaded
    );
  } catch (_e) {
    return false;
  }
}

function beginStartupDataGate() {
  try {
    if (!state.boot) state.boot = {};
    state.boot.waitingForData = true;
    state.boot.ready = false;
    state.boot.startedAt = Date.now();
    if (state.boot.readyTimer) {
      clearTimeout(state.boot.readyTimer);
      state.boot.readyTimer = null;
    }
    state.authGateState = "loading_data";
    syncHeaderSub();
    toggleAuthOverlay(true);
  } catch (_e) {}
}

function cancelStartupDataGate() {
  try {
    if (state.boot?.readyTimer) {
      clearTimeout(state.boot.readyTimer);
    }
    if (!state.boot) state.boot = {};
    state.boot.readyTimer = null;
    state.boot.waitingForData = false;
    state.boot.ready = false;
  } catch (_e) {}
}

function checkStartupDataGate(reason = "") {
  try {
    if (!state.boot?.waitingForData) return;
    toggleAuthOverlay(true);
    if (!isInitialDataReady()) return;
    if (state.boot.readyTimer) clearTimeout(state.boot.readyTimer);
    state.boot.readyTimer = setTimeout(() => {
      if (!state.boot?.waitingForData || !isInitialDataReady()) return;
      state.boot.waitingForData = false;
      state.boot.ready = true;
      state.boot.readyTimer = null;
      state.authGateState = "signed_in";
      renderHomeDashboard();
      schedulePickingPreviewCounts(
        "startup_ready",
        pickingHomeView() === "home"
          ? { delay: 500, includeRemote: true, includeFba: true }
          : { delay: 500, inventoryOnly: true },
      );
      syncHeaderSub();
      toggleAuthOverlay(false);
    }, 100);
  } catch (_e) {}
}

function setView() {
  state.route.view = "home";
  state.route.loc = INVENTORY_CANONICAL_LOC;
  $("viewHome")?.classList.add("show");
  document.title = "Picking";
  syncHeaderSub();
  renderHomeDashboard();
}

function prettyLoc(loc) {
  const s = String(loc || "")
    .trim()
    .toLowerCase();
  if (s === "cerea" || s === "concamarise" || s === INVENTORY_CANONICAL_LOC)
    return INVENTORY_SINGLE_AREA_LABEL;
  return "—";
}

function syncHeaderSub() {
  const isAuthed = !!state.user;
  const busy = state.authGateState === "restoring" || state.authGateState === "loading_data";
  const name = isAuthed
    ? state.user.displayName || state.user.email || "Utente"
    : busy
      ? ""
      : "Accesso non attivo";
  const role = isAuthed ? (state.user.isAdmin ? "Amministratore" : "Operatore") : "";
  const status = $("authStatus");
  if (status) status.textContent = name;
  const roleEl = $("authRole");
  if (roleEl) roleEl.textContent = role;
  document.querySelectorAll("[data-account-name]").forEach((el) => {
    el.textContent = role ? `${name} (${role.toLowerCase()})` : name;
  });
  document
    .querySelectorAll("#dotAuth, [data-account-dot]")
    .forEach((el) => el.classList.toggle("ok", isAuthed));
  $("pillAuth")?.classList.toggle("ok", isAuthed);
  const sub = $("brandSub");
  if (sub) sub.textContent = "Magazzino Concamarise";
  const btnLogin = $("btnGoogleLogin");
  if (btnLogin) btnLogin.hidden = isAuthed || busy;
  syncLiveStatus();
}

// --- text helpers ---
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function toSkuId(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}
function parseQty(val) {
  const s = String(val || "")
    .trim()
    .replace(",", ".");
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n); // pezzi
}

// Parser signed "strict" (accetta +/- e spazi). Ritorna intero (arrotondato) o null se invalido/vuoto.
function parseSignedQtyStrict(v) {
  if (v === null || v === undefined) return null;
  const raw0 = String(v);
  const raw = raw0.trim();
  if (!raw) return null;

  // consenti spazi dopo il segno: "- 200" / "+ 200"
  const m = raw.match(/^([+-])?\s*(.*)$/);
  const sign = m && m[1] ? m[1] : "";
  let body = m && m[2] != null ? String(m[2]) : raw;

  // rimuovi spazi interni (es. "2 000")
  body = body.trim().replace(/\s+/g, "");
  if (!body) return null;

  // normalizza formati italiani (migliaia/decimali)
  // es: "2.000" -> "2000", "1.234,56" -> "1234.56"
  if (body.includes(",")) {
    body = body.replace(/\./g, "");
    body = body.replace(",", ".");
  } else {
    if (/^\d{1,3}(?:\.\d{3})+$/.test(body)) body = body.replace(/\./g, "");
    body = body.replace(",", ".");
  }

  // valida formato numerico semplice
  if (!/^\d+(?:\.\d+)?$/.test(body)) return null;

  const n = parseFloat(sign + body);
  if (!Number.isFinite(n)) return null;

  if (!Number.isInteger(n)) return null;
  return n;
}

// --- title/meta helpers (pulizia righe) ---
function parseTitleMeta(rawTitle) {
  const t = squashWhitespace(rawTitle || "");
  if (!t) return { main: "", asin: "", storage: "", skuInTitle: "" };

  // taglia il "titolo pulito" prima di SKU/ASIN/stoccaggio
  let cut = t.length;
  for (const re of [/\bSKU\s*:/i, /\bASIN\s*:/i, /Tipo\s+di\s+stoccaggio/i]) {
    const i = t.search(re);
    if (i > 0) cut = Math.min(cut, i);
  }

  let main = t.slice(0, cut).trim();
  main = main.replace(/[\|\-–•]+\s*$/g, "").trim();
  const _main0 = main;
  main = cleanProductMainName(main);
  if (!main) main = _main0;
  if (!main) main = t;

  const mSku = t.match(/\bSKU\s*:\s*([A-Z0-9][A-Z0-9-]{3,})/i);
  const skuInTitle = mSku ? String(mSku[1] || "").trim() : "";

  const mAsin = t.match(/\bASIN\s*:\s*([A-Z0-9]{10})\b/i);
  const asin = mAsin ? String(mAsin[1] || "").trim() : "";

  let storage = "";
  const mStor = t.match(/Tipo\s+di\s+stoccaggio[^:]*:\s*([^\n\r]+)$/i);
  if (mStor) storage = squashWhitespace(mStor[1]);
  if (!storage) {
    const mStor2 = t.match(/\b(Dimensione\s+standard|Fuori\s+misura)\b/i);
    if (mStor2) storage = squashWhitespace(mStor2[1]);
  }

  return { main, asin, storage, skuInTitle };
}

function normalizeAsin(v) {
  const raw = String(v || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return raw ? raw.slice(0, 10) : "";
}

function readAsinFromDoc(d) {
  try {
    if (!d || typeof d !== "object") return "";
    const direct =
      d.asin ??
      d.ASIN ??
      d.amazonAsin ??
      d.productAsin ??
      d.asinGroupKey ??
      d.skuUnificationAsin ??
      d?.skuUnification?.asin ??
      d?.asinUnification?.asin ??
      "";
    const parsed = direct || parseTitleMeta(d.title || d.name || "").asin || "";
    return normalizeAsin(parsed);
  } catch (_e) {
    return "";
  }
}

function readAsinFromLine(line) {
  try {
    const direct = line?.asin ?? line?.ASIN ?? line?.amazonAsin ?? "";
    const parsed = direct || parseTitleMeta(line?.title || line?.name || "").asin || "";
    return normalizeAsin(parsed);
  } catch (_e) {
    return "";
  }
}

function asinCloudFields(asin, nowClient, who) {
  const a = normalizeAsin(asin || "");
  return {
    asin: a,
    ASIN: a,
    amazonAsin: a,
    asinGroupKey: a,
    skuUnificationAsin: a,
    asinUpdatedAtClient: nowClient || Date.now(),
    asinUpdatedBy: who || "",
  };
}

// --- Flow dedupe (anti-doppio upload) ---

// --- Auto email sotto-scorta (Firestore Trigger Email) ---

// Quantità prenotata da flussi di scarico in attesa picking.
// La giacenza fisica resta in qty; la sotto-scorta lavora sulla disponibilità: qty - reservedQty.
function reservedQtyFromItem(it) {
  try {
    const raw = (it && (it.reservedQty ?? it.pendingPickQty ?? it.reservationQty)) ?? 0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.round(n));
  } catch (_e) {
    return 0;
  }
}

// Aggiornamento ottimistico immediato dopo prenotazione scarico:
// Firestore resta la fonte ufficiale, ma la UI/sottoscorta non aspetta il prossimo snapshot.

// --- Unificazione SKU FBA/FBM (solo cloud) ---
// Permette di trattare SKU diversi dello stesso prodotto come un unico stock logico.
// I dati vengono letti/scritti su Firestore: niente localStorage, niente fallback locale.
function normalizeSkuAliases(value, selfSku = "") {
  const out = [];
  const seen = new Set();
  const push = (v) => {
    const sku = toSkuId(
      v && typeof v === "object" ? v.sku || v.id || v.code || v.alias || v.value || "" : v,
    );
    if (!sku || seen.has(sku)) return;
    seen.add(sku);
    out.push(sku);
  };
  push(selfSku);
  if (Array.isArray(value)) value.forEach(push);
  else
    String(value || "")
      .split(/[\s,;\n\r]+/g)
      .forEach(push);
  return out;
}

function readSkuAliasesFromDoc(d, fallbackSku = "") {
  const sku = toSkuId(fallbackSku || d?.sku || d?.id || "");
  // Match Hub: stale alias arrays cannot merge different ASINs.
  return sku ? buildSkuAliasIndex().members(sku) : [];
}

function readSkuAliasCanonicalFromDoc(d, fallbackSku = "") {
  const base = toSkuId(fallbackSku || d?.sku || d?.id || "");
  const raw =
    d?.canonicalSku ||
    d?.skuGroupCanonical ||
    d?.masterSku ||
    d?.parentSku ||
    d?.aliasOfSku ||
    d?.skuUnification?.canonicalSku ||
    "";
  return toSkuId(raw) || base;
}

function inventoryRuntimeCacheKey(extra = "") {
  try {
    state.cache = state.cache || {};
    const v = Number(state.cache.inventoryRuntimeVersion || 0) || 0;
    return `${v}|${String(extra || "")}`;
  } catch (_e) {
    return `0|${String(extra || "")}`;
  }
}

function invalidateInventoryRuntimeCaches(reason = "") {
  try {
    state.cache = state.cache || {};
    state.cache.inventoryRuntimeVersion =
      (Number(state.cache.inventoryRuntimeVersion || 0) || 0) + 1;
    state.cache.skuAliasIndex = null;
    state.cache.stockRepresentativeItems = null;
    state.cache.rackUsageIndex = null;
    state.cache.rackIdentityCache = null;
    state.cache.rackLocationOptionsHtml = null;
    state.cache.invIndexForMatch = null;
    state.cache.inventoryRuntimeInvalidatedBy = String(reason || "");
  } catch (_e) {}
}

function buildSkuAliasIndex() {
  const cacheKey = inventoryRuntimeCacheKey("sku_alias_index");
  state.cache = state.cache || {};
  if (state.cache.skuAliasIndex?.key === cacheKey) return state.cache.skuAliasIndex.value;
  const parent = new Map();
  const allSkus = new Set();
  const asinGroups = new Map();
  const itemsBySku = new Map();
  const find = (x) => {
    const s = toSkuId(x || "");
    if (!s) return "";
    if (!parent.has(s)) parent.set(s, s);
    let p = parent.get(s);
    if (p !== s) {
      p = find(p);
      parent.set(s, p);
    }
    return p;
  };
  const union = (a, b) => {
    const ra = find(a),
      rb = find(b);
    if (!ra || !rb || ra === rb) return;
    const root = ra.localeCompare(rb) <= 0 ? ra : rb;
    const child = root === ra ? rb : ra;
    parent.set(child, root);
  };

  const addAsinSku = (asin, sku) => {
    const a = normalizeAsin(asin || "");
    const s = toSkuId(sku || "");
    if (!a || !s) return;
    if (!asinGroups.has(a)) asinGroups.set(a, new Set());
    asinGroups.get(a).add(s);
  };

  for (const loc of inventoryLocs()) {
    const items = state.inventory?.[loc]?.items || [];
    for (const it of items) {
      const sku = toSkuId(it?.sku || it?.id || "");
      if (!sku) continue;
      allSkus.add(sku);
      find(sku);
      if (!itemsBySku.has(sku)) itemsBySku.set(sku, it);
      addAsinSku(readAsinFromDoc(it || {}), sku);
    }
  }

  for (const members of asinGroups.values()) {
    const arr = normalizeSkuAliases(Array.from(members)).sort((a, b) => a.localeCompare(b));
    if (arr.length > 1) {
      const first = arr[0];
      arr.forEach((sku) => union(first, sku));
    }
  }

  // L'ASIN è l'unico parent logico. Il canonical interno serve solo a indirizzare
  // lo stock e preferisce il proprietario dichiarato dal cloud; gli alias manuali
  // o gli snapshot legacy non possono più fondere prodotti privi dello stesso ASIN.
  const canonByRoot = new Map();
  for (const members of asinGroups.values()) {
    const arr = normalizeSkuAliases(Array.from(members)).sort((a, b) => a.localeCompare(b));
    if (!arr.length) continue;
    const groupItems = arr.map((sku) => itemsBySku.get(sku)).filter(Boolean);
    const declaredCanonicals = Array.from(
      new Set(
        groupItems
          .map((item) => readSkuAliasCanonicalFromDoc(item || {}, item?.sku || item?.id || ""))
          .filter((candidate) => candidate && arr.includes(candidate)),
      ),
    );
    const safeCanonical = declaredCanonicals.length === 1 ? declaredCanonicals[0] : arr[0];
    const ownerSku = pickingCloudDeclaredStockOwnerSku(groupItems, safeCanonical);
    canonByRoot.set(find(arr[0]), ownerSku && arr.includes(ownerSku) ? ownerSku : safeCanonical);
  }
  for (const sku of allSkus) {
    const root = find(sku);
    if (root && !canonByRoot.has(root)) canonByRoot.set(root, sku);
  }

  const groups = new Map();
  allSkus.forEach((s) => {
    const r = find(s);
    const canonical = canonByRoot.get(r) || r || s;
    if (!groups.has(canonical)) groups.set(canonical, new Set());
    groups.get(canonical).add(s);
  });

  const resolve = (sku) => {
    const s = toSkuId(sku || "");
    if (!s) return "";
    const r = find(s);
    return canonByRoot.get(r) || r || s;
  };
  const members = (sku) => {
    const canonical = resolve(sku);
    const set = groups.get(canonical) || new Set([canonical]);
    const arr = Array.from(set)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return canonical ? [canonical, ...arr.filter((x) => x !== canonical)] : arr;
  };
  const isUnified = (sku) => members(sku).length > 1;
  const value = { resolve, members, isUnified, groups };
  state.cache.skuAliasIndex = { key: cacheKey, value };
  return value;
}

function resolveSkuAlias(sku) {
  return buildSkuAliasIndex().resolve(sku);
}
function skuAliasMembers(sku) {
  return buildSkuAliasIndex().members(sku);
}

function validInventoryLoc(loc) {
  const s = String(loc || "")
    .trim()
    .toLowerCase();
  return (
    s === "unica" ||
    s === INVENTORY_CANONICAL_LOC ||
    normalizeInventoryLoc(s) === INVENTORY_CANONICAL_LOC
  );
}

function inventoryLocs() {
  return [INVENTORY_CANONICAL_LOC];
}

function itemUpdatedMillis(it) {
  try {
    const c = Number(it?.updatedAtClient || it?.lastSeenAtClient || 0);
    if (Number.isFinite(c) && c > 0) return c;
    if (it?.updatedAt?.toMillis) return it.updatedAt.toMillis();
    if (it?.lastSeenAt?.toMillis) return it.lastSeenAt.toMillis();
    return 0;
  } catch (_e) {
    return 0;
  }
}

// Gli SKU unificati vengono letti dalla situazione cloud, senza ricostruire una fotografia
// in base a quantità, date, lotti o presenza di ubicazioni.
function pickingCloudRawDoc(it) {
  return it && typeof it === "object" && it.__raw && typeof it.__raw === "object"
    ? it.__raw
    : it || {};
}

function pickingCloudDeclaredStockOwnerSku(items, canonicalSku = "") {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  const skus = new Set(
    list
      .map((it) => toSkuId(it?.sku || it?.id || pickingCloudRawDoc(it)?.sku || ""))
      .filter(Boolean),
  );
  const declarations = [];

  for (const it of list) {
    const d = pickingCloudRawDoc(it);
    const sourceSku = toSkuId(
      d?.sharedStockSourceSku || d?.authoritativeStockSku || d?.stockOwnerSku || "",
    );
    if (!sourceSku || !skus.has(sourceSku)) continue;
    declarations.push({
      sourceSku,
      revision: Math.max(
        Number(d?.sharedStockRevisionAtClient || 0) || 0,
        Number(d?.stockUpdatedAtClient || 0) || 0,
      ),
    });
  }

  if (declarations.length) {
    const maxRevision = Math.max(...declarations.map((x) => x.revision));
    const latestSources = Array.from(
      new Set(declarations.filter((x) => x.revision === maxRevision).map((x) => x.sourceSku)),
    );
    if (latestSources.length === 1) return latestSources[0];

    const allSources = Array.from(new Set(declarations.map((x) => x.sourceSku)));
    if (allSources.length === 1) return allSources[0];
    return ""; // cloud non coerente: Picking non sceglie al posto del backend
  }

  const canonical = toSkuId(canonicalSku || "");
  if (canonical && skus.has(canonical)) return canonical;
  if (skus.size === 1) return Array.from(skus)[0];
  return "";
}

function buildPickingCloudInventoryItem(groupItems, canonicalSku, aliasIndex) {
  const candidates = Array.isArray(groupItems) ? groupItems.filter(Boolean) : [];
  if (!candidates.length) return null;

  const canonical =
    toSkuId(canonicalSku || "") || toSkuId(candidates[0]?.sku || candidates[0]?.id || "");
  const ownerSku = pickingCloudDeclaredStockOwnerSku(candidates, canonical);
  if (!ownerSku) return null;

  const source = candidates.find((it) => toSkuId(it?.sku || it?.id || "") === ownerSku) || null;
  if (!source) return null;

  const aliases = normalizeSkuAliases(
    [...(aliasIndex?.members?.(canonical) || []), ...candidates.map((x) => x?.sku || x?.id || "")],
    canonical,
  );

  // Quantità, prenotati, lotti e ubicazioni provengono dallo stesso documento cloud autorevole.
  return {
    ...source,
    sku: ownerSku,
    __canonicalSku: canonical || ownerSku,
    __aliasSkus: aliases,
    __stockSourceSku: ownerSku,
    __rackSourceSku: ownerSku,
    __logicalInventoryGroup: true,
    __cloudAuthoritative: true,
  };
}

function stockRepresentativeItemsForLoc(loc) {
  const l = validInventoryLoc(loc) ? loc : "concamarise";
  const __repKey = inventoryRuntimeCacheKey(`stock_rep_${l}`);
  try {
    state.cache = state.cache || {};
    if (!state.cache.stockRepresentativeItems) state.cache.stockRepresentativeItems = new Map();
    const hit = state.cache.stockRepresentativeItems.get(l);
    if (hit && hit.key === __repKey && Array.isArray(hit.value)) return hit.value;
  } catch (_e) {}

  const items = state.inventory?.[l]?.items || [];
  const aliasIndex = buildSkuAliasIndex();
  const groups = new Map();
  for (const it of items) {
    const actualSku = toSkuId(it?.sku || it?.id || "");
    if (!actualSku) continue;
    const canonicalSku = aliasIndex.resolve(actualSku) || actualSku;
    if (!groups.has(canonicalSku)) groups.set(canonicalSku, []);
    groups.get(canonicalSku).push({ ...it, sku: actualSku });
  }

  const value = [];
  for (const [canonicalSku, groupItems] of groups.entries()) {
    const logical = buildPickingCloudInventoryItem(groupItems, canonicalSku, aliasIndex);
    if (logical) {
      value.push(logical);
      continue;
    }

    // Nessuna dichiarazione cloud univoca: mostra i documenti così come sono,
    // senza unire stock o ubicazioni e senza remappare le scritture.
    for (const item of groupItems) {
      const actualSku = toSkuId(item?.sku || item?.id || "");
      if (!actualSku) continue;
      value.push({
        ...item,
        sku: actualSku,
        __canonicalSku: actualSku,
        __aliasSkus: [actualSku],
        __stockSourceSku: actualSku,
        __rackSourceSku: actualSku,
        __cloudGroupUnresolved: true,
      });
    }
  }

  try {
    state.cache = state.cache || {};
    if (!state.cache.stockRepresentativeItems) state.cache.stockRepresentativeItems = new Map();
    state.cache.stockRepresentativeItems.set(l, { key: __repKey, value });
  } catch (_e) {}
  return value;
}

// --- policy sotto-scorta ---
const LOW_STOCK_DEFAULT = 100;
const LOW_STOCK_5KG = 20;
const LOW_STOCK_5KG_SKUS = new Set(["q6-kwh6-owul"]); // esempio: Poltiglia 5kg

// --- Ubicazioni scaffale (WMS): scrittura solo cloud, nessun salvataggio locale ---
const RACK_PALLET_CAPACITY = 480;
const LOCATION_ONLY_MODE = PICKING_CAPABILITIES.rackWrite;

function buildRackLocationOptions() {
  const out = [];
  const addBay = (rack, bay, pallets, levels = 3) => {
    const b = String(bay).padStart(2, "0");
    for (let l = 1; l <= levels; l++) {
      for (let p = 1; p <= pallets; p++) {
        out.push(`${rack}${b}-L${l}-P${p}`);
      }
    }
  };
  // A: A04 da 2 pallet
  for (let bay = 1; bay <= 4; bay++) addBay("A", bay, bay === 4 ? 2 : 3);
  // B: tutte da 3
  for (let bay = 1; bay <= 4; bay++) addBay("B", bay, 3);
  // C: nuova C00 da 3 pallet; C01 resta da 2 pallet
  addBay("C", 0, 3);
  for (let bay = 1; bay <= 4; bay++) addBay("C", bay, bay === 1 ? 2 : 3);
  // D: nuova D05 da 3 pallet; D04 resta da 2 pallet
  for (let bay = 1; bay <= 5; bay++) addBay("D", bay, bay === 4 ? 2 : 3);
  // E: E01/E02 da 3 pallet; nuova E03 da 2 pallet
  for (let bay = 1; bay <= 3; bay++) addBay("E", bay, bay === 3 ? 2 : 3);
  // F: nuova F00 da 2 pallet; F01/F02 restano da 3 pallet
  addBay("F", 0, 2);
  for (let bay = 1; bay <= 2; bay++) addBay("F", bay, 3);
  // G: solo livello L1; G01/G02 da 3 pallet, G03 da 2 pallet
  for (let bay = 1; bay <= 3; bay++) addBay("G", bay, bay === 3 ? 2 : 3, 1);
  return out;
}
const RACK_LOCATION_OPTIONS = buildRackLocationOptions();
const RACK_LOCATION_SET = new Set(RACK_LOCATION_OPTIONS);
const LOT_LEGACY_ID = "LOTTO-STORICO";

function productionLotIdFromTs(ts) {
  const n = Number(ts || Date.now());
  const d = Number.isFinite(n) ? new Date(n) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `LOTTO-${y}${m}${day}`;
}

function normalizeLotId(v, fallbackTs = null) {
  const raw = String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (raw) return raw;
  if (fallbackTs !== null && fallbackTs !== undefined) return productionLotIdFromTs(fallbackTs);
  return "";
}

function lotLabelFromId(lot) {
  const s = normalizeLotId(lot) || LOT_LEGACY_ID;
  if (s === LOT_LEGACY_ID) return "Storico";
  const m = s.match(/(\d{4})(\d{2})(\d{2})$/);
  if (m) return `L-${m[1]}${m[2]}${m[3]}`;
  return s;
}

function lotDateLabelFromId(lot) {
  const s = normalizeLotId(lot) || LOT_LEGACY_ID;
  if (s === LOT_LEGACY_ID) return "storico/pre-lotti";
  const m = s.match(/(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function rawStockLotsFromDoc(d) {
  if (!d || typeof d !== "object") return [];
  if (Array.isArray(d.stockLots)) return d.stockLots;
  if (Array.isArray(d.lots)) return d.lots;
  if (Array.isArray(d.productionLots)) return d.productionLots;
  return [];
}

function readStockLotsFromDoc(d) {
  const totalQty = stockQtyFromDoc(d || {});
  if (totalQty <= 0) return [];

  const map = new Map();
  const raw = rawStockLotsFromDoc(d || {});
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const q0 = x.qty ?? x.quantity ?? x.pieces ?? x.qta ?? 0;
    const qty = Number.isFinite(Number(q0)) ? Math.round(Number(q0)) : parseSignedQtyStrict(q0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const lot =
      normalizeLotId(
        x.lot || x.batch || x.batchId || x.lotto || x.id || "",
        x.createdAtClient || x.producedAtClient || x.dateClient || null,
      ) || LOT_LEGACY_ID;
    const prev = map.get(lot) || {
      lot,
      qty: 0,
      createdAtClient: Number(x.createdAtClient || x.producedAtClient || 0) || 0,
      producedAtClient: Number(x.producedAtClient || x.createdAtClient || 0) || 0,
      source: String(x.source || ""),
    };
    prev.qty += qty;
    if (!prev.createdAtClient && (x.createdAtClient || x.producedAtClient))
      prev.createdAtClient = Number(x.createdAtClient || x.producedAtClient) || 0;
    if (!prev.producedAtClient && (x.producedAtClient || x.createdAtClient))
      prev.producedAtClient = Number(x.producedAtClient || x.createdAtClient) || 0;
    if (!prev.source && x.source) prev.source = String(x.source || "");
    map.set(lot, prev);
  }

  let explicitTotal = Array.from(map.values()).reduce(
    (a, x) => a + (Number.isFinite(Number(x.qty)) ? Number(x.qty) : 0),
    0,
  );
  if (totalQty > explicitTotal) {
    const legacyQty = totalQty - explicitTotal;
    const prev = map.get(LOT_LEGACY_ID) || {
      lot: LOT_LEGACY_ID,
      qty: 0,
      createdAtClient: 0,
      producedAtClient: 0,
      source: "legacy",
    };
    prev.qty += legacyQty;
    map.set(LOT_LEGACY_ID, prev);
  }

  let lots = Array.from(map.values())
    .map((x) => ({
      lot: normalizeLotId(x.lot) || LOT_LEGACY_ID,
      qty: Math.max(0, Math.round(Number(x.qty) || 0)),
      createdAtClient: Number(x.createdAtClient || x.producedAtClient || 0) || 0,
      producedAtClient: Number(x.producedAtClient || x.createdAtClient || 0) || 0,
      source: String(x.source || ""),
    }))
    .filter((x) => x.qty > 0)
    .sort((a, b) => {
      const ta = a.createdAtClient || 0;
      const tb = b.createdAtClient || 0;
      if (ta !== tb) return ta - tb;
      return String(a.lot).localeCompare(String(b.lot));
    });

  // Se i lotti storici/cloud superano la giacenza reale (scarichi non lottizzati),
  // taglio il totale senza creare dati locali: la quantità reale resta sempre quella del documento cloud.
  let running = 0;
  lots = lots
    .map((l) => {
      const allowed = Math.max(0, Math.min(l.qty, totalQty - running));
      running += allowed;
      return { ...l, qty: allowed };
    })
    .filter((l) => l.qty > 0);

  return lots;
}

function stockLotsWithDeltaForWrite(d, lot, delta, tsClient, source = "", refId = "") {
  const lotId = normalizeLotId(lot) || LOT_LEGACY_ID;
  const q = Number.isFinite(Number(delta))
    ? Math.round(Number(delta))
    : parseSignedQtyStrict(delta);
  const map = new Map();
  for (const l of readStockLotsFromDoc(d || {})) {
    map.set(l.lot, { ...l });
  }
  if (Number.isFinite(q) && q !== 0) {
    const base = map.get(lotId) || {
      lot: lotId,
      qty: 0,
      createdAtClient: Number(tsClient || 0) || 0,
      producedAtClient: Number(tsClient || 0) || 0,
      source: String(source || ""),
    };
    base.qty = Math.max(0, Math.round((Number(base.qty) || 0) + q));
    if (!base.createdAtClient && tsClient) base.createdAtClient = Number(tsClient) || 0;
    if (!base.producedAtClient && tsClient) base.producedAtClient = Number(tsClient) || 0;
    if (!base.source && source) base.source = String(source || "");
    if (refId) base.refId = String(refId || "");
    map.set(lotId, base);
  }
  return Array.from(map.values())
    .filter((x) => Number(x.qty) > 0)
    .map((x) => ({
      lot: normalizeLotId(x.lot) || LOT_LEGACY_ID,
      qty: Math.round(Number(x.qty) || 0),
      createdAtClient: Number(x.createdAtClient || x.producedAtClient || 0) || 0,
      producedAtClient: Number(x.producedAtClient || x.createdAtClient || 0) || 0,
      source: String(x.source || ""),
      refId: String(x.refId || ""),
    }));
}

function stockLotQtyFromDoc(d, lot) {
  const lotId = normalizeLotId(lot) || LOT_LEGACY_ID;
  const found = readStockLotsFromDoc(d || {}).find((x) => x.lot === lotId);
  return found ? Math.max(0, Math.round(Number(found.qty) || 0)) : 0;
}

function normalizeRackLocation(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizeRackLocationsList(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[;,\n]+/g);
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const code = normalizeRackLocation(x);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

function isPositiveStockDoc(d) {
  try {
    if (!d || !Object.prototype.hasOwnProperty.call(d, "qty")) return true;
    const q = Number.isFinite(Number(d.qty)) ? Number(d.qty) : parseSignedQtyStrict(d.qty);
    return Number.isFinite(q) && q > 0;
  } catch (_e) {
    return true;
  }
}

function stockQtyFromDoc(d) {
  try {
    const raw = d && Object.prototype.hasOwnProperty.call(d, "qty") ? d.qty : 0;
    const q = Number.isFinite(Number(raw)) ? Math.round(Number(raw)) : parseSignedQtyStrict(raw);
    return Number.isFinite(q) ? q : 0;
  } catch (_e) {
    return 0;
  }
}

function rawRackAllocationsFromDoc(d) {
  return d && Array.isArray(d.rackAllocations) ? d.rackAllocations : [];
}

function normalizeRackAllocationsForWrite(value) {
  const arr = Array.isArray(value) ? value : [];
  const map = new Map();
  for (const x of arr) {
    const code = normalizeRackLocation(
      x && typeof x === "object"
        ? x.code || x.location || x.rackLocation || x.ubicazione || ""
        : "",
    );
    const q0 = x && typeof x === "object" ? (x.qty ?? x.quantity ?? x.pieces ?? x.qta ?? 0) : 0;
    const qty = Number.isFinite(Number(q0)) ? Math.round(Number(q0)) : parseSignedQtyStrict(q0);
    const lot =
      normalizeLotId(
        x && typeof x === "object" ? x.lot || x.batch || x.batchId || x.lotto || "" : "",
      ) || LOT_LEGACY_ID;
    if (!code || !RACK_LOCATION_SET.has(code) || !Number.isFinite(qty) || qty <= 0) continue;
    const key = `${code}::${lot}`;
    const prev = map.get(key) || { code, lot, qty: 0 };
    prev.qty += qty;
    map.set(key, prev);
  }
  return Array.from(map.values()).map((x) => ({
    code: x.code,
    lot: x.lot,
    qty: Math.round(x.qty),
  }));
}

function rackAllocationQtyTotal(allocations) {
  try {
    return (Array.isArray(allocations) ? allocations : []).reduce((sum, x) => {
      const q = Number(x?.qty || 0);
      return sum + (Number.isFinite(q) ? Math.max(0, Math.round(q)) : 0);
    }, 0);
  } catch (_e) {
    return 0;
  }
}

function sortRackAllocationsForConsumption(allocations) {
  return (Array.isArray(allocations) ? allocations : [])
    .map((x) => ({
      code: normalizeRackLocation(x?.code || x?.rackLocation || x?.location || ""),
      lot: normalizeLotId(x?.lot || x?.batch || x?.batchId || x?.lotto || "") || LOT_LEGACY_ID,
      qty: Math.max(0, Math.round(Number(x?.qty || 0) || 0)),
    }))
    .filter((x) => x.code && x.qty > 0)
    .sort((a, b) => {
      const la = String(a.lot || "");
      const lb = String(b.lot || "");
      if (la !== lb) return la.localeCompare(lb);
      return String(a.code || "").localeCompare(String(b.code || ""));
    });
}

function trimRackAllocationsToStockQty(rawAllocations, stockQty) {
  const clean = sortRackAllocationsForConsumption(normalizeRackAllocationsForWrite(rawAllocations));
  const q = Number.isFinite(Number(stockQty)) ? Math.max(0, Math.round(Number(stockQty))) : 0;
  if (q <= 0) return [];
  const total = rackAllocationQtyTotal(clean);
  if (total <= q) return clean;

  // Se Shopify/altro backend ha già scalato qty ma non rackAllocations,
  // scarichiamo virtualmente l'eccedenza dalle ubicazioni in ordine FIFO (lotto/codice),
  // così la quantità mostrata e quella prelevabile non possono restare più alte del cloud.
  let over = total - q;
  const next = [];
  for (const a of clean) {
    if (over > 0) {
      const take = Math.min(a.qty, over);
      const left = a.qty - take;
      over -= take;
      if (left > 0) next.push({ ...a, qty: left });
    } else {
      next.push(a);
    }
  }
  return next.filter((x) => x.qty > 0);
}

function rackAllocationsEqual(a, b) {
  try {
    const aa = sortRackAllocationsForConsumption(a)
      .map((x) => `${x.code}|${x.lot}|${x.qty}`)
      .join(";");
    const bb = sortRackAllocationsForConsumption(b)
      .map((x) => `${x.code}|${x.lot}|${x.qty}`)
      .join(";");
    return aa === bb;
  } catch (_e) {
    return false;
  }
}

function readRackAllocationsFromDoc(d) {
  if (d && !isPositiveStockDoc(d)) return [];
  const q = stockQtyFromDoc(d || {});
  const explicit = trimRackAllocationsToStockQty(rawRackAllocationsFromDoc(d), q);
  if (explicit.length) return explicit;

  // Compatibilità con dati vecchi: se c'erano solo rackLocation/rackLocations,
  // considero il prodotto già completamente ubicato, senza inventare righe residue.
  const raw =
    d && Object.prototype.hasOwnProperty.call(d, "rackLocations")
      ? d.rackLocations
      : d?.rackLocation ||
        d?.shelfLocation ||
        d?.storageSlot ||
        d?.warehouseSlot ||
        d?.ubicazione ||
        "";
  const locs = normalizeRackLocationsList(raw);
  if (!locs.length || q <= 0) return [];
  return locs.map((code, idx) => ({
    code,
    lot: LOT_LEGACY_ID,
    qty: idx === 0 ? q : 0,
    legacy: true,
  }));
}

function readRackLocationsFromDoc(d) {
  if (d && !isPositiveStockDoc(d)) return [];
  const explicit = trimRackAllocationsToStockQty(
    rawRackAllocationsFromDoc(d),
    stockQtyFromDoc(d || {}),
  );
  if (explicit.length) return explicit.map((x) => x.code);
  const raw =
    d && Object.prototype.hasOwnProperty.call(d, "rackLocations")
      ? d.rackLocations
      : d?.rackLocation ||
        d?.shelfLocation ||
        d?.storageSlot ||
        d?.warehouseSlot ||
        d?.ubicazione ||
        "";
  return normalizeRackLocationsList(raw);
}

function readRackLocationFromDoc(d) {
  return readRackLocationsFromDoc(d)[0] || "";
}

function rackAllocatedQtyFromDoc(d) {
  const q = stockQtyFromDoc(d || {});
  if (q <= 0) return 0;
  const explicit = normalizeRackAllocationsForWrite(rawRackAllocationsFromDoc(d));
  if (explicit.length) {
    const total = explicit.reduce(
      (a, x) => a + (Number.isFinite(Number(x.qty)) ? Number(x.qty) : 0),
      0,
    );
    return Math.max(0, Math.min(q, Math.round(total)));
  }
  // Dati legacy: una o più ubicazioni senza quantità = considerato tutto ubicato.
  return readRackLocationsFromDoc(d || {}).length ? q : 0;
}

function rackUnallocatedQtyFromDoc(d) {
  const q = stockQtyFromDoc(d || {});
  if (q <= 0) return 0;
  return Math.max(0, q - rackAllocatedQtyFromDoc(d || {}));
}

function rackAllocatedQtyByLotFromDoc(d, lot) {
  const lotId = normalizeLotId(lot) || LOT_LEGACY_ID;
  const allocations = readRackAllocationsFromDoc(d || {});
  return allocations
    .filter((x) => (normalizeLotId(x.lot) || LOT_LEGACY_ID) === lotId)
    .reduce((a, x) => a + (Number.isFinite(Number(x.qty)) ? Math.round(Number(x.qty)) : 0), 0);
}

function rackUnallocatedQtyByLotFromDoc(d, lot) {
  const lotId = normalizeLotId(lot) || LOT_LEGACY_ID;
  const lotQty = stockLotQtyFromDoc(d || {}, lotId);
  if (lotQty <= 0) return 0;
  return Math.max(0, lotQty - rackAllocatedQtyByLotFromDoc(d || {}, lotId));
}

function getDefaultLotForItem(it) {
  const lots = readStockLotsFromDoc(it || {});
  const unallocated = lots.find((l) => rackUnallocatedQtyByLotFromDoc(it || {}, l.lot) > 0);
  return (unallocated || lots[0] || { lot: LOT_LEGACY_ID }).lot;
}

// Cerea è una posizione temporanea: i suoi pezzi fanno ancora parte del
// residuo da ubicare e non occupano un rack fisico né una seconda giacenza.
function isCereaLocation(code) {
  return normalizeRackLocation(code) === "CEREA";
}

function readCereaAllocationsFromDoc(d) {
  const stock = Number.isFinite(Number(d?.totalQty)) ? { ...d, qty: Number(d.totalQty) } : d || {};
  const raw = Array.isArray(d?.cereaAllocations)
    ? d.cereaAllocations
    : d?.__raw?.cereaAllocations || [];
  const byLot = new Map();
  for (const row of Array.isArray(raw) ? raw : []) {
    const qty = Number(row?.qty);
    const lot = normalizeLotId(row?.lot) || LOT_LEGACY_ID;
    if (!Number.isSafeInteger(qty) || qty <= 0) continue;
    byLot.set(lot, (byLot.get(lot) || 0) + qty);
  }
  return Array.from(byLot, ([lot, qty]) => ({
    code: "CEREA",
    lot,
    qty: Math.min(qty, rackUnallocatedQtyByLotFromDoc(stock, lot)),
  }))
    .filter((row) => row.qty > 0)
    .sort((a, b) => a.lot.localeCompare(b.lot));
}

function cereaQtyFromDoc(d, lot = "") {
  const selectedLot = normalizeLotId(lot);
  return readCereaAllocationsFromDoc(d)
    .filter((row) => !selectedLot || row.lot === selectedLot)
    .reduce((sum, row) => sum + row.qty, 0);
}

function consumeCereaAllocations(d, lot, qty) {
  const selectedLot = normalizeLotId(lot) || LOT_LEGACY_ID;
  return readCereaAllocationsFromDoc(d)
    .map((row) => (row.lot === selectedLot ? { ...row, qty: Math.max(0, row.qty - qty) } : row))
    .filter((row) => row.qty > 0);
}

function cereaBadgeHtml(qty) {
  return Number(qty) > 0
    ? `<span class="tag tag--cerea" title="${escapeHtml(String(qty))} pz in posizione temporanea, ancora da ubicare">A Cerea ${escapeHtml(fmtN(qty))} pz</span>`
    : "";
}

function rackLocationDisplayPartsFromItem(it) {
  const d = it || {};
  const explicit = readRackAllocationsFromDoc(d);
  if (explicit.length) {
    return explicit
      .slice()
      .sort((a, b) => {
        const ca = String(a.code || "");
        const cb = String(b.code || "");
        if (ca !== cb) return ca.localeCompare(cb);
        return String(a.lot || "").localeCompare(String(b.lot || ""));
      })
      .map((x) => {
        const lot = normalizeLotId(x.lot) || LOT_LEGACY_ID;
        const qty = Math.round(Number(x.qty || 0));
        const lotTxt = lot ? ` • ${lotLabelFromId(lot)}` : "";
        return {
          code: String(x.code || ""),
          qty,
          lot,
          lotLabel: lot ? lotLabelFromId(lot) : "",
          text: `${x.code} (${qty} pz${lotTxt})`,
        };
      })
      .filter((x) => x.code);
  }

  return readRackLocationsFromDoc(d).map((code) => ({
    code,
    qty: null,
    lot: "",
    lotLabel: "",
    text: code,
  }));
}

function rackLocationDisplayFromItem(it) {
  const parts = rackLocationDisplayPartsFromItem(it);
  return parts.length ? parts.map((x) => x.text).join(", ") : "—";
}

function rackLocationStackHtml(it) {
  return uiLocList(rackLocationDisplayPartsFromItem(it), { size: "sm", none: "—" });
}

function rackAllocationRowsForDetails(it) {
  return normalizeRackAllocationsForWrite(readRackAllocationsFromDoc(it || {}))
    .filter((x) => x && x.code && Number.isFinite(Number(x.qty)) && Number(x.qty) > 0)
    .map((x) => ({
      code: normalizeRackLocation(x.code),
      lot: normalizeLotId(x.lot) || LOT_LEGACY_ID,
      qty: Math.round(Number(x.qty) || 0),
    }))
    .filter((x) => x.code && x.qty > 0)
    .sort((a, b) => {
      if (a.code !== b.code) return String(a.code).localeCompare(String(b.code));
      return String(a.lot).localeCompare(String(b.lot));
    });
}

function rackAllocationsEditorHtml(it, sku, loc, canEdit) {
  const rows = [
    ...rackAllocationRowsForDetails(it || {}),
    ...readCereaAllocationsFromDoc(it || {}),
  ];
  if (!rows.length)
    return uiEmpty("Nessuna posizione", "Usa Ubica per assegnare un posto sulle scaffalature.");
  return `<div class="rackAllocList">${rows
    .map((x) => {
      const isCerea = isCereaLocation(x.code);
      const attrs = `data-old-code="${escapeHtml(x.code)}" data-lot="${escapeHtml(x.lot)}"`;
      const editor = canEdit
        ? `<details class="rackAllocEdit">
            <summary>${ICON.edit}<span>${isCerea ? "Sposta su scaffale o modifica" : "Sposta o modifica"}</span></summary>
            <div class="rackAllocEditGrid">
              <label class="field"><span class="field-label">Posizione</span>
                <select class="input" data-field="allocRackLocation" ${attrs}>${rackLocationSelectOptions(x.code, sku, loc, { hideEmpty: true, exclude: [] })}</select>
              </label>
              <label class="field field--qty"><span class="field-label">Pezzi</span>
                <input class="input rackAllocQtyInput" inputmode="numeric" data-field="allocQty" ${attrs} value="${escapeHtml(String(x.qty))}" />
              </label>
              <button class="btn btn--ghost btn--sm rackAllocMapBtn" type="button" data-action="pdPickOnMap" ${attrs}>${ICON.map}<span>Scegli sulla mappa</span></button>
              <p class="field-help">I pezzi tolti da questa posizione tornano in Da ubicare.</p>
              <div class="rackAllocBtns">
                <button class="btn btn--ghost btn--danger-text" type="button" data-action="pdDeleteRackAlloc" ${attrs}>Rimuovi</button>
                <button class="btn btn--primary" type="button" data-action="pdSaveRackAlloc" ${attrs}>Salva</button>
              </div>
            </div>
          </details>`
        : "";
      return `
        <div class="rackAllocRow${isCerea ? " is-cerea" : ""}" ${attrs}>
          <div class="rackAllocTop">
            <div class="rackAllocCode">${locationLabelHTML(x.code, { size: "md" })}</div>
            <div class="rackAllocMeta">${escapeHtml(isCerea ? "Temporanea, resta da ubicare" : uiLotText(x.lot))}${isCerea ? `<span>${escapeHtml(uiLotText(x.lot))}</span>` : ""}</div>
            <div class="rackAllocQty"><strong>${escapeHtml(fmtN(x.qty))}</strong> pz</div>
          </div>
          ${editor}
        </div>`;
    })
    .join("")}</div>`;
}

function readRackAllocationEditor(btn) {
  const row = btn?.closest?.(".rackAllocRow");
  if (!row) return null;
  const oldCode = normalizeRackLocation(
    row.getAttribute("data-old-code") || btn.getAttribute("data-old-code") || "",
  );
  const lot =
    normalizeLotId(row.getAttribute("data-lot") || btn.getAttribute("data-lot") || "") ||
    LOT_LEGACY_ID;
  const select = row.querySelector('[data-field="allocRackLocation"]');
  const qtyInput = row.querySelector('[data-field="allocQty"]');
  const newCode = normalizeRackLocation(select?.value || "");
  const newQty = parseSignedQtyStrict(qtyInput?.value || "");
  return { row, oldCode, lot, newCode, newQty };
}

async function saveRackAllocationFromDetails(btn, opts = {}) {
  const loc = state.route.loc;
  const sku = toSkuId(state.ui.productDetailsSku || "");
  const data = readRackAllocationEditor(btn);

  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  if (!(loc === "cerea" || loc === "concamarise") || !sku || !data) {
    showToast("Errore", "Prodotto o ubicazione non valida.", 2200);
    return;
  }
  const { oldCode, lot, newCode } = data;
  let newQty = data.newQty;
  if (!oldCode || !lot) {
    showToast("Errore", "Ubicazione originale non valida.", 2200);
    return;
  }
  if (opts.remove === true) newQty = 0;
  if (!Number.isSafeInteger(newQty) || newQty < 0) {
    showToast(
      "Quantità non valida",
      "Inserisci una quantità intera positiva. Usa Rimuovi per azzerare.",
      2600,
    );
    return;
  }
  if (newQty > 0 && (!newCode || (!RACK_LOCATION_SET.has(newCode) && !isCereaLocation(newCode)))) {
    showToast("Ubicazione non valida", "Scegli una posizione dalla lista.", 2400);
    return;
  }
  if (newQty > 0 && newCode !== oldCode && !isRackLocationUsableForItem(newCode, sku, loc)) {
    const occ = rackLocationOccupantInfo(newCode, sku, loc);
    showToast(
      "Ubicazione occupata",
      occ ? `${newCode} è già occupata da ${occ.sku}.` : "Scegli una posizione libera.",
      2800,
    );
    return;
  }

  const confirmed = await uiConfirm(
    opts.remove === true
      ? {
          title: "Rimuovere questa posizione?",
          tone: "danger",
          lead: locationLabelHTML(oldCode, { size: "lg" }),
          rows: [
            ["SKU", sku],
            ["Lotto", lotLabelFromId(lot)],
          ],
          note: "I pezzi tornano in Da ubicare.",
          confirmLabel: "Rimuovi posizione",
        }
      : {
          title: newCode === oldCode ? "Salvare la nuova quantità?" : "Spostare i pezzi?",
          lead:
            newCode === oldCode
              ? locationLabelHTML(oldCode, { size: "lg" })
              : `${locationLabelHTML(oldCode, { size: "lg" })}<span class="dlg-arrow" aria-label="verso">→</span>${locationLabelHTML(newCode, { size: "lg" })}`,
          rows: [
            ["SKU", sku],
            ["Lotto", lotLabelFromId(lot)],
            ["Pezzi", `${newQty} pz`],
          ],
          confirmLabel: newCode === oldCode ? "Salva" : "Sposta",
        },
  );
  if (!confirmed) return;

  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db) {
    showToast("Errore", "Firebase non inizializzato.", 2200);
    return;
  }

  try {
    const itemRef = api.doc(db, COL_ROOT, loc, SUB_ITEMS, sku);
    const productRef = api.doc(db, COL_PRODUCTS, sku);
    const nowClient = Date.now();
    const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
    let saved = { oldQty: 0, newQty, newCode, remainingQty: 0 };
    let runtimePatch = null;

    await api.runTransaction(db, async (tx) => {
      const snap = await tx.get(itemRef);
      if (!snap.exists()) throw new Error("Prodotto non trovato.");
      const fresh = snap.data() || {};
      const title = squashWhitespace(fresh.title || fresh.name || sku) || sku;
      const allocations = [
        ...normalizeRackAllocationsForWrite(readRackAllocationsFromDoc(fresh)),
        ...readCereaAllocationsFromDoc(fresh),
      ];
      const oldIdx = allocations.findIndex(
        (x) => x.code === oldCode && (normalizeLotId(x.lot) || LOT_LEGACY_ID) === lot,
      );
      if (oldIdx < 0) throw new Error("Ubicazione non trovata o già modificata.");

      const oldAlloc = allocations[oldIdx];
      const oldQty = Math.round(Number(oldAlloc.qty || 0));
      const lotQty =
        stockLotQtyFromDoc(fresh, lot) || (lot === LOT_LEGACY_ID ? stockQtyFromDoc(fresh) : 0);
      if (lotQty <= 0) throw new Error("Lotto senza disponibilità.");

      const otherSameLotQty = allocations
        .filter((x, i) => i !== oldIdx && (normalizeLotId(x.lot) || LOT_LEGACY_ID) === lot)
        .reduce((a, x) => a + Math.round(Number(x.qty || 0)), 0);

      if (newQty > Math.max(0, lotQty - otherSameLotQty)) {
        throw new Error(
          `Quantità massima disponibile per questo lotto: ${Math.max(0, lotQty - otherSameLotQty)} pz.`,
        );
      }
      // Se la nuova posizione è già usata dallo stesso SKU, la normalizzazione cloud somma
      // le quantità sullo stesso code+lot invece di bloccare l'operatore.
      const nextAllocationsRaw = allocations.filter((_, i) => i !== oldIdx);
      // Il trasferimento parziale da/a Cerea lascia il resto nella posizione
      // di partenza; la modifica della quantità nella stessa posizione resta esplicita.
      if (
        newQty > 0 &&
        newQty < oldQty &&
        newCode !== oldCode &&
        (isCereaLocation(oldCode) || isCereaLocation(newCode))
      ) {
        nextAllocationsRaw.push({ ...oldAlloc, qty: oldQty - newQty });
      }
      if (newQty > 0) {
        nextAllocationsRaw.push({
          code: newCode,
          lot,
          qty: newQty,
          movementId: "",
          movementKey: "",
          updatedAtClient: nowClient,
        });
      }
      const nextAllocations = normalizeRackAllocationsForWrite(nextAllocationsRaw);
      const cleanLocations = normalizeRackLocationsList(nextAllocations.map((x) => x.code));
      const cleanLocation = cleanLocations[0] || "";
      const nextCereaAllocations = readCereaAllocationsFromDoc({
        ...fresh,
        rackAllocations: nextAllocations,
        rackLocations: cleanLocations,
        rackLocation: cleanLocation,
        cereaAllocations: nextAllocationsRaw.filter((row) => isCereaLocation(row.code)),
      });
      const remainingQty = Math.max(
        0,
        lotQty -
          nextAllocations
            .filter((x) => (normalizeLotId(x.lot) || LOT_LEGACY_ID) === lot)
            .reduce((a, x) => a + Math.round(Number(x.qty || 0)), 0),
      );

      tx.set(
        itemRef,
        {
          sku,
          title,
          titleNorm: normalizeText(title || sku),
          rackLocation: cleanLocation,
          rackLocations: cleanLocations,
          rackAllocations: nextAllocations,
          cereaAllocations: nextCereaAllocations,
          lastRackMovementLot: lot,
          updatedAt: api.serverTimestamp(),
          updatedAtClient: nowClient,
          updatedBy: who,
          location: loc,
        },
        { merge: true },
      );

      tx.set(
        productRef,
        {
          sku,
          title,
          titleNorm: normalizeText(title || sku),
          rackLocation: cleanLocation,
          rackLocations: cleanLocations,
          rackAllocations: nextAllocations,
          cereaAllocations: nextCereaAllocations,
          lastRackMovementLot: lot,
          lastSeenAt: api.serverTimestamp(),
          lastSeenAtClient: nowClient,
          lastSeenBy: who,
          lastSeenLocation: loc,
          lastSeenKind: "location_allocation_edit",
        },
        { merge: true },
      );

      addProductMovementToBatch(tx, api, db, sku, {
        type: "ubicazione_modifica",
        qtySigned: 0,
        deltaSigned: 0,
        assignedQty: newQty,
        beforeAllocatedQty: oldQty,
        afterAllocatedQty: newQty,
        remainingQty,
        fromWarehouse: loc,
        toWarehouse: loc,
        location: loc,
        source: "ubicazione",
        note:
          newQty > 0
            ? `Modifica ubicazione ${oldCode} → ${newCode} • ${oldQty}→${newQty} pz`
            : `Rimozione ubicazione ${oldCode} • ${oldQty} pz tornano da ubicare`,
        oldRackLocation: oldCode,
        rackLocation: newQty > 0 ? newCode : "",
        rackLocations: cleanLocations,
        lot,
        lotLabel: lotLabelFromId(lot),
        deleteLocked: true,
        locked: true,
        createdAtClient: nowClient,
      });

      saved = { oldQty, newQty, newCode, remainingQty };
      runtimePatch = {
        sku,
        title,
        qty: stockQtyFromDoc(fresh),
        stockLots: readStockLotsFromDoc(fresh),
        rackAllocations: nextAllocations,
        rackLocations: cleanLocations,
        rackLocation: cleanLocation,
        cereaAllocations: nextCereaAllocations,
        updatedAtClient: nowClient,
        updatedBy: who,
        location: loc,
      };
      runtimePatch.__raw = { ...fresh, ...runtimePatch };
    });

    if (runtimePatch) patchRuntimeInventoryItem(loc, sku, runtimePatch);
    await syncRackLocationGroupCloud(
      sku,
      loc,
      opts.remove === true ? "rack_allocation_remove" : "rack_allocation_edit",
    );

    showToast(
      opts.remove === true ? "Ubicazione rimossa" : "Ubicazione aggiornata",
      opts.remove === true
        ? `${oldCode} rimosso • ${saved.oldQty} pz tornano da ubicare.`
        : `${oldCode} → ${newCode} • ${saved.newQty} pz`,
      2600,
    );
    state.ui.productDetailsEditMode = true;
    renderProductDetailsSheet();
    renderHomeDashboard();
  } catch (err) {
    console.error("save rack allocation", err);
    showToast("Errore ubicazione", String(err?.message || err).slice(0, 240), 3200);
  }
}

function rackAllocationCloudNormalizePlan(item) {
  try {
    const d = item || {};
    const raw = normalizeRackAllocationsForWrite(rawRackAllocationsFromDoc(d));
    if (!raw.length) return null;
    const qty = stockQtyFromDoc(d || {});
    const clean = trimRackAllocationsToStockQty(raw, qty);
    if (rackAllocationsEqual(raw, clean)) return null;
    const sku = toSkuId(d.sku || d.id || "");
    if (!sku) return null;
    const cleanLocations = normalizeRackLocationsList(clean.map((x) => x.code));
    return { sku, docId: String(d.id || sku), qty, raw, clean, cleanLocations };
  } catch (_e) {
    return null;
  }
}

function scheduleRackAllocationsCloudNormalize(loc, reason = "rack_allocations_normalize") {
  try {
    if (!(loc === "cerea" || loc === "concamarise")) return;
    if (!state.user?.isAdmin || !state.user?.isWhitelisted) return;
    const api = state.firebase?.api;
    const db = state.firebase?.db;
    if (!api || !db || !api.writeBatch || !api.doc) return;

    const root = state.__rackAllocNormalize || (state.__rackAllocNormalize = {});
    const slot = root[loc] || (root[loc] = { timer: null, running: false, lastAt: 0 });
    const now = Date.now();
    if (slot.running) return;
    if (slot.lastAt && now - slot.lastAt < 1800) return;
    if (slot.timer) clearTimeout(slot.timer);

    slot.timer = setTimeout(async () => {
      slot.timer = null;
      if (slot.running) return;
      slot.running = true;
      try {
        const items = state.inventory?.[loc]?.items || [];
        const plans = stockRepresentativeItemsForLoc(loc)
          .map(rackAllocationCloudNormalizePlan)
          .filter(Boolean)
          .slice(0, 120);
        if (!plans.length) {
          slot.lastAt = Date.now();
          return;
        }

        const who = state.user?.emailLower || state.user?.email || state.user?.uid || "";
        const chunks = [];
        for (let i = 0; i < plans.length; i += 180) chunks.push(plans.slice(i, i + 180));
        for (const chunk of chunks) {
          const batch = api.writeBatch(db);
          const ts = Date.now();
          for (const p of chunk) {
            const patch = {
              rackAllocations: p.clean,
              rackLocations: p.cleanLocations,
              rackLocation: p.cleanLocations[0] || "",
              rackAllocationNormalizedAt: api.serverTimestamp(),
              rackAllocationNormalizedAtClient: ts,
              rackAllocationNormalizedBy: who,
              rackAllocationNormalizeReason: String(reason || "rack_allocations_normalize"),
              lastShopifyEffectivePickNormalize: String(reason || "")
                .toLowerCase()
                .includes("shopify"),
              location: loc,
              updatedAt: api.serverTimestamp(),
              updatedAtClient: ts,
              updatedBy: who,
            };
            batch.set(api.doc(db, COL_ROOT, loc, SUB_ITEMS, p.docId), patch, { merge: true });
            batch.set(
              api.doc(db, COL_PRODUCTS, p.sku),
              {
                sku: p.sku,
                ...patch,
                lastSeenAt: api.serverTimestamp(),
                lastSeenAtClient: ts,
                lastSeenBy: who,
                lastSeenLocation: loc,
                lastSeenKind: "rack_allocations_cloud_normalize",
              },
              { merge: true },
            );
          }
          await batch.commit();
        }
        slot.lastAt = Date.now();
      } catch (err) {
        console.warn("rack allocations cloud normalize", loc, err);
      } finally {
        slot.running = false;
      }
    }, 650);
  } catch (err) {
    console.warn("schedule rack allocation normalize", loc, err);
  }
}

// --- Sincronizzazione ubicazioni per SKU collegati / stesso ASIN ---
// Picking è l'unico writer delle posizioni fisiche. Hub sincronizza stock e prenotati,
// ma non deve mai scegliere o propagare rack positivi.
const __rackSkuGroupSyncState = { timer: null, running: false, lastAt: 0, reason: "" };

function rackGroupSnapshotFromDoc(d) {
  const qty = stockQtyFromDoc(d || {});
  const allocations =
    qty > 0 ? normalizeRackAllocationsForWrite(readRackAllocationsFromDoc(d || {})) : [];
  const locations =
    qty > 0
      ? normalizeRackLocationsList([
          ...readRackLocationsFromDoc(d || {}),
          ...allocations.map((x) => x.code),
        ])
      : [];
  return {
    rackLocation: locations[0] || "",
    rackLocations: locations,
    rackAllocations: allocations,
  };
}

function rackGroupComparable(d) {
  try {
    return JSON.stringify(rackGroupSnapshotFromDoc(d || {}));
  } catch (_e) {
    return "";
  }
}

function rackGroupRevisionInfo(d) {
  const raw = d?.__raw || d || {};
  const explicitKeys = [
    "rackRevisionAtClient",
    "rackUpdatedAtClient",
    "lastRackMutationAtClient",
    "rackAllocationNormalizedAtClient",
    "lastPickingAtClient",
    "lastPickingRollbackAtClient",
  ];
  const vals = explicitKeys
    .map((k) => Number(raw?.[k] || 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  const explicit = vals.length ? Math.max(...vals) : 0;
  const generic = Number(raw?.updatedAtClient || 0) || 0;
  return { explicit, generic };
}

function rackGroupInformationScore(d) {
  try {
    const snap = rackGroupSnapshotFromDoc(d || {});
    const allocated = (snap.rackAllocations || []).reduce(
      (a, x) => a + Math.max(0, Math.round(Number(x?.qty || 0) || 0)),
      0,
    );
    return (
      allocated * 1000 +
      (snap.rackAllocations?.length || 0) * 20 +
      (snap.rackLocations?.length || 0)
    );
  } catch (_e) {
    return 0;
  }
}

function pickRackGroupSource(items, preferredSku = "") {
  const pref = toSkuId(preferredSku || "");
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (pref) {
    const direct = list.find((x) => toSkuId(x?.sku || x?.id || x?.data?.sku || "") === pref);
    if (direct) return direct;
  }
  let best = null;
  for (const item of list) {
    if (!best) {
      best = item;
      continue;
    }
    const a = rackGroupRevisionInfo(item?.data || item);
    const b = rackGroupRevisionInfo(best?.data || best);
    if (a.explicit !== b.explicit) {
      if (a.explicit > b.explicit) best = item;
      continue;
    }
    const ai = rackGroupInformationScore(item?.data || item);
    const bi = rackGroupInformationScore(best?.data || best);
    if (ai !== bi) {
      if (ai > bi) best = item;
      continue;
    }
    if (a.generic !== b.generic) {
      if (a.generic > b.generic) best = item;
      continue;
    }
    const as = toSkuId(item?.sku || item?.id || item?.data?.sku || "");
    const bs = toSkuId(best?.sku || best?.id || best?.data?.sku || "");
    if (as.localeCompare(bs) < 0) best = item;
  }
  return best;
}

async function syncRackLocationGroupCloud(
  sourceSku,
  loc = INVENTORY_CANONICAL_LOC,
  reason = "rack_group_sync",
  opts = {},
) {
  if (!PICKING_CAPABILITIES.rackWrite) return { updated: 0, found: 0 };
  if (!state.user?.isWhitelisted || !state.firebase?.ok) return { updated: 0, found: 0 };
  const api = state.firebase?.api;
  const db = state.firebase?.db;
  if (!api || !db || !api.getDoc || !api.writeBatch) return { updated: 0, found: 0 };

  const requestedSku = toSkuId(sourceSku || "");
  if (!requestedSku) return { updated: 0, found: 0 };
  const targetLoc = normalizeInventoryLoc(loc) || INVENTORY_CANONICAL_LOC;
  const members = Array.from(new Set(skuAliasMembers(requestedSku).map(toSkuId).filter(Boolean)));
  if (!members.includes(requestedSku)) members.unshift(requestedSku);
  if (members.length < 2) return { updated: 0, found: 1 };

  const docs = (
    await Promise.all(
      members.map(async (sku) => {
        try {
          const ref = api.doc(db, COL_ROOT, targetLoc, SUB_ITEMS, sku);
          const snap = await api.getDoc(ref);
          return snap.exists() ? { sku, ref, data: snap.data() || {} } : null;
        } catch (_e) {
          return null;
        }
      }),
    )
  ).filter(Boolean);
  if (docs.length < 2) return { updated: 0, found: docs.length };

  const source = pickRackGroupSource(docs, opts?.preferSource === false ? "" : requestedSku);
  if (!source) return { updated: 0, found: docs.length };
  const snapshot = rackGroupSnapshotFromDoc(source.data || {});
  const comparable = JSON.stringify(snapshot);
  const canonical = resolveSkuAlias(requestedSku) || requestedSku;
  const aliases = Array.from(new Set(members)).sort((a, b) => a.localeCompare(b));
  const nowClient = Date.now();
  const sourceRev = rackGroupRevisionInfo(source.data || {});
  const revision = Math.max(sourceRev.explicit || 0, nowClient);
  const who = state.user?.emailLower || state.user?.email || state.user?.uid || "";
  const pending = docs.filter((x) => {
    const xRevision = rackGroupRevisionInfo(x.data || {}).explicit || 0;
    return (
      rackGroupComparable(x.data || {}) !== comparable ||
      toSkuId(x.data?.rackGroupCanonicalSku || "") !== canonical ||
      xRevision < revision
    );
  });
  if (!pending.length) return { updated: 0, found: docs.length, sourceSku: source.sku };

  let updated = 0;
  for (let i = 0; i < pending.length; i += 180) {
    const batch = api.writeBatch(db);
    for (const x of pending.slice(i, i + 180)) {
      batch.set(
        x.ref,
        {
          ...snapshot,
          rackRevisionAtClient: revision,
          rackUpdatedAt: api.serverTimestamp(),
          rackUpdatedAtClient: revision,
          rackUpdatedBy: who,
          rackMutationReason: String(reason || "rack_group_sync"),
          rackGroupCanonicalSku: canonical,
          rackGroupAliases: aliases,
          rackSyncSourceSku: source.sku,
          rackSyncedAt: api.serverTimestamp(),
          rackSyncedAtClient: nowClient,
          rackSyncedBy: who,
          rackSyncVersion: 1,
        },
        { merge: true },
      );
      batch.set(
        api.doc(db, COL_PRODUCTS, x.sku),
        {
          sku: x.sku,
          ...snapshot,
          rackRevisionAtClient: revision,
          rackUpdatedAt: api.serverTimestamp(),
          rackUpdatedAtClient: revision,
          rackUpdatedBy: who,
          rackMutationReason: String(reason || "rack_group_sync"),
          rackGroupCanonicalSku: canonical,
          rackGroupAliases: aliases,
          rackSyncSourceSku: source.sku,
          lastSeenAt: api.serverTimestamp(),
          lastSeenAtClient: nowClient,
          lastSeenBy: who,
          lastSeenLocation: targetLoc,
          lastSeenKind: "rack_group_sync",
        },
        { merge: true },
      );
      updated++;
    }
    await batch.commit();
  }
  invalidateInventoryRuntimeCaches("rack_group_cloud_sync");
  return { updated, found: docs.length, sourceSku: source.sku };
}

async function runRackSkuGroupCloudSync(reason = "inventory_snapshot") {
  return { updated: 0, skipped: true, reason: String(reason || "inventory_snapshot") };
}

function scheduleRackSkuGroupCloudSync(reason = "inventory_snapshot", opts = {}) {
  // Nessuna propagazione automatica da snapshot: la sorgente rack è certa solo
  // durante un'azione esplicita dell'operatore (assegna/modifica/rimuovi/trasferisci).
  return;
}

function rackSkuAliasSetForCompare(sku, doc = null) {
  const out = new Set();
  const push = (v) => {
    const s = toSkuId(v || "");
    if (s) out.add(s);
  };
  const base = toSkuId(sku || doc?.sku || doc?.id || "");
  push(base);
  try {
    const idx = buildSkuAliasIndex();
    push(idx.resolve(base));
    idx.members(base).forEach(push);
  } catch (_e) {
    try {
      push(resolveSkuAlias(base));
    } catch (_e2) {}
    try {
      skuAliasMembers(base).forEach(push);
    } catch (_e3) {}
  }
  try {
    readSkuAliasesFromDoc(doc || {}, base).forEach(push);
  } catch (_e) {}
  try {
    push(readSkuAliasCanonicalFromDoc(doc || {}, base));
  } catch (_e) {}
  return out;
}

function rackFindDocsForSkuCompare(currentSku = "", currentLoc = "") {
  const curSku = toSkuId(currentSku || "");
  const out = [];
  const seen = new Set();
  const locs = [];
  const addLoc = (loc) => {
    const l = normalizeInventoryLoc(loc) || loc;
    if (l && !locs.includes(l)) locs.push(l);
  };
  addLoc(currentLoc);
  try {
    INVENTORY_ALL_CLOUD_LOCS.forEach(addLoc);
  } catch (_e) {}
  try {
    inventoryLocs().forEach(addLoc);
  } catch (_e) {}
  for (const loc of locs) {
    const items = state.inventory?.[loc]?.items || [];
    for (const it of items) {
      const itemSku = toSkuId(it?.sku || it?.id || "");
      if (!itemSku || !curSku) continue;
      if (itemSku !== curSku) continue;
      const key = `${loc}::${itemSku}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ loc, it });
    }
  }
  return out;
}

function getRackLocationUsageIndex() {
  const __rackKey = inventoryRuntimeCacheKey("rack_usage_index");
  try {
    state.cache = state.cache || {};
    const hit = state.cache.rackUsageIndex;
    if (hit && hit.key === __rackKey && hit.value) return hit.value;
  } catch (_e) {}

  const byCode = new Map();
  const skuToAsins = new Map();
  const asinToSkus = new Map();
  const allItems = [];
  const aliasIndex = buildSkuAliasIndex();
  const locs = [];
  const addLoc = (loc) => {
    const l = normalizeInventoryLoc(loc) || loc;
    if (l && !locs.includes(l)) locs.push(l);
  };
  try {
    INVENTORY_ALL_CLOUD_LOCS.forEach(addLoc);
  } catch (_e) {}
  try {
    inventoryLocs().forEach(addLoc);
  } catch (_e) {}

  const addAsin = (sku, asin) => {
    const s = toSkuId(sku || "");
    const a = normalizeAsin(asin || "");
    if (!s || !a) return;
    if (!skuToAsins.has(s)) skuToAsins.set(s, new Set());
    skuToAsins.get(s).add(a);
    if (!asinToSkus.has(a)) asinToSkus.set(a, new Set());
    asinToSkus.get(a).add(s);
  };

  for (const loc of locs) {
    const items = state.inventory?.[loc]?.items || [];
    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      const sku = toSkuId(it.sku || it.id || "");
      if (!sku) continue;
      const asin = readAsinFromDoc(it || {});
      addAsin(sku, asin);
      allItems.push({ loc, it, sku, asin });
    }
  }

  const membersForSku = (sku, doc = null) => {
    const set = new Set();
    const push = (v) => {
      const s = toSkuId(v || "");
      if (s) set.add(s);
    };
    const s = toSkuId(sku || doc?.sku || doc?.id || "");
    push(s);
    try {
      push(aliasIndex.resolve(s));
    } catch (_e) {}
    try {
      aliasIndex.members(s).forEach(push);
    } catch (_e) {}
    try {
      readSkuAliasesFromDoc(doc || {}, s).forEach(push);
    } catch (_e) {}
    try {
      push(readSkuAliasCanonicalFromDoc(doc || {}, s));
    } catch (_e) {}
    return set;
  };

  const addOccupant = (code, occ) => {
    const c = normalizeRackLocation(code || "");
    if (!c) return;
    if (!byCode.has(c)) byCode.set(c, []);
    byCode.get(c).push(occ);
  };

  for (const row of allItems) {
    const { loc, it, sku, asin } = row;
    if (!isPositiveStockDoc(it || {})) continue;
    const locations = readRackLocationsFromDoc(it || {});
    if (!locations.length) continue;

    const members = membersForSku(sku, it || {});
    if (asin && asinToSkus.has(asin)) {
      for (const sameSku of asinToSkus.get(asin)) {
        members.add(sameSku);
        try {
          aliasIndex.members(sameSku).forEach((x) => members.add(x));
        } catch (_e) {}
      }
    }

    const occ = {
      sku,
      loc,
      title: it?.title || "",
      asin: asin || "",
      members,
      item: it,
    };
    for (const code of locations) addOccupant(code, occ);
  }

  const value = { byCode, skuToAsins, asinToSkus, builtAtClient: Date.now(), key: __rackKey };
  try {
    state.cache = state.cache || {};
    state.cache.rackUsageIndex = { key: __rackKey, value };
  } catch (_e) {}
  return value;
}

function rackCurrentSkuIdentity(currentSku = "", currentLoc = "", idx = null) {
  const cacheKey = `${inventoryRuntimeCacheKey("rack_identity")}::${toSkuId(currentSku || "")}::${String(currentLoc || "")}`;
  try {
    state.cache = state.cache || {};
    if (!state.cache.rackIdentityCache) state.cache.rackIdentityCache = new Map();
    const hit = state.cache.rackIdentityCache.get(cacheKey);
    if (hit) return hit;
  } catch (_e) {}

  const index = idx || getRackLocationUsageIndex();
  const aliasIndex = buildSkuAliasIndex();
  const members = new Set();
  const asins = new Set();
  const pushSku = (v) => {
    const s = toSkuId(v || "");
    if (s) members.add(s);
  };
  const pushAsin = (v) => {
    const a = normalizeAsin(v || "");
    if (a) asins.add(a);
  };
  const base = toSkuId(currentSku || "");
  pushSku(base);
  try {
    pushSku(aliasIndex.resolve(base));
  } catch (_e) {}
  try {
    aliasIndex.members(base).forEach(pushSku);
  } catch (_e) {}

  for (const s of Array.from(members)) {
    const skuAsins = index.skuToAsins?.get?.(s);
    if (skuAsins) skuAsins.forEach(pushAsin);
    try {
      for (const doc of rackFindDocsForSkuCompare(s, currentLoc))
        pushAsin(readAsinFromDoc(doc.it || {}));
    } catch (_e) {}
  }
  for (const a of Array.from(asins)) {
    const skuSet = index.asinToSkus?.get?.(a);
    if (skuSet) {
      for (const s of skuSet) {
        pushSku(s);
        try {
          aliasIndex.members(s).forEach(pushSku);
        } catch (_e) {}
      }
    }
  }

  const value = { members, asins };
  try {
    state.cache = state.cache || {};
    if (!state.cache.rackIdentityCache) state.cache.rackIdentityCache = new Map();
    state.cache.rackIdentityCache.set(cacheKey, value);
  } catch (_e) {}
  return value;
}

function rackOccupantMatchesCurrentSku(occ, currentSku = "", currentLoc = "", idx = null) {
  try {
    const curSku = toSkuId(currentSku || "");
    const occSku = toSkuId(occ?.sku || "");
    if (!curSku || !occSku) return false;
    if (curSku === occSku) return true;
    const index = idx || getRackLocationUsageIndex();
    const identity = rackCurrentSkuIdentity(curSku, currentLoc, index);
    if (identity.members?.has?.(occSku)) return true;
    const occMembers =
      occ?.members instanceof Set
        ? occ.members
        : rackSkuAliasSetForCompare(occSku, occ?.item || null);
    for (const s of occMembers) {
      if (identity.members.has(s)) return true;
    }
    const occAsin = normalizeAsin(occ?.asin || readAsinFromDoc(occ?.item || {}) || "");
    if (occAsin && identity.asins.has(occAsin)) return true;
    return false;
  } catch (_e) {
    return false;
  }
}

function rackLocationUseInfo(code, currentSku = "", currentLoc = "") {
  const target = normalizeRackLocation(code);
  if (!target) return { same: false, occupiedBy: null };
  const idx = getRackLocationUsageIndex();
  const list = idx.byCode?.get?.(target) || [];
  let same = false;
  for (const occ of list) {
    if (rackOccupantMatchesCurrentSku(occ, currentSku, currentLoc, idx)) {
      same = true;
      continue;
    }
    return { same, occupiedBy: { sku: occ.sku, loc: occ.loc, title: occ.title || "" } };
  }
  return { same, occupiedBy: null };
}

function rackLocationIsUsedBySameLogicalSku(code, currentSku = "", currentLoc = "") {
  const target = normalizeRackLocation(code);
  if (!target || !toSkuId(currentSku || "")) return false;
  if (!RACK_LOCATION_SET.has(target)) return false;
  const info = rackLocationUseInfo(target, currentSku, currentLoc);
  return !!(info.same && !info.occupiedBy);
}

function rackLocationOccupantInfo(code, currentSku = "", currentLoc = "") {
  const target = normalizeRackLocation(code);
  if (!target) return null;
  const info = rackLocationUseInfo(target, currentSku, currentLoc);
  return info.occupiedBy || null;
}

function isRackLocationAvailableForItem(code, currentSku = "", currentLoc = "") {
  const s = normalizeRackLocation(code);
  if (!s) return true;
  if (isCereaLocation(s)) return true;
  if (!RACK_LOCATION_SET.has(s)) return false;
  return !rackLocationUseInfo(s, currentSku, currentLoc).occupiedBy;
}

function isRackLocationUsableForItem(code, currentSku = "", currentLoc = "") {
  const s = normalizeRackLocation(code);
  if (!s) return true;
  if (isCereaLocation(s)) return true;
  if (!RACK_LOCATION_SET.has(s)) return false;
  return !rackLocationUseInfo(s, currentSku, currentLoc).occupiedBy;
}

function rackLocationSelectOptions(selected, currentSku = "", currentLoc = "", opts = {}) {
  const selectedList = normalizeRackLocationsList(selected);
  const excludedList = normalizeRackLocationsList(opts && opts.exclude ? opts.exclude : []);
  const selectedSet = new Set(selectedList);
  const excludedSet = new Set(excludedList);
  const groups = ["A", "B", "C", "D", "E", "F", "G"];
  const isMultiple = !!(opts && opts.multiple);
  const hideEmpty = !!(opts && opts.hideEmpty);
  const __optionsKey = inventoryRuntimeCacheKey(
    `rack_options|${toSkuId(currentSku || "")}|${String(currentLoc || "")}|${selectedList.join(",")}|${excludedList.join(",")}|${isMultiple ? "m" : "s"}|${hideEmpty ? "h" : "n"}`,
  );
  try {
    state.cache = state.cache || {};
    if (!state.cache.rackLocationOptionsHtml) state.cache.rackLocationOptionsHtml = new Map();
    const hit = state.cache.rackLocationOptionsHtml.get(__optionsKey);
    if (typeof hit === "string") return hit;
  } catch (_e) {}
  const out = [];

  if (!isMultiple) {
    if (hideEmpty) {
      out.push(
        `<option value=""${selectedSet.size ? "" : " selected"} disabled>Scegli ubicazione</option>`,
      );
    } else {
      out.push(`<option value=""${selectedSet.size ? "" : " selected"}>Non assegnata</option>`);
    }
  }

  let visibleCount = 0;

  for (const g of groups) {
    const codes = RACK_LOCATION_OPTIONS.filter((x) => x.startsWith(g)).filter(
      (code) =>
        selectedSet.has(code) ||
        (!excludedSet.has(code) && isRackLocationUsableForItem(code, currentSku, currentLoc)),
    );

    if (!codes.length) continue;
    out.push(`<optgroup label="Scaffalatura ${escapeHtml(g)}">`);
    for (const code of codes) {
      visibleCount++;
      out.push(
        `<option value="${escapeHtml(code)}"${selectedSet.has(code) ? " selected" : ""}>${escapeHtml(code)}</option>`,
      );
    }
    out.push(`</optgroup>`);
  }

  // Sempre in fondo ai rack e condivisibile fra SKU diversi.
  if (!excludedSet.has("CEREA") || selectedSet.has("CEREA")) {
    out.push(
      `<optgroup label="Posizione temporanea"><option value="CEREA"${selectedSet.has("CEREA") ? " selected" : ""}>Cerea</option></optgroup>`,
    );
    visibleCount++;
  }
  const invalidSelected = Array.from(selectedSet).filter(
    (code) => !RACK_LOCATION_SET.has(code) && !isCereaLocation(code),
  );
  if (invalidSelected.length) {
    out.push(`<optgroup label="Attuale non in lista">`);
    for (const code of invalidSelected) {
      out.push(`<option value="${escapeHtml(code)}" selected>${escapeHtml(code)}</option>`);
    }
    out.push(`</optgroup>`);
  } else if (!visibleCount && !isMultiple) {
    out.push(`<option value="" disabled>Nessuna ubicazione libera</option>`);
  } else if (!visibleCount && isMultiple) {
    out.push(`<option value="" disabled>Nessuna ubicazione libera</option>`);
  }

  const html = out.join("");
  try {
    state.cache = state.cache || {};
    if (!state.cache.rackLocationOptionsHtml) state.cache.rackLocationOptionsHtml = new Map();
    state.cache.rackLocationOptionsHtml.set(__optionsKey, html);
  } catch (_e) {}
  return html;
}

function rackLocationPickerHtml(selected, currentSku = "", currentLoc = "", opts = {}) {
  const selectedList = normalizeRackLocationsList(selected);
  const multiple = !!(opts && opts.multiple);
  const disabled = !!(opts && opts.disabled);
  const disabledAttr = disabled ? " disabled" : "";
  const multipleAttr = multiple ? ' multiple size="8"' : "";
  const fieldName = multiple ? "rackLocations" : "rackLocation";

  return `
        <select class="input" data-field="${fieldName}"${multipleAttr}${disabledAttr}>
          ${rackLocationSelectOptions(selectedList, currentSku, currentLoc, opts)}
        </select>
      `;
}

function readRackPickerSelection(root) {
  const wrap = root || document;
  const choices = Array.from(
    wrap.querySelectorAll?.('[data-field="rackLocationChoice"]:checked') || [],
  );
  return normalizeRackLocationsList(choices.map((x) => x.value));
}

function updateRackPickerSummary(picker) {
  try {
    if (!picker) return;
    const valueEl = picker.querySelector?.("[data-rack-picker-value]");
    if (!valueEl) return;
    const list = readRackPickerSelection(picker);
    const label = list.length ? list.join(", ") : "—";
    valueEl.textContent = label;
    valueEl.classList.toggle("empty", !list.length);
  } catch (_e) {}
}

// calcola sotto-scorta globale (inventario unico)

// trigger email dopo aggiornamenti reali: locali + realtime Firestore (anche da altri hub), NON all'accesso
let __lowMailSeq = 0;
let __lowMailT1 = null;
let __lowMailT2 = null;

let __lowStockRealtimeReady = false;
let __lowStockRealtimeKey = "";
let __lowStockRealtimeTimer = null;

// --- Firestore paths ---
const COL_META = "amzInventoryMeta";
const DOC_SHOPIFY_FBM_SYNC = "shopifyFbmSync";
const COL_SHOPIFY_FBM_ORDERS = "shopifyFbmOrders";

const COL_ROOT = "amzInventory";
const SUB_ITEMS = "items";
const SUB_LOGS = "logs";
const COL_PRODUCTS = "amzInventoryProducts"; // anagrafica prodotti (globale)
const SUB_MOVES = "movements"; // storico movimenti per prodotto

// Inventario Amazon unico (cloud).
// Canonico operativo: un solo inventario.
// Ponte legacy minimo: legge eventuali scritture pre-patch su Cerea e le fonde nel canonico, poi azzera il legacy.
const INVENTORY_CANONICAL_LOC = "concamarise";
const INVENTORY_LEGACY_SOURCE_LOCS = [];
const INVENTORY_ALL_CLOUD_LOCS = [INVENTORY_CANONICAL_LOC];
const INVENTORY_SINGLE_AREA_LABEL = "Inventario unico";

// Tabellone WRITE: stessa coda usata da tabellone_write.html
const TW_WRITE_LINE_BUCKET = "linea_liquidi";
const TW_WRITE_QUEUE_META_COL = "meta";
const TW_WRITE_QUEUE_META_DOC = "queueState";
const TW_WRITE_AMZ_TARGET_LOC = INVENTORY_CANONICAL_LOC;
const TW_WRITE_ORDER_KEY_LEN = 16;
const TW_WRITE_ORDER_BASE = 36n;
const TW_WRITE_ORDER_STEP = 2821109907456n; // 36^8
const TW_WRITE_ORDER_MAX = TW_WRITE_ORDER_BASE ** BigInt(TW_WRITE_ORDER_KEY_LEN) - 1n;

function sanitizeFirestoreDocId(v, maxLen = 900) {
  const input = String(v || "").trim();
  if (!input) return "";
  const out = [];
  for (const ch of Array.from(input)) {
    const code = ch.charCodeAt(0);
    if (
      ch === "/" ||
      ch === "\\" ||
      ch === "?" ||
      ch === "#" ||
      ch === "[" ||
      ch === "]" ||
      ch === "*" ||
      code < 32 ||
      code === 127
    ) {
      out.push("_");
    } else {
      out.push(ch);
    }
  }
  return out.join("").slice(0, maxLen);
}

function addProductMovementToBatch(batch, api, db, sku, data = {}) {
  const s = toSkuId(sku || data?.sku || "");
  if (!batch || !api || !db) throw new Error("Movimenti: Firestore non inizializzato.");
  if (!s) throw new Error("Movimenti: SKU mancante.");

  const nowClient =
    data && typeof data.createdAtClient === "number" ? data.createdAtClient : Date.now();
  const q = Number(data?.qtySigned ?? data?.deltaSigned ?? 0);
  const qtySigned = Number.isFinite(q) ? Math.round(q) : 0;

  const payload = Object.assign({}, data || {});
  payload.sku = s;
  payload.type = payload.type || "rettifica";
  payload.qtySigned = qtySigned;
  payload.deltaSigned = Number.isFinite(Number(payload.deltaSigned))
    ? Math.round(Number(payload.deltaSigned))
    : qtySigned;
  payload.createdAt = api.serverTimestamp();
  payload.createdAtClient = nowClient;
  payload.createdByUid = payload.createdByUid || state.user?.uid || "";
  payload.createdByEmail =
    payload.createdByEmail || state.user?.email || state.user?.emailLower || "";

  const requestedKey = sanitizeFirestoreDocId(
    payload.movementKey || payload.movementId || payload.writeKey || "",
    900,
  );
  const movesCol = api.collection(db, COL_PRODUCTS, s, SUB_MOVES);
  const moveRef = requestedKey ? api.doc(movesCol, requestedKey) : api.doc(movesCol);
  const movementKey = requestedKey || moveRef.id;
  payload.movementId = movementKey;
  payload.movementKey = movementKey;
  payload.writeKey = String(payload.writeKey || movementKey || "");
  batch.set(moveRef, payload);
  return movementKey;
}

// --- PDF workflow parsing ---

// --- Firebase init ---
async function initFirebase() {
  try {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js"),
    ]);

    const app = initializeApp(firebaseConfig);
    const auth = authMod.getAuth(app);

    // iOS/PWA (standalone): popup spesso instabile → preferisci redirect
    const __UA = navigator.userAgent || "";
    const __IS_APPLE_MOBILE =
      /iPad|iPhone|iPod/.test(__UA) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const __IS_STANDALONE =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      navigator.standalone === true;
    const __FORCE_REDIRECT = __IS_APPLE_MOBILE || __IS_STANDALONE;

    async function setBestAuthPersistence() {
      // Deve essere identica a Index: browserLocalPersistence prima.
      // Così, se accedi da Picking, tornando su Index la stessa sessione Firebase viene letta subito.
      const candidates = [
        authMod.browserLocalPersistence,
        authMod.indexedDBLocalPersistence,
      ].filter(Boolean);

      for (const p of candidates) {
        try {
          await authMod.setPersistence(auth, p);
          return true;
        } catch (_e) {}
      }
      return false;
    }
    try {
      await setBestAuthPersistence();
    } catch (_e) {}

    const db = fsMod.getFirestore(app);

    state.firebase = {
      ok: true,
      app,
      auth,
      db,
      authApi: authMod,
      api: {
        collection: fsMod.collection,
        collectionGroup: fsMod.collectionGroup,
        doc: fsMod.doc,
        addDoc: fsMod.addDoc,
        getDoc: fsMod.getDoc,
        getDocFromServer: fsMod.getDocFromServer,
        getDocs: fsMod.getDocs,
        getDocsFromServer: fsMod.getDocsFromServer,
        setDoc: fsMod.setDoc,
        updateDoc: fsMod.updateDoc,
        serverTimestamp: fsMod.serverTimestamp,
        query: fsMod.query,
        where: fsMod.where,
        orderBy: fsMod.orderBy,
        limit: fsMod.limit,
        onSnapshot: fsMod.onSnapshot,
        deleteDoc: fsMod.deleteDoc,
        writeBatch: fsMod.writeBatch,
        increment: fsMod.increment,
        arrayUnion: fsMod.arrayUnion,
        runTransaction: fsMod.runTransaction,
      },
    };

    // Google Sign-In
    const googleProvider = new authMod.GoogleAuthProvider();
    try {
      googleProvider.setCustomParameters({ prompt: "select_account" });
    } catch (_e) {}

    async function signInWithGoogle() {
      try {
        state.authGateState = "restoring";
        state.authGateMessage = "";
        syncHeaderSub();
        toggleAuthOverlay(true);

        try {
          await setBestAuthPersistence();
        } catch (_e) {}
        try {
          googleProvider.setCustomParameters({ prompt: "select_account" });
        } catch (_e) {}

        if (__FORCE_REDIRECT) {
          await authMod.signInWithRedirect(auth, googleProvider);
          return;
        }

        try {
          await authMod.signInWithPopup(auth, googleProvider);
          return;
        } catch (err) {
          const code = String(err?.code || "");
          const msg = String(err?.message || "").toLowerCase();
          const popupIssue = code.includes("popup") || msg.includes("popup");
          const notSupported =
            code.includes("operation-not-supported-in-this-environment") ||
            code.includes("web-storage-unsupported");
          if (popupIssue || notSupported) {
            await authMod.signInWithRedirect(auth, googleProvider);
            return;
          }
          throw err;
        }
      } catch (err) {
        console.warn("google login", err);
        state.authGateState = "signed_out";
        state.authGateMessage = "Accesso non riuscito. Riprova.";
        syncHeaderSub();
        toggleAuthOverlay(true);
        showToast("Accesso non riuscito", err?.message || String(err));
      }
    }

    $("btnGoogleLogin")?.addEventListener("click", () => signInWithGoogle());
    $("btnGoogleLoginOverlay")?.addEventListener("click", () => signInWithGoogle());

    // handle redirect result best-effort
    try {
      await authMod.getRedirectResult(auth);
    } catch (_e) {}

    // auth state
    // Nessun marker locale: Firebase Auth gestisce solo la sessione; dati app sempre cloud.
    function __readSignedOnce() {
      return true;
    }
    function __markSignedOnce() {}

    state.authGateState = "restoring";
    state.authGateMessage = "";
    const __hadSession = __readSignedOnce();
    toggleAuthOverlay(__hadSession);
    syncHeaderSub();

    let __authNullTimer = null;

    authMod.onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (__authNullTimer) {
          clearTimeout(__authNullTimer);
          __authNullTimer = null;
        }

        state.user = {
          uid: user.uid,
          email: user.email || "",
          emailLower: (user.email || "").toLowerCase(),
          displayName: user.displayName || user.email || "Utente",
          isAdmin: false,
          isUser: false,
          role: "",
          roles: [],
          isWhitelisted: null,
        };
        state.authGateState = "signed_in";
        state.authGateMessage = "";
        await resolveUserRole(user);
        syncPickingMailAuth();
        syncHeaderSub();

        if (state.user.isWhitelisted) {
          beginStartupDataGate();
          startAllRealtime();
          setView("home");
          checkStartupDataGate("auth_ready");
          const mailView = new URLSearchParams(location.search).get("picking");
          if (mailView === "fba" || mailView === "fbm")
            setPickingHomeView(mailView === "fba" ? "pickingFba" : "pickingFbm");
        } else {
          cancelStartupDataGate();
          stopAllRealtime();
          setView("home");
          toggleAuthOverlay(false);
          showToast("Account non abilitato", "Contatta l’admin per l’accesso a questo hub.");
        }
        __markSignedOnce();
        return;
      }

      const finalizeSignedOut = () => {
        state.user = null;
        syncPickingMailAuth();
        cancelStartupDataGate();
        stopAllRealtime();
        state.authGateState = "signed_out";
        state.authGateMessage = "";
        syncHeaderSub();
        toggleAuthOverlay(true);
        setView("home");
      };

      if (state.authGateState === "restoring") {
        if (__authNullTimer) clearTimeout(__authNullTimer);
        __authNullTimer = setTimeout(finalizeSignedOut, 1200);
      } else {
        finalizeSignedOut();
      }
    });
  } catch (err) {
    console.error("Firebase init error", err);
    showToast("Errore Firebase", err?.message || String(err));
    state.firebase.ok = false;
    state.authGateState = "signed_out";
    state.authGateMessage = "Errore inizializzazione. Ricarica la pagina.";
    toggleAuthOverlay(true);
    syncHeaderSub();
  }
}

async function resolveUserRole(authUser) {
  try {
    if (!state.firebase.ok) return;
    const api = state.firebase.api;
    const db = state.firebase.db;
    const emailLower = (authUser?.email || "").toLowerCase();

    let isAdmin = !!(emailLower && ADMIN_EMAILS.includes(emailLower));
    let isUser = false;
    let isWhitelisted = false;
    let resolvedRole = "";
    let resolvedRoles = [];

    const readRoles = (d = {}) => {
      const role = String(d.role || d.userRole || d.type || "")
        .trim()
        .toLowerCase();
      const roles = Array.isArray(d.roles)
        ? d.roles
            .map((x) =>
              String(x || "")
                .trim()
                .toLowerCase(),
            )
            .filter(Boolean)
        : [];
      if (role && !roles.includes(role)) roles.push(role);
      return { role, roles };
    };
    const hasAnyRole = (roles, wanted) => wanted.some((r) => roles.includes(r));

    // whitelist dedicata: amzInventoryDirectory/{emailLower} + fallback payrollDirectory/{emailLower}
    const dirs = ["amzInventoryDirectory", "payrollDirectory"];
    for (const col of dirs) {
      if (!emailLower) continue;
      try {
        const snap = await api.getDoc(api.doc(db, col, emailLower));
        if (snap?.exists()) {
          const d = snap.data() || {};
          const enabled = d.enabled !== false && d.disabled !== true;
          const rr = readRoles(d);
          if (enabled) {
            isWhitelisted = true;
            if (rr.role) resolvedRole = rr.role;
            resolvedRoles = Array.from(new Set([...resolvedRoles, ...rr.roles]));
            if (hasAnyRole(rr.roles, ["user", "operatore", "operator", "picking", "warehouse"])) {
              isUser = true;
            }
            if (
              hasAnyRole(rr.roles, ["admin", "administrator"]) ||
              d.isAdmin === true ||
              d.admin === true
            ) {
              isAdmin = true;
            }
            break;
          }
        }
      } catch (_e) {}
    }

    // utenti generali: powderUsers/{uid} oppure powderUsers/{emailLower}
    // Ruolo user/operator/picking = accesso a Picking; admin mantiene i permessi avanzati.
    const ids = [authUser?.uid, emailLower].filter(Boolean);
    for (const id of ids) {
      try {
        const puSnap = await api.getDoc(api.doc(db, "powderUsers", id));
        if (puSnap?.exists()) {
          const d = puSnap.data() || {};
          const enabled = d.enabled !== false && d.disabled !== true;
          const rr = readRoles(d);
          if (enabled) {
            if (rr.role) resolvedRole = rr.role;
            resolvedRoles = Array.from(new Set([...resolvedRoles, ...rr.roles]));

            const adminByRole =
              hasAnyRole(rr.roles, ["admin", "administrator"]) ||
              d.isAdmin === true ||
              d.admin === true;
            const userByRole =
              hasAnyRole(rr.roles, ["user", "operatore", "operator", "picking", "warehouse"]) ||
              d.isUser === true ||
              d.user === true;

            if (adminByRole) isAdmin = true;
            if (userByRole) isUser = true;
            // Qualsiasi utente abilitato ha accesso al Picking (whitelist),
            // i permessi avanzati restano legati al ruolo admin.
            isWhitelisted = true;
          }
          break;
        }
      } catch (_e) {}
    }

    if (state.user) {
      state.user.isAdmin = !!isAdmin;
      state.user.isUser = !!isUser;
      state.user.role = resolvedRole || (isAdmin ? "admin" : isUser ? "user" : "");
      state.user.roles = Array.from(new Set(resolvedRoles));
      state.user.isWhitelisted = !!(isWhitelisted || isAdmin || isUser);
    }
  } catch (err) {
    console.warn("resolveUserRole", err);
  }
}

function canUsePickingActions() {
  return !!(
    state.user?.isWhitelisted ||
    state.user?.isAdmin ||
    state.user?.isUser ||
    state.user?.role === "user" ||
    (Array.isArray(state.user?.roles) && state.user.roles.includes("user"))
  );
}

function pickingActionKey(parts) {
  try {
    return (Array.isArray(parts) ? parts : [parts]).map((x) => String(x || "")).join(":");
  } catch (_e) {
    return String(parts || "picking");
  }
}

async function withPickingActionLock(key, btn, fn) {
  const k = pickingActionKey(key || "picking");
  if (!state.actionLocks) state.actionLocks = new Set();
  if (state.actionLocks.has(k)) {
    showToast("Operazione in corso", "Attendi la conferma cloud prima di ripremere.", 1400);
    return null;
  }
  state.actionLocks.add(k);
  const hadBtn = !!btn;
  const oldDisabled = hadBtn ? !!btn.disabled : false;
  if (hadBtn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    console.error("picking action", k, err);
    showToast("Errore picking", String(err?.message || err).slice(0, 240), 3200);
    return null;
  } finally {
    state.actionLocks.delete(k);
    if (hadBtn && document.contains(btn)) btn.disabled = oldDisabled;
  }
}

// --- realtime inventory watchers ---
function startAllRealtime() {
  startRealtimeFor(INVENTORY_CANONICAL_LOC);
  startShopifyFbmSyncMetaWatch();
}

function stopAllRealtime() {
  cancelStartupDataGate();
  resetPickingPreviewCounts();
  try {
    if (__rackSkuGroupSyncState.timer) clearTimeout(__rackSkuGroupSyncState.timer);
  } catch (_e) {}
  __rackSkuGroupSyncState.timer = null;
  __rackSkuGroupSyncState.running = false;
  const inv = state.inventory?.[INVENTORY_CANONICAL_LOC];
  try {
    inv?.unsub?.();
  } catch (_e) {}
  if (inv) {
    inv.unsub = null;
    inv.items = [];
    inv.meta = { count: 0, lastUpdatedAt: null, loaded: false };
  }
  stopAllLogs();
  stopShopifyFbmSyncMetaWatch();
  resetShopifyActiveOrdersState();
  if (state.shopifySync) {
    state.shopifySync.meta = null;
    state.shopifySync.error = "";
    state.shopifySync.busy = false;
  }
  renderHomeDashboard();
  if (state.ui.sheet === "productDetails") renderProductDetailsSheet();
}

function startRealtimeFor(loc) {
  loc = INVENTORY_CANONICAL_LOC;
  if (!state.firebase.ok || !state.user?.isWhitelisted) return;
  const inv = state.inventory[loc];
  if (inv.unsub) return;
  const api = state.firebase.api,
    db = state.firebase.db;
  const q = api.query(
    api.collection(db, COL_ROOT, loc, SUB_ITEMS),
    api.orderBy("sku"),
    api.limit(2000),
  );
  inv.unsub = api.onSnapshot(
    q,
    (snap) => {
      const arr = [];
      let last = 0;
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        const sku = toSkuId(d.sku || docSnap.id),
          qty = stockQtyFromDoc(d),
          title = d.title || d.name || sku;
        const reserved = Number.isFinite(Number(d.reservedQty))
          ? Math.max(0, Math.round(Number(d.reservedQty)))
          : 0;
        const updatedAt = d.updatedAt || null,
          updatedAtClient = Number(d.updatedAtClient || 0) || 0;
        arr.push({
          __raw: d,
          id: docSnap.id,
          sku,
          title,
          titleNorm: d.titleNorm || normalizeText(title || sku),
          qty,
          reservedQty: reserved,
          pendingPickQty: Number.isFinite(Number(d.pendingPickQty))
            ? Math.max(0, Math.round(Number(d.pendingPickQty)))
            : reserved,
          availableQty: Math.round(qty - reserved),
          reservationStatus: d.reservationStatus || "",
          lastReservationFlowId: d.lastReservationFlowId || "",
          lastReservationSource: d.lastReservationSource || d.reservationSource || "",
          lastReservationOrderId: d.lastReservationOrderId || d.shopifyOrderId || d.orderId || "",
          lastReservationOrderName:
            d.lastReservationOrderName || d.shopifyOrderName || d.orderName || "",
          lastReservationCustomerName:
            d.lastReservationCustomerName ||
            d.shopifyCustomerName ||
            d.customerName ||
            d.customerDisplayName ||
            d.cliente ||
            "",
          shopifyCustomerName: d.shopifyCustomerName || d.customerName || "",
          customerName: d.customerName || d.cliente || "",
          customerEmail: d.customerEmail || d.shopifyCustomerEmail || "",
          pendingOrders: Array.isArray(d.pendingOrders) ? d.pendingOrders : [],
          pendingOrderLines: Array.isArray(d.pendingOrderLines) ? d.pendingOrderLines : [],
          shopifyPendingOrders: Array.isArray(d.shopifyPendingOrders) ? d.shopifyPendingOrders : [],
          shopifyOrders: Array.isArray(d.shopifyOrders) ? d.shopifyOrders : [],
          reservationOrders: Array.isArray(d.reservationOrders) ? d.reservationOrders : [],
          orderLines: Array.isArray(d.orderLines) ? d.orderLines : [],
          shopifyOrderLines: Array.isArray(d.shopifyOrderLines) ? d.shopifyOrderLines : [],
          shopifyOrder:
            d.shopifyOrder && typeof d.shopifyOrder === "object" ? d.shopifyOrder : null,
          lastReservationOrder:
            d.lastReservationOrder && typeof d.lastReservationOrder === "object"
              ? d.lastReservationOrder
              : null,
          generatedFromShopifyFbm: d.generatedFromShopifyFbm === true,
          firstSeenSource: d.firstSeenSource || "",
          rackLocations: readRackLocationsFromDoc(d),
          rackAllocations: readRackAllocationsFromDoc(d),
          rackLocation: readRackLocationFromDoc(d),
          stockLots: readStockLotsFromDoc(d),
          cereaAllocations: readCereaAllocationsFromDoc(d),
          lastProductionLot: d.lastProductionLot || "",
          lastProductionAtClient: d.lastProductionAtClient || null,
          asin: d.asin || d.ASIN || d.amazonAsin || "",
          ASIN: d.ASIN || d.asin || d.amazonAsin || "",
          amazonAsin: d.amazonAsin || d.asin || d.ASIN || "",
          canonicalSku:
            d.canonicalSku ||
            d.skuGroupCanonical ||
            d.masterSku ||
            d.parentSku ||
            d.aliasOfSku ||
            "",
          skuGroupCanonical: d.skuGroupCanonical || d.canonicalSku || "",
          skuAliases: Array.isArray(d.skuAliases) ? d.skuAliases : [],
          aliasSkus: Array.isArray(d.aliasSkus) ? d.aliasSkus : [],
          linkedSkus: Array.isArray(d.linkedSkus) ? d.linkedSkus : [],
          unifiedSkus: Array.isArray(d.unifiedSkus) ? d.unifiedSkus : [],
          fbaFbmSkus: Array.isArray(d.fbaFbmSkus) ? d.fbaFbmSkus : [],
          skuUnification: d.skuUnification || null,
          note: d.note || d.notes || "",
          updatedAt,
          updatedAtClient,
          location: loc,
        });
        const t = updatedAt?.toMillis?.() || updatedAtClient || 0;
        if (t > last) last = t;
      });
      inv.items = arr;
      invalidateInventoryRuntimeCaches("inventory_runtime_change");
      inv.meta = {
        count: arr.length,
        lastUpdatedAt: last ? new Date(last) : null,
        loaded: true,
        fromCache: !!snap.metadata?.fromCache,
      };
      renderHomeDashboard();
      if (state.ui.sheet === "productDetails") renderProductDetailsSheet();
      // Lo snapshot realtime è solo lettura: non normalizza né propaga ubicazioni.
      // Le scritture rack avvengono esclusivamente dopo un'azione esplicita dell'operatore.
      updateFbmPreviewFromInventory("inventory_snapshot");
      checkStartupDataGate("inventory_snapshot");
    },
    (err) => {
      inv.meta.error = String(err?.message || err);
      refreshPickingHomeOverview();
      console.warn("inventory watch error", err);
      showToast("Permessi insufficienti", err?.message || String(err));
    },
  );
}

// --- Inventario unico: fusione cloud dei vecchi rami sede ---
const __unifiedInventoryMergeState = { timer: null, running: false, lastAt: 0, touched: new Set() };

// --- realtime flows (logs) ---

// --- Shopify FBM sync meta watch (ultimo controllo scheduler) ---
function startShopifyFbmSyncMetaWatch() {
  try {
    if (!state.firebase.ok || !state.user?.isWhitelisted) return;
    if (state.shopifySync?.unsub) return;

    const api = state.firebase.api;
    const db = state.firebase.db;
    const ref = api.doc(db, COL_META, DOC_SHOPIFY_FBM_SYNC);

    state.shopifySync.unsub = api.onSnapshot(
      ref,
      (snap) => {
        state.shopifySync.meta = snap.exists() ? snap.data() || null : null;
        state.shopifySync.error = "";
        if (state.route.view === "home") renderHomePickingBox();
      },
      (err) => {
        state.shopifySync.meta = null;
        state.shopifySync.error = err?.message || String(err || "Errore sync Shopify");
        if (state.route.view === "home") renderHomePickingBox();
      },
    );
  } catch (err) {
    try {
      state.shopifySync.meta = null;
      state.shopifySync.error = err?.message || String(err || "Errore sync Shopify");
    } catch (_e) {}
  }
}

function stopShopifyFbmSyncMetaWatch() {
  try {
    state.shopifySync?.unsub && state.shopifySync.unsub();
  } catch (_e) {}
  try {
    if (state.shopifySync) {
      state.shopifySync.unsub = null;
      state.shopifySync.meta = null;
      state.shopifySync.error = "";
    }
  } catch (_e) {}
}

// --- low-stock email meta watch (log ultimo invio) ---

function stopAllLogs() {
  for (const loc of INVENTORY_ALL_CLOUD_LOCS) {
    try {
      state.logs[loc].unsub && state.logs[loc].unsub();
    } catch (_e) {}
    state.logs[loc].unsub = null;
    state.logs[loc].mode = null;
    state.logs[loc].flows = [];
    state.logs[loc].meta = { count: 0, loaded: false, expected: 0, seen: 0, mode: null };
  }
}

function logsRealtimeStarted(loc = null) {
  try {
    if (loc === "cerea" || loc === "concamarise")
      return !!state.logs?.[normalizeInventoryLoc(loc)]?.unsub;
    return !!state.logs?.[INVENTORY_CANONICAL_LOC]?.unsub;
  } catch (_e) {
    return false;
  }
}

function logsRealtimeLoaded(loc = null) {
  try {
    if (loc === "cerea" || loc === "concamarise")
      return !!state.logs?.[normalizeInventoryLoc(loc)]?.meta?.loaded;
    return !!state.logs?.[INVENTORY_CANONICAL_LOC]?.meta?.loaded;
  } catch (_e) {
    return false;
  }
}

function ensureLogsRealtimeStarted(reason = "", opts = {}) {
  try {
    if (!state.firebase.ok || !state.user?.isWhitelisted) return false;
    const rawMode = opts && opts.mode;
    const mode = rawMode === "fba" || rawMode === "fbm" ? rawMode : "full";
    // FBM non usa più i log: il backend schedulato scrive pendingPickQty/reservedQty
    // sugli item inventario, quindi la vista si apre subito e non scarica flussi storici.
    if (mode === "fbm") {
      updateFbmPreviewFromInventory("ensure_fbm_inventory");
      if (state.route.view === "home") renderHomePickingBox();
      return true;
    }
    // Picking FBA/Storico: lettura lazy one-shot, mai listener realtime sui log.
    startLogsFor(INVENTORY_CANONICAL_LOC, { mode });
    if (state.route.view === "home") {
      renderHomePickingBox();
      renderHomePickingHistoryBox();
    }
    return true;
  } catch (err) {
    console.warn("ensureLogsRealtimeStarted", reason, err);
    return false;
  }
}

// Conteggi anteprima menu Picking: numeri sempre visibili senza aprire la vista.
// Non avvia i listener pesanti: usa letture one-shot limitate e resta totalmente cloud.
function pickingPreviewState() {
  if (!state.pickingPreview) {
    state.pickingPreview = {
      fbm: { count: null, loaded: false, loading: false, updatedAtClient: 0, source: "" },
      fba: { count: null, loaded: false, loading: false, updatedAtClient: 0, source: "" },
      busy: false,
      timer: null,
    };
  }
  for (const k of ["fbm", "fba"]) {
    if (!state.pickingPreview[k])
      state.pickingPreview[k] = {
        count: null,
        loaded: false,
        loading: false,
        updatedAtClient: 0,
        source: "",
      };
  }
  return state.pickingPreview;
}

function resetPickingPreviewCounts() {
  try {
    const p = pickingPreviewState();
    if (p.timer) clearTimeout(p.timer);
    p.timer = null;
    p.busy = false;
    p.fbm = { count: null, loaded: false, loading: false, updatedAtClient: 0, source: "" };
    p.fba = { count: null, loaded: false, loading: false, updatedAtClient: 0, source: "" };
    setPickingNavCount("pickingFbm", "—");
    setPickingNavCount("pickingFba", "—");
  } catch (_e) {}
}

function setPickingPreviewCount(kind, count, source = "") {
  try {
    const k = kind === "fba" ? "fba" : "fbm";
    const p = pickingPreviewState();
    const n = Number(count);
    p[k].count = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    p[k].loaded = true;
    p[k].loading = false;
    p[k].updatedAtClient = Date.now();
    p[k].source = String(source || "");
    setPickingNavCount(k === "fba" ? "pickingFba" : "pickingFbm", fmtN(p[k].count));
    refreshPickingHomeOverview();
  } catch (_e) {}
}

function setPickingPreviewLoading(kind) {
  try {
    const k = kind === "fba" ? "fba" : "fbm";
    const p = pickingPreviewState();
    if (!p[k].loaded) {
      p[k].loading = true;
      setPickingNavCount(k === "fba" ? "pickingFba" : "pickingFbm", "…");
      refreshPickingHomeOverview();
    }
  } catch (_e) {}
}

function applyPickingPreviewNavCounts(fallback = "—") {
  try {
    const p = pickingPreviewState();
    const val = (k) => (p[k].loaded ? fmtN(p[k].count || 0) : p[k].loading ? "…" : fallback);
    setPickingNavCount("pickingFbm", val("fbm"));
    setPickingNavCount("pickingFba", val("fba"));
  } catch (_e) {}
}

// FBM Shopify veloce: dopo l'allineamento backend lo stato operativo è già
// sull'inventario (pendingPickQty/reservedQty). Per aprire Picking FBM non
// serve più leggere /logs: niente query pesanti, niente wait su flussi storici.
function shopifyFbmPendingQtyFromItem(it) {
  try {
    const candidates = [
      it?.pendingPickQty,
      it?.reservedQty,
      it?.reservationQty,
      it?.reserved,
      it?.pendingQty,
    ];
    let best = 0;
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n)) best = Math.max(best, Math.round(n));
    }
    return Math.max(0, best);
  } catch (_e) {
    return 0;
  }
}

function pickingFlatTextParts(value) {
  const out = [];
  const push = (v) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      v.forEach(push);
      return;
    }
    if (typeof v === "object") return;
    const s = String(v || "").trim();
    if (s) out.push(s);
  };
  push(value);
  return out;
}

function pickingTagList(value) {
  return pickingFlatTextParts(value)
    .flatMap((v) => String(v || "").split(/[;,|]/g))
    .map((v) =>
      String(v || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
}

function hasAmazonFbaSignalsFromParts(parts, tags = []) {
  try {
    const raw = pickingFlatTextParts(parts).join(" ");
    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();
    const tagList = pickingTagList(tags);
    if (
      tagList.some(
        (t) =>
          t === "fba" ||
          t === "amazon_fba" ||
          t === "fulfillment_by_amazon" ||
          t === "seller_central",
      )
    )
      return true;
    if (/(^|[^A-Z0-9])FBA[0-9A-Z]{5,}([^A-Z0-9]|$)/.test(upper)) return true;
    if (/(^|[^A-Z0-9])FBA([^A-Z0-9]|$)/.test(upper)) return true;
    return !!(
      lower.includes("fulfillment by amazon") ||
      lower.includes("amazon fba") ||
      lower.includes("seller central") ||
      lower.includes("invia ad amazon") ||
      lower.includes("inviato ad amazon") ||
      lower.includes("spedizione fba") ||
      lower.includes("shipment fba") ||
      lower.includes("fba inbound")
    );
  } catch (_e) {
    return false;
  }
}

function hasAmazonFbaSignalsDeep(value, depth = 0, seen = null) {
  try {
    if (value === null || value === undefined) return false;
    if (!seen) seen = new Set();
    if (depth > 4) return false;
    if (typeof value !== "object") return hasAmazonFbaSignalsFromParts([value]);
    if (seen.has(value)) return false;
    seen.add(value);
    if (Array.isArray(value)) return value.some((v) => hasAmazonFbaSignalsDeep(v, depth + 1, seen));
    for (const [k, v] of Object.entries(value)) {
      const key = String(k || "");
      if (hasAmazonFbaSignalsFromParts([key])) return true;
      if (hasAmazonFbaSignalsDeep(v, depth + 1, seen)) return true;
    }
  } catch (_e) {}
  return false;
}

function isAmazonFbaFlow(flow) {
  try {
    const f = flow || {};
    const shop = f.shopify && typeof f.shopify === "object" ? f.shopify : {};
    const p = f.picking && typeof f.picking === "object" ? f.picking : {};
    const r = f.reservation && typeof f.reservation === "object" ? f.reservation : {};
    const workflow = f.workflow && typeof f.workflow === "object" ? f.workflow : {};
    const shipments = Array.isArray(workflow.shipments) ? workflow.shipments : [];
    const shipmentParts = shipments.flatMap((x) => [x?.code, x?.id, x?.shipmentId, x?.destination]);
    if (
      f.fba === true ||
      f.isFba === true ||
      f.isFBA === true ||
      f.amazonFba === true ||
      f.fulfillmentByAmazon === true
    )
      return true;
    return hasAmazonFbaSignalsFromParts(
      [
        f.id,
        f.workflowId,
        f.workflowLabel,
        workflow.id,
        workflow.label,
        f.fileName,
        f.source,
        f.channel,
        f.fulfillmentChannel,
        f.fulfillment_channel,
        f.fulfillmentService,
        f.fulfillment_service,
        f.fulfillmentType,
        f.shipmentId,
        f.shipmentCode,
        f.fbaShipmentId,
        f.amazonShipmentId,
        f.inboundShipmentId,
        f.orderId,
        f.orderName,
        f.name,
        r.source,
        r.channel,
        r.fulfillmentChannel,
        p.source,
        p.channel,
        p.fulfillmentChannel,
        shop.fulfillmentChannel,
        shop.fulfillment_channel,
        ...shipmentParts,
      ],
      [f.tags, f.tag, shop.tags, r.tags, p.tags],
    );
  } catch (_e) {
    return false;
  }
}

function isAmazonFbaInventoryPendingItem(it) {
  try {
    const d = it || {};
    if (
      d.fba === true ||
      d.isFba === true ||
      d.isFBA === true ||
      d.amazonFba === true ||
      d.fulfillmentByAmazon === true
    )
      return true;
    if (hasAmazonFbaSignalsDeep(d.__raw || null)) return true;
    return hasAmazonFbaSignalsFromParts(
      [
        d.lastReservationFlowId,
        d.lastReservationFileName,
        d.lastReservationSource,
        d.reservationSource,
        d.firstSeenSource,
        d.source,
        d.reservationStatus,
        d.status,
        d.workflowId,
        d.workflowLabel,
        d.fulfillmentChannel,
        d.fulfillment_channel,
        d.fulfillmentService,
        d.fulfillment_service,
        d.shipmentId,
        d.shipmentCode,
        d.fbaShipmentId,
        d.amazonShipmentId,
        d.inboundShipmentId,
        d.lastReservationOrderId,
        d.lastReservationOrderName,
      ],
      [d.tags, d.tag],
    );
  } catch (_e) {
    return false;
  }
}

function hasStrongShopifyFbmItemSignal(it) {
  try {
    const d = it && typeof it === "object" ? it : {};
    if (isAmazonFbaInventoryPendingItem(d)) return false;
    if (d.shopify === true || d.generatedFromShopifyFbm === true) return true;
    const raw = [
      d.__shopifySource,
      d.lastReservationSource,
      d.reservationSource,
      d.firstSeenSource,
      d.source,
      d.origin,
      d.platform,
      d.provider,
      d.reservationStatus,
      d.status,
      d.lastReservationFlowId,
      d.lastReservationFileName,
      d.workflowId,
      d.workflowLabel,
      d.channel,
      d.salesChannel,
      d.sales_channel,
      d.fulfillmentChannel,
      d.fulfillment_channel,
      d.fulfillmentService,
      d.fulfillment_service,
      d.shopifyOrderId,
      d.shopifyOrderName,
    ]
      .map((x) => String(x || "").toLowerCase())
      .join(" ");
    if (!raw) return false;
    return !!(
      raw.includes("shopify_fbm") ||
      raw.includes("shopify-fbm") ||
      raw.includes("shopify fbm") ||
      raw.includes("manual_shopify") ||
      raw.includes("manual shopify") ||
      raw.includes("merchant_fulfilled") ||
      raw.includes("merchant fulfilled") ||
      raw.includes("fulfilled_by_merchant") ||
      raw.includes("fulfilled by merchant") ||
      raw.includes("gid://shopify") ||
      raw.startsWith("shopify-") ||
      raw.includes(" shopify-") ||
      (raw.includes("shopify") &&
        (raw.includes("fbm") || raw.includes("merchant") || raw.includes("manual")))
    );
  } catch (_e) {
    return false;
  }
}

function isShopifyFbmPendingInventoryItem(it) {
  try {
    const pending = shopifyFbmPendingQtyFromItem(it);
    if (pending <= 0) return false;

    // Guard rail forte: gli FBA possono avere pendingPickQty/reservedQty e anche
    // orderId/orderName generici dopo una prenotazione. Per FBM accettiamo:
    // 1) righe Shopify reali con SKU combaciante; oppure
    // 2) una prenotazione item-level con segnale Shopify/FBM esplicito.
    if (isAmazonFbaInventoryPendingItem(it)) return false;
    if (hasExplicitMismatchedShopifyOrderDetails(it)) return false;
    if (hasValidShopifyFbmOrderSourceForItem(it)) return true;
    return isSafeShopifyFbmItemLevelFallback(it);
  } catch (_e) {
    return false;
  }
}

function shopifyFbmTextValue(v) {
  try {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return "";
    return squashWhitespace(v);
  } catch (_e) {
    return "";
  }
}

function shopifyFbmFirstText(obj, keys) {
  try {
    if (!obj || typeof obj !== "object") return "";
    for (const k of Array.isArray(keys) ? keys : []) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        const v = obj[k];
        if (v && typeof v !== "object") {
          const t = shopifyFbmTextValue(v);
          if (t) return t;
        }
      }
    }
  } catch (_e) {}
  return "";
}

function shopifyFbmSourceSku(src) {
  try {
    const source = src && typeof src === "object" ? src : {};
    const direct = shopifyFbmFirstText(source, [
      "sku",
      "SKU",
      "code",
      "productSku",
      "product_sku",
      "variantSku",
      "variant_sku",
      "itemSku",
      "lineSku",
      "amazonSku",
      "amazonSKU",
      "amazonInventorySku",
      "inventorySku",
      "sellerSku",
      "seller_sku",
    ]);
    if (direct) return toSkuId(direct);
    for (const k of ["variant", "product", "item", "lineItem", "line_item"]) {
      const v = source[k];
      if (v && typeof v === "object") {
        const nested = shopifyFbmSourceSku(v);
        if (nested) return nested;
      }
    }
  } catch (_e) {}
  return "";
}

function shopifyFbmHasExplicitSourceSignal(src, parent = null) {
  try {
    const source = src && typeof src === "object" ? src : {};
    const par = parent && typeof parent === "object" ? parent : {};
    if (isAmazonFbaInventoryPendingItem(source) || isAmazonFbaInventoryPendingItem(par))
      return false;
    if (
      source.shopify === true ||
      source.generatedFromShopifyFbm === true ||
      par.shopify === true ||
      par.generatedFromShopifyFbm === true
    )
      return true;
    const raw = [
      source.__shopifySource,
      source.source,
      source.origin,
      source.platform,
      source.provider,
      source.channel,
      source.salesChannel,
      source.sales_channel,
      source.fulfillmentService,
      source.fulfillment_service,
      source.shopifyOrderId,
      source.shopifyOrderName,
      source.admin_graphql_api_id,
      source.adminGraphqlApiId,
      par.__shopifySource,
      par.source,
      par.origin,
      par.platform,
      par.provider,
      par.channel,
      par.salesChannel,
      par.sales_channel,
      par.fulfillmentService,
      par.fulfillment_service,
      par.shopifyOrderId,
      par.shopifyOrderName,
      par.admin_graphql_api_id,
      par.adminGraphqlApiId,
    ]
      .map((x) => String(x || "").toLowerCase())
      .join(" ");
    return !!(
      raw.includes("shopify") ||
      raw.includes("shopify_fbm") ||
      raw.includes("manual_shopify") ||
      raw.includes("admin_graphql") ||
      raw.includes("gid://shopify")
    );
  } catch (_e) {
    return false;
  }
}

function shopifyFbmLineQtyInfo(src) {
  try {
    const source = src && typeof src === "object" ? src : {};
    // Ordine intenzionale: i campi Shopify della singola line-item devono vincere
    // su qty/pieces, che nei documenti inventario possono contenere il totale SKU prenotato.
    const groups = [
      { rank: 4, keys: ["currentQuantity", "current_quantity"] },
      { rank: 3, keys: ["fulfillableQuantity", "fulfillable_quantity"] },
      { rank: 2, keys: ["quantity", "quantityOrdered", "lineQuantity", "lineQty"] },
      { rank: 1, keys: ["qty", "pieces", "qta"] },
    ];
    for (const group of groups) {
      for (const k of group.keys) {
        if (!Object.prototype.hasOwnProperty.call(source, k)) continue;
        const n = parseQty(source[k]);
        if (Number.isFinite(n) && n > 0) return { qty: Math.abs(n), rank: group.rank, key: k };
      }
    }
  } catch (_e) {}
  return { qty: 0, rank: 0, key: "" };
}

function shopifyFbmLineQtyStrict(src) {
  return shopifyFbmLineQtyInfo(src).qty;
}

function shopifyFbmOrderParentData(order) {
  const o = order && typeof order === "object" ? order : {};
  const orderId = shopifyFbmFirstText(o, [
    "orderId",
    "shopifyOrderId",
    "admin_graphql_api_id",
    "adminGraphqlApiId",
    "id",
    "legacyResourceId",
    "order_id",
  ]);
  const orderName = shopifyFbmFirstText(o, [
    "orderName",
    "shopifyOrderName",
    "name",
    "orderNumber",
    "order_number",
    "orderLabel",
    "numeroOrdine",
    "numero_ordine",
  ]);
  const customerName = shopifyFbmCustomerNameFromSource(o, {});
  return {
    __shopifySource: shopifyFbmHasExplicitSourceSignal(o) ? "shopify" : "",
    orderId,
    shopifyOrderId: shopifyFbmFirstText(o, ["shopifyOrderId"]) || orderId,
    orderName,
    shopifyOrderName: shopifyFbmFirstText(o, ["shopifyOrderName"]) || orderName,
    customerName,
    shopifyCustomerName: customerName,
    source: shopifyFbmFirstText(o, ["source", "origin", "platform", "provider"]) || "shopify",
  };
}

function hasValidShopifyFbmOrderSourceForItem(it) {
  try {
    const sku = toSkuId(it?.sku || it?.id || "");
    if (!sku) return false;
    const sources = shopifyFbmOrderSourcesFromItem(it);
    return sources.some((src) => {
      const srcSku = shopifyFbmSourceSku(src);
      if (!srcSku || srcSku !== sku) return false;
      if (!shopifyFbmHasExplicitSourceSignal(src, it)) return false;
      if (isAmazonFbaInventoryPendingItem(src)) return false;
      return shopifyFbmLineQtyStrict(src) > 0;
    });
  } catch (_e) {
    return false;
  }
}

function shopifyFbmOrderLineSkuSummaryForItem(it) {
  const summary = {
    lineSkuCount: 0,
    matchingSkuCount: 0,
    otherSkuCount: 0,
    otherSkus: new Set(),
    hasExplicitOrderContainer: false,
  };
  try {
    const sku = toSkuId(it?.sku || it?.id || "");
    const lineKeys = [
      "line_items",
      "lineItems",
      "lines",
      "items",
      "orderLines",
      "shopifyOrderLines",
      "products",
      "productLines",
    ];
    const seen = new Set();

    const recordLine = (line) => {
      try {
        if (!line || typeof line !== "object") return;
        const srcSku = shopifyFbmSourceSku(line);
        const qty = shopifyFbmLineQtyStrict(line);
        if (!srcSku || qty <= 0) return;
        const key = `${srcSku}::${qty}`;
        if (seen.has(key)) return;
        seen.add(key);
        summary.lineSkuCount++;
        if (sku && srcSku === sku) summary.matchingSkuCount++;
        else {
          summary.otherSkuCount++;
          summary.otherSkus.add(srcSku);
        }
      } catch (_e) {}
    };

    const collect = (value, parent = null, generic = false) => {
      try {
        if (!value) return;
        if (Array.isArray(value)) {
          value.forEach((v) => collect(v, parent, generic));
          return;
        }
        if (typeof value !== "object") return;
        const explicit = shopifyFbmHasExplicitSourceSignal(value, parent || it || {});
        if (generic && !explicit) return;
        if (explicit) summary.hasExplicitOrderContainer = true;

        for (const k of lineKeys) {
          const arr = value[k];
          if (Array.isArray(arr) && arr.length) {
            if (explicit) summary.hasExplicitOrderContainer = true;
            arr.forEach((line) => recordLine(line));
          }
        }

        // Se il container stesso è una riga ordine, conteggiala.
        recordLine(value);
      } catch (_e) {}
    };

    collect(it?.shopifyPendingOrders, null, false);
    collect(it?.shopifyOrders, null, false);
    collect(it?.shopifyOrderLines, null, false);
    collect(it?.shopifyOrder, null, false);
    collect(it?.pendingOrders, null, true);
    collect(it?.pendingOrderLines, null, true);
    collect(it?.reservationOrders, null, true);
    collect(it?.orderLines, null, true);
    collect(it?.lastReservationOrder, null, true);
  } catch (_e) {}
  return summary;
}

function hasExplicitMismatchedShopifyOrderDetails(it) {
  try {
    const summary = shopifyFbmOrderLineSkuSummaryForItem(it);
    // Caso critico: il documento inventario ha riferimenti Shopify con righe ordine,
    // ma nessuna riga ha lo SKU dell'articolo. Questo è esattamente il mix sporco
    // FBA↔FBM: non devo mostrare il prodotto in Picking FBM.
    return summary.lineSkuCount > 0 && summary.matchingSkuCount <= 0 && summary.otherSkuCount > 0;
  } catch (_e) {
    return false;
  }
}

function isSafeShopifyFbmItemLevelFallback(it) {
  try {
    if (!hasStrongShopifyFbmItemSignal(it)) return false;
    if (isAmazonFbaInventoryPendingItem(it)) return false;
    if (hasExplicitMismatchedShopifyOrderDetails(it)) return false;

    const summary = shopifyFbmOrderLineSkuSummaryForItem(it);
    // Appena esiste almeno una line-item reale, la lista ordini deve usare esclusivamente
    // quelle quantità. Il totale pending dello SKU resta nel widget riepilogativo e non
    // viene mai attribuito all'ultimo ordine conosciuto.
    if (summary.lineSkuCount > 0) return false;

    const raw = [
      it?.lastReservationSource,
      it?.reservationSource,
      it?.firstSeenSource,
      it?.source,
      it?.origin,
      it?.reservationStatus,
      it?.status,
      it?.lastReservationFlowId,
      it?.lastReservationFileName,
      it?.workflowId,
      it?.workflowLabel,
      it?.channel,
      it?.fulfillmentChannel,
      it?.fulfillment_service,
      it?.fulfillmentService,
    ]
      .map((x) => String(x || "").toLowerCase())
      .join(" ");

    // Fallback ammesso solo con segnale operativo FBM, non con un generico ordine/ID cliente.
    return !!(
      raw.includes("shopify_fbm") ||
      raw.includes("shopify-fbm") ||
      raw.includes("shopify fbm") ||
      raw.includes("merchant_fulfilled") ||
      raw.includes("merchant fulfilled") ||
      raw.includes("fulfilled_by_merchant") ||
      raw.includes("fulfilled by merchant") ||
      raw.includes("manual_shopify") ||
      raw.includes("manual shopify") ||
      String(it?.lastReservationFlowId || "")
        .toUpperCase()
        .startsWith("SHOPIFY-") ||
      String(it?.lastReservationFileName || "").toUpperCase() === "SHOPIFY_FBM"
    );
  } catch (_e) {
    return false;
  }
}

function shopifyFbmNameFromPerson(value) {
  try {
    if (!value) return "";
    if (typeof value === "string") return squashWhitespace(value);
    if (typeof value !== "object") return "";
    const direct = shopifyFbmFirstText(value, [
      "name",
      "fullName",
      "displayName",
      "customerName",
      "cliente",
      "company",
      "ragioneSociale",
    ]);
    if (direct) return direct;
    const first = shopifyFbmFirstText(value, ["first_name", "firstName", "nome"]);
    const last = shopifyFbmFirstText(value, ["last_name", "lastName", "cognome"]);
    const joined = squashWhitespace([first, last].filter(Boolean).join(" "));
    if (joined) return joined;
    if (value.default_address) return shopifyFbmNameFromPerson(value.default_address);
    if (value.shipping_address) return shopifyFbmNameFromPerson(value.shipping_address);
    if (value.shippingAddress) return shopifyFbmNameFromPerson(value.shippingAddress);
    if (value.billing_address) return shopifyFbmNameFromPerson(value.billing_address);
    if (value.billingAddress) return shopifyFbmNameFromPerson(value.billingAddress);
  } catch (_e) {}
  return "";
}

function shopifyFbmCustomerNameFromSource(src, fallbackItem) {
  try {
    const source = src && typeof src === "object" ? src : {};
    const item = fallbackItem && typeof fallbackItem === "object" ? fallbackItem : {};
    const direct = shopifyFbmFirstText(source, [
      "__customerName",
      "customerName",
      "shopifyCustomerName",
      "cliente",
      "clientName",
      "buyerName",
      "recipientName",
      "shippingName",
      "shippingCustomerName",
      "billingName",
      "name",
    ]);
    if (direct) return direct;
    for (const k of [
      "customer",
      "cliente",
      "buyer",
      "recipient",
      "shipping_address",
      "shippingAddress",
      "billing_address",
      "billingAddress",
    ]) {
      const name = shopifyFbmNameFromPerson(source[k]);
      if (name) return name;
    }
    const itemDirect = shopifyFbmFirstText(item, [
      "__customerName",
      "lastReservationCustomerName",
      "shopifyCustomerName",
      "customerName",
      "customerDisplayName",
      "cliente",
      "customerEmail",
    ]);
    if (itemDirect) return itemDirect;
    for (const k of [
      "shopifyOrder",
      "lastReservationOrder",
      "customer",
      "shipping_address",
      "shippingAddress",
    ]) {
      const name = shopifyFbmNameFromPerson(item[k]);
      if (name) return name;
    }
  } catch (_e) {}
  return "";
}

function shopifyFbmOrderIdFromSource(src, fallbackItem) {
  const source = src && typeof src === "object" ? src : {};
  const item = fallbackItem && typeof fallbackItem === "object" ? fallbackItem : {};
  return (
    shopifyFbmFirstText(source, [
      "__orderId",
      "orderId",
      "shopifyOrderId",
      "admin_graphql_api_id",
      "adminGraphqlApiId",
      "id",
      "legacyResourceId",
      "order_id",
    ]) ||
    shopifyFbmFirstText(item, ["__orderId", "lastReservationOrderId", "shopifyOrderId", "orderId"])
  );
}

function shopifyFbmOrderNameFromSource(src, fallbackItem) {
  const source = src && typeof src === "object" ? src : {};
  const item = fallbackItem && typeof fallbackItem === "object" ? fallbackItem : {};
  return (
    shopifyFbmFirstText(source, [
      "__orderName",
      "orderName",
      "shopifyOrderName",
      "orderNumber",
      "order_number",
      "orderLabel",
      "numeroOrdine",
      "numero_ordine",
    ]) ||
    shopifyFbmFirstText(item, [
      "__orderName",
      "lastReservationOrderName",
      "shopifyOrderName",
      "orderName",
    ])
  );
}

function shopifyFbmTitleFromSource(src, fallbackItem, sku) {
  const source = src && typeof src === "object" ? src : {};
  const item = fallbackItem && typeof fallbackItem === "object" ? fallbackItem : {};
  const raw =
    shopifyFbmFirstText(source, [
      "title",
      "productTitle",
      "product_title",
      "name",
      "productName",
      "variantTitle",
      "variant_title",
      "amazonInventoryTitle",
    ]) || shopifyFbmFirstText(item, ["title", "name"]);
  const meta = parseTitleMeta(raw || sku || "");
  return meta.main || raw || sku || "";
}

function shopifyFbmOrderSourcesFromItem(it) {
  const out = [];
  const seen = new Map();
  const lineKeys = [
    "line_items",
    "lineItems",
    "lines",
    "items",
    "orderLines",
    "shopifyOrderLines",
    "products",
    "productLines",
  ];

  const pushLine = (line, parent = null) => {
    try {
      if (!line || typeof line !== "object") return;
      const parentData = shopifyFbmOrderParentData(parent || {});
      const merged = { ...parentData, ...line };
      const sku = shopifyFbmSourceSku(merged);
      if (!sku) return; // niente SKU riga = non posso abbinarla a un prodotto inventario
      if (!shopifyFbmHasExplicitSourceSignal(merged, parent || it || {})) return;
      if (isAmazonFbaInventoryPendingItem(merged)) return;
      const qtyInfo = shopifyFbmLineQtyInfo(merged);
      const qty = qtyInfo.qty;
      if (qty <= 0) return;
      const oid = shopifyFbmOrderIdFromSource(merged, parent || {});
      const oname = shopifyFbmOrderNameFromSource(merged, parent || {});
      const lineId = shopifyFbmFirstText(merged, [
        "lineItemId",
        "line_item_id",
        "lineId",
        "line_id",
        "admin_graphql_api_id",
        "adminGraphqlApiId",
        "id",
      ]);
      const variantId = shopifyFbmFirstText(merged, [
        "variantId",
        "variant_id",
        "variantLegacyResourceId",
      ]);
      const fallbackIdentity = shopifyFbmTitleFromSource(merged, {}, sku);
      const key = [
        sku,
        oid || oname || "NO_ORDER",
        lineId || variantId || fallbackIdentity || sku,
      ].join("::");
      const prev = seen.get(key);
      if (prev) {
        // Se la stessa line-item arriva da più campi cloud, conserva la versione
        // con il segnale quantità più specifico; non sommare mai copie duplicate.
        if (qtyInfo.rank > prev.rank) {
          out[prev.index] = merged;
          seen.set(key, { index: prev.index, rank: qtyInfo.rank });
        }
        return;
      }
      const index = out.length;
      out.push(merged);
      seen.set(key, { index, rank: qtyInfo.rank });
    } catch (_e) {}
  };

  const collect = (value, parent = null, generic = false) => {
    try {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((v) => collect(v, parent, generic));
        return;
      }
      if (typeof value !== "object") return;
      const explicit = shopifyFbmHasExplicitSourceSignal(value, parent || it || {});
      if (generic && !explicit) return;

      let hadLines = false;
      for (const k of lineKeys) {
        const arr = value[k];
        if (Array.isArray(arr) && arr.length) {
          hadLines = true;
          arr.forEach((line) => pushLine(line, value));
        }
      }

      // Se l'oggetto stesso è già una riga Shopify con SKU/qty, usalo.
      if (shopifyFbmSourceSku(value) && shopifyFbmLineQtyStrict(value) > 0) {
        pushLine(value, parent || it || {});
      }
    } catch (_e) {}
  };

  try {
    // Fonti Shopify esplicite: accettate, ma solo se contengono righe con SKU e quantità.
    collect(it?.shopifyPendingOrders, null, false);
    collect(it?.shopifyOrders, null, false);
    collect(it?.shopifyOrderLines, null, false);
    collect(it?.shopifyOrder, null, false);

    // Fonti generiche: usate solo se l'oggetto dichiara Shopify. Niente più abbinamenti
    // da pendingOrders/reservationOrders/orderLines generici, perché mischiavano FBA e FBM.
    collect(it?.pendingOrders, null, true);
    collect(it?.pendingOrderLines, null, true);
    collect(it?.reservationOrders, null, true);
    collect(it?.orderLines, null, true);
    collect(it?.lastReservationOrder, null, true);
  } catch (_e) {}
  return out;
}

function shopifyFbmOrderRowsFromItem(it, loc) {
  let rows = [];
  const seen = new Set();
  try {
    const sku = toSkuId(it?.sku || it?.id || "");
    const pending = shopifyFbmPendingQtyFromItem(it);
    if (!sku || pending <= 0) return rows;
    const sources = shopifyFbmOrderSourcesFromItem(it);
    const titleFallback = shopifyFbmTitleFromSource(null, it, sku) || sku;
    const positions = rackLocationDisplayPartsFromItem(it || {})
      .map((p) => ({
        code: normalizeRackLocation(p?.code || ""),
        qty: Number.isFinite(Number(p?.qty)) ? Math.round(Number(p.qty)) : 0,
        lot: p?.lot || "",
        lotLabel: p?.lotLabel || "",
      }))
      .filter((p) => p.code);
    const codes = positions.map((p) => p.code).filter(Boolean);
    const firstCode = codes[0] || "";

    const makeRow = (src, forceFallback = false) => {
      const source = src && typeof src === "object" ? src : {};
      const srcSku = shopifyFbmSourceSku(source);
      if (!srcSku || srcSku !== sku) return null;
      if (!shopifyFbmHasExplicitSourceSignal(source, it)) return null;
      if (isAmazonFbaInventoryPendingItem(source)) return null;
      const qty = shopifyFbmLineQtyStrict(source);
      if (!qty) return null;
      const orderId = shopifyFbmOrderIdFromSource(source, it);
      const orderName = shopifyFbmOrderNameFromSource(source, it);
      const customerName = shopifyFbmCustomerNameFromSource(source, it);
      const title = shopifyFbmTitleFromSource(source, {}, sku) || titleFallback;
      const orderLabel = orderName || orderId || "Ordine Shopify";
      const lineId = shopifyFbmFirstText(source, [
        "lineItemId",
        "line_item_id",
        "lineId",
        "line_id",
        "admin_graphql_api_id",
        "adminGraphqlApiId",
        "id",
        "variantId",
        "variant_id",
      ]);
      const fallbackOrderKey = [
        loc,
        "inventory_source",
        sku,
        lineId || "",
        orderName || "",
        orderId || "",
        customerName || "",
      ].join("::");
      const rowKey =
        orderName || orderId
          ? [loc, "order", orderName || orderId, sku, lineId || sku].join("::")
          : fallbackOrderKey;
      if (seen.has(rowKey)) return null;
      seen.add(rowKey);
      return {
        loc,
        sku,
        title,
        qty: Math.round(qty),
        orderId,
        orderName,
        orderLabel,
        orderKey: orderName || orderId ? "" : fallbackOrderKey,
        lineKey: lineId || sku,
        customerName,
        positions,
        codes,
        firstCode,
        latestAt:
          Number(
            it?.updatedAtClient || it?.lastReservationAtClient || it?.reorderedAtClient || 0,
          ) || 0,
        source: forceFallback ? "fallback_inventory" : "inventory_order",
      };
    };

    if (sources.length) {
      for (const src of sources) {
        const row = makeRow(src, false);
        if (row) rows.push(row);
      }
    }

    // Le righe ordine reali vengono mostrate con la loro quantità esatta.
    // Il totale pending dello SKU serve solo a non superare il totale prenotato.
    if (rows.length && pending > 0) {
      let remaining = Math.round(pending);
      const capped = [];
      for (const row of rows) {
        if (remaining <= 0) break;
        const q = Math.max(0, Math.round(Number(row.qty || 0) || 0));
        if (!q) continue;
        const useQty = Math.min(q, remaining);
        capped.push({ ...row, qty: useQty });
        remaining -= useQty;
      }
      rows = capped;
    }

    const alreadyShownQty = rows.reduce(
      (sum, row) => sum + Math.max(0, Math.round(Number(row?.qty || 0) || 0)),
      0,
    );
    const missingQty = Math.max(0, Math.round(pending) - alreadyShownQty);
    if (missingQty > 0 && isSafeShopifyFbmItemLevelFallback(it)) {
      const fallbackKey = [
        loc,
        sku,
        "shopify_fbm_item_pending",
        missingQty,
        firstCode || "",
        titleFallback,
      ].join("::");
      if (!seen.has(fallbackKey)) {
        seen.add(fallbackKey);
        rows.push({
          loc,
          sku,
          title: titleFallback,
          qty: Math.round(missingQty),
          orderId: "",
          orderName: "",
          orderLabel: "Shopify FBM in sospeso",
          orderKey: fallbackKey,
          lineKey: sku,
          customerName: "Dettaglio cliente non disponibile",
          positions,
          codes,
          firstCode,
          latestAt:
            Number(
              it?.updatedAtClient || it?.lastReservationAtClient || it?.reorderedAtClient || 0,
            ) || 0,
          source: "inventory_item_shopify_fbm_pending_unassigned",
        });
      }
    }
  } catch (err) {
    console.warn("shopify fbm order rows", err);
  }
  return rows;
}

function shopifyFbmInventoryOrderRows() {
  const rows = [];
  const seen = new Set();
  const locOrder = INVENTORY_ALL_CLOUD_LOCS;
  for (const loc of locOrder) {
    const items = state.inventory?.[loc]?.items || [];
    for (const it0 of items) {
      const it = it0 || {};
      if (!isShopifyFbmPendingInventoryItem(it)) continue;
      const part = shopifyFbmOrderRowsFromItem(it, loc);
      for (const row of part) {
        const key = [
          row.loc,
          row.orderKey || "",
          row.lineKey || "",
          row.sku,
          row.orderName || "",
          row.orderId || "",
          row.customerName || "",
          row.qty,
          row.title,
        ].join("::");
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(row);
      }
    }
  }
  return rows.sort((a, b) => {
    const oa = String(a.orderName || a.orderId || "");
    const ob = String(b.orderName || b.orderId || "");
    if (oa && ob && oa !== ob)
      return oa.localeCompare(ob, "it", { numeric: true, sensitivity: "base" });
    if (oa && !ob) return -1;
    if (!oa && ob) return 1;
    const pa = a.positions?.[0]?.code || "";
    const pb = b.positions?.[0]?.code || "";
    if (pa && pb && pa !== pb) return pa.localeCompare(pb);
    if (pa && !pb) return -1;
    if (!pa && pb) return 1;
    return String(a.sku).localeCompare(String(b.sku));
  });
}

function shopifyFbmInventoryOrdersGrouped(rowsInput = null) {
  const rows = Array.isArray(rowsInput) ? rowsInput : shopifyFbmInventoryOrderRows();
  const groups = new Map();

  const clean = (v) => squashWhitespace(v || "");
  const isUnknownCustomer = (v) => {
    const t = clean(v);
    return !t || /cliente non disponibile|dettaglio cliente non disponibile/i.test(t);
  };
  const betterTitle = (a, b) => {
    const aa = clean(a);
    const bb = clean(b);
    if (!aa) return bb;
    if (!bb) return aa;
    return bb.length > aa.length ? bb : aa;
  };

  for (const row0 of rows) {
    const row = row0 || {};
    const sku = toSkuId(row.sku || "");
    const qty = Math.abs(parseQty(row.qty || 0) || 0);
    if (!sku || qty <= 0) continue;

    const orderName = clean(row.orderName || "");
    const orderId = clean(row.orderId || "");
    const hasOrder = !!(orderName || orderId);
    const explicitFallbackKey = clean(
      row.orderKey || row.groupKey || row.flowId || row.lineKey || "",
    );
    const fallbackKeyBase =
      explicitFallbackKey ||
      [
        clean(row.loc || "concamarise"),
        sku,
        clean(row.title || ""),
        qty,
        clean(row.customerName || ""),
        normalizeRackLocation(row.firstCode || ""),
        String(Number(row.latestAt || 0) || 0),
      ].join("::");
    const orderKeyBase = orderName || orderId || fallbackKeyBase || "FBM_SENZA_DETTAGLIO_ORDINE";
    const orderKey = hasOrder ? `order::${orderKeyBase}` : `pending::${orderKeyBase}`;
    const orderLabel = clean(row.orderLabel || orderName || orderId || "Shopify FBM in sospeso");
    const looksLikeOrderNumber = (v) =>
      /^#{1,3}\s*\d+\b/i.test(clean(v)) || /^ORD[-\s#]*\d+\b/i.test(clean(v));
    const orderNumber = orderName || (looksLikeOrderNumber(orderLabel) ? orderLabel : "") || "";

    let group = groups.get(orderKey);
    if (!group) {
      group = {
        key: orderKey,
        hasOrder,
        orderName,
        orderId,
        orderLabel,
        orderNumber,
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        shopifyUpdatedAtClient: 0,
        locs: new Set(),
        latestAt: 0,
        linesMap: new Map(),
      };
      groups.set(orderKey, group);
    }

    if (orderName && !group.orderName) group.orderName = orderName;
    if (orderId && !group.orderId) group.orderId = orderId;
    if (orderNumber && !group.orderNumber) group.orderNumber = orderNumber;
    if (orderLabel && (!group.orderLabel || group.orderLabel === "Shopify FBM in sospeso"))
      group.orderLabel = orderLabel;
    if (!isUnknownCustomer(row.customerName) && isUnknownCustomer(group.customerName))
      group.customerName = clean(row.customerName);
    if (!group.customerEmail && row.customerEmail) group.customerEmail = clean(row.customerEmail);
    if (!group.customerPhone && row.customerPhone) group.customerPhone = clean(row.customerPhone);
    group.shopifyUpdatedAtClient = Math.max(
      group.shopifyUpdatedAtClient || 0,
      Number(row.shopifyUpdatedAtClient || 0) || 0,
    );
    if (row.loc) group.locs.add(row.loc);
    const ts = Number(row.latestAt || 0) || 0;
    if (ts > group.latestAt) group.latestAt = ts;

    const lineKey = sku;
    let line = group.linesMap.get(lineKey);
    if (!line) {
      line = {
        sku,
        title: clean(row.title || sku) || sku,
        qty: 0,
        positionsMap: new Map(),
        firstCode: "",
        locs: new Set(),
        latestAt: 0,
      };
      group.linesMap.set(lineKey, line);
    }
    line.title = betterTitle(line.title, row.title || sku) || sku;
    line.qty += qty;
    if (row.loc) line.locs.add(row.loc);
    if (ts > line.latestAt) line.latestAt = ts;

    const parts = Array.isArray(row.positions) ? row.positions : [];
    for (const part of parts) {
      const code = normalizeRackLocation(part?.code || "");
      if (!code) continue;
      const prev = line.positionsMap.get(code) || { code, qty: 0 };
      const pQty = Number(part?.qty || 0);
      if (Number.isFinite(pQty) && pQty > prev.qty) prev.qty = Math.round(pQty);
      line.positionsMap.set(code, prev);
      if (!line.firstCode) line.firstCode = code;
    }
    const firstCode = normalizeRackLocation(row.firstCode || "");
    if (firstCode && !line.firstCode) line.firstCode = firstCode;
  }

  return Array.from(groups.values())
    .map((group) => {
      const lines = Array.from(group.linesMap.values())
        .map((line) => {
          const positions = Array.from(line.positionsMap.values()).sort((a, b) =>
            String(a.code).localeCompare(String(b.code)),
          );
          const codes = positions.map((x) => x.code).filter(Boolean);
          return {
            sku: line.sku,
            title: line.title || line.sku,
            qty: Math.round(line.qty || 0),
            positions,
            codes,
            firstCode: line.firstCode || codes[0] || "",
            locs: Array.from(line.locs),
            latestAt: line.latestAt || 0,
          };
        })
        .filter((x) => x.sku && x.qty > 0)
        .sort((a, b) => {
          const pa = a.positions?.[0]?.code || "";
          const pb = b.positions?.[0]?.code || "";
          if (pa && pb && pa !== pb) return pa.localeCompare(pb);
          if (pa && !pb) return -1;
          if (!pa && pb) return 1;
          return String(a.sku).localeCompare(String(b.sku));
        });
      const totalQty = lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
      return {
        key: group.key,
        hasOrder: !!group.hasOrder,
        orderName: group.orderName || "",
        orderId: group.orderId || "",
        orderNumber: group.orderNumber || group.orderName || "",
        orderLabel:
          group.orderLabel ||
          (group.hasOrder
            ? group.orderNumber || group.orderName || group.orderId || "Ordine Shopify"
            : "Shopify FBM in sospeso"),
        customerName: group.customerName || "Cliente non disponibile",
        customerEmail: group.customerEmail || "",
        customerPhone: group.customerPhone || "",
        shopifyUpdatedAtClient: group.shopifyUpdatedAtClient || 0,
        locs: Array.from(group.locs),
        lines,
        totalQty,
        productCount: lines.length,
        latestAt: group.latestAt || 0,
      };
    })
    .filter((group) => group.lines.length)
    .sort((a, b) => {
      if (a.hasOrder !== b.hasOrder) return a.hasOrder ? -1 : 1;
      const oa = String(a.orderName || a.orderId || a.orderLabel || "");
      const ob = String(b.orderName || b.orderId || b.orderLabel || "");
      if (oa && ob && oa !== ob)
        return oa.localeCompare(ob, "it", { numeric: true, sensitivity: "base" });
      if (oa && !ob) return -1;
      if (!oa && ob) return 1;
      return (b.latestAt || 0) - (a.latestAt || 0);
    });
}

// Lista FBM esatta: una sola query server sui documenti ordine attivi.
// Nessun listener aggiuntivo e nessun fallback dai documenti inventario, che non
// possono garantire numero ordine/cliente. La query viene rifatta soltanto quando
// il meta sync Shopify risulta più recente della lista già letta.
const __shopifyActiveOrdersState = {
  items: [],
  loaded: false,
  loading: false,
  error: "",
  loadedAtClient: 0,
  syncVersion: 0,
  promise: null,
};

function resetShopifyActiveOrdersState() {
  __shopifyActiveOrdersState.items = [];
  __shopifyActiveOrdersState.loaded = false;
  __shopifyActiveOrdersState.loading = false;
  __shopifyActiveOrdersState.error = "";
  __shopifyActiveOrdersState.loadedAtClient = 0;
  __shopifyActiveOrdersState.syncVersion = 0;
  __shopifyActiveOrdersState.promise = null;
}

function shopifyExactOrderLineRemainingQty(stored) {
  try {
    const row = stored && typeof stored === "object" ? stored : {};
    const reserved = Math.max(0, Math.round(Number(row.reservedQty || 0) || 0));
    const shipped = Math.max(0, Math.round(Number(row.shippedQty || 0) || 0));
    const applied = Math.max(0, Math.round(Number(row.inventoryAppliedQty || 0) || 0));
    return Math.max(0, reserved - Math.max(shipped, applied));
  } catch (_e) {
    return 0;
  }
}

function shopifyExactOrderRowsFromDocs(itemsInput = null) {
  const out = [];
  try {
    const items = Array.isArray(itemsInput) ? itemsInput : __shopifyActiveOrdersState.items;
    for (const root0 of items) {
      const root = root0 && typeof root0 === "object" ? root0 : {};
      if (root.active !== true) continue;
      const d = root.orderDetails && typeof root.orderDetails === "object" ? root.orderDetails : {};
      const customer = d.customer && typeof d.customer === "object" ? d.customer : {};
      const shipping =
        d.shippingAddress && typeof d.shippingAddress === "object" ? d.shippingAddress : {};
      const orderId = squashWhitespace(root.orderId || d.orderId || root.__docId || "");
      if (!orderId) continue;
      const orderName = squashWhitespace(root.orderName || d.orderName || d.orderNumber || "");
      const customerName =
        squashWhitespace(root.customerName || customer.name || shipping.name || "") ||
        "Cliente non disponibile";
      const customerEmail = squashWhitespace(root.customerEmail || customer.email || d.email || "");
      const customerPhone = squashWhitespace(
        root.customerPhone || customer.phone || d.phone || shipping.phone || "",
      );
      const detailVersion = Math.max(
        Number(root.shopifyUpdatedAtClient || 0) || 0,
        Number(d.updatedAtClient || 0) || 0,
        Number(root.detailUpdatedAtClient || 0) || 0,
      );
      const latestAt =
        Number(
          d.createdAtClient ||
            root.shopifyCreatedAtClient ||
            detailVersion ||
            root.createdAtClient ||
            0,
        ) || 0;
      const loc =
        root.location === "cerea" || root.location === "concamarise"
          ? root.location
          : INVENTORY_CANONICAL_LOC;
      const detailLines = Array.isArray(d.lineItems) ? d.lineItems : [];
      const detailByLineId = new Map();
      const detailBySku = new Map();
      for (const line0 of detailLines) {
        const line = line0 && typeof line0 === "object" ? line0 : {};
        const lineId = squashWhitespace(line.lineItemId || line.id || "");
        const sku = toSkuId(line.sku || "");
        if (lineId) detailByLineId.set(lineId, line);
        if (sku && !detailBySku.has(sku)) detailBySku.set(sku, line);
      }

      const grouped = new Map();
      const storedLines =
        root.linesByLineId && typeof root.linesByLineId === "object"
          ? Object.values(root.linesByLineId)
          : [];
      for (const stored0 of storedLines) {
        const stored = stored0 && typeof stored0 === "object" ? stored0 : {};
        const sku = toSkuId(stored.sku || "");
        const qty = shopifyExactOrderLineRemainingQty(stored);
        if (!sku || qty <= 0) continue;
        const detailLine =
          detailByLineId.get(squashWhitespace(stored.lineItemId || "")) ||
          detailBySku.get(sku) ||
          {};
        const title = squashWhitespace(stored.title || detailLine.title || sku) || sku;
        const prev = grouped.get(sku) || { sku, title, qty: 0 };
        prev.qty += qty;
        if (title.length > String(prev.title || "").length) prev.title = title;
        grouped.set(sku, prev);
      }

      // Compatibilità per documenti dettaglio completi che non hanno ancora linesByLineId.
      if (!grouped.size) {
        for (const line0 of detailLines) {
          const line = line0 && typeof line0 === "object" ? line0 : {};
          const sku = toSkuId(line.sku || "");
          const qtyCandidate =
            line.currentQuantity !== undefined
              ? line.currentQuantity
              : line.fulfillableQuantity !== undefined
                ? line.fulfillableQuantity
                : line.quantity;
          const qty = Math.max(0, Math.round(Number(qtyCandidate || 0) || 0));
          if (!sku || qty <= 0 || line.requiresShipping === false || line.giftCard === true)
            continue;
          const title = squashWhitespace(line.title || sku) || sku;
          const prev = grouped.get(sku) || { sku, title, qty: 0 };
          prev.qty += qty;
          if (title.length > String(prev.title || "").length) prev.title = title;
          grouped.set(sku, prev);
        }
      }

      for (const line of grouped.values()) {
        const orderedSku = toSkuId(line.sku || "");
        const hit = getItemBySkuAny(orderedSku, loc);
        const item = hit?.it || getProductBySku(loc, orderedSku) || null;
        // Lo SKU dell'ordine può essere un alias FBM dello SKU fisico (es. stesso ASIN).
        // La lista ordine conserva lo SKU Shopify; il widget usa invece lo SKU reale inventario.
        const stockSku =
          toSkuId(hit?.stockSku || item?.sku || item?.id || orderedSku) || orderedSku;
        const inventoryTitle = squashWhitespace(item?.title || item?.name || "");
        const positions = item
          ? rackLocationDisplayPartsFromItem(item)
              .map((part) => ({
                code: normalizeRackLocation(part?.code || ""),
                qty: Number.isFinite(Number(part?.qty)) ? Math.round(Number(part.qty)) : 0,
                lot: part?.lot || "",
                lotLabel: part?.lotLabel || "",
              }))
              .filter((x) => x.code)
          : [];
        const codes = positions.map((x) => x.code).filter(Boolean);
        out.push({
          loc: hit?.loc || loc,
          sku: orderedSku,
          stockSku,
          inventoryTitle,
          title: line.title || inventoryTitle || orderedSku,
          qty: Math.round(Number(line.qty || 0) || 0),
          orderId,
          orderName,
          orderLabel: orderName || orderId,
          orderKey: `order::${orderId}`,
          lineKey: orderedSku,
          customerName,
          customerEmail,
          customerPhone,
          shopifyUpdatedAtClient: detailVersion,
          positions,
          codes,
          firstCode: codes[0] || "",
          latestAt,
          source: "shopify_order_document",
        });
      }
    }
  } catch (err) {
    console.warn("shopify exact active order rows", err);
  }
  return out.sort((a, b) => {
    const ta = Number(a.latestAt || 0) || 0;
    const tb = Number(b.latestAt || 0) || 0;
    if (ta !== tb) return tb - ta;
    const oa = String(a.orderName || a.orderId || "");
    const ob = String(b.orderName || b.orderId || "");
    if (oa !== ob) return ob.localeCompare(oa, "it", { numeric: true, sensitivity: "base" });
    return String(a.sku || "").localeCompare(String(b.sku || ""));
  });
}

async function loadShopifyActiveOrdersExact(opts = {}) {
  if (__shopifyActiveOrdersState.loading && __shopifyActiveOrdersState.promise) {
    return await __shopifyActiveOrdersState.promise;
  }
  const syncVersion = shopifyFbmSyncLastCheckTs();
  const isFresh =
    __shopifyActiveOrdersState.loaded &&
    !opts.force &&
    __shopifyActiveOrdersState.syncVersion >= syncVersion &&
    Date.now() - __shopifyActiveOrdersState.loadedAtClient < 5 * 60 * 1000;
  if (isFresh) return __shopifyActiveOrdersState.items;

  __shopifyActiveOrdersState.loading = true;
  __shopifyActiveOrdersState.error = "";
  const task = (async () => {
    const api = state.firebase?.api;
    const db = state.firebase?.db;
    if (!api || !db) throw new Error("Firestore non inizializzato.");
    const q = api.query(
      api.collection(db, COL_SHOPIFY_FBM_ORDERS),
      api.where("active", "==", true),
      api.limit(250),
    );
    const snap = api.getDocsFromServer ? await api.getDocsFromServer(q) : await api.getDocs(q);
    const items = [];
    snap.forEach((docSnap) => items.push({ ...(docSnap.data() || {}), __docId: docSnap.id }));
    items.sort((a, b) => {
      const da = a?.orderDetails || {};
      const dbb = b?.orderDetails || {};
      const ta =
        Number(da.createdAtClient || a.shopifyCreatedAtClient || a.createdAtClient || 0) || 0;
      const tb =
        Number(dbb.createdAtClient || b.shopifyCreatedAtClient || b.createdAtClient || 0) || 0;
      return tb - ta;
    });
    __shopifyActiveOrdersState.items = items;
    __shopifyActiveOrdersState.loaded = true;
    __shopifyActiveOrdersState.loadedAtClient = Date.now();
    __shopifyActiveOrdersState.syncVersion = Math.max(syncVersion, shopifyFbmSyncLastCheckTs());
    return items;
  })();
  __shopifyActiveOrdersState.promise = task;
  try {
    return await task;
  } catch (err) {
    __shopifyActiveOrdersState.error = String(err?.message || err || "Errore ordini Shopify");
    throw err;
  } finally {
    __shopifyActiveOrdersState.loading = false;
    __shopifyActiveOrdersState.promise = null;
  }
}

function ensureShopifyActiveOrdersExact() {
  const syncVersion = shopifyFbmSyncLastCheckTs();
  const stale =
    !__shopifyActiveOrdersState.loaded ||
    __shopifyActiveOrdersState.syncVersion < syncVersion ||
    Date.now() - __shopifyActiveOrdersState.loadedAtClient >= 5 * 60 * 1000;
  if (stale && !__shopifyActiveOrdersState.loading) {
    void loadShopifyActiveOrdersExact()
      .then(() => {
        if (state.route?.view === "home" && pickingHomeView() === "pickingFbm")
          renderHomePickingBox();
      })
      .catch((err) => {
        console.warn("load exact Shopify FBM orders", err);
        if (state.route?.view === "home" && pickingHomeView() === "pickingFbm")
          renderHomePickingBox();
      });
  }
  return __shopifyActiveOrdersState;
}

function shopifyOrderDisplayNumber(...values) {
  for (const value of values) {
    let raw = squashWhitespace(value || "");
    if (!raw) continue;
    raw = raw.replace(/^ordine\s*/i, "").trim();
    if (/^#+/.test(raw)) return "#" + raw.replace(/^#+/, "");
    if (/^\d{1,9}$/.test(raw)) return "#" + raw;
    return raw;
  }
  return "Ordine Shopify";
}

function shopifyOrderDocId(value) {
  return String(value || "")
    .trim()
    .replace(/[\/\\?#\[\]*\x00-\x1F\x7F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 500);
}

function shopifyDateLabel(value) {
  try {
    if (value === null || value === undefined || value === "") return "—";
    let ts = 0;
    if (typeof value === "number" && Number.isFinite(value))
      ts = value > 1000000000000 ? value : value * 1000;
    else if (value?.toMillis) ts = value.toMillis();
    else ts = Date.parse(String(value));
    if (!Number.isFinite(ts) || ts <= 0) return squashWhitespace(value || "") || "—";
    return new Date(ts).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });
  } catch (_e) {
    return squashWhitespace(value || "") || "—";
  }
}

function shopifyText(value, fallback = "—") {
  const t = squashWhitespace(value || "");
  return t || fallback;
}

function shopifyMoney(value, currency = "") {
  const t = squashWhitespace(value || "");
  if (!t) return "—";
  return [t, squashWhitespace(currency || "")].filter(Boolean).join(" ");
}

function shopifyStatusClass(value) {
  const v = String(value || "").toLowerCase();
  if (/paid|fulfilled|shipped|reserved|active|success|complete/.test(v)) return "ok";
  if (/pending|partial|unfulfilled|open|authorized/.test(v)) return "warn";
  return "";
}

function shopifyContactLink(value, kind) {
  const raw = squashWhitespace(value || "");
  if (!raw) return "—";
  const href = kind === "email" ? `mailto:${raw}` : `tel:${raw.replace(/[^+\d]/g, "")}`;
  return `<a href="${escapeHtml(href)}">${escapeHtml(raw)}</a>`;
}

function shopifyAddressHtml(address) {
  const a = address && typeof address === "object" ? address : {};
  const lines = [];
  const nameCompany = [a.name, a.company].map((x) => squashWhitespace(x || "")).filter(Boolean);
  if (nameCompany.length) lines.push(nameCompany.join(" • "));
  const street = [a.address1, a.address2]
    .map((x) => squashWhitespace(x || ""))
    .filter(Boolean)
    .join(", ");
  if (street) lines.push(street);
  const city = [a.zip, a.city, a.provinceCode || a.province]
    .map((x) => squashWhitespace(x || ""))
    .filter(Boolean)
    .join(" ");
  if (city) lines.push(city);
  const country = [a.country, a.countryCode].map((x) => squashWhitespace(x || "")).filter(Boolean);
  if (country.length) lines.push(Array.from(new Set(country)).join(" • "));
  if (a.phone) lines.push(`Tel. ${squashWhitespace(a.phone)}`);
  if (!lines.length) return `<span class="muted">Non disponibile</span>`;
  return lines.map((x) => `<div>${escapeHtml(x)}</div>`).join("");
}

function shopifyDetailRow(label, valueHtml) {
  return `<div class="sodRow"><div class="sodLabel">${escapeHtml(label)}</div><div class="sodValue">${valueHtml || "—"}</div></div>`;
}

const __shopifyOrderDetailsCache = new Map();
const __shopifyOrderDetailsInflight = new Map();
let __shopifyOrderDetailsRequestSeq = 0;
let __shopifyOrderDetailsContext = null;

function shopifyOrderCachePut(orderId, data) {
  const key = shopifyOrderDocId(orderId);
  if (!key) return;
  __shopifyOrderDetailsCache.delete(key);
  __shopifyOrderDetailsCache.set(key, {
    data,
    cachedAt: Date.now(),
    version:
      Number(
        data?.shopifyUpdatedAtClient ||
          data?.orderDetails?.updatedAtClient ||
          data?.updatedAtClient ||
          0,
      ) || 0,
  });
  while (__shopifyOrderDetailsCache.size > 20) {
    const first = __shopifyOrderDetailsCache.keys().next().value;
    __shopifyOrderDetailsCache.delete(first);
  }
}

async function readShopifyOrderDetailsExact(orderId, opts = {}) {
  const key = shopifyOrderDocId(orderId);
  if (!key) throw new Error("ID ordine Shopify mancante.");
  const minVersion = Number(opts.minVersion || 0) || 0;
  const cached = __shopifyOrderDetailsCache.get(key);
  if (
    cached &&
    ((minVersion > 0 && cached.version >= minVersion) ||
      (minVersion <= 0 && Date.now() - cached.cachedAt < 60000))
  ) {
    return cached.data;
  }
  if (__shopifyOrderDetailsInflight.has(key)) return await __shopifyOrderDetailsInflight.get(key);
  const task = (async () => {
    const api = state.firebase?.api;
    const db = state.firebase?.db;
    if (!api || !db) throw new Error("Firestore non inizializzato.");
    const ref = api.doc(db, COL_SHOPIFY_FBM_ORDERS, key);
    const snap = api.getDocFromServer ? await api.getDocFromServer(ref) : await api.getDoc(ref);
    if (!snap?.exists?.()) throw new Error("Dettaglio ordine non trovato nel cloud.");
    const data = { ...(snap.data() || {}), __docId: snap.id };
    shopifyOrderCachePut(key, data);
    return data;
  })();
  __shopifyOrderDetailsInflight.set(key, task);
  try {
    return await task;
  } finally {
    __shopifyOrderDetailsInflight.delete(key);
  }
}

function renderShopifyOrderDetailsDoc(orderDoc, context = {}) {
  const root = orderDoc && typeof orderDoc === "object" ? orderDoc : {};
  const d = root.orderDetails && typeof root.orderDetails === "object" ? root.orderDetails : {};
  const customer = d.customer && typeof d.customer === "object" ? d.customer : {};
  const shipping =
    d.shippingAddress && typeof d.shippingAddress === "object" ? d.shippingAddress : {};
  const billing = d.billingAddress && typeof d.billingAddress === "object" ? d.billingAddress : {};
  const totals = d.totals && typeof d.totals === "object" ? d.totals : {};
  const lines = Array.isArray(d.lineItems) ? d.lineItems : [];
  const shippingLines = Array.isArray(d.shippingLines) ? d.shippingLines : [];
  const fulfillments = Array.isArray(d.fulfillments) ? d.fulfillments : [];
  const orderNo = shopifyOrderDisplayNumber(
    d.orderName,
    root.orderName,
    d.orderNumber,
    context.orderName,
    root.orderId,
    context.orderId,
  );
  const orderId = shopifyText(d.orderId || root.orderId || context.orderId, "—");
  const customerName = shopifyText(
    customer.name || shipping.name || root.customerName || context.customerName,
    "Cliente non disponibile",
  );
  const email = shopifyText(customer.email || d.email || root.customerEmail, "");
  const phone = shopifyText(
    customer.phone || d.phone || shipping.phone || billing.phone || root.customerPhone,
    "",
  );
  const currency = shopifyText(d.currency || root.currency, "");
  const financialStatus = shopifyText(d.financialStatus || root.financialStatus, "—");
  const fulfillmentStatus = shopifyText(
    d.fulfillmentStatus || root.fulfillmentStatus || root.status,
    "—",
  );
  const operationalStatus = shopifyText(
    root.reservationStatus || d.reservationStatus || root.status,
    "—",
  );
  const createdAt = d.createdAt || root.shopifyCreatedAt || root.createdAtClient || "";
  const updatedAt =
    d.updatedAt ||
    root.shopifyUpdatedAt ||
    root.shopifyUpdatedAtClient ||
    root.updatedAtClient ||
    "";

  const title = $("shopifyOrderDetailsTitle");
  const sub = $("shopifyOrderDetailsSub");
  const hint = $("shopifyOrderDetailsHint");
  if (title) title.textContent = `Ordine ${orderNo}`;
  if (sub) sub.textContent = `${customerName} • creato ${shopifyDateLabel(createdAt)}`;
  if (hint)
    hint.textContent = `Dati Shopify aggiornati ${shopifyDateLabel(updatedAt)} • lettura server eseguita solo all’apertura.`;

  const contactRows = [
    shopifyDetailRow("Cliente", escapeHtml(customerName)),
    shopifyDetailRow("Email", shopifyContactLink(email, "email")),
    shopifyDetailRow("Telefono", shopifyContactLink(phone, "phone")),
    customer.id
      ? shopifyDetailRow(
          "ID cliente",
          `<span class="mono">${escapeHtml(String(customer.id))}</span>`,
        )
      : "",
  ]
    .filter(Boolean)
    .join("");

  const orderRows = [
    shopifyDetailRow("Numero ordine", escapeHtml(orderNo)),
    shopifyDetailRow("ID Shopify", `<span class="mono">${escapeHtml(orderId)}</span>`),
    d.confirmationNumber
      ? shopifyDetailRow("Conferma", escapeHtml(String(d.confirmationNumber)))
      : "",
    shopifyDetailRow("Data ordine", escapeHtml(shopifyDateLabel(createdAt))),
    shopifyDetailRow("Ultimo aggiornamento", escapeHtml(shopifyDateLabel(updatedAt))),
    shopifyDetailRow("Pagamento", escapeHtml(financialStatus)),
    shopifyDetailRow("Evasione", escapeHtml(fulfillmentStatus)),
    shopifyDetailRow("Stato operativo", escapeHtml(operationalStatus)),
    shopifyDetailRow("Valuta", escapeHtml(currency || "—")),
  ]
    .filter(Boolean)
    .join("");

  const totalRows = [
    shopifyDetailRow(
      "Subtotale",
      escapeHtml(shopifyMoney(totals.subtotalPrice || totals.currentSubtotalPrice, currency)),
    ),
    shopifyDetailRow("Sconti", escapeHtml(shopifyMoney(totals.totalDiscounts, currency))),
    shopifyDetailRow("Spedizione", escapeHtml(shopifyMoney(totals.totalShippingPrice, currency))),
    shopifyDetailRow("Imposte", escapeHtml(shopifyMoney(totals.totalTax, currency))),
    shopifyDetailRow(
      "Totale",
      `<strong>${escapeHtml(shopifyMoney(totals.totalPrice || totals.currentTotalPrice || root.totalPrice, currency))}</strong>`,
    ),
    totals.totalOutstanding
      ? shopifyDetailRow("Da pagare", escapeHtml(shopifyMoney(totals.totalOutstanding, currency)))
      : "",
  ]
    .filter(Boolean)
    .join("");

  const productsHtml = lines.length
    ? `
        <div class="sodProducts">
          <div class="sodProductHead" aria-hidden="true">
            <div class="sodProductCell">SKU</div><div class="sodProductCell">Articolo</div><div class="sodProductCell right">Pezzi</div><div class="sodProductCell right">Prezzo</div>
          </div>
          ${lines
            .map((line) => {
              const qty = Number.isFinite(Number(line?.quantity))
                ? Math.round(Number(line.quantity))
                : 0;
              const currentQty = Number.isFinite(Number(line?.currentQuantity))
                ? Math.round(Number(line.currentQuantity))
                : null;
              const fulfillable = Number.isFinite(Number(line?.fulfillableQuantity))
                ? Math.round(Number(line.fulfillableQuantity))
                : null;
              const subParts = [
                line?.variantTitle,
                currentQty !== null && currentQty !== qty ? `Attuali: ${currentQty}` : "",
                fulfillable !== null ? `Da evadere: ${fulfillable}` : "",
              ].filter(Boolean);
              const priceParts = [
                shopifyMoney(line?.price, currency),
                line?.totalDiscount ? `Sconto ${shopifyMoney(line.totalDiscount, currency)}` : "",
              ].filter(Boolean);
              return `<div class="sodProductRow">
              <div class="sodProductCell"><div class="sodProductSku">${escapeHtml(line?.sku || "—")}</div></div>
              <div class="sodProductCell"><div class="sodProductName">${escapeHtml(line?.title || line?.sku || "Articolo")}</div>${subParts.length ? `<div class="sodProductSub">${escapeHtml(subParts.join(" • "))}</div>` : ""}</div>
              <div class="sodProductCell right"><span class="badge warn">${escapeHtml(String(qty))}</span></div>
              <div class="sodProductCell right"><div class="sodProductSub">${escapeHtml(priceParts.join(" • ") || "—")}</div></div>
            </div>`;
            })
            .join("")}
        </div>`
    : `<div class="muted">Nessuna riga articolo disponibile.</div>`;

  const shippingMethodHtml = shippingLines.length
    ? shippingLines
        .map(
          (x) =>
            `<div class="sodTrackingItem"><strong>${escapeHtml(x?.title || x?.code || "Spedizione")}</strong>${x?.price ? ` • ${escapeHtml(shopifyMoney(x.price, currency))}` : ""}${x?.source ? `<div class="muted">${escapeHtml(x.source)}</div>` : ""}</div>`,
        )
        .join("")
    : `<div class="muted">Metodo di spedizione non disponibile.</div>`;

  const trackingHtml = fulfillments.length
    ? fulfillments
        .map((f) => {
          const nums = Array.isArray(f?.trackingNumbers) ? f.trackingNumbers : [];
          const urls = Array.isArray(f?.trackingUrls) ? f.trackingUrls : [];
          const links = nums
            .map((n, i) => {
              const url = urls[i] || urls[0] || "";
              return url
                ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(n)}</a>`
                : escapeHtml(n);
            })
            .join(" • ");
          return `<div class="sodTrackingItem"><strong>${escapeHtml(f?.trackingCompany || f?.service || "Fulfillment")}</strong>${f?.status ? ` • ${escapeHtml(f.status)}` : ""}${links ? `<div>${links}</div>` : ""}${f?.createdAt ? `<div class="muted">${escapeHtml(shopifyDateLabel(f.createdAt))}</div>` : ""}</div>`;
        })
        .join("")
    : `<div class="muted">Nessun tracking disponibile.</div>`;

  const notes = [];
  if (d.note) notes.push(`<div><strong>Nota:</strong> ${escapeHtml(String(d.note))}</div>`);
  if (Array.isArray(d.tags) && d.tags.length)
    notes.push(`<div><strong>Tag:</strong> ${escapeHtml(d.tags.join(", "))}</div>`);
  if (Array.isArray(d.discountCodes) && d.discountCodes.length)
    notes.push(
      `<div><strong>Codici sconto:</strong> ${escapeHtml(
        d.discountCodes
          .map((x) => x?.code)
          .filter(Boolean)
          .join(", "),
      )}</div>`,
    );

  return `<div class="sodWrap">
        <div class="sodHero">
          <div><div class="sodOrderNo">${escapeHtml(orderNo)}</div><div class="sodHeroSub">${escapeHtml(customerName)} • ${escapeHtml(shopifyDateLabel(createdAt))}</div></div>
          <div class="sodStatusStack">
            <span class="sodStatus ${shopifyStatusClass(financialStatus)}">Pagamento: ${escapeHtml(financialStatus)}</span>
            <span class="sodStatus ${shopifyStatusClass(fulfillmentStatus)}">Evasione: ${escapeHtml(fulfillmentStatus)}</span>
          </div>
        </div>
        <div class="sodGrid">
          <section class="sodSection"><h3 class="sodTitle">Cliente e contatti</h3><div class="sodRows">${contactRows}</div></section>
          <section class="sodSection"><h3 class="sodTitle">Dati ordine</h3><div class="sodRows">${orderRows}</div></section>
          <section class="sodSection"><h3 class="sodTitle">Indirizzo di spedizione</h3><div class="sodAddress">${shopifyAddressHtml(shipping)}</div></section>
          <section class="sodSection"><h3 class="sodTitle">Indirizzo di fatturazione</h3><div class="sodAddress">${shopifyAddressHtml(billing)}</div></section>
          <section class="sodSection"><h3 class="sodTitle">Totali</h3><div class="sodRows">${totalRows}</div></section>
          <section class="sodSection"><h3 class="sodTitle">Metodo di spedizione</h3><div class="sodTrackingList">${shippingMethodHtml}</div></section>
          <section class="sodSection full"><h3 class="sodTitle">Articoli</h3>${productsHtml}</section>
          <section class="sodSection full"><h3 class="sodTitle">Tracking e fulfillment</h3><div class="sodTrackingList">${trackingHtml}</div></section>
          ${notes.length ? `<section class="sodSection full"><h3 class="sodTitle">Note e riferimenti</h3><div class="sodAddress">${notes.join("")}</div></section>` : ""}
        </div>
      </div>`;
}

async function openShopifyOrderDetailsSheet(context = {}) {
  const orderId = squashWhitespace(context.orderId || "");
  if (!orderId) {
    showToast(
      "Dettaglio non disponibile",
      "Questo elemento non contiene un ID ordine Shopify.",
      2400,
    );
    return;
  }
  const requestSeq = ++__shopifyOrderDetailsRequestSeq;
  __shopifyOrderDetailsContext = { ...context, orderId };
  const orderNo = shopifyOrderDisplayNumber(context.orderName, context.orderNumber, orderId);
  const title = $("shopifyOrderDetailsTitle");
  const sub = $("shopifyOrderDetailsSub");
  const hint = $("shopifyOrderDetailsHint");
  const content = $("shopifyOrderDetailsContent");
  if (title) title.textContent = `Ordine ${orderNo}`;
  if (sub)
    sub.textContent = context.customerName ? context.customerName : "Lettura dettaglio Shopify";
  if (hint) hint.textContent = "Apertura immediata; lettura esatta dal server in corso.";
  if (content)
    content.innerHTML = `<div class="shopifyOrderDetailLoading"><span class="shopifyOrderDetailSpinner" aria-hidden="true"></span><span>Caricamento dettaglio esatto Shopify…</span></div>`;
  openSheet("shopifyOrderDetails");

  try {
    const data = await readShopifyOrderDetailsExact(orderId, {
      minVersion: Number(context.updatedAtClient || 0) || 0,
    });
    if (
      requestSeq !== __shopifyOrderDetailsRequestSeq ||
      __shopifyOrderDetailsContext?.orderId !== orderId
    )
      return;
    if (content) content.innerHTML = renderShopifyOrderDetailsDoc(data, context);
  } catch (err) {
    console.error("Shopify order details", err);
    if (requestSeq !== __shopifyOrderDetailsRequestSeq) return;
    if (hint) hint.textContent = "Impossibile leggere il documento ordine dal cloud.";
    if (content)
      content.innerHTML = `<div class="sodError"><strong>Dettaglio non disponibile.</strong><br>${escapeHtml(String(err?.message || err || "Errore sconosciuto"))}</div>`;
  }
}

function closeShopifyOrderDetailsSheet() {
  __shopifyOrderDetailsRequestSeq++;
  __shopifyOrderDetailsContext = null;
  closeSheet("shopifyOrderDetails");
}

function shopifyFbmInventoryGroups(rowsInput = null) {
  const groups = new Map();
  const orderRows = Array.isArray(rowsInput) ? rowsInput : shopifyFbmInventoryOrderRows();
  const sourceName = Array.isArray(rowsInput) ? "shopify_order_documents" : "shopify_order_lines";
  for (const row of orderRows) {
    const orderedSku = toSkuId(row?.sku || "");
    if (!orderedSku) continue;

    // Raggruppa sullo SKU fisico inventario, non obbligatoriamente sullo SKU Shopify.
    // In questo modo gli alias FBM/FBA collegati (anche tramite ASIN) finiscono nello stesso widget.
    const hit = getItemBySkuAny(orderedSku, row?.loc || INVENTORY_CANONICAL_LOC);
    const sku =
      toSkuId(row?.stockSku || hit?.stockSku || hit?.it?.sku || hit?.it?.id || orderedSku) ||
      orderedSku;
    const qty = Math.abs(parseQty(row?.qty || 0) || 0);
    if (!sku || qty <= 0) continue;
    let g = groups.get(sku);
    if (!g) {
      g = {
        sku,
        orderedSkus: new Set(),
        title: "",
        qty: 0,
        locs: new Set(),
        flowIds: new Set(),
        flowNames: new Set(),
        orderKeys: new Set(),
        customerNames: new Set(),
        positionsMap: new Map(),
        firstCode: "",
        latestAt: 0,
        source: sourceName,
      };
      groups.set(sku, g);
    }
    g.orderedSkus.add(orderedSku);
    const inventoryTitle = squashWhitespace(
      row?.inventoryTitle || hit?.it?.title || hit?.it?.name || "",
    );
    const title = inventoryTitle || squashWhitespace(row.title || sku) || sku;
    const meta = parseTitleMeta(title);
    const cleanTitle = meta.main || title || sku;
    if (!g.title || cleanTitle.length > g.title.length) g.title = cleanTitle;
    g.qty += qty;
    const effectiveLoc = hit?.loc || row.loc;
    if (effectiveLoc) g.locs.add(effectiveLoc);
    if (row.orderId || row.orderName) g.orderKeys.add(row.orderName || row.orderId);
    if (row.orderName) g.flowNames.add(row.orderName);
    if (row.customerName) g.customerNames.add(row.customerName);
    const ts = Number(row.latestAt || 0) || 0;
    if (ts > g.latestAt) g.latestAt = ts;

    let parts = Array.isArray(row.positions) ? row.positions : [];
    if (!parts.length && hit?.it) {
      parts = rackLocationDisplayPartsFromItem(hit.it)
        .map((part) => ({
          code: normalizeRackLocation(part?.code || ""),
          qty: Number.isFinite(Number(part?.qty)) ? Math.round(Number(part.qty)) : 0,
          lot: part?.lot || "",
          lotLabel: part?.lotLabel || "",
        }))
        .filter((part) => part.code);
    }
    for (const part of parts) {
      const code = normalizeRackLocation(part?.code || "");
      if (!code) continue;
      const prev = g.positionsMap.get(code) || { code, qty: 0 };
      const pQty = Number(part?.qty || 0);
      if (Number.isFinite(pQty) && pQty > prev.qty) prev.qty = Math.round(pQty);
      g.positionsMap.set(code, prev);
      if (!g.firstCode) g.firstCode = code;
    }
  }

  return Array.from(groups.values())
    .map((g) => {
      const positions = Array.from(g.positionsMap.values()).sort((a, b) =>
        String(a.code).localeCompare(String(b.code)),
      );
      const orderCount = g.orderKeys.size || g.flowIds.size || g.flowNames.size || 0;
      return {
        sku: g.sku,
        orderedSkus: Array.from(g.orderedSkus),
        title: g.title || g.sku,
        qty: Math.round(g.qty || 0),
        locs: Array.from(g.locs),
        flowCount: orderCount,
        flowNames: Array.from(g.flowNames),
        customerNames: Array.from(g.customerNames),
        positions,
        firstCode: g.firstCode || positions[0]?.code || "",
        latestAt: g.latestAt || 0,
        source: g.source || sourceName,
      };
    })
    .filter((g) => g.sku && g.qty > 0)
    .sort((a, b) => {
      const pa = a.positions?.[0]?.code || "";
      const pb = b.positions?.[0]?.code || "";
      if (pa && pb && pa !== pb) return pa.localeCompare(pb);
      if (pa && !pb) return -1;
      if (!pa && pb) return 1;
      return String(a.sku).localeCompare(String(b.sku));
    });
}

function shopifyFbmOrderLogStatus() {
  try {
    let loaded = true;
    let loading = false;
    for (const loc of INVENTORY_ALL_CLOUD_LOCS) {
      const lg = state.logs?.[loc] || {};
      const mode = String(lg.mode || lg.meta?.mode || "");
      const modeOk = mode === "fbm" || mode === "full";
      if (lg.loading && modeOk) loading = true;
      if (!(lg.meta?.loaded && modeOk)) loaded = false;
    }
    return { loaded, loading };
  } catch (_e) {
    return { loaded: false, loading: false };
  }
}

function ensureShopifyFbmOrderLogsStarted() {
  try {
    if (!state.firebase.ok || !state.user?.isWhitelisted) return shopifyFbmOrderLogStatus();
    const st = shopifyFbmOrderLogStatus();
    if (st.loaded || st.loading) return st;
    startLogsFor(INVENTORY_CANONICAL_LOC, { mode: "fbm", staleMs: 45000 });
    return shopifyFbmOrderLogStatus();
  } catch (_e) {
    return shopifyFbmOrderLogStatus();
  }
}

function shopifyFbmActiveOrderFlowsFromLogs() {
  try {
    const st = shopifyFbmOrderLogStatus();
    if (!st.loaded) return [];
    return getPickingCandidateFlows()
      .filter((flow) => isShopifyFbmFlow(flow))
      .filter((flow) => !pickingFlowStats(flow).done);
  } catch (_e) {
    return [];
  }
}

function shopifyFbmOrderRowsFromFlows(flows) {
  const rows = [];
  const seen = new Set();
  try {
    for (const flow0 of Array.isArray(flows) ? flows : []) {
      const flow = flow0 || {};
      if (!isShopifyFbmFlow(flow)) continue;
      if (pickingFlowStats(flow).done) continue;
      const loc =
        flow.location === "cerea" || flow.location === "concamarise"
          ? flow.location
          : "concamarise";
      const flowId = String(flow.id || flow.workflowId || "").trim();
      const shop = flow.shopify && typeof flow.shopify === "object" ? flow.shopify : {};
      const displayName = squashWhitespace(flowDisplayName(flow) || "");

      let orderId = squashWhitespace(
        shopifyFbmFirstText(shop, [
          "orderId",
          "shopifyOrderId",
          "admin_graphql_api_id",
          "adminGraphqlApiId",
          "id",
          "legacyResourceId",
          "order_id",
        ]) ||
          shopifyFbmFirstText(flow, [
            "shopifyOrderId",
            "orderId",
            "admin_graphql_api_id",
            "adminGraphqlApiId",
            "legacyResourceId",
            "order_id",
          ]) ||
          flowId,
      );
      let orderName = squashWhitespace(
        shopifyFbmFirstText(shop, [
          "name",
          "orderName",
          "shopifyOrderName",
          "orderNumber",
          "order_number",
          "orderLabel",
          "numeroOrdine",
          "numero_ordine",
        ]) ||
          shopifyFbmFirstText(flow, [
            "shopifyOrderName",
            "orderName",
            "orderNumber",
            "order_number",
            "orderLabel",
            "numeroOrdine",
            "numero_ordine",
          ]) ||
          "",
      );
      let orderLabel = squashWhitespace(orderName || displayName || orderId || "Ordine Shopify");
      if (!orderName && orderLabel) {
        const stripped = orderLabel.replace(/^shopify\s*/i, "").trim();
        if (/^#{0,3}\s*\d+\b/.test(stripped) || /^ORD[-\s#]*\d+\b/i.test(stripped))
          orderName = stripped;
      }
      if (!orderId && flowId) orderId = flowId;

      const customerName = squashWhitespace(
        shopifyFbmCustomerNameFromSource(shop, flow) ||
          shopifyFbmFirstText(flow, [
            "customerName",
            "shopifyCustomerName",
            "customerDisplayName",
            "cliente",
            "customerEmail",
          ]) ||
          "",
      );
      const customerEmail = squashWhitespace(
        shopifyFbmFirstText(shop, ["customerEmail", "email"]) ||
          shopifyFbmFirstText(flow, ["customerEmail", "shopifyCustomerEmail"]) ||
          "",
      );
      const customerPhone = squashWhitespace(
        shopifyFbmFirstText(shop, ["customerPhone", "phone"]) ||
          shopifyFbmFirstText(flow, ["customerPhone", "shopifyCustomerPhone"]) ||
          "",
      );
      const shopifyUpdatedAtClient =
        Number(shop.updatedAtClient || flow.shopifyUpdatedAtClient || 0) || 0;
      const flowTs =
        pickingFlowStableBaseTs(flow) ||
        Number(flow.appliedAtClient || flow.createdAtClient || 0) ||
        flowLogTimestamp(flow) ||
        0;
      const lines = Array.isArray(flow.lines) ? flow.lines : [];
      lines.forEach((line0, idx) => {
        const line = line0 || {};
        const sku = toSkuId(line.sku || line.SKU || "");
        const qty = Math.abs(shopifyFbmLineQtyStrict(line) || 0);
        if (!sku || qty <= 0) return;
        if (isPickingLinePicked(flow, sku)) return;
        const title = pickingLineTitle(line, flow) || sku;
        const positions = pickingLinePositionParts(flow, sku)
          .map((p) => ({
            code: normalizeRackLocation(p?.code || ""),
            qty: Number.isFinite(Number(p?.qty)) ? Math.round(Number(p.qty)) : 0,
            lot: p?.lot || "",
            lotLabel: p?.lotLabel || "",
          }))
          .filter((p) => p.code);
        const codes = positions.map((p) => p.code).filter(Boolean);
        const firstCode = codes[0] || "";
        const lineId =
          shopifyFbmFirstText(line, [
            "lineItemId",
            "line_item_id",
            "lineId",
            "line_id",
            "admin_graphql_api_id",
            "adminGraphqlApiId",
            "id",
            "variantId",
            "variant_id",
          ]) || String(idx);
        const rowKey = [
          "flow",
          loc,
          flowId || orderId || orderName || orderLabel,
          lineId,
          sku,
          qty,
        ].join("::");
        if (seen.has(rowKey)) return;
        seen.add(rowKey);
        rows.push({
          loc,
          sku,
          title,
          qty: Math.round(qty),
          orderId,
          orderName,
          orderLabel,
          orderKey: flowId ? `flow::${flowId}` : orderName || orderId ? "" : rowKey,
          lineKey: sku,
          flowId,
          customerName,
          customerEmail,
          customerPhone,
          shopifyUpdatedAtClient,
          positions,
          codes,
          firstCode,
          latestAt: flowTs,
          source: "flow_order",
        });
      });
    }
  } catch (err) {
    console.warn("shopify fbm flow order rows", err);
  }
  return rows.sort((a, b) => {
    const oa = String(a.orderName || a.orderId || a.orderLabel || "");
    const ob = String(b.orderName || b.orderId || b.orderLabel || "");
    if (oa && ob && oa !== ob)
      return oa.localeCompare(ob, "it", { numeric: true, sensitivity: "base" });
    if (oa && !ob) return -1;
    if (!oa && ob) return 1;
    return String(a.sku || "").localeCompare(String(b.sku || ""));
  });
}

function updateFbmPreviewFromInventory(source = "inventory_pending") {
  try {
    // Appena i documenti ordine esatti sono disponibili, widget e contatore usano
    // la stessa identica fonte della lista ordini. L'inventario resta fallback solo
    // durante il caricamento o in caso di errore della query ordini.
    const exactReady = __shopifyActiveOrdersState.loaded && !__shopifyActiveOrdersState.error;
    const rows = exactReady
      ? shopifyExactOrderRowsFromDocs(__shopifyActiveOrdersState.items)
      : null;
    const groups = exactReady ? shopifyFbmInventoryGroups(rows) : shopifyFbmInventoryGroups();
    setPickingPreviewCount(
      "fbm",
      groups.length,
      exactReady ? "exact_orders_" + String(source || "") : source,
    );
    return groups;
  } catch (_e) {
    return [];
  }
}

function renderFastFbmPickingFromInventory(box, list, count, hint, btnPickAll) {
  try {
    const exactOrdersState = ensureShopifyActiveOrdersExact();
    const orderRows = exactOrdersState.loaded
      ? shopifyExactOrderRowsFromDocs(exactOrdersState.items)
      : [];
    const groups = updateFbmPreviewFromInventory("inventory_fbm_render");
    const orderRowsSource = exactOrdersState.loading
      ? "loading_orders"
      : exactOrdersState.error
        ? "orders_error"
        : "order_documents";
    const sub = $("homePickingSub");
    if (sub)
      sub.textContent =
        "Ordini Shopify da evadere dal magazzino. Prepara i pezzi: l’inventario scende quando Shopify segna l’ordine come spedito.";
    if (btnPickAll) {
      btnPickAll.disabled = true;
      btnPickAll.hidden = true;
    }
    if (count) count.textContent = fmtN(groups.length) + " SKU";
    applyPickingPreviewNavCounts("—");

    if (!inventoryReady()) {
      if (list) list.innerHTML = uiEmpty("Caricamento inventario…");
      if (hint) hint.textContent = "";
      renderHomePickingHistoryBox();
      return true;
    }

    const syncErr = /errore/i.test(shopifyFbmSyncCaption());
    const totalPieces = groups.reduce((a, g) => a + (Number(g.qty) || 0), 0);
    const skuCards = groups.length
      ? groups
          .map((group) => {
            const groupCodes = (group.positions || [])
              .slice()
              .sort((a, b) => Number(b?.qty || 0) - Number(a?.qty || 0))
              .map((p) => p.code);
            const findBtnHtml = findPalletButtonHtml(group.firstCode || "", groupCodes, {
              sku: group.sku,
              title: group.title || group.sku,
            });
            const orders = Number(group.flowCount || 0);
            return `
            <article class="pick-line pick-line--fbm">
              <div class="pick-where">${uiLocList(group.positions, { size: "lg", none: "Senza posizione" })}</div>
              <div class="pick-what"><span class="pick-title">${escapeHtml(group.title || group.sku)}</span><span class="pick-sub"><span class="sku">${escapeHtml(group.sku)}</span>${orders ? `<span>${orders === 1 ? "1 ordine" : escapeHtml(fmtN(orders)) + " ordini"}</span>` : ""}</span></div>
              <div class="pick-qty"><strong>${escapeHtml(fmtN(group.qty))}</strong><span>pz</span></div>
              <div class="pick-actions">${findBtnHtml}</div>
            </article>`;
          })
          .join("")
      : uiEmpty("Nessun SKU da preparare", "Non ci sono ordini Shopify FBM aperti.");

    const orderGroups = shopifyFbmInventoryOrdersGrouped(orderRows);
    let ordersHtml = "";
    if (!orderGroups.length) {
      ordersHtml =
        orderRowsSource === "loading_orders"
          ? uiEmpty("Caricamento ordini Shopify…")
          : orderRowsSource === "orders_error"
            ? uiEmpty(
                "Ordini non disponibili",
                `Lettura non riuscita: ${__shopifyActiveOrdersState.error || "dati non disponibili"}. Riapri la sezione per riprovare.`,
              )
            : uiEmpty("Nessun ordine aperto");
    } else {
      ordersHtml = orderGroups
        .map((order) => {
          const orderId = squashWhitespace(order.orderId || "");
          const orderNumber = shopifyOrderDisplayNumber(
            order.orderNumber,
            order.orderName,
            order.orderLabel,
            orderId,
          );
          const customer = squashWhitespace(order.customerName || "") || "Cliente non disponibile";
          const head = orderId
            ? `<button class="order-head" type="button" data-action="openShopifyOrderDetails" data-order-id="${escapeHtml(orderId)}" data-order-name="${escapeHtml(order.orderName || order.orderNumber || order.orderLabel || "")}" data-customer-name="${escapeHtml(customer)}" data-order-updated="${escapeHtml(String(order.shopifyUpdatedAtClient || 0))}"><span class="order-no">${escapeHtml(orderNumber)}</span><span class="order-customer">${escapeHtml(customer)}</span>${ICON.chev}</button>`
            : `<div class="order-head is-static"><span class="order-no">${escapeHtml(orderNumber)}</span><span class="order-customer">${escapeHtml(customer)}</span></div>`;
          const lines = (order.lines || [])
            .map(
              (line) =>
                `<li><span class="order-art"><b>${escapeHtml(squashWhitespace(line.title || line.sku || "Articolo"))}</b><span class="sku">${escapeHtml(toSkuId(line.sku || ""))}</span></span><span class="order-qty">${escapeHtml(fmtN(Math.max(0, Math.round(Number(line.qty || 0) || 0))))} pz</span></li>`,
            )
            .join("");
          return `<article class="order">${head}<ul class="order-lines">${lines}</ul></article>`;
        })
        .join("");
    }

    if (list) {
      list.innerHTML = `
        <div class="fbm">
          <div class="fbm-bar">
            <span class="sync" data-state="${syncErr ? "error" : "ok"}"><span class="live-dot" aria-hidden="true"></span>${escapeHtml(shopifyFbmSyncCaption())}</span>
            <button class="btn btn--ghost btn--sm" type="button" data-action="uploadBrtLabels" ${__brtLabelUploadBusy ? "disabled" : ""}>${ICON.upload}<span data-brt-label>${__brtLabelUploadBusy ? "Elaborazione etichette…" : "Carica etichette BRT"}</span></button>
          </div>
          <section class="block">
            <header class="sec-head"><h3>Da preparare</h3><span class="sec-meta">${escapeHtml(fmtN(groups.length))} SKU, ${escapeHtml(fmtN(totalPieces))} pz</span>${groups.length ? `<button class="link-btn" type="button" data-action="mapFbm">${ICON.map}<span>Posizioni sulla mappa</span></button>` : ""}</header>
            <div class="pick-lines">${skuCards}</div>
          </section>
          <section class="block">
            <header class="sec-head"><h3>Ordini</h3>${orderGroups.length ? `<span class="sec-meta">${escapeHtml(fmtN(orderGroups.length))} ${orderGroups.length === 1 ? "ordine" : "ordini"}</span>` : ""}</header>
            <div class="orders">${ordersHtml}</div>
          </section>
        </div>`;
    }
    if (hint) hint.textContent = "";
    renderHomePickingHistoryBox();
    return true;
  } catch (err) {
    console.warn("render fast FBM picking", err);
    return false;
  }
}

function pickingCandidateFlowsFromArray(allFlows) {
  const out = [];
  for (const f0 of Array.isArray(allFlows) ? allFlows : []) {
    const f = f0 || {};
    if (String(f?.kind || "").toLowerCase() !== "scarica") continue;
    if (f?.voided) continue;
    if (!isPickingManagedFlow(f)) continue;
    const lines = Array.isArray(f.lines)
      ? f.lines.filter((l) => toSkuId(l?.sku || "") && parseQty(l?.qty || 0))
      : [];
    if (!lines.length) continue;
    out.push({ ...f, location: f.location || "concamarise", lines });
  }
  out.sort(
    (a, b) =>
      pickingFlowStableBaseTs(b) - pickingFlowStableBaseTs(a) ||
      String(b.id || "").localeCompare(String(a.id || "")),
  );
  return out;
}

function countFbmPickingSkuGroupsForPreview(flows) {
  const seen = new Set();
  for (const flow of Array.isArray(flows) ? flows : []) {
    if (!isShopifyFbmFlow(flow)) continue;
    if (pickingFlowStats(flow).done) continue;
    const lines = Array.isArray(flow?.lines) ? flow.lines : [];
    for (const line of lines) {
      const sku = toSkuId(line?.sku || "");
      const qty = Math.abs(parseQty(line?.qty || 0) || 0);
      if (!sku || !qty) continue;
      if (isPickingLinePicked(flow, sku)) continue;
      seen.add(sku);
    }
  }
  return seen.size;
}

function pickingPreviewCountsFromFlows(flows) {
  const candidates = pickingCandidateFlowsFromArray(flows);
  const fbmFlows = candidates.filter((f) => isShopifyFbmFlow(f));
  const fbaFlows = candidates.filter((f) => !isShopifyFbmFlow(f));
  return {
    fbm: countFbmPickingSkuGroupsForPreview(fbmFlows),
    fba: fbaFlows.filter((f) => !pickingFlowStats(f).done).length,
  };
}

function updatePickingPreviewCountsFromCurrentLogs(source = "logs") {
  try {
    if (!logsRealtimeLoaded()) return;
    const flows = getPickingCandidateFlows();
    const mode =
      state.logs?.[INVENTORY_CANONICAL_LOC]?.mode ||
      state.logs?.[INVENTORY_CANONICAL_LOC]?.meta?.mode ||
      "";
    const counts = pickingPreviewCountsFromFlows(flows);
    if (mode === "fbm") {
      setPickingPreviewCount("fbm", counts.fbm, source);
    } else if (mode === "fba") {
      setPickingPreviewCount("fba", counts.fba, source);
    } else if (mode === "full" || !mode) {
      setPickingPreviewCount("fbm", counts.fbm, source);
      setPickingPreviewCount("fba", counts.fba, source);
    }
  } catch (_e) {}
}

async function fetchPickingPreviewFlowsForLocMode(loc, mode) {
  const api = state.firebase?.api;
  const db = state.firebase?.db;
  if (!api || !db || !api.getDocs) return [];
  const colRef = api.collection(db, COL_ROOT, loc, SUB_LOGS);
  const map = new Map();
  const addSnap = (snap) => {
    try {
      snap.forEach((docSnap) => {
        const flow = normalizeFlowLogDoc(docSnap, loc);
        map.set(flow.id, flow);
      });
    } catch (_e) {}
  };

  if (mode === "fba") {
    // FBA/PDF: prima leggo solo stati operativi; fallback ridotto sui recenti.
    for (const st of ["RESERVED", "PARTIAL_PICKED"]) {
      try {
        addSnap(await api.getDocs(api.query(colRef, api.where("status", "==", st), api.limit(60))));
      } catch (_e) {}
    }
    try {
      const snap = await api.getDocs(
        api.query(colRef, api.orderBy("appliedAtClient", "desc"), api.limit(40)),
      );
      addSnap(snap);
    } catch (err) {
      console.warn("preview fba count", loc, err);
    }
  } else {
    const queries = [];
    try {
      queries.push(api.query(colRef, api.where("source", "==", "shopify_fbm"), api.limit(80)));
    } catch (_e) {}
    try {
      queries.push(api.query(colRef, api.where("source", "==", "shopify"), api.limit(60)));
    } catch (_e) {}
    try {
      queries.push(api.query(colRef, api.where("fileName", "==", "SHOPIFY_FBM"), api.limit(80)));
    } catch (_e) {}
    for (const q of queries) {
      try {
        addSnap(await api.getDocs(q));
      } catch (err) {
        console.warn("preview fbm count", loc, err);
      }
    }
  }
  return Array.from(map.values());
}

async function refreshPickingPreviewCounts(reason = "", opts = {}) {
  const p = pickingPreviewState();
  if (!state.firebase.ok || !state.user?.isWhitelisted) return;
  if (p.busy) {
    schedulePickingPreviewCounts(reason || "busy_retry", { delay: 1200, ...opts });
    return;
  }

  try {
    p.busy = true;
    // FBM: conteggio immediato da inventario. Non fa query /logs.
    updateFbmPreviewFromInventory("preview_inventory_" + String(reason || ""));
    updatePickingPreviewCountsFromCurrentLogs("current_" + String(reason || ""));

    const view = pickingHomeView();
    const allowRemote =
      opts?.includeRemote === true || view === "pickingFba" || view === "pickingHistory";
    if (opts?.inventoryOnly === true || !allowRemote) {
      applyPickingPreviewNavCounts("—");
      return;
    }

    const maxAge = Number(opts.maxAgeMs || 45000);
    const now = Date.now();
    const need = [];
    // Il remoto serve solo per FBA/PDF. FBM è già coperto da pending inventario.
    if (view === "pickingFba" || view === "pickingHistory" || opts?.includeFba === true) {
      const freshFba = p.fba.loaded && now - Number(p.fba.updatedAtClient || 0) < maxAge;
      if (!freshFba) need.push("fba");
    }

    if (!need.length) return;
    need.forEach(setPickingPreviewLoading);

    for (const mode of need) {
      const flows = [];
      for (const loc of INVENTORY_ALL_CLOUD_LOCS) {
        const part = await fetchPickingPreviewFlowsForLocMode(loc, mode);
        flows.push(...part);
      }
      const counts = pickingPreviewCountsFromFlows(flows);
      setPickingPreviewCount(mode, counts[mode], "preview_" + String(reason || mode));
    }
  } catch (err) {
    console.warn("picking preview counts", err);
    for (const k of ["fbm", "fba"]) {
      if (p[k]) p[k].loading = false;
    }
    applyPickingPreviewNavCounts("—");
  } finally {
    p.busy = false;
  }
}

function schedulePickingPreviewCounts(reason = "", opts = {}) {
  try {
    const p = pickingPreviewState();
    if (p.timer && !opts.force) return;
    if (p.timer) clearTimeout(p.timer);
    const delay = Number.isFinite(Number(opts.delay)) ? Math.max(0, Number(opts.delay)) : 600;
    p.timer = setTimeout(() => {
      p.timer = null;
      void refreshPickingPreviewCounts(reason, opts);
    }, delay);
  } catch (_e) {}
}

// --- Riordini Tabellone WRITE: live cloud + backfill pregresso ---

// --- Tabellone WRITE completati Amazon: self-healing movimenti + combo ---

function readFlowLogTimestamp(v) {
  try {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number" && Number.isFinite(v)) {
      if (v > 1000000000000) return v;
      if (v > 1000000000) return v * 1000; // supporta timestamp in secondi
      return v;
    }
    if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n) && n > 1000000000000) return n;
      if (Number.isFinite(n) && n > 1000000000) return n * 1000; // supporta timestamp in secondi
      const d = Date.parse(v);
      return Number.isFinite(d) ? d : 0;
    }
    if (v && typeof v.toMillis === "function") return v.toMillis();
    if (v && typeof v.seconds === "number") return v.seconds * 1000;
    return 0;
  } catch (_e) {
    return 0;
  }
}

function flowLogTimestamp(flow) {
  const f = flow || {};
  const s = f.shopify && typeof f.shopify === "object" ? f.shopify : {};
  const r = f.reservation && typeof f.reservation === "object" ? f.reservation : {};
  const p = f.picking && typeof f.picking === "object" ? f.picking : {};

  // IMPORTANTE: timestamp log = data evento, NON data aggiornamento documento.
  // updatedAtClient/updatedAt cambiano a ogni sync/realtime e facevano sembrare
  // tutti i log appena scaricati/ristampati all'avvio del kiosk.
  const candidates = [
    f.appliedAtClient,
    f.doneAtClient,
    f.createdAtClient,
    f.importedAtClient,
    f.orderCreatedAtClient,
    f.completedAtClient,
    f.appliedAt,
    f.doneAt,
    f.createdAt,
    s.createdAtClient,
    s.orderCreatedAtClient,
    s.created_at,
    s.createdAt,
    s.orderCreatedAt,
    r.reservedAtClient,
    r.pickedAtClient,
    p.flowPickedAtClient,
    p.pickedAtClient,
  ];

  if (Array.isArray(p.events)) {
    for (const ev0 of p.events) {
      const ev = ev0 || {};
      candidates.push(
        ev.atClient,
        ev.pickedAtClient,
        ev.undoneAtClient,
        ev.createdAtClient,
        ev.tsClient,
        ev.timestampClient,
      );
    }
  }

  return candidates.reduce((max, v) => Math.max(max, readFlowLogTimestamp(v)), 0);
}

function shopifyFlowLinesFromData(d) {
  const src = d || {};
  const shop = src.shopify && typeof src.shopify === "object" ? src.shopify : {};
  const candidates = [
    src.lines,
    src.lineItems,
    src.items,
    src.orderLines,
    src.products,
    shop.lines,
    shop.lineItems,
    shop.items,
    shop.orderLines,
  ];
  const raw = candidates.find((x) => Array.isArray(x)) || [];
  const out = [];
  for (const x0 of raw) {
    const x = x0 && typeof x0 === "object" ? x0 : {};
    const sku = toSkuId(
      x.sku ||
        x.SKU ||
        x.code ||
        x.productSku ||
        x.variantSku ||
        x.amazonSku ||
        x.amazonInventorySku ||
        "",
    );
    const qty = parseQty(
      x.qty ??
        x.quantity ??
        x.quantityOrdered ??
        x.fulfillableQuantity ??
        x.currentQuantity ??
        x.pieces ??
        x.qta ??
        0,
    );
    if (!sku || !Number.isFinite(qty) || qty === 0) continue;
    const title =
      squashWhitespace(
        x.title || x.name || x.productTitle || x.variantTitle || x.amazonInventoryTitle || sku,
      ) || sku;
    out.push({ sku, title, qty: Math.abs(qty) });
  }
  return out;
}

function normalizeFlowLogDoc(docSnap, loc) {
  const d = docSnap.data() || {};
  const shop = d.shopify && typeof d.shopify === "object" ? d.shopify : {};
  const lines = Array.isArray(d.lines) ? d.lines : shopifyFlowLinesFromData(d);
  const ts = flowLogTimestamp(d);
  // Timestamp stabile: gli updatedAtClient cambiano a ogni sync Shopify e non devono
  // far "saltare" i flussi o ristampare lo storico come se fossero nuovi.
  const stableTs =
    readFlowLogTimestamp(d.appliedAtClient) ||
    pickingFlowStableBaseTs(d) ||
    readFlowLogTimestamp(d.createdAtClient) ||
    readFlowLogTimestamp(d.createdAt) ||
    ts;
  const src = String(d.source || shop.source || "").trim();
  const srcLower = src.toLowerCase();
  // Classificazione stretta: orderId/orderName generici non sono segnali Shopify.
  // Alcuni flussi FBA li hanno e finivano nel ramo FBM.
  const looksShopify = isShopifyFbmFlow({
    ...d,
    id: docSnap.id,
    shopify: shop,
    source: src,
    fileName: d.fileName,
  });
  const shopId = looksShopify
    ? String(
        shop.orderId ||
          shop.admin_graphql_api_id ||
          shop.id ||
          d.shopifyOrderId ||
          (srcLower.includes("shopify") ? d.orderId : "") ||
          "",
      ).trim()
    : "";
  const shopName = looksShopify
    ? String(
        shop.name ||
          d.shopifyOrderName ||
          (srcLower.includes("shopify") ? d.orderName : "") ||
          shopId ||
          "",
      ).trim()
    : "";
  const workflowId =
    d.workflowId ||
    (d.workflow && d.workflow.id ? d.workflow.id : "") ||
    (looksShopify ? `SHOPIFY-${shopName || shopId || docSnap.id}` : "");
  const workflowLabel =
    d.workflowLabel ||
    (d.workflow && d.workflow.label ? d.workflow.label : "") ||
    (looksShopify ? `Shopify ${shopName || shopId || docSnap.id}` : "");
  const totalPieces = Number.isFinite(Number(d.totalPieces))
    ? Number(d.totalPieces)
    : lines.reduce((a, x) => a + Math.abs(parseQty(x.qty) || 0), 0);
  const totalLines = Number.isFinite(Number(d.totalLines)) ? Number(d.totalLines) : lines.length;
  const reservation =
    d.reservation && typeof d.reservation === "object"
      ? d.reservation
      : looksShopify
        ? { active: true, status: "in_attesa_shopify_spedito", totalPieces }
        : {};
  const picking =
    d.picking && typeof d.picking === "object"
      ? d.picking
      : looksShopify
        ? {
            status: "da_prelevare",
            managedByPicking: true,
            shopifyControlled: true,
            pickedLines: {},
            flowPicked: false,
          }
        : {};
  return {
    ...d,
    id: docSnap.id,
    kind: looksShopify ? "scarica" : d.kind || "",
    location: d.location || loc,
    fileName: d.fileName || (looksShopify ? "SHOPIFY_FBM" : ""),
    appliedAtClient: readFlowLogTimestamp(d.appliedAtClient) || stableTs || ts,
    appliedBy: d.appliedBy || d.createdBy || d.createdByEmail || "",
    status: d.status || (looksShopify ? "RESERVED" : ""),
    source: d.source || shop.source || (looksShopify ? "shopify_fbm" : ""),
    reservation,
    shopify: shop,
    // Mantengo updatedAtClient come dato tecnico, ma non viene usato per ordinare/mostrare il log.
    updatedAtClient: readFlowLogTimestamp(d.updatedAtClient) || 0,
    createdAtClient:
      readFlowLogTimestamp(d.createdAtClient) ||
      readFlowLogTimestamp(shop.createdAtClient) ||
      stableTs ||
      0,
    totalLines,
    totalPieces,
    workflow: d.workflow || null,
    workflowId,
    workflowLabel,
    comboApplied: d.comboApplied === true,
    comboVersion: Number.isFinite(Number(d.comboVersion)) ? Number(d.comboVersion) : 0,
    comboLines: Array.isArray(d.comboLines) ? d.comboLines : [],
    comboTotalPieces: Number.isFinite(Number(d.comboTotalPieces)) ? Number(d.comboTotalPieces) : 0,
    voided: d.voided === true,
    voidedAtClient: typeof d.voidedAtClient === "number" ? d.voidedAtClient : 0,
    voidedBy: d.voidedBy || "",
    picking,
    lines,
  };
}

function renderLogsForLoc(loc) {
  if (state.route.view !== "home") return;
  const view = pickingHomeView();
  if (view === "pickingFbm" || view === "pickingFba") renderHomePickingBox();
  if (view === "pickingHistory") renderHomePickingHistoryBox();
}

function startLogsFor(loc, opts = {}) {
  try {
    if (!state.firebase.ok || !state.user?.isWhitelisted) return;
    if (!(loc === "cerea" || loc === "concamarise")) return;

    const lg = state.logs[loc];
    const rawMode = opts && opts.mode;
    const requestedMode = rawMode === "fba" || rawMode === "fbm" ? rawMode : "full";
    const now = Date.now();
    const currentMode = lg.mode || lg.meta?.mode || "";
    const staleMs = Number(opts?.staleMs || (requestedMode === "full" ? 45000 : 25000));
    const loadedAt = Number(lg.loadedAtClient || 0) || 0;
    const localMutationSeqAtStart = Number(lg.localMutationSeq || 0) || 0;
    const preserveLoadedFlows = !!(
      opts?.forceReload &&
      currentMode === requestedMode &&
      lg.meta?.loaded &&
      Array.isArray(lg.flows) &&
      lg.flows.length
    );

    // Nessun listener realtime sui log: il frontend fa una lettura one-shot mirata.
    // Se è già fresco, non riscarica nulla.
    if (
      !opts?.forceReload &&
      lg.meta?.loaded &&
      currentMode === requestedMode &&
      now - loadedAt < staleMs
    ) {
      return;
    }
    if (lg.loading && currentMode === requestedMode) return;

    try {
      lg.unsub && lg.unsub();
    } catch (_e) {}
    try {
      if (lg._mergeTimer) {
        clearTimeout(lg._mergeTimer);
        lg._mergeTimer = null;
      }
    } catch (_e) {}

    const api = state.firebase.api;
    const db = state.firebase.db;
    const colRef = api.collection(db, COL_ROOT, loc, SUB_LOGS);
    const maps = {
      applied: new Map(),
      shopifySource: new Map(),
      shopifySourcePlain: new Map(),
      shopifyFile: new Map(),
    };

    lg.loading = true;
    lg.mode = requestedMode;
    lg.unsub = () => {}; // compatibilità con logsRealtimeStarted(), ma non apre socket realtime.
    // Durante il riallineamento post-prelievo non svuotare i flussi già operativi:
    // i pulsanti successivi devono restare agganciati allo stesso flow mentre la query è in volo.
    if (!preserveLoadedFlows) lg.flows = [];
    lg.meta = preserveLoadedFlows
      ? {
          ...(lg.meta || {}),
          count: lg.flows.length,
          loaded: true,
          expected: 0,
          seen: 0,
          mode: requestedMode,
          oneShot: true,
          refreshing: true,
        }
      : {
          count: 0,
          loaded: false,
          expected: 0,
          seen: 0,
          mode: requestedMode,
          oneShot: true,
          refreshing: true,
        };

    const addSnap = (key, snap) => {
      const m = maps[key] || new Map();
      try {
        snap.forEach((docSnap) => {
          const flow = normalizeFlowLogDoc(docSnap, loc);
          m.set(flow.id, flow);
        });
      } catch (_e) {}
      maps[key] = m;
    };

    const run = async (key, q) => {
      lg.meta.expected++;
      try {
        const snap = await api.getDocs(q);
        addSnap(key, snap);
      } catch (err) {
        console.warn(`logs one-shot ${key} ${loc}`, err);
      } finally {
        lg.meta.seen++;
      }
    };

    const tasks = [];
    if (requestedMode === "fba") {
      // Lettura operativa FBA/PDF: stati attivi + piccolo fallback recenti.
      // Evita di scaricare pagine di log Shopify/vecchi flussi quando serve solo il picking.
      try {
        tasks.push(
          run(
            "statusReserved",
            api.query(colRef, api.where("status", "==", "RESERVED"), api.limit(60)),
          ),
        );
      } catch (_e) {}
      try {
        tasks.push(
          run(
            "statusPartial",
            api.query(colRef, api.where("status", "==", "PARTIAL_PICKED"), api.limit(60)),
          ),
        );
      } catch (_e) {}
      try {
        tasks.push(
          run("applied", api.query(colRef, api.orderBy("appliedAtClient", "desc"), api.limit(40))),
        );
      } catch (_e) {}
    } else if (requestedMode === "full") {
      try {
        tasks.push(
          run("applied", api.query(colRef, api.orderBy("appliedAtClient", "desc"), api.limit(100))),
        );
      } catch (_e) {}
    }

    if (requestedMode === "fbm" || requestedMode === "full") {
      // Query Shopify mirate. Niente raw scan e niente updatedAtClient.
      try {
        tasks.push(
          run(
            "shopifySource",
            api.query(colRef, api.where("source", "==", "shopify_fbm"), api.limit(80)),
          ),
        );
      } catch (_e) {}
      try {
        tasks.push(
          run(
            "shopifySourcePlain",
            api.query(colRef, api.where("source", "==", "shopify"), api.limit(60)),
          ),
        );
      } catch (_e) {}
      try {
        tasks.push(
          run(
            "shopifyFile",
            api.query(colRef, api.where("fileName", "==", "SHOPIFY_FBM"), api.limit(80)),
          ),
        );
      } catch (_e) {}
    }

    if (!tasks.length) {
      lg.loading = false;
      lg.meta.loaded = true;
      lg.loadedAtClient = Date.now();
      renderLogsForLoc(loc);
      return;
    }

    Promise.allSettled(tasks)
      .then(() => {
        const merged = new Map();
        for (const m of Object.values(maps)) {
          for (const [id, flow] of m.entries()) {
            const prev = merged.get(id) || {};
            merged.set(id, { ...prev, ...flow });
          }
        }

        const flows = Array.from(merged.values())
          .filter((f) => f && !f.__invalid)
          .sort(
            (a, b) =>
              flowLogTimestamp(b) - flowLogTimestamp(a) ||
              String(b.id || "").localeCompare(String(a.id || "")),
          )
          .slice(0, requestedMode === "full" ? 240 : 160);

        // Se nel frattempo è stato prelevato un altro SKU, questa risposta può essere
        // precedente alla nuova transaction. Non deve sovrascrivere lo stato locale più recente.
        const localMutationChanged =
          (Number(lg.localMutationSeq || 0) || 0) !== localMutationSeqAtStart;
        if (localMutationChanged) {
          lg.meta = {
            ...(lg.meta || {}),
            count: Array.isArray(lg.flows) ? lg.flows.length : 0,
            loaded: true,
            oneShot: true,
            mode: requestedMode,
            refreshing: false,
          };
          lg.loadedAtClient = Date.now();
          lg.loading = false;
          updatePickingPreviewCountsFromCurrentLogs("one_shot_skipped_after_local_pick_" + loc);
          renderLogsForLoc(loc);
          checkStartupDataGate("logs_local_newer_" + loc);
          // Ora che la query vecchia è terminata, avviane una nuova sullo stato cloud finale.
          setTimeout(() => {
            try {
              startLogsFor(loc, { mode: requestedMode, forceReload: true, staleMs: 0 });
            } catch (_e) {}
          }, 120);
          return;
        }

        lg.flows = flows;
        lg.meta.count = flows.length;
        lg.meta.loaded = true;
        lg.meta.oneShot = true;
        lg.meta.refreshing = false;
        lg.loadedAtClient = Date.now();
        lg.loading = false;

        updatePickingPreviewCountsFromCurrentLogs("one_shot_logs_" + loc);
        renderLogsForLoc(loc);
        checkStartupDataGate("logs_" + loc);
      })
      .catch((err) => {
        console.warn("logs one-shot batch", loc, err);
        lg.loading = false;
        lg.meta.loaded = true;
        lg.meta.refreshing = false;
        renderLogsForLoc(loc);
        checkStartupDataGate("logs_error_" + loc);
      });
  } catch (err) {
    console.warn("startLogsFor one-shot", loc, err);
    try {
      const lg = state.logs?.[loc];
      if (lg) {
        lg.loading = false;
        lg.meta = {
          ...(lg.meta || {}),
          loaded: true,
          oneShot: true,
          error: String(err?.message || err || ""),
        };
      }
    } catch (_e) {}
  }
}

// --- Logs home: movimenti cloud live + flussi PDF ---
// Non usa più collectionGroup("movements") ordinata: quella query richiede un indice
// Collection Group creato da Console Firebase. Qui leggiamo direttamente le sottocollezioni
// /amzInventoryProducts/{sku}/movements, così il Picking funziona senza creare indici.
const ACTIVITY_MOVEMENT_SKU_LIMIT = 36;
const ACTIVITY_MOVEMENT_PER_SKU_LIMIT = 5;
const ACTIVITY_MOVEMENT_TOTAL_LIMIT = 80;

// Wrapper con debounce: le chiamate in cascata dagli snapshot (inventory/logs)
// vengono collassate in una sola ricostruzione dei watcher, evitando di
// smontare/rimontare di continuo decine/centinaia di listener (causa di lentezza).
// La chiamata di avvio ("start") resta immediata.

function stopActivityLogWatch(opts = {}) {
  try {
    if (state.activityLogs?._refreshTimer) {
      clearTimeout(state.activityLogs._refreshTimer);
    }
  } catch (_e) {}
  try {
    state.activityLogs?.unsubMovements && state.activityLogs.unsubMovements();
  } catch (_e) {}
  if (state.activityLogs) {
    state.activityLogs.unsubMovements = null;
    state.activityLogs.movements = [];
    state.activityLogs.error = "";
    state.activityLogs.loaded = false;
    state.activityLogs._watchKey = "";
    state.activityLogs._refreshTimer = null;
  }
}

function shortLogId(v) {
  const s = String(v || "").trim();
  if (!s) return "—";
  return s.length > 18 ? s.slice(0, 8) + "…" + s.slice(-6) : s;
}

function homeLogStableClientTs(...values) {
  for (const v of values) {
    const n = readFlowLogTimestamp(v);
    if (n) return n;
  }
  return 0;
}

function pickingEventStableClientTsList(flow, opts = {}) {
  const out = [];
  try {
    const p = flow?.picking && typeof flow.picking === "object" ? flow.picking : {};
    const events = Array.isArray(p.events) ? p.events : [];
    const wantSku = toSkuId(opts?.sku || "");
    const wantFlow = !!opts?.flowOnly;
    const shopifyOnly = !!opts?.shopifyOnly;
    for (const ev0 of events) {
      const ev = ev0 || {};
      const type = String(ev.type || "").toLowerCase();
      if (!["flow", "sku", "undo_flow", "undo_sku"].includes(type)) continue;
      if (wantFlow && type !== "flow") continue;
      if (wantSku) {
        const evSku = toSkuId(ev.sku || "");
        const evSkus = Array.isArray(ev.skus) ? ev.skus.map((x) => toSkuId(x)).filter(Boolean) : [];
        if (evSku !== wantSku && !evSkus.includes(wantSku)) continue;
      }
      if (shopifyOnly) {
        const by = String(ev.by || ev.pickedBy || ev.undoneBy || ev.operator || "").toLowerCase();
        const src = String(ev.source || ev.origin || "").toLowerCase();
        const isShopify =
          ev.shopifyFbm === true || by.includes("shopify") || src.includes("shopify");
        if (!isShopify) continue;
      }
      const ts = homeLogStableClientTs(
        ev.atClient,
        ev.pickedAtClient,
        ev.undoneAtClient,
        ev.createdAtClient,
        ev.tsClient,
        ev.timestampClient,
      );
      if (ts) out.push(ts);
    }
  } catch (_e) {}
  return out.filter((n) => Number.isFinite(Number(n)) && Number(n) > 0).map((n) => Number(n));
}

function pickingExplicitShopifyCompletionTs(flow) {
  try {
    const shop = flow?.shopify && typeof flow.shopify === "object" ? flow.shopify : {};
    // Solo campi evento Shopify: niente updatedAt/updatedAtClient, perché cambiano a ogni sync.
    return homeLogStableClientTs(
      shop.shippedAtClient,
      shop.shipped_at,
      shop.lastShipmentAtClient,
      shop.lastShipmentAt,
      shop.fulfilledAtClient,
      shop.fulfilled_at,
      shop.fulfillmentAtClient,
      shop.fulfillment_at,
      shop.fulfillmentCreatedAtClient,
      shop.fulfillment_created_at,
      shop.lastFulfillmentAtClient,
      shop.lastFulfillmentAt,
      shop.closedAtClient,
      shop.closed_at,
      flow?.shippedAtClient,
      flow?.shipped_at,
      flow?.fulfilledAtClient,
      flow?.fulfilled_at,
      flow?.lastShipmentAtClient,
      flow?.lastShipmentAt,
      flow?.lastFulfillmentAtClient,
      flow?.lastFulfillmentAt,
      flow?.closedAtClient,
      flow?.closed_at,
    );
  } catch (_e) {
    return 0;
  }
}

function pickingFlowStableBaseTs(flow) {
  try {
    const shop = flow?.shopify && typeof flow.shopify === "object" ? flow.shopify : {};
    // Fallback immutabile: quando manca un vero timestamp di spedizione/prelievo,
    // usiamo la nascita/import del flusso, non l'ultimo aggiornamento del documento.
    return homeLogStableClientTs(
      flow?.appliedAtClient,
      flow?.importedAtClient,
      flow?.createdAtClient,
      flow?.orderCreatedAtClient,
      shop.orderCreatedAtClient,
      shop.createdAtClient,
      shop.created_at,
      shop.createdAt,
      flow?.appliedAt,
      flow?.createdAt,
    );
  } catch (_e) {
    return 0;
  }
}

function pickingLineStableClientTs(flow, sku, rec = {}, completedByShopify = false) {
  try {
    const p = flow?.picking && typeof flow.picking === "object" ? flow.picking : {};
    const r = flow?.reservation && typeof flow.reservation === "object" ? flow.reservation : {};
    const s = toSkuId(sku || rec?.sku || "");

    if (completedByShopify) {
      let evShopify = pickingEventStableClientTsList(flow, { sku: s, shopifyOnly: true });
      if (evShopify.length) return Math.min(...evShopify);
      let evAny = pickingEventStableClientTsList(flow, { sku: s });
      if (evAny.length) return Math.min(...evAny);
      const shipTs = pickingExplicitShopifyCompletionTs(flow);
      if (shipTs) return shipTs;
      return pickingFlowStableBaseTs(flow);
    }

    const direct = homeLogStableClientTs(rec?.pickedAtClient, rec?.atClient, rec?.createdAtClient);
    if (direct) return direct;
    const ev = pickingEventStableClientTsList(flow, { sku: s });
    if (ev.length) return Math.max(...ev);
    return (
      homeLogStableClientTs(p.flowPickedAtClient, r.pickedAtClient, p.pickedAtClient) ||
      pickingFlowStableBaseTs(flow)
    );
  } catch (_e) {
    return 0;
  }
}

function pickingFlowStableClientTs(flow, completedByShopify = false) {
  try {
    const p = flow?.picking && typeof flow.picking === "object" ? flow.picking : {};
    const r = flow?.reservation && typeof flow.reservation === "object" ? flow.reservation : {};
    const picked = pickingLineMap(flow);
    const lineTs = [];
    for (const rec of Object.values(picked || {})) {
      if (!rec || !(rec.picked === true || rec.status === "prelevato")) continue;
      const ts = pickingLineStableClientTs(flow, rec.sku || "", rec, completedByShopify);
      if (ts) lineTs.push(ts);
    }

    if (completedByShopify) {
      const evShopify = pickingEventStableClientTsList(flow, { flowOnly: true, shopifyOnly: true });
      if (evShopify.length) return Math.min(...evShopify);
      const evAny = pickingEventStableClientTsList(flow, { flowOnly: true });
      if (evAny.length) return Math.min(...evAny);
      if (lineTs.length) return Math.min(...lineTs);
      const shipTs = pickingExplicitShopifyCompletionTs(flow);
      if (shipTs) return shipTs;
      return pickingFlowStableBaseTs(flow);
    }

    const direct = homeLogStableClientTs(p.flowPickedAtClient, r.pickedAtClient, p.pickedAtClient);
    const ev = pickingEventStableClientTsList(flow, { flowOnly: true });
    const candidates = [direct, ...ev, ...lineTs]
      .filter((n) => Number.isFinite(Number(n)) && Number(n) > 0)
      .map((n) => Number(n));
    if (candidates.length) return Math.max(...candidates);
    return pickingFlowStableBaseTs(flow);
  } catch (_e) {
    return 0;
  }
}

function pickingStableOperatorLabel(value, completedByShopify = false) {
  const raw = String(value || "").trim();
  if (completedByShopify && (!raw || raw.toLowerCase() === "shopify")) return "Shopify";
  return raw;
}

function fmtDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("it-IT");
  } catch (_e) {
    return "—";
  }
}

function flowDisplayName(flow) {
  const label =
    flow && flow.workflow && flow.workflow.label
      ? String(flow.workflow.label)
      : String(flow?.workflowLabel || "");
  if (label) return label;

  const wfId = flow && flow.workflow && flow.workflow.id ? String(flow.workflow.id) : "";
  if (wfId) return `ID flusso di lavoro: ${wfId}`;

  const fn = String(flow?.fileName || "").trim();
  if (fn) return fn;

  return flow?.id ? flow.id.slice(0, 8) : "—";
}

// === Modale Flussi (HOME) ===

function flowReservationPickedMap(flow) {
  try {
    const p = flow?.picking && typeof flow.picking === "object" ? flow.picking : {};
    return p.pickedLines && typeof p.pickedLines === "object" ? p.pickedLines : {};
  } catch (_e) {
    return {};
  }
}

function isReservedScaricaFlow(flow) {
  try {
    if (String(flow?.kind || "").toLowerCase() !== "scarica") return false;
    const st = String(flow?.status || "").toUpperCase();
    const r = flow?.reservation && typeof flow.reservation === "object" ? flow.reservation : {};
    return !!(
      r.active === true ||
      st === "RESERVED" ||
      st === "PRENOTATO" ||
      st === "IN_ATTESA_PICKING"
    );
  } catch (_e) {
    return false;
  }
}

// === Flow/Picking sync helpers: unica fonte cloud, nessun fallback locale ===

// Mirror runtime dello stato già confermato da Firestore.
// Mirror runtime dello stato già confermato da Firestore: serve solo a rendere immediata la UI tra write cloud riuscita e prossimo snapshot realtime.
function patchRuntimeInventoryItem(loc, sku, patch = {}, opts = {}) {
  try {
    if (!(loc === "cerea" || loc === "concamarise")) return;
    const inv = state.inventory?.[loc];
    if (!inv || !Array.isArray(inv.items)) return;

    const s = toSkuId(sku || patch?.sku || patch?.id || "");
    if (!s) return;

    const idx = inv.items.findIndex((x) => toSkuId(x?.sku || x?.id || "") === s);
    if (opts && opts.remove === true) {
      if (idx >= 0) inv.items.splice(idx, 1);
      inv.meta.count = inv.items.length;
      inv.meta.lastUpdatedAt = new Date();
      inv.meta.loaded = true;
      invalidateInventoryRuntimeCaches("inventory_runtime_change");
      return;
    }

    const base = idx >= 0 ? inv.items[idx] || {} : {};
    const has = (obj, key) => !!obj && Object.prototype.hasOwnProperty.call(obj, key);
    const nowClient = Number(patch?.updatedAtClient || Date.now());
    const title = squashWhitespace(has(patch, "title") ? patch.title : base.title || s) || s;
    const merged = {
      ...base,
      ...(patch || {}),
      id: base.id || patch?.id || s,
      sku: s,
      title,
      titleNorm: patch?.titleNorm || normalizeText(title || s),
      location: loc,
      updatedAtClient: nowClient,
    };

    if (has(patch, "qty")) merged.qty = stockQtyFromDoc({ qty: patch.qty });
    else if (!Number.isFinite(Number(merged.qty))) merged.qty = stockQtyFromDoc(merged);

    if (has(patch, "stockLots")) {
      merged.stockLots = readStockLotsFromDoc({
        ...merged,
        stockLots: patch.stockLots,
        qty: merged.qty,
      });
    }

    if (has(patch, "rackAllocations")) {
      merged.rackAllocations = normalizeRackAllocationsForWrite(patch.rackAllocations);
    }
    if (has(patch, "rackLocations")) {
      merged.rackLocations = normalizeRackLocationsList(patch.rackLocations);
    } else if (has(patch, "rackLocation")) {
      merged.rackLocations = normalizeRackLocationsList([patch.rackLocation]);
    }

    const finalLocations = normalizeRackLocationsList(
      has(merged, "rackLocations") ? merged.rackLocations : readRackLocationsFromDoc(merged),
    );
    merged.rackLocations = finalLocations;
    merged.rackLocation = finalLocations[0] || "";

    if (idx >= 0) inv.items[idx] = merged;
    else inv.items.push(merged);

    inv.items.sort((a, b) => String(a?.sku || "").localeCompare(String(b?.sku || "")));
    inv.meta.count = inv.items.length;
    inv.meta.lastUpdatedAt = new Date(nowClient);
    inv.meta.loaded = true;
    invalidateInventoryRuntimeCaches("inventory_runtime_change");
  } catch (err) {
    console.warn("runtime inventory patch skipped", err);
  }
}

function buildStockLotsForUnallocatedQty(fresh, newUnallocatedQty, opts = {}) {
  const targetUnallocated = Math.max(0, Math.round(Number(newUnallocatedQty) || 0));
  const tsClient = Number(opts.tsClient || Date.now());
  const source = String(opts.source || "quantita_da_ubicare");
  const refId = String(opts.refId || "");
  const preferredLot =
    normalizeLotId(
      opts.preferredLot || fresh?.lastProductionLot || "",
      fresh?.lastProductionAtClient || null,
    ) || "";

  const allocations = normalizeRackAllocationsForWrite(readRackAllocationsFromDoc(fresh || {}));
  const allocatedByLot = new Map();
  for (const a of allocations) {
    const lot = normalizeLotId(a.lot) || LOT_LEGACY_ID;
    const q = Math.max(0, Math.round(Number(a.qty || 0)));
    allocatedByLot.set(lot, (allocatedByLot.get(lot) || 0) + q);
  }

  const currentLots = readStockLotsFromDoc(fresh || {}).map((l) => ({
    lot: normalizeLotId(l.lot) || LOT_LEGACY_ID,
    qty: Math.max(0, Math.round(Number(l.qty || 0))),
    createdAtClient: Number(l.createdAtClient || l.producedAtClient || tsClient) || tsClient,
    producedAtClient: Number(l.producedAtClient || l.createdAtClient || tsClient) || tsClient,
    source: String(l.source || ""),
    refId: String(l.refId || ""),
  }));

  // Ogni lotto con pallet già ubicati deve restare almeno alla sua quantità ubicata.
  for (const [lot, q] of allocatedByLot.entries()) {
    if (!currentLots.some((l) => l.lot === lot)) {
      currentLots.push({
        lot,
        qty: q,
        createdAtClient: tsClient,
        producedAtClient: tsClient,
        source,
        refId,
      });
    }
  }

  let fallbackLot = preferredLot;
  if (!fallbackLot) {
    const withFree = currentLots.find(
      (l) => Math.max(0, l.qty - (allocatedByLot.get(l.lot) || 0)) > 0,
    );
    fallbackLot = withFree?.lot || currentLots[0]?.lot || LOT_LEGACY_ID;
  }

  const result = new Map();
  for (const lot of currentLots) {
    const allocQty = allocatedByLot.get(lot.lot) || 0;
    result.set(lot.lot, {
      lot: lot.lot,
      qty: Math.max(0, Math.round(allocQty)),
      createdAtClient: lot.createdAtClient || tsClient,
      producedAtClient: lot.producedAtClient || lot.createdAtClient || tsClient,
      source: lot.source || source,
      refId: lot.refId || refId,
    });
  }

  let remaining = targetUnallocated;
  const orderedLots = currentLots.slice().sort((a, b) => {
    if (a.lot === fallbackLot) return -1;
    if (b.lot === fallbackLot) return 1;
    return (
      (a.createdAtClient || 0) - (b.createdAtClient || 0) ||
      String(a.lot).localeCompare(String(b.lot))
    );
  });

  // Mantieni la distribuzione esistente finché basta, ma il totale finale resta sempre quello scelto dal prompt.
  for (const lot of orderedLots) {
    if (remaining <= 0) break;
    const allocQty = allocatedByLot.get(lot.lot) || 0;
    const currentFree = Math.max(0, Math.round(Number(lot.qty || 0)) - allocQty);
    if (currentFree <= 0) continue;
    const add = Math.min(currentFree, remaining);
    const rec = result.get(lot.lot) || {
      lot: lot.lot,
      qty: 0,
      createdAtClient: lot.createdAtClient || tsClient,
      producedAtClient: lot.producedAtClient || tsClient,
      source: lot.source || source,
      refId: lot.refId || refId,
    };
    rec.qty = Math.max(0, Math.round(Number(rec.qty || 0))) + add;
    result.set(lot.lot, rec);
    remaining -= add;
  }

  // Se la nuova quantità è maggiore dell'attuale residuo, aggiungo l'extra al lotto preferito/default.
  if (remaining > 0) {
    const rec = result.get(fallbackLot) || {
      lot: fallbackLot,
      qty: 0,
      createdAtClient: tsClient,
      producedAtClient: tsClient,
      source,
      refId,
    };
    rec.qty = Math.max(0, Math.round(Number(rec.qty || 0))) + remaining;
    if (!rec.source) rec.source = source;
    if (!rec.refId) rec.refId = refId;
    result.set(fallbackLot, rec);
  }

  return Array.from(result.values())
    .filter((x) => Number.isFinite(Number(x.qty)) && Math.round(Number(x.qty)) > 0)
    .map((x) => ({
      lot: normalizeLotId(x.lot) || LOT_LEGACY_ID,
      qty: Math.round(Number(x.qty) || 0),
      createdAtClient: Number(x.createdAtClient || x.producedAtClient || tsClient) || tsClient,
      producedAtClient: Number(x.producedAtClient || x.createdAtClient || tsClient) || tsClient,
      source: String(x.source || source),
      refId: String(x.refId || refId),
    }));
}

async function editHomeNoLocationQtyPrompt(skuRaw, locRaw) {
  const requestedSku = toSkuId(skuRaw || "");
  const loc = locRaw === "cerea" || locRaw === "concamarise" ? locRaw : state.route.loc;
  const sku = stockSkuForSkuAny(requestedSku, loc) || requestedSku;

  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  if (!sku || !(loc === "cerea" || loc === "concamarise")) {
    showToast("Errore", "Prodotto o magazzino non valido.", 2200);
    return;
  }

  const currentItem = getProductBySku(loc, sku);
  if (!currentItem) {
    showToast("Errore", "Prodotto non trovato.", 2200);
    return;
  }

  const currentUnallocated = rackUnallocatedQtyFromDoc(currentItem || {});
  const raw = await uiQuantity({
    title: "Correggi pezzi da ubicare",
    message:
      "Inserisci i pezzi contati che non hanno ancora una posizione. La giacenza totale cambia della stessa differenza.",
    rows: [
      ["SKU", sku],
      ["Ora da ubicare", `${currentUnallocated} pz`],
    ],
    value: Math.max(0, Math.round(Number(currentUnallocated) || 0)),
    min: 0,
    help: "Zero o un numero intero positivo.",
    confirmLabel: "Salva quantità",
  });
  if (raw === null) return;

  const parsed = parseSignedQtyStrict(raw);
  if (parsed === null || !Number.isFinite(parsed) || parsed < 0) {
    showToast("Quantità non valida", "Inserisci un numero intero positivo o zero.", 2400);
    return;
  }

  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db || !api.runTransaction) {
    showToast("Errore", "Firebase non inizializzato.", 2200);
    return;
  }

  const itemRef = api.doc(db, COL_ROOT, loc, SUB_ITEMS, sku);
  const productRef = api.doc(db, COL_PRODUCTS, sku);
  const nowClient = Date.now();
  const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
  const movementId = api.doc(api.collection(db, COL_PRODUCTS, sku, SUB_MOVES)).id;

  let runtimePatch = null;
  let shouldRemove = false;
  let beforeUnallocated = currentUnallocated;
  let afterUnallocated = parsed;
  let beforeTotal = stockQtyFromDoc(currentItem || {});
  let afterTotal = beforeTotal;

  try {
    await api.runTransaction(db, async (tx) => {
      const snap = await tx.get(itemRef);
      if (!snap.exists()) throw new Error("Prodotto non trovato.");
      const fresh = snap.data() || {};
      const title = squashWhitespace(fresh.title || fresh.name || currentItem.title || sku) || sku;
      const freshTotal = stockQtyFromDoc(fresh);
      const allocations = normalizeRackAllocationsForWrite(readRackAllocationsFromDoc(fresh));
      const allocatedTotal = rackAllocatedQtyFromDoc(fresh);
      const freshUnallocated = Math.max(0, freshTotal - allocatedTotal);
      const newUnallocated = Math.max(0, Math.round(Number(parsed) || 0));
      const finalQty = allocatedTotal + newUnallocated;
      const cleanLocations = normalizeRackLocationsList(allocations.map((x) => x.code));
      const cleanLocation = cleanLocations[0] || "";
      const preferredLot =
        normalizeLotId(
          state.ui.productDetailsLot || fresh.lastProductionLot || "",
          fresh.lastProductionAtClient || null,
        ) || getDefaultLotForItem(fresh || {});
      const cleanStockLots = buildStockLotsForUnallocatedQty(fresh, newUnallocated, {
        tsClient: nowClient,
        source: "quantita_da_ubicare",
        refId: movementId,
        preferredLot,
      });
      const cleanCereaAllocations = readCereaAllocationsFromDoc({
        ...fresh,
        qty: finalQty,
        stockLots: cleanStockLots,
        cereaAllocations: readCereaAllocationsFromDoc(fresh),
      });
      const delta = newUnallocated - freshUnallocated;

      beforeUnallocated = freshUnallocated;
      afterUnallocated = newUnallocated;
      beforeTotal = freshTotal;
      afterTotal = finalQty;

      if (delta === 0) {
        runtimePatch = {
          sku,
          title,
          qty: freshTotal,
          stockLots: cleanStockLots,
          cereaAllocations: cleanCereaAllocations,
          rackLocation: cleanLocation,
          rackLocations: cleanLocations,
          rackAllocations: allocations,
          updatedAtClient: nowClient,
        };
        return;
      }

      // Non eliminare mai il documento inventario quando la quantità va a 0.
      // Picking deve semplicemente togliere lo SKU dalle liste operative (filtrate con qty > 0),
      // mentre Hub Inventario Amazon deve continuare a vedere lo SKU con giacenza 0 e storico intatto.
      const safeFinalQty = Math.max(0, Math.round(Number(finalQty) || 0));
      const safeStockLots = safeFinalQty > 0 ? cleanStockLots : [];

      tx.set(
        itemRef,
        {
          sku,
          title,
          titleNorm: normalizeText(title || sku),
          qty: safeFinalQty,
          sharedStockSourceSku: sku,
          sharedStockCanonicalSku: sku,
          sharedStockRevisionAtClient: nowClient,
          stockUpdatedAtClient: nowClient,
          lastStockMutationAtClient: nowClient,
          stockLots: safeStockLots,
          cereaAllocations: cleanCereaAllocations,
          rackLocation: cleanLocation,
          rackLocations: cleanLocations,
          rackAllocations: allocations,
          zeroStock: safeFinalQty === 0,
          zeroStockAt: safeFinalQty === 0 ? api.serverTimestamp() : null,
          zeroStockAtClient: safeFinalQty === 0 ? nowClient : null,
          lastNoLocationQtyEditId: movementId,
          updatedAt: api.serverTimestamp(),
          updatedAtClient: nowClient,
          updatedBy: who,
          location: loc,
        },
        { merge: true },
      );

      tx.set(
        productRef,
        {
          sku,
          title,
          titleNorm: normalizeText(title || sku),
          rackLocation: cleanLocation,
          rackLocations: cleanLocations,
          rackAllocations: allocations,
          lastNoLocationQtyEditId: movementId,
          lastNoLocationQtyBefore: freshUnallocated,
          cereaAllocations: cleanCereaAllocations,
          lastNoLocationQtyAfter: newUnallocated,
          lastSeenAt: api.serverTimestamp(),
          lastSeenAtClient: nowClient,
          lastSeenBy: who,
          lastSeenLocation: loc,
          lastSeenKind: "no_location_qty_update",
        },
        { merge: true },
      );

      addProductMovementToBatch(tx, api, db, sku, {
        type: "quantita_da_ubicare",
        movementId,
        movementKey: movementId,
        writeKey: movementId,
        qtySigned: delta,
        deltaSigned: delta,
        beforeQty: freshTotal,
        afterQty: finalQty,
        beforeUnallocatedQty: freshUnallocated,
        afterUnallocatedQty: newUnallocated,
        allocatedQty: allocatedTotal,
        fromWarehouse: loc,
        toWarehouse: loc,
        location: loc,
        source: "da_ubicare",
        note: `Modifica quantità da ubicare ${freshUnallocated} → ${newUnallocated} pz`,
        rackLocation: cleanLocation,
        rackLocations: cleanLocations,
        lot: preferredLot,
        lotLabel: lotLabelFromId(preferredLot),
        deleteLocked: true,
        locked: true,
        createdAtClient: nowClient,
      });

      runtimePatch = {
        sku,
        title,
        qty: Math.max(0, Math.round(Number(finalQty) || 0)),
        stockLots: Math.max(0, Math.round(Number(finalQty) || 0)) > 0 ? cleanStockLots : [],
        cereaAllocations: cleanCereaAllocations,
        rackLocation: cleanLocation,
        rackLocations: cleanLocations,
        rackAllocations: allocations,
        zeroStock: Math.max(0, Math.round(Number(finalQty) || 0)) === 0,
        zeroStockAtClient: Math.max(0, Math.round(Number(finalQty) || 0)) === 0 ? nowClient : null,
        updatedAtClient: nowClient,
        updatedBy: who,
        location: loc,
      };
    });

    if (runtimePatch) {
      patchRuntimeInventoryItem(loc, sku, runtimePatch);
    }

    renderHomeDashboard();

    if (state.ui.sheet === "productDetails") renderProductDetailsSheet();

    if (afterUnallocated === beforeUnallocated) {
      showToast("Quantità invariata", `${sku} resta a ${afterUnallocated} pz da ubicare.`, 1800);
    } else {
      showToast(
        "Quantità aggiornata",
        `${sku}: ${beforeUnallocated} → ${afterUnallocated} pz da ubicare`,
        2200,
      );
    }
  } catch (err) {
    console.error("edit no-location qty", err);
    showToast("Errore quantità", String(err?.message || err).slice(0, 220), 3000);
  }
}

// --- HOME dashboard (mini cockpit + info tiles + lista sotto-scorta) ---
function fmtN(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  try {
    return Math.round(v).toLocaleString("it-IT");
  } catch (_e) {
    return String(Math.round(v));
  }
}

function getItemsWithoutRackLocations() {
  const out = [];
  const pushLoc = (loc) => {
    const items = stockRepresentativeItemsForLoc(loc);
    for (const it of items) {
      const totalQty = stockQtyFromDoc(it || {});
      if (totalQty <= 0) continue;
      const remainingQty = rackUnallocatedQtyFromDoc(it || {});
      if (remainingQty <= 0) continue;
      out.push({
        ...it,
        loc,
        qty: remainingQty,
        totalQty,
        remainingQty,
        allocatedQty: rackAllocatedQtyFromDoc(it || {}),
        cereaQty: cereaQtyFromDoc(it),
      });
    }
  };
  pushLoc(INVENTORY_CANONICAL_LOC);
  out.sort((a, b) => {
    const ta = Number(a.updatedAtClient || 0) || a.updatedAt?.toMillis?.() || 0;
    const tb = Number(b.updatedAtClient || 0) || b.updatedAt?.toMillis?.() || 0;
    if (ta !== tb) return tb - ta;
    return String(a.sku || "").localeCompare(String(b.sku || ""));
  });
  return out;
}

function getHomeSmartSearchValue(inputId, stateKey) {
  try {
    const el = $(inputId);
    const v = String(el ? el.value || "" : state.ui?.[stateKey] || "").trim();
    if (state.ui) state.ui[stateKey] = v;
    return v;
  } catch (_e) {
    return "";
  }
}

let _bioneeShopUi = null,
  _bioneeShopLoading = null,
  _bioneeShopUid = "";
async function openBioneeShop() {
  if (!state.user?.isWhitelisted || pickingHomeView() !== "bioneeShop") return;
  try {
    const uid = state.firebase.auth?.currentUser?.uid;
    if (!_bioneeShopLoading) _bioneeShopLoading = import("./picking-bionee-shop.js?v=917f7cee94a7");
    const mod = await _bioneeShopLoading;
    if (
      uid !== state.firebase.auth?.currentUser?.uid ||
      !state.user?.isWhitelisted ||
      pickingHomeView() !== "bioneeShop"
    )
      return;
    if (!_bioneeShopUi)
      _bioneeShopUi = mod.createBioneeShopMonitor({
        root: $("homePickingBioneeShopBox"),
        getFirebase: () => state.firebase,
        getUser: () => state.firebase.auth?.currentUser,
        isActive: () => !!state.user?.isWhitelisted && pickingHomeView() === "bioneeShop",
      });
    _bioneeShopUi.open();
  } catch (err) {
    _bioneeShopLoading = null;
    $("homePickingBioneeShopBox").textContent =
      "Impossibile caricare Bionee shop. Riapri la sezione.";
  }
}

let _pickingMailUi = null;
let _pickingMailLoading = null;
let _pickingMailAuthUid = "";

function syncPickingMailAuth() {
  const uid = state.user?.uid || "";
  if (uid !== _bioneeShopUid || !state.user?.isWhitelisted) {
    _bioneeShopUi?.reset();
    _bioneeShopUid = uid;
  }
  if (!state.user?.isWhitelisted && state.ui?.pickingHomeView === "bioneeShop")
    state.ui.pickingHomeView = "home";
  if (uid !== _pickingMailAuthUid || !state.user?.isAdmin) {
    _pickingMailUi?.reset();
    _pickingMailAuthUid = uid;
  }
  const btn = $("btnPickingNotifications");
  if (btn) btn.hidden = !state.user?.isAdmin;
  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    el.hidden = !state.user?.isAdmin;
  });
  if (!state.user?.isAdmin && state.ui?.pickingHomeView === "notifications") {
    state.ui.pickingHomeView = "home";
    syncPickingHomeView();
  }
}

async function openPickingMail() {
  if (!state.user?.isAdmin || pickingHomeView() !== "notifications") return;
  try {
    if (!_pickingMailLoading)
      _pickingMailLoading = import("./picking-notifications.js?v=c131b87dce47");
    const mod = await _pickingMailLoading;
    if (!state.user?.isAdmin || pickingHomeView() !== "notifications") return;
    if (!_pickingMailUi)
      _pickingMailUi = mod.createPickingNotifications({
        root: $("homePickingNotificationsBox"),
        getUser: () => state.firebase.auth?.currentUser,
        isActive: () => !!state.user?.isAdmin && pickingHomeView() === "notifications",
      });
    _pickingMailUi.open();
  } catch (err) {
    _pickingMailLoading = null;
    const feedback = $("homePickingNotificationsBox")?.querySelector("[data-mail-status]");
    if (feedback) feedback.textContent = "Impossibile caricare le notifiche. Riapri la sezione.";
    console.warn("picking email interface", err);
  }
}

function pickingHomeView() {
  const v = state.ui?.pickingHomeView || "home";
  if (v === "picking")
    return state.ui?.lastPickingKind === "pickingFba" ? "pickingFba" : "pickingFbm";
  return v === "home" ||
    v === "map" ||
    v === "noLocation" ||
    v === "cerea" ||
    v === "located" ||
    v === "pickingFbm" ||
    v === "pickingFba" ||
    v === "pickingHistory" ||
    (v === "bioneeShop" && state.user?.isWhitelisted) ||
    (v === "notifications" && state.user?.isAdmin)
    ? v
    : "home";
}

const DRONE_NATIVE_COL = "amzInventoryProducts";
const DRONE_NATIVE_DOC = "capannone3dDrone";
let _droneNativeActive = false;
let _droneNativeAxes = { thr: 0, yaw: 0, pitch: 0, roll: 0 };
let _droneNativeSession = "";
let _droneNativeLastWrite = 0;
let _droneNativeWriteTimer = null;
let _droneNativeBusy = false;
let _droneNativeExtra = {};

function setDroneNativeStatus(text, ok = true) {
  const el = $("droneNativeStatusText");
  const dot = document.querySelector("#droneNativeStatus .droneNativeStatusDot");
  if (el) el.textContent = text || "";
  if (dot) {
    dot.style.background = ok ? "#22d3ee" : "#f97316";
    dot.style.boxShadow = ok ? "0 0 16px rgba(34,211,238,.85)" : "0 0 16px rgba(249,115,22,.85)";
  }
}

function droneNativeRef() {
  try {
    const api = state.firebase?.api;
    const db = state.firebase?.db;
    if (!api || !db) return null;
    return api.doc(db, DRONE_NATIVE_COL, DRONE_NATIVE_DOC);
  } catch (_e) {
    return null;
  }
}

async function flushDroneNativeState(extra = {}) {
  const api = state.firebase?.api;
  const ref = droneNativeRef();
  if (!api || !ref) {
    setDroneNativeStatus("Firebase non pronto", false);
    return false;
  }
  const payload = {
    active: !!_droneNativeActive,
    thr: Number(_droneNativeAxes.thr || 0),
    yaw: Number(_droneNativeAxes.yaw || 0),
    pitch: Number(_droneNativeAxes.pitch || 0),
    roll: Number(_droneNativeAxes.roll || 0),
    source: "picking_native_drone",
    sessionSeq: _droneNativeSession,
    updatedAtClient: Date.now(),
    ..._droneNativeExtra,
    ...extra,
  };
  _droneNativeExtra = {};
  try {
    _droneNativeBusy = true;
    await api.setDoc(ref, payload, { merge: true });
    _droneNativeLastWrite = Date.now();
    setDroneNativeStatus(_droneNativeActive ? "Drone attivo • comandi live" : "Drone fermo", true);
    return true;
  } catch (err) {
    console.warn("drone native write", err);
    setDroneNativeStatus("Errore Firestore Drone", false);
    return false;
  } finally {
    _droneNativeBusy = false;
  }
}

function scheduleDroneNativeWrite(extra = {}, immediate = false) {
  _droneNativeExtra = { ..._droneNativeExtra, ...extra };
  if (_droneNativeWriteTimer) {
    clearTimeout(_droneNativeWriteTimer);
    _droneNativeWriteTimer = null;
  }
  const due = Math.max(0, 70 - (Date.now() - _droneNativeLastWrite));
  if (immediate || due <= 0) {
    void flushDroneNativeState();
    return;
  }
  _droneNativeWriteTimer = setTimeout(() => {
    _droneNativeWriteTimer = null;
    void flushDroneNativeState();
  }, due);
}

function resetDroneNativeKnob(knobId) {
  const knob = $(knobId);
  if (knob) knob.style.transform = "translate3d(0px,0px,0)";
}

function resetDroneNativeAxes(part = "all") {
  if (part === "left" || part === "all") {
    _droneNativeAxes.thr = 0;
    _droneNativeAxes.yaw = 0;
    resetDroneNativeKnob("droneKnobLeft");
  }
  if (part === "right" || part === "all") {
    _droneNativeAxes.pitch = 0;
    _droneNativeAxes.roll = 0;
    resetDroneNativeKnob("droneKnobRight");
  }
  scheduleDroneNativeWrite({}, true);
}

async function startDroneNativeController() {
  _droneNativeActive = true;
  _droneNativeSession = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  resetDroneNativeAxes("all");
  setDroneNativeStatus("Attivazione Drone Mode…", true);
  await flushDroneNativeState({ active: true, lockOn: false });
}

async function stopDroneNativeController() {
  _droneNativeActive = false;
  _droneNativeAxes = { thr: 0, yaw: 0, pitch: 0, roll: 0 };
  resetDroneNativeKnob("droneKnobLeft");
  resetDroneNativeKnob("droneKnobRight");
  if (_droneNativeWriteTimer) {
    clearTimeout(_droneNativeWriteTimer);
    _droneNativeWriteTimer = null;
  }
  await flushDroneNativeState({ active: false, lockOn: false });
}

function droneNativeStickDelta(stick, ev) {
  const r = stick.getBoundingClientRect();
  const max = Math.max(20, Math.min(r.width, r.height) * 0.34);
  const screenDx = ev.clientX - (r.left + r.width / 2);
  const screenDy = ev.clientY - (r.top + r.height / 2);
  let dx = screenDx;
  let dy = screenDy;

  // In portrait il controller viene ruotato via CSS per restare orizzontale.
  // I pointer event però arrivano sempre nelle coordinate fisiche dello schermo:
  // senza questa conversione, "destra/sinistra" diventano "su/giù" e le gesture risultano sballate.
  try {
    const ctrl = $("droneNativeController");
    const tr = ctrl ? window.getComputedStyle(ctrl).transform || "" : "";
    const Matrix = window.DOMMatrixReadOnly || window.DOMMatrix || window.WebKitCSSMatrix;
    if (tr && tr !== "none" && Matrix) {
      const m = new Matrix(tr);
      const a = Number(m.a),
        b = Number(m.b),
        c = Number(m.c),
        d = Number(m.d);
      const det = a * d - b * c;
      const hasRotation = Math.abs(b) > 0.01 || Math.abs(c) > 0.01;
      if (hasRotation && Number.isFinite(det) && Math.abs(det) > 1e-6) {
        dx = (d * screenDx - c * screenDy) / det;
        dy = (-b * screenDx + a * screenDy) / det;
      }
    } else if (window.matchMedia && window.matchMedia("(orientation: portrait)").matches) {
      // Fallback vecchi WebKit: il CSS portrait usa rotate(90deg).
      dx = screenDy;
      dy = -screenDx;
    }
  } catch (_e) {
    try {
      if (window.matchMedia && window.matchMedia("(orientation: portrait)").matches) {
        dx = screenDy;
        dy = -screenDx;
      }
    } catch (__e) {}
  }

  return { dx, dy, max };
}

function bindDroneNativeStick(stickId, knobId, side) {
  const stick = $(stickId);
  const knob = $(knobId);
  if (!stick || !knob || stick.__droneBound) return;
  stick.__droneBound = true;
  let pointerId = null;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const update = (ev) => {
    const d = droneNativeStickDelta(stick, ev);
    let dx = d.dx;
    let dy = d.dy;
    const max = d.max;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knob.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    const x = clamp(dx / max, -1, 1);
    const y = clamp(dy / max, -1, 1);
    if (side === "left") {
      _droneNativeAxes.yaw = x;
      _droneNativeAxes.thr = -y;
    } else {
      _droneNativeAxes.roll = -x;
      _droneNativeAxes.pitch = -y;
    }
    scheduleDroneNativeWrite();
  };
  const end = (ev) => {
    try {
      if (pointerId !== null) stick.releasePointerCapture?.(pointerId);
    } catch (_e) {}
    pointerId = null;
    resetDroneNativeAxes(side);
  };
  stick.addEventListener(
    "pointerdown",
    (ev) => {
      ev.preventDefault();
      pointerId = ev.pointerId;
      try {
        stick.setPointerCapture?.(pointerId);
      } catch (_e) {}
      update(ev);
    },
    { passive: false },
  );
  stick.addEventListener(
    "pointermove",
    (ev) => {
      if (pointerId === null || ev.pointerId !== pointerId) return;
      ev.preventDefault();
      update(ev);
    },
    { passive: false },
  );
  stick.addEventListener("pointerup", end, { passive: false });
  stick.addEventListener("pointercancel", end, { passive: false });
  stick.addEventListener("lostpointercapture", () => {
    if (pointerId !== null) resetDroneNativeAxes(side);
    pointerId = null;
  });
  stick.addEventListener("contextmenu", (ev) => ev.preventDefault());
}

function bindDroneNativeControls() {
  bindDroneNativeStick("droneStickLeft", "droneKnobLeft", "left");
  bindDroneNativeStick("droneStickRight", "droneKnobRight", "right");
  const lockBtn = $("btnDroneNativeLock");
  if (lockBtn && !lockBtn.__droneBound) {
    lockBtn.__droneBound = true;
    lockBtn.addEventListener("click", () => {
      if (!_droneNativeActive) return;
      scheduleDroneNativeWrite(
        { lockSeq: `${Date.now()}-${Math.random().toString(16).slice(2)}`, lockOn: true },
        true,
      );
    });
  }
  const stopBtn = $("btnDroneNativeStop");
  if (stopBtn && !stopBtn.__droneBound) {
    stopBtn.__droneBound = true;
    stopBtn.addEventListener("click", () => resetDroneNativeAxes("all"));
  }
}

async function openDroneModeFullscreen() {
  const shell = $("droneModeFullscreenShell");
  if (!shell) return;
  setPickingMobileMenu(false);
  bindDroneNativeControls();
  document.body.classList.add("drone-mode-active");
  shell.setAttribute("aria-hidden", "false");
  await startDroneNativeController();

  // Fullscreen/landscape quando il browser lo consente. Su iOS/PWA resta il fallback CSS ruotato.
  try {
    if (shell.requestFullscreen && !document.fullscreenElement) {
      const p = shell.requestFullscreen({ navigationUI: "hide" });
      if (p && typeof p.catch === "function") await p.catch(() => {});
    }
  } catch (_e) {}
  try {
    const lock = screen?.orientation?.lock;
    if (typeof lock === "function") {
      const p = lock.call(screen.orientation, "landscape");
      if (p && typeof p.catch === "function") await p.catch(() => {});
    }
  } catch (_e) {}
}

async function closeDroneModeFullscreen(opts = {}) {
  await stopDroneNativeController();
  const shell = $("droneModeFullscreenShell");
  if (shell) shell.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drone-mode-active");
  try {
    if (screen?.orientation?.unlock) screen.orientation.unlock();
  } catch (_e) {}
  if (!opts.skipExitFullscreen) {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        const p = document.exitFullscreen();
        if (p && typeof p.catch === "function") await p.catch(() => {});
      }
    } catch (_e) {}
  }
  syncPickingHomeView();
}

function setPickingNavCount(kind, value) {
  const keys = kind === "picking" ? ["pickingFbm", "pickingFba"] : [kind];
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  for (const k of keys) {
    document.querySelectorAll(`[data-nav-count="${k}"]`).forEach((el) => {
      if (el.textContent !== text) el.textContent = text;
    });
  }
  if (kind === "pickingFbm" || kind === "pickingFba" || kind === "picking") syncNavBadges();
}

function isPickingMobileNav() {
  try {
    return !!(window.matchMedia && window.matchMedia("(max-width: 899px)").matches);
  } catch (_e) {
    return false;
  }
}

function setPickingMobileMenu(open) {
  const isOpen = !!open;
  if (isOpen) openSheet("menu");
  else if (state.ui.sheet === "menu" || $("menuSheet")?.classList.contains("show"))
    closeSheet("menu");
  document
    .querySelectorAll("[data-open-menu]")
    .forEach((b) => b.setAttribute("aria-expanded", isOpen ? "true" : "false"));
}

function syncPickingHomeView() {
  const view = pickingHomeView();
  const pickingActive = view === "pickingFbm" || view === "pickingFba";
  const sections = {
    home: "homeOverviewBox",
    map: "homeMapBox",
    noLocation: "homeNoLocationBox",
    cerea: "homeCereaBox",
    located: "homeLocatedBox",
    picking: "homePickingBox",
    pickingHistory: "homePickingHistoryBox",
    bioneeShop: "homePickingBioneeShopBox",
    notifications: "homePickingNotificationsBox",
  };
  const activeKey = pickingActive ? "picking" : view;
  for (const [key, id] of Object.entries(sections)) {
    const box = $(id);
    if (!box) continue;
    const active = key === activeKey;
    box.classList.toggle("is-active", active);
    box.setAttribute("aria-hidden", active ? "false" : "true");
  }
  document
    .querySelectorAll(".nav-item[data-picking-view], .menu-item[data-picking-view]")
    .forEach((btn) => {
      const active = btn.dataset.pickingView === view;
      btn.classList.toggle("is-active", active);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
  const menuViews = ["located", "cerea", "pickingHistory", "bioneeShop", "notifications"];
  document.querySelectorAll(".tab[data-tab]").forEach((tab) => {
    const t = tab.dataset.tab;
    const active =
      t === view ||
      (t === "picking" && pickingActive) ||
      (t === "menu" && menuViews.includes(view));
    tab.classList.toggle("is-active", active);
    if (active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  for (const id of ["segPickingFbm", "segPickingFba"]) {
    const b = $(id);
    if (b) b.setAttribute("aria-selected", b.dataset.pickingView === view ? "true" : "false");
  }
  const title = $("viewTitle");
  if (title) title.textContent = PICKING_VIEW_TITLES[view] || "Picking";
  document.body.dataset.view = activeKey;
  const droneBtn = $("btnPickingDroneMode");
  if (droneBtn) droneBtn.classList.remove("is-active");
}

function setPickingHomeView(view) {
  if (!state.ui) state.ui = {};
  let next = view;
  if (next === "picking")
    next = state.ui.lastPickingKind === "pickingFba" ? "pickingFba" : "pickingFbm";
  if (next === "droneMode") {
    state.ui.previousPickingHomeView = pickingHomeView();
    setPickingMobileMenu(false);
    void openDroneModeFullscreen();
    return;
  }
  const prev = pickingHomeView();
  state.ui.pickingHomeView =
    next === "home" ||
    next === "map" ||
    next === "noLocation" ||
    next === "cerea" ||
    next === "located" ||
    next === "pickingFbm" ||
    next === "pickingFba" ||
    next === "pickingHistory" ||
    (next === "bioneeShop" && state.user?.isWhitelisted) ||
    (next === "notifications" && state.user?.isAdmin)
      ? next
      : "home";
  const current = state.ui.pickingHomeView;
  if (current === "pickingFbm" || current === "pickingFba") state.ui.lastPickingKind = current;
  if (current === "bioneeShop") void openBioneeShop();
  else _bioneeShopUi?.close();
  if (current === "notifications") void openPickingMail();
  else _pickingMailUi?.close();
  const needsFlowLogs = current === "pickingFba" || current === "pickingHistory";
  if (current === "pickingFbm") {
    // FBM: widget SKU immediati da inventario; lista ordini letta dai documenti Shopify FBM.
    updateFbmPreviewFromInventory("menu_fbm_inventory");
    schedulePickingPreviewCounts("menu_pickingFbm", { delay: 250, inventoryOnly: true });
  } else if (needsFlowLogs) {
    const logMode = current === "pickingFba" ? "fba" : "full";
    ensureLogsRealtimeStarted("picking_" + current, { mode: logMode });
    schedulePickingPreviewCounts("menu_" + current, {
      delay: logMode === "full" ? 900 : 700,
      includeRemote: true,
    });
  } else if (state.activityLogs?.unsubMovements) {
    stopActivityLogWatch({ render: false });
  }
  syncPickingHomeView();
  if (current === "home") pickingHomeDashboard?.activate();
  if (current === "map") pickingMapView?.render();
  if (state.route?.view === "home" && (current === "pickingFbm" || current === "pickingFba"))
    renderHomePickingBox();
  if (current === "pickingHistory") renderHomePickingHistoryBox();
  setPickingMobileMenu(false);
  if (prev !== current) {
    try {
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (_e) {
      window.scrollTo(0, 0);
    }
  }
}

function homeSmartSearchText(it, section = "") {
  try {
    const meta = parseTitleMeta(it?.title || "");
    const sku = toSkuId(it?.sku || it?.id || meta.skuInTitle || "");
    const aliases = normalizeSkuAliases(
      [
        ...(Array.isArray(it?.__aliasSkus) ? it.__aliasSkus : []),
        ...(Array.isArray(it?.skuAliases) ? it.skuAliases : []),
        ...(Array.isArray(it?.aliasSkus) ? it.aliasSkus : []),
        it?.__canonicalSku || "",
      ],
      sku,
    ).join(" ");
    const loc = it?.loc === "cerea" || it?.loc === "concamarise" ? it.loc : "";
    const rackText = rackLocationDisplayFromItem(it || {});
    const rackCodes = readRackLocationsFromDoc(it || {}).join(" ");
    const lots = readStockLotsFromDoc(it || {})
      .map((l) => `${l.lot} ${lotLabelFromId(l.lot)} ${lotDateLabelFromId(l.lot)} ${l.qty}`)
      .join(" ");
    const allocations = readRackAllocationsFromDoc(it || {})
      .map((a) => `${a.code} ${a.lot} ${lotLabelFromId(a.lot)} ${a.qty}`)
      .join(" ");
    const qtys = [
      it?.qty,
      it?.totalQty,
      it?.remainingQty,
      it?.allocatedQty,
      stockQtyFromDoc(it || {}),
      rackAllocatedQtyFromDoc(it || {}),
      rackUnallocatedQtyFromDoc(it || {}),
    ]
      .filter((v) => Number.isFinite(Number(v)))
      .map((v) => String(Math.round(Number(v))))
      .join(" ");
    return [
      section,
      sku,
      aliases,
      it?.title || "",
      meta.main || "",
      meta.asin || "",
      meta.storage || "",
      loc,
      loc ? prettyLoc(loc) : "",
      rackText,
      rackCodes,
      lots,
      allocations,
      cereaQtyFromDoc(it) > 0 ? `Cerea temporanea ${cereaQtyFromDoc(it)}` : "",
      qtys,
    ]
      .filter(Boolean)
      .join(" ");
  } catch (_e) {
    return String(it?.sku || it?.title || "");
  }
}

function homeSmartCandidateScore(it, query, section = "") {
  const raw = String(query || "").trim();
  if (!raw) return 0;

  const qNorm = normalizeText(raw);
  const tokens = qNorm.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;

  const hayText = homeSmartSearchText(it, section);
  const hay = normalizeText(hayText);
  if (!hay) return -1;

  // Match intelligente: tutte le parole devono comparire, anche se in ordine diverso.
  // Esempio: “neem a01” trova i candidati Neem ubicati in A01.
  for (const token of tokens) {
    if (!hay.includes(token)) return -1;
  }

  const meta = parseTitleMeta(it?.title || "");
  const skuNorm = normalizeText(toSkuId(it?.sku || it?.id || meta.skuInTitle || ""));
  const titleNorm = normalizeText(meta.main || it?.title || "");
  const rackNorm = normalizeText(rackLocationDisplayFromItem(it || {}));
  const locNorm = normalizeText(prettyLoc(it?.loc || ""));

  let score = 0;
  if (skuNorm === qNorm) score += 120;
  else if (skuNorm.startsWith(qNorm)) score += 85;
  else if (skuNorm.includes(qNorm)) score += 65;

  if (titleNorm === qNorm) score += 70;
  else if (titleNorm.startsWith(qNorm)) score += 48;
  else if (titleNorm.includes(qNorm)) score += 32;

  if (rackNorm && rackNorm.includes(qNorm)) score += 38;
  if (locNorm && locNorm.includes(qNorm)) score += 12;

  // Più parole coincidono in campi importanti, più il candidato sale.
  for (const token of tokens) {
    if (skuNorm && skuNorm.includes(token)) score += 18;
    if (titleNorm && titleNorm.includes(token)) score += 12;
    if (rackNorm && rackNorm.includes(token)) score += 10;
    if (locNorm && locNorm.includes(token)) score += 4;
  }

  return score;
}

function homeSmartCandidates(items, query, section = "") {
  const raw = String(query || "").trim();
  if (!raw) return Array.isArray(items) ? items : [];
  return (Array.isArray(items) ? items : [])
    .map((it, idx) => ({ it, idx, score: homeSmartCandidateScore(it, raw, section) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.idx - b.idx;
    })
    .map((x) => x.it);
}

function locatedQtySnapshotKey(item) {
  const raw = item?.__raw || item || {};
  return JSON.stringify({
    qty: stockQtyFromDoc(item),
    stockOwner: toSkuId(
      raw.sharedStockSourceSku || raw.authoritativeStockSku || raw.stockOwnerSku || "",
    ),
    allocations: sortRackAllocationsForConsumption(readRackAllocationsFromDoc(item)),
    lots: readStockLotsFromDoc(item)
      .map((x) => ({ lot: x.lot, qty: x.qty }))
      .sort((a, b) => a.lot.localeCompare(b.lot)),
  });
}

function buildLocatedQtyEdit(fresh, requested, opts = {}) {
  const before = normalizeRackAllocationsForWrite(readRackAllocationsFromDoc(fresh));
  const beforeAllocated = rackAllocatedQtyFromDoc(fresh);
  const beforeTotal = stockQtyFromDoc(fresh);
  if (!before.length || rackAllocationQtyTotal(before) !== beforeAllocated) {
    throw new Error("Ubicazioni cambiate o non valide. Riapri la modifica quantità.");
  }
  const key = (x) => `${x.code}::${x.lot}`;
  const previous = new Map(before.map((x) => [key(x), x]));
  const seen = new Set();
  const changes = [];
  const next = [];
  for (const row of requested || []) {
    const rowKey = key(row);
    const old = previous.get(rowKey);
    if (!old || seen.has(rowKey)) throw new Error("Ubicazione o lotto non valido.");
    if (!Number.isSafeInteger(row.qty) || row.qty < 0)
      throw new Error("Inserisci un numero intero positivo o zero.");
    seen.add(rowKey);
    if (row.qty > 0) next.push({ code: old.code, lot: old.lot, qty: row.qty });
    if (row.qty !== old.qty)
      changes.push({ code: old.code, lot: old.lot, beforeQty: old.qty, afterQty: row.qty });
  }
  if (seen.size !== before.length) throw new Error("Completa le quantità di tutte le ubicazioni.");
  const afterAllocated = rackAllocationQtyTotal(next);
  const unallocated = Math.max(0, beforeTotal - beforeAllocated);
  const afterTotal = afterAllocated + unallocated;
  if (!Number.isSafeInteger(afterTotal)) throw new Error("Quantità troppo alta.");

  // Prima conserva i pezzi da ubicare di ciascun lotto, poi applica soltanto
  // le rettifiche delle ubicazioni scelte. Nessuna redistribuzione tra rack.
  const lots = buildStockLotsForUnallocatedQty(fresh, unallocated, opts);
  const byLot = new Map(lots.map((x) => [x.lot, { ...x }]));
  for (const change of changes) {
    const lot = byLot.get(change.lot);
    if (!lot) throw new Error("Lotto ubicato non trovato.");
    lot.qty += change.afterQty - change.beforeQty;
  }
  const stockLots = Array.from(byLot.values()).filter((x) => x.qty > 0);
  if (stockLots.reduce((sum, x) => sum + x.qty, 0) !== afterTotal)
    throw new Error("Totale lotti non coerente.");
  return {
    before,
    allocations: next,
    stockLots,
    beforeAllocated,
    afterAllocated,
    beforeTotal,
    afterTotal,
    unallocated,
    changes,
  };
}

function requestLocatedQtyEdit(item, sku, loc) {
  const rows = rackAllocationRowsForDetails(item);
  const allocated = rackAllocatedQtyFromDoc(item);
  const unallocated = rackUnallocatedQtyFromDoc(item);
  if (!rows.length || rackAllocationQtyTotal(rows) !== allocated) {
    throw new Error("Ubicazioni non valide. Riapri la scheda del prodotto.");
  }
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "dlg locatedQtyDialog";
    dialog.setAttribute("aria-labelledby", "locatedQtyTitle");
    dialog.innerHTML = `<form class="dlg-card locatedQtyForm" novalidate>
          <div class="dlg-grip" aria-hidden="true"></div>
          <h2 class="dlg-title" id="locatedQtyTitle">Correggi pezzi ubicati</h2>
          <p class="dlg-text">Inserisci i pezzi contati in ogni posizione di ${escapeHtml(sku)}. La giacenza totale cambia della stessa differenza.</p>
          <div class="locatedQtyRows">
          ${rows.map((row, i) => `<label class="locatedQtyRow"><span class="locatedQtyWhere">${locationLabelHTML(row.code, { size: "md" })}<small>${escapeHtml(lotLabelFromId(row.lot))}</small></span><input class="input" data-located-index="${i}" inputmode="numeric" autocomplete="off" value="${row.qty}" aria-label="Pezzi in ${escapeHtml(row.code)}, ${escapeHtml(lotLabelFromId(row.lot))}" /></label>`).join("")}
          </div>
          <dl class="dlg-rows">
            <div><dt>Ubicati</dt><dd data-located-total aria-live="polite">${allocated} pz</dd></div>
            <div><dt>Da ubicare</dt><dd>${unallocated} pz</dd></div>
            <div><dt>Nuova giacenza totale</dt><dd data-stock-total>${stockQtyFromDoc(item)} pz</dd></div>
          </dl>
          <p class="dlg-error" data-qty-error role="alert" hidden>Inserisci un numero intero, zero o positivo, per ogni posizione.</p>
          <div class="dlg-actions"><button class="btn btn--ghost" type="button" data-cancel>Annulla</button><button class="btn btn--primary" type="submit">Salva quantità</button></div>
        </form>`;
    const form = dialog.querySelector("form");
    const inputs = Array.from(dialog.querySelectorAll("[data-located-index]"));
    const save = dialog.querySelector('[type="submit"]');
    const read = () =>
      rows.map((row, i) => ({ ...row, qty: parseSignedQtyStrict(inputs[i].value) }));
    const refresh = () => {
      const values = read();
      const valid =
        values.every((x) => Number.isSafeInteger(x.qty) && x.qty >= 0) &&
        Number.isSafeInteger(values.reduce((sum, x) => sum + x.qty, unallocated));
      const total = valid ? rackAllocationQtyTotal(values) : null;
      dialog.querySelector("[data-located-total]").textContent = valid ? `${total} pz` : "—";
      dialog.querySelector("[data-stock-total]").textContent = valid
        ? `${total + unallocated} pz`
        : "—";
      dialog.querySelector("[data-qty-error]").hidden = valid;
      save.disabled = !valid;
      return valid;
    };
    let result = null;
    form.addEventListener("input", refresh);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!refresh()) return;
      result = read();
      dialog.close();
    });
    dialog.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener("keydown", (e) => e.stopPropagation());
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        resolve(result);
      },
      { once: true },
    );
    document.body.appendChild(dialog);
    dialog.showModal();
    inputs[0]?.focus();
    inputs[0]?.select();
  });
}

let locatedQtyEditInFlight = false;
async function editHomeLocatedQtyPrompt(skuRaw, locRaw) {
  if (locatedQtyEditInFlight) return;
  const loc = locRaw === "cerea" || locRaw === "concamarise" ? locRaw : state.route.loc;
  const requestedSku = toSkuId(skuRaw || "");
  const sku = stockSkuForSkuAny(requestedSku, loc) || requestedSku;
  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  if (!sku || !(loc === "cerea" || loc === "concamarise")) {
    showToast("Errore", "Prodotto o magazzino non valido.", 2200);
    return;
  }
  const currentItem = getProductBySku(loc, sku);
  if (!currentItem) {
    showToast("Errore", "Prodotto non trovato.", 2200);
    return;
  }
  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db || !api.runTransaction) {
    showToast("Errore", "Firebase non inizializzato.", 2200);
    return;
  }

  locatedQtyEditInFlight = true;
  const snapshotKey = locatedQtySnapshotKey(currentItem);
  const userUid = state.user?.uid;
  try {
    const requested = await requestLocatedQtyEdit(currentItem, sku, loc);
    if (requested === null) return;
    if (!canUsePickingActions() || state.user?.uid !== userUid)
      throw new Error("Sessione cambiata. Accedi di nuovo.");
    if (stockSkuForSkuAny(sku, loc) !== sku)
      throw new Error("Prodotto aggiornato. Riapri la modifica quantità.");
    const itemRef = api.doc(db, COL_ROOT, loc, SUB_ITEMS, sku);
    const productRef = api.doc(db, COL_PRODUCTS, sku);
    const nowClient = Date.now();
    const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
    const movementId = api.doc(api.collection(db, COL_PRODUCTS, sku, SUB_MOVES)).id;
    let runtimePatch = null;
    let saved = null;

    await api.runTransaction(db, async (tx) => {
      const snap = await tx.get(itemRef);
      if (!snap.exists()) throw new Error("Prodotto non trovato.");
      const fresh = snap.data() || {};
      if (locatedQtySnapshotKey(fresh) !== snapshotKey) {
        throw new Error(
          "Quantità, lotti o ubicazioni aggiornati durante la modifica. Riapri il popup per usare i valori attuali.",
        );
      }
      saved = buildLocatedQtyEdit(fresh, requested, {
        tsClient: nowClient,
        source: "quantita_ubicati",
        refId: movementId,
      });
      if (!saved.changes.length) return;
      const title = squashWhitespace(fresh.title || fresh.name || currentItem.title || sku) || sku;
      const locations = normalizeRackLocationsList(saved.allocations.map((x) => x.code));
      const racks = {
        rackLocation: locations[0] || "",
        rackLocations: locations,
        rackAllocations: saved.allocations,
        cereaAllocations: readCereaAllocationsFromDoc(fresh),
      };
      runtimePatch = {
        sku,
        title,
        titleNorm: normalizeText(title || sku),
        qty: saved.afterTotal,
        stockLots: saved.stockLots,
        ...racks,
        sharedStockSourceSku: sku,
        sharedStockCanonicalSku: sku,
        sharedStockRevisionAtClient: nowClient,
        stockUpdatedAtClient: nowClient,
        lastStockMutationAtClient: nowClient,
        rackRevisionAtClient: nowClient,
        rackUpdatedAtClient: nowClient,
        lastRackMutationAtClient: nowClient,
        zeroStock: saved.afterTotal === 0,
        zeroStockAtClient: saved.afterTotal === 0 ? nowClient : null,
        lastLocatedQtyEditId: movementId,
        updatedAtClient: nowClient,
        updatedBy: who,
        location: loc,
      };
      tx.set(
        itemRef,
        {
          ...runtimePatch,
          updatedAt: api.serverTimestamp(),
          zeroStockAt: saved.afterTotal === 0 ? api.serverTimestamp() : null,
        },
        { merge: true },
      );
      tx.set(
        productRef,
        {
          sku,
          title,
          titleNorm: normalizeText(title || sku),
          ...racks,
          lastLocatedQtyEditId: movementId,
          lastLocatedQtyBeforeTotal: saved.beforeTotal,
          lastLocatedQtyAfterTotal: saved.afterTotal,
          lastLocatedQtyBeforeAllocated: saved.beforeAllocated,
          lastLocatedQtyAfterAllocated: saved.afterAllocated,
          lastLocatedQtyBeforeUnallocated: saved.unallocated,
          lastLocatedQtyAfterUnallocated: saved.unallocated,
          lastSeenAt: api.serverTimestamp(),
          lastSeenAtClient: nowClient,
          lastSeenBy: who,
          lastSeenLocation: loc,
          lastSeenKind: "located_qty_update",
        },
        { merge: true },
      );
      const changedLots = Array.from(new Set(saved.changes.map((x) => x.lot)));
      addProductMovementToBatch(tx, api, db, sku, {
        type: "quantita_ubicati",
        movementId,
        movementKey: movementId,
        writeKey: movementId,
        qtySigned: saved.afterTotal - saved.beforeTotal,
        deltaSigned: saved.afterTotal - saved.beforeTotal,
        beforeQty: saved.beforeTotal,
        afterQty: saved.afterTotal,
        beforeAllocatedQty: saved.beforeAllocated,
        afterAllocatedQty: saved.afterAllocated,
        beforeUnallocatedQty: saved.unallocated,
        afterUnallocatedQty: saved.unallocated,
        allocatedQty: saved.afterAllocated,
        allocationChanges: saved.changes,
        lots: changedLots,
        ...(changedLots.length === 1
          ? { lot: changedLots[0], lotLabel: lotLabelFromId(changedLots[0]) }
          : {}),
        fromWarehouse: loc,
        toWarehouse: loc,
        location: loc,
        source: "ubicati",
        note: `Modifica quantità ubicata ${saved.beforeAllocated} → ${saved.afterAllocated} pz; totale ${saved.beforeTotal} → ${saved.afterTotal} pz`,
        rackLocation: racks.rackLocation,
        rackLocations: locations,
        deleteLocked: true,
        locked: true,
        createdAtClient: nowClient,
      });
      runtimePatch = { ...runtimePatch, __raw: { ...fresh, ...runtimePatch } };
    });
    if (runtimePatch) patchRuntimeInventoryItem(loc, sku, runtimePatch);
    renderHomeDashboard();
    if (state.ui.sheet === "productDetails") renderProductDetailsSheet();
    if (!saved.changes.length) {
      showToast("Quantità invariata", `${sku} resta a ${saved.afterAllocated} pz ubicati.`, 1800);
    } else {
      showToast(
        "Quantità aggiornata",
        `${sku}: ${saved.beforeAllocated} → ${saved.afterAllocated} pz ubicati • totale ${saved.afterTotal} pz`,
        2600,
      );
    }
  } catch (err) {
    console.error("edit located qty", err);
    renderHomeDashboard();
    showToast("Errore quantità", String(err?.message || err).slice(0, 220), 5000);
  } finally {
    locatedQtyEditInFlight = false;
  }
}

function renderHomeNoLocationBox() {
  const list = $("homeNoLocationList");
  const count = $("homeNoLocationCount");
  const hint = $("homeNoLocationHint");
  if (!list || !count) return;

  if (!state.user?.isWhitelisted) {
    count.textContent = "—";
    setPickingNavCount("noLocation", "—");
    setNavBadge("noLocation", 0);
    list.innerHTML = uiEmpty("Accedi per vedere i prodotti da ubicare.");
    if (hint) hint.textContent = "";
    return;
  }
  if (!inventoryReady()) {
    count.textContent = "—";
    list.innerHTML = uiEmpty("Caricamento inventario…");
    if (hint) hint.textContent = "";
    return;
  }

  const all = getItemsWithoutRackLocations();
  const q = getHomeSmartSearchValue("homeNoLocationSearch", "homeNoLocationSearch");
  const out = homeSmartCandidates(all, q, "da ubicare");
  count.textContent = q ? `${fmtN(out.length)} di ${fmtN(all.length)}` : fmtN(all.length);
  setPickingNavCount("noLocation", fmtN(all.length));
  setNavBadge("noLocation", all.length);
  const canEdit = canUsePickingActions();

  if (!all.length) {
    list.innerHTML = uiEmpty(
      "Tutto ubicato",
      "Ogni prodotto con pezzi disponibili ha già una posizione sulle scaffalature.",
    );
    if (hint) hint.textContent = "";
    return;
  }
  if (!out.length) {
    list.innerHTML = uiEmpty(
      "Nessun prodotto trovato",
      "Controlla lo SKU o cerca una parte del nome.",
    );
    if (hint) hint.textContent = "";
    return;
  }

  list.innerHTML = out
    .slice(0, 120)
    .map((it) => {
      const meta = parseTitleMeta(it.title || "");
      const title = meta.main || it.title || "Prodotto senza nome";
      const skuRaw = toSkuId(it.__stockSourceSku || it.sku || it.id || "");
      const displaySku = toSkuId(it.__canonicalSku || skuRaw) || skuRaw;
      const remainingQty = Number.isFinite(Number(it.remainingQty))
        ? Math.round(Number(it.remainingQty))
        : Math.round(Number(it.qty) || 0);
      const totalQty = Number.isFinite(Number(it.totalQty))
        ? Math.round(Number(it.totalQty))
        : remainingQty;
      const allocatedQty = Math.round(Number(it.allocatedQty) || 0);
      const fullDoc = { ...it, qty: totalQty };
      const lots = readStockLotsFromDoc(fullDoc).filter(
        (l) => rackUnallocatedQtyByLotFromDoc(fullDoc, l.lot) > 0,
      );
      const lot = normalizeLotId(it.lot || "") || getDefaultLotForItem(fullDoc);
      const lotText = lots.length > 1 ? `${lots.length} lotti da ubicare` : uiLotText(lot);
      const attrs = `data-sku="${escapeHtml(skuRaw)}" data-loc="${escapeHtml(it.loc || "")}"`;
      const partial = allocatedQty
        ? `<div class="item-extra"><span class="item-note">Già ubicati ${escapeHtml(fmtN(allocatedQty))} di ${escapeHtml(fmtN(totalQty))} pz</span>${uiLocList(rackLocationDisplayPartsFromItem({ ...it, qty: totalQty }), { size: "sm", max: 4 })}</div>`
        : "";
      return `
        <article class="item item--todo">
          <button class="item-body" type="button" data-action="openHomeNoLocationItem" ${attrs}>
            <span class="item-title">${escapeHtml(title)}</span>
            <span class="item-sub"><span class="sku">${escapeHtml(displaySku)}</span><span>${escapeHtml(lotText)}</span>${cereaBadgeHtml(it.cereaQty)}</span>
          </button>
          <div class="item-figure item-figure--warn"><strong>${escapeHtml(fmtN(remainingQty))}</strong><span>pz da ubicare</span></div>
          ${partial}
          ${
            canEdit
              ? `<div class="item-actions">
            <button class="btn btn--ghost btn--sm" type="button" data-action="editHomeNoLocationQty" ${attrs} data-current="${escapeHtml(String(remainingQty))}" title="Correggi la quantità da ubicare">${ICON.edit}<span>Correggi</span></button>
            <button class="btn btn--primary" type="button" data-action="ubicaItem" ${attrs}>${ICON.put}<span>Ubica</span></button>
          </div>`
              : ""
          }
        </article>`;
    })
    .join("");
  if (hint)
    hint.textContent =
      out.length > 120
        ? `Mostrati i primi 120 di ${fmtN(out.length)}. Cerca per restringere l’elenco.`
        : "";
}

function getItemsAtCerea() {
  return stockRepresentativeItemsForLoc(INVENTORY_CANONICAL_LOC)
    .map((it) => ({
      ...it,
      loc: INVENTORY_CANONICAL_LOC,
      cereaQty: cereaQtyFromDoc(it),
      remainingQty: rackUnallocatedQtyFromDoc(it),
    }))
    .filter((it) => it.cereaQty > 0)
    .sort((a, b) =>
      String(a.__canonicalSku || a.sku).localeCompare(String(b.__canonicalSku || b.sku)),
    );
}

function renderHomeCereaBox() {
  const list = $("homeCereaList"),
    count = $("homeCereaCount"),
    hint = $("homeCereaHint");
  if (!list || !count) return;
  if (!state.user?.isWhitelisted) {
    count.textContent = "—";
    setPickingNavCount("cerea", "—");
    list.innerHTML = uiEmpty("Accedi per vedere i prodotti a Cerea.");
    if (hint) hint.textContent = "";
    return;
  }
  if (!inventoryReady()) {
    count.textContent = "—";
    list.innerHTML = uiEmpty("Caricamento inventario…");
    return;
  }
  const all = getItemsAtCerea();
  const q = getHomeSmartSearchValue("homeCereaSearch", "homeCereaSearch");
  const out = homeSmartCandidates(all, q, "Cerea temporanea da ubicare");
  count.textContent = q ? `${fmtN(out.length)} di ${fmtN(all.length)}` : fmtN(all.length);
  setPickingNavCount("cerea", fmtN(all.length));
  const canEdit = canUsePickingActions();
  if (!out.length) {
    list.innerHTML = all.length
      ? uiEmpty("Nessun prodotto trovato", "Controlla lo SKU o cerca una parte del nome.")
      : uiEmpty(
          "Nessun prodotto a Cerea",
          "Per mettere un prodotto a Cerea scegli Ubica e poi Cerea nell’elenco delle posizioni.",
        );
    if (hint) hint.textContent = "";
    return;
  }
  list.innerHTML = out
    .map((it) => {
      const sku = toSkuId(it.__stockSourceSku || it.sku || it.id || "");
      const displaySku = toSkuId(it.__canonicalSku || sku) || sku;
      const meta = parseTitleMeta(it.title || "");
      const lots = readCereaAllocationsFromDoc(it)
        .map(
          (row) =>
            `<span class="item-note">${escapeHtml(lotLabelFromId(row.lot))}: ${escapeHtml(fmtN(row.qty))} pz</span>`,
        )
        .join("");
      return `<article class="item">
          <button class="item-body" type="button" data-action="openHomeCereaItem" data-sku="${escapeHtml(sku)}">
            <span class="item-title">${escapeHtml(meta.main || it.title || displaySku)}</span>
            <span class="item-sub"><span class="sku">${escapeHtml(displaySku)}</span><span>Da ubicare in totale ${escapeHtml(fmtN(it.remainingQty))} pz</span></span>
          </button>
          <div class="item-figure item-figure--cerea"><strong>${escapeHtml(fmtN(it.cereaQty))}</strong><span>pz a Cerea</span></div>
          <div class="item-extra">${lots}</div>
          ${canEdit ? `<div class="item-actions"><button class="btn btn--primary" type="button" data-action="ubicaItem" data-sku="${escapeHtml(sku)}" data-loc="${escapeHtml(INVENTORY_CANONICAL_LOC)}">${ICON.put}<span>Ubica</span></button></div>` : ""}
        </article>`;
    })
    .join("");
  if (hint) hint.textContent = "";
}

function getItemsWithRackLocations() {
  const out = [];
  const pushLoc = (loc) => {
    const items = stockRepresentativeItemsForLoc(loc);
    for (const it of items) {
      const totalQty = stockQtyFromDoc(it || {});
      if (totalQty <= 0) continue;
      const allocatedQty = rackAllocatedQtyFromDoc(it || {});
      if (allocatedQty <= 0) continue;
      const rackLocations = readRackLocationsFromDoc(it || {});
      if (!rackLocations.length) continue;
      out.push({
        ...it,
        loc,
        qty: allocatedQty,
        totalQty,
        allocatedQty,
        remainingQty: rackUnallocatedQtyFromDoc(it || {}),
        rackLocations,
      });
    }
  };
  pushLoc(INVENTORY_CANONICAL_LOC);
  out.sort((a, b) => {
    const ra = (a.rackLocations || []).join(",");
    const rb = (b.rackLocations || []).join(",");
    if (ra !== rb) return ra.localeCompare(rb);
    const la = String(a.loc || "");
    const lb = String(b.loc || "");
    if (la !== lb) return la.localeCompare(lb);
    return String(a.sku || "").localeCompare(String(b.sku || ""));
  });
  return out;
}

// --- Picking visual: prelievo flussi scarico, senza modificare stock o ID flusso ---
function pickingSkuKey(sku) {
  return sanitizeFirestoreDocId(toSkuId(sku || ""), 180) || "SKU";
}

function isShopifyFbmFlow(flow) {
  try {
    if (isAmazonFbaFlow(flow)) return false;
    const shop = flow?.shopify && typeof flow.shopify === "object" ? flow.shopify : {};
    const reservation =
      flow?.reservation && typeof flow.reservation === "object" ? flow.reservation : {};
    const picking = flow?.picking && typeof flow.picking === "object" ? flow.picking : {};
    const src = String(flow?.source || shop.source || reservation.source || "").toLowerCase();
    const fileName = String(flow?.fileName || "").toUpperCase();
    const workflow = String(flow?.workflowId || flow?.workflowLabel || "").toUpperCase();
    const tags = pickingTagList([flow?.tags, shop.tags, flow?.tag, reservation.tags, picking.tags]);
    const raw = [
      src,
      fileName,
      workflow,
      flow?.channel,
      flow?.fulfillmentChannel,
      flow?.fulfillment_channel,
      flow?.fulfillmentService,
      flow?.fulfillment_service,
      reservation.channel,
      reservation.fulfillmentChannel,
      picking.channel,
      picking.fulfillmentChannel,
      shop.fulfillmentChannel,
      shop.fulfillment_channel,
    ]
      .map((x) => String(x || "").toLowerCase())
      .join(" ");

    // Niente più classificazione FBM da "src contiene shopify" o dalla sola presenza
    // di orderId/orderName: questi campi possono restare appesi anche su flussi FBA.
    return !!(
      src === "shopify_fbm" ||
      src.includes("shopify_fbm") ||
      src.includes("shopify-fbm") ||
      raw.includes("shopify fbm") ||
      raw.includes("merchant_fulfilled") ||
      raw.includes("merchant fulfilled") ||
      raw.includes("fulfilled_by_merchant") ||
      raw.includes("fulfilled by merchant") ||
      raw.includes("manual_shopify") ||
      raw.includes("manual shopify") ||
      fileName === "SHOPIFY_FBM" ||
      workflow.startsWith("SHOPIFY-") ||
      tags.includes("shopify_fbm") ||
      tags.includes("merchant_fulfilled") ||
      (tags.includes("shopify") &&
        (tags.includes("fbm") || tags.includes("merchant") || tags.includes("manual"))) ||
      (tags.includes("fbm") && !tags.includes("fba")) ||
      picking.shopifyControlled === true ||
      flow?.shopifyControlled === true ||
      flow?.generatedFromShopifyFbm === true
    );
  } catch (_e) {
    return false;
  }
}

function isShopifyFbmCompletedByShopify(flow) {
  try {
    if (!isShopifyFbmFlow(flow)) return false;
    const status = String(flow?.status || "").toUpperCase();
    const rs = String(flow?.reservation?.status || "").toLowerCase();
    const p = flow?.picking && typeof flow.picking === "object" ? flow.picking : {};
    const ps = String(p.status || "").toLowerCase();
    const mode = String(p.flowPickMode || "").toLowerCase();
    const shop = flow?.shopify && typeof flow.shopify === "object" ? flow.shopify : {};
    const fulfillmentStatus = String(
      shop.fulfillmentStatus ||
        shop.fulfillment_status ||
        flow?.fulfillmentStatus ||
        flow?.fulfillment_status ||
        "",
    ).toLowerCase();
    const shippedTotal = Number(shop.shippedTotal || flow?.shippedTotal || 0);
    const reservedTotal = Number(
      shop.reservedTotal || flow?.reservedTotal || flow?.totalPieces || 0,
    );
    const shipmentKey = String(
      shop.lastShipmentKey || flow?.lastShipmentKey || flow?.trackingNumber || "",
    ).trim();

    return !!(
      rs === "shopify_spedito" ||
      ps === "shopify_spedito" ||
      fulfillmentStatus === "fulfilled" ||
      (status === "PICKED" &&
        (mode === "shopify" || ps === "shopify_spedito" || rs === "shopify_spedito")) ||
      (p.flowPicked === true && mode === "shopify") ||
      (shipmentKey &&
        Number.isFinite(shippedTotal) &&
        Number.isFinite(reservedTotal) &&
        reservedTotal > 0 &&
        shippedTotal >= reservedTotal)
    );
  } catch (_e) {
    return false;
  }
}

function shopifyFbmPickingBadge() {
  return "";
}

function getPickingCandidateFlows() {
  const out = [];
  for (const loc of INVENTORY_ALL_CLOUD_LOCS) {
    const flows = state.logs?.[loc]?.flows || [];
    for (const f of flows) {
      if (String(f?.kind || "").toLowerCase() !== "scarica") continue;
      if (f?.voided) continue;
      // Picking operativo solo sui flussi gestiti a prenotazione.
      // I vecchi scarichi PDF già scalati subito non vengono mostrati qui, così evitiamo doppi scarichi.
      if (!isPickingManagedFlow(f)) continue;
      const lines = Array.isArray(f.lines)
        ? f.lines.filter((l) => toSkuId(l?.sku || "") && parseQty(l?.qty || 0))
        : [];
      if (!lines.length) continue;
      out.push({ ...f, location: f.location || loc, lines });
    }
  }
  out.sort(
    (a, b) =>
      pickingFlowStableBaseTs(b) - pickingFlowStableBaseTs(a) ||
      String(b.id || "").localeCompare(String(a.id || "")),
  );
  return out;
}

function pickingLineMap(flow) {
  const pickedLines =
    flow?.picking &&
    typeof flow.picking === "object" &&
    flow.picking.pickedLines &&
    typeof flow.picking.pickedLines === "object"
      ? flow.picking.pickedLines
      : {};
  return pickedLines || {};
}

function isPickingLinePicked(flow, sku) {
  if (isShopifyFbmCompletedByShopify(flow)) return true;
  const key = pickingSkuKey(sku);
  const picked = pickingLineMap(flow);
  return !!(
    flow?.picking?.flowPicked === true ||
    picked[key]?.picked === true ||
    picked[key]?.status === "prelevato"
  );
}

function pickingFlowStats(flow) {
  const lines = Array.isArray(flow?.lines) ? flow.lines.filter((l) => toSkuId(l?.sku || "")) : [];
  const uniq = [];
  const seen = new Set();
  for (const l of lines) {
    const sku = toSkuId(l?.sku || "");
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);
    uniq.push(l);
  }
  const total = uniq.length;
  const picked = uniq.filter((l) => isPickingLinePicked(flow, l.sku)).length;
  return {
    total,
    picked,
    remaining: Math.max(0, total - picked),
    done: total > 0 && picked >= total,
  };
}

function pickingLineProduct(flow, sku) {
  const loc =
    flow?.location === "cerea" || flow?.location === "concamarise" ? flow.location : "concamarise";
  return getItemBySkuAny(sku, loc)?.it || getProductBySku(loc, sku) || null;
}

function pickingLinePositionParts(flow, sku) {
  const it = pickingLineProduct(flow, sku);
  if (!it) return [];

  // Picking: qui servono solo posizione + quantità presente.
  // Niente lotto/storico/movimenti nella colonna operativa.
  const grouped = new Map();
  const allocations = readRackAllocationsFromDoc(it || {});
  for (const a of allocations) {
    const code = normalizeRackLocation(a?.code || "");
    const qty = Math.round(Number(a?.qty || 0));
    if (!code) continue;
    const prev = grouped.get(code) || { code, qty: 0 };
    if (Number.isFinite(qty) && qty > 0) prev.qty += qty;
    grouped.set(code, prev);
  }

  if (!grouped.size) {
    for (const code of readRackLocationsFromDoc(it || {})) {
      if (code) grouped.set(code, { code, qty: 0 });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

function pickingLinePositionHtml(flow, sku) {
  return uiLocList(pickingLinePositionParts(flow, sku), { size: "lg", none: "Senza posizione" });
}

function pickingLinePositionText(flow, sku) {
  const parts = pickingLinePositionParts(flow, sku);
  if (!parts.length) return "—";
  return parts
    .map((x) => {
      const q =
        Number.isFinite(Number(x.qty)) && Number(x.qty) > 0
          ? ` (${Math.round(Number(x.qty))} pz)`
          : "";
      return `${x.code}${q}`;
    })
    .join(", ");
}

function isPickingManagedFlow(flow) {
  try {
    // Gli ordini Shopify FBM sono flussi operativi di picking anche quando il backend
    // li scrive senza reservation/picking.managedByPicking: lo scarico inventario resta separato.
    if (isShopifyFbmFlow(flow)) return true;
    if (isReservedScaricaFlow(flow)) return true;
    const p = flow?.picking && typeof flow.picking === "object" ? flow.picking : {};
    const st = String(flow?.status || p.status || "").toUpperCase();
    const picked = flowReservationPickedMap(flow);
    return !!(
      p.managedByPicking === true ||
      p.flowPicked === true ||
      Object.keys(picked || {}).length ||
      st === "PICKED" ||
      st === "PARTIAL_PICKED"
    );
  } catch (_e) {
    return false;
  }
}

function pickingRackAllocationsToMap(arr) {
  const map = new Map();
  for (const x of Array.isArray(arr) ? arr : []) {
    const code = normalizeRackLocation(x?.code || x?.rackLocation || x?.location || "");
    if (!code) continue;
    const lot = normalizeLotId(x?.lot || x?.batch || "") || LOT_LEGACY_ID;
    const qty = Math.max(0, Math.round(Number(x?.qty || 0)));
    if (qty <= 0) continue;
    const key = `${code}::${lot}`;
    const prev = map.get(key) || { code, lot, qty: 0 };
    prev.qty += qty;
    map.set(key, prev);
  }
  return map;
}

function pickingCleanAllocationsFromMap(map) {
  return Array.from((map || new Map()).values())
    .map((x) => ({
      code: normalizeRackLocation(x.code),
      lot: normalizeLotId(x.lot) || LOT_LEGACY_ID,
      qty: Math.max(0, Math.round(Number(x.qty || 0))),
    }))
    .filter((x) => x.code && x.qty > 0)
    .sort((a, b) => {
      if (a.code !== b.code) return a.code.localeCompare(b.code);
      return String(a.lot || "").localeCompare(String(b.lot || ""));
    });
}

function consumeRackAllocationsForPicking(it, qty) {
  const q = Math.max(0, Math.round(Number(qty || 0)));
  const current = readRackAllocationsFromDoc(it || {})
    .map((x) => ({
      code: normalizeRackLocation(x.code || ""),
      lot: normalizeLotId(x.lot) || LOT_LEGACY_ID,
      qty: Math.max(0, Math.round(Number(x.qty || 0))),
    }))
    .filter((x) => x.code && x.qty > 0)
    .sort((a, b) => {
      const la = String(a.lot || "");
      const lb = String(b.lot || "");
      if (la !== lb) return la.localeCompare(lb);
      return String(a.code || "").localeCompare(String(b.code || ""));
    });

  let remaining = q;
  const consumed = [];
  const next = [];
  for (const a of current) {
    if (remaining > 0) {
      const take = Math.min(a.qty, remaining);
      if (take > 0) {
        consumed.push({ code: a.code, lot: a.lot, qty: take });
        remaining -= take;
      }
      const left = a.qty - take;
      if (left > 0) next.push({ ...a, qty: left });
    } else {
      next.push(a);
    }
  }
  const cleanLocations = normalizeRackLocationsList(next.map((x) => x.code));
  return {
    nextAllocations: next,
    cleanLocations,
    consumedAllocations: consumed,
    missingQty: remaining,
  };
}

function restoreRackAllocationsForPicking(it, consumedAllocations) {
  const map = pickingRackAllocationsToMap(readRackAllocationsFromDoc(it || {}));
  for (const x of Array.isArray(consumedAllocations) ? consumedAllocations : []) {
    const code = normalizeRackLocation(x?.code || "");
    if (!code) continue;
    const lot = normalizeLotId(x?.lot || "") || LOT_LEGACY_ID;
    const qty = Math.max(0, Math.round(Number(x?.qty || 0)));
    if (qty <= 0) continue;
    const key = `${code}::${lot}`;
    const prev = map.get(key) || { code, lot, qty: 0 };
    prev.qty += qty;
    map.set(key, prev);
  }
  const nextAllocations = pickingCleanAllocationsFromMap(map);
  const cleanLocations = normalizeRackLocationsList(nextAllocations.map((x) => x.code));
  return { nextAllocations, cleanLocations };
}

function pickingItemPatchFromAllocations(basePatch, nextAllocations, cleanLocations, afterQty) {
  const patch = { ...(basePatch || {}) };
  const q = Number.isFinite(Number(afterQty)) ? Math.round(Number(afterQty)) : null;
  const locs = normalizeRackLocationsList(cleanLocations || []);
  if (q !== null && q <= 0) {
    patch.rackLocation = "";
    patch.rackLocations = [];
    patch.rackAllocations = [];
  } else {
    patch.rackLocation = locs[0] || "";
    patch.rackLocations = locs;
    patch.rackAllocations = Array.isArray(nextAllocations) ? nextAllocations : [];
  }
  return patch;
}

function addPickingStockWrite(batch, api, db, loc, flow, line, direction, opts = {}) {
  const requestedSku = toSkuId(line?.sku || opts?.sku || "");
  if (!requestedSku) return null;
  const stockSku = toSkuId(opts.stockSku || stockSkuForSkuAny(requestedSku, loc) || requestedSku);
  if (!stockSku) return null;
  const qty = Math.abs(parseQty(line?.qty || opts?.qty || 0) || 0);
  if (!qty) return null;
  const nowClient = Number(opts.nowClient || Date.now());
  const who = opts.who || state.user?.email || state.user?.emailLower || state.user?.uid || "";
  const hit = getItemBySkuAny(requestedSku, loc);
  const item =
    opts.itemData ||
    hit?.it ||
    getProductBySku(loc, stockSku) ||
    getProductBySku(loc, requestedSku) ||
    {};
  const title =
    opts.title ||
    item?.title ||
    savedTitleForExistingInventorySku(requestedSku, loc) ||
    pickingLineTitle(line, flow) ||
    requestedSku;
  const asin = opts.asin || readAsinFromDoc(item || {}) || readAsinFromLine(line || {});
  const asinPatch = asin ? asinCloudFields(asin, nowClient, who) : {};
  const beforeQty = Number.isFinite(Number(item?.qty)) ? Math.round(Number(item.qty)) : 0;
  const beforeReserved = reservedQtyFromItem(item);
  if (direction > 0 && beforeQty < qty) {
    throw new Error(
      `${requestedSku}: stock insufficiente per il prelievo (${beforeQty} disponibili, richiesti ${qty}).`,
    );
  }
  const itemRef = api.doc(db, COL_ROOT, loc, SUB_ITEMS, stockSku);
  const delta = direction > 0 ? -qty : qty;
  const reservedDelta = delta;
  let allocationResult = null;
  let consumedAllocations = [];
  let actionType = direction > 0 ? "prelievo_picking" : "annulla_prelievo_picking";
  let note = direction > 0 ? "Scarico reale da Picking" : "Annullamento prelievo Picking";

  if (direction > 0) {
    allocationResult = consumeRackAllocationsForPicking(item, qty);
    consumedAllocations = allocationResult.consumedAllocations || [];
    if ((allocationResult.missingQty || 0) > 0) {
      throw new Error(
        `${requestedSku}: ubicazioni insufficienti per il prelievo (mancano ${allocationResult.missingQty} pz ubicati).`,
      );
    }
  } else {
    consumedAllocations = Array.isArray(opts.consumedAllocations) ? opts.consumedAllocations : [];
    allocationResult = restoreRackAllocationsForPicking(item, consumedAllocations);
  }

  const afterQty = beforeQty + delta;
  const reservedFieldValue =
    direction > 0 && beforeReserved <= qty ? 0 : api.increment(reservedDelta);
  const pendingFieldValue =
    direction > 0 && beforeReserved <= qty ? 0 : api.increment(reservedDelta);
  const itemPatch = pickingItemPatchFromAllocations(
    {
      sku: stockSku,
      requestedSku,
      aliasRequestedSku: requestedSku !== stockSku ? requestedSku : "",
      title,
      titleNorm: normalizeText(title || stockSku),
      ...asinPatch,
      qty: api.increment(delta),
      sharedStockSourceSku: stockSku,
      sharedStockCanonicalSku: stockSku,
      sharedStockRevisionAtClient: nowClient,
      stockUpdatedAtClient: nowClient,
      lastStockMutationAtClient: nowClient,
      reservedQty: reservedFieldValue,
      pendingPickQty: pendingFieldValue,
      reservationStatus: direction > 0 ? "prelevata" : "in_attesa_picking",
      lastPickingFlowId: flow?.id || opts.flowId || "",
      lastPickingAt: api.serverTimestamp(),
      lastPickingAtClient: nowClient,
      lastPickingBy: who,
      location: loc,
      updatedAt: api.serverTimestamp(),
      updatedAtClient: nowClient,
      updatedBy: who,
    },
    allocationResult.nextAllocations || [],
    allocationResult.cleanLocations || [],
    afterQty,
  );
  batch.set(itemRef, itemPatch, { merge: true });

  addProductMovementToBatch(batch, api, db, stockSku, {
    type: actionType,
    requestedSku,
    stockSku,
    asin,
    qtySigned: delta,
    deltaSigned: delta,
    reservationQty: reservedDelta,
    reservedQtySigned: reservedDelta,
    fromWarehouse: loc,
    toWarehouse: loc,
    location: loc,
    source: "picking",
    note: `${note}${flowDisplayName(flow) ? " • " + flowDisplayName(flow) : ""}`,
    flowKind: "scarica",
    flowId: flow?.id || opts.flowId || "",
    flowName: flowDisplayName(flow),
    rackAllocations: consumedAllocations,
    createdAtClient: nowClient,
  });

  return {
    sku: requestedSku,
    requestedSku,
    stockSku,
    title,
    qty,
    delta,
    beforeQty,
    afterQty,
    beforeReserved,
    reservedDelta,
    nextAllocations: allocationResult.nextAllocations || [],
    cleanLocations: allocationResult.cleanLocations || [],
    consumedAllocations,
    missingRackQty: allocationResult.missingQty || 0,
  };
}

// Picking FBA/PDF: commit atomico SOLO CLOUD.
// Il vecchio controllo usava lo snapshot già caricato nel browser e poi writeBatch + increment().
// Qui invece ogni prelievo rilegge flow + inventario dentro una Firestore transaction:
// se la quantità reale cloud non basta, la transaction abortisce e non può creare giacenza negativa.
function pickingPositionTextFromCloudItem(it) {
  try {
    const grouped = new Map();
    const allocations = readRackAllocationsFromDoc(it || {});
    for (const a of allocations) {
      const code = normalizeRackLocation(a?.code || "");
      const qty = Math.round(Number(a?.qty || 0));
      if (!code) continue;
      const prev = grouped.get(code) || { code, qty: 0 };
      if (Number.isFinite(qty) && qty > 0) prev.qty += qty;
      grouped.set(code, prev);
    }
    if (!grouped.size) {
      for (const code of readRackLocationsFromDoc(it || {})) {
        const c = normalizeRackLocation(code || "");
        if (c) grouped.set(c, { code: c, qty: 0 });
      }
    }
    const parts = Array.from(grouped.values()).sort((a, b) =>
      String(a.code).localeCompare(String(b.code)),
    );
    if (!parts.length) return "—";
    return parts
      .map((x) => {
        const q =
          Number.isFinite(Number(x.qty)) && Number(x.qty) > 0
            ? ` (${Math.round(Number(x.qty))} pz)`
            : "";
        return `${x.code}${q}`;
      })
      .join(", ");
  } catch (_e) {
    return "—";
  }
}

function pendingPickQtyFromItem(it) {
  try {
    const raw =
      it && Object.prototype.hasOwnProperty.call(it, "pendingPickQty")
        ? it.pendingPickQty
        : (it?.reservedQty ?? 0);
    const n = Number(raw);
    if (!Number.isFinite(n)) return reservedQtyFromItem(it || {});
    return Math.max(0, Math.round(n));
  } catch (_e) {
    return 0;
  }
}

function makeForcePickAvailableError(message, data = {}) {
  const err = new Error(message || "Prelievo forzato disponibile.");
  try {
    err.forcePickAvailable = true;
    err.forcePickData = data || {};
  } catch (_e) {}
  return err;
}

function addPickingStockTransactionWrite(tx, api, db, loc, flow, line, direction, opts = {}) {
  const requestedSku = toSkuId(line?.sku || opts?.sku || "");
  if (!requestedSku) return null;
  const stockSku = toSkuId(opts.stockSku || stockSkuForSkuAny(requestedSku, loc) || requestedSku);
  if (!stockSku) return null;
  const qty = Math.abs(parseQty(line?.qty || opts?.qty || 0) || 0);
  if (!qty) return null;

  const nowClient = Number(opts.nowClient || Date.now());
  const who = opts.who || state.user?.email || state.user?.emailLower || state.user?.uid || "";
  const title = opts.title || pickingLineTitle(line, flow) || requestedSku;
  const forceNegative = direction > 0 && (opts.forceNegative === true || opts.force === true);
  const itemTitle =
    opts.itemData?.title ||
    savedTitleForExistingInventorySku(requestedSku, loc) ||
    title ||
    stockSku;
  const cloudItem = { ...(opts.itemData || {}), sku: stockSku, requestedSku, title: itemTitle };
  const asin = opts.asin || readAsinFromDoc(cloudItem || {}) || readAsinFromLine(line || {});
  const asinPatch = asin ? asinCloudFields(asin, nowClient, who) : {};
  const beforeQty = stockQtyFromDoc(cloudItem || {});
  const beforeReserved = reservedQtyFromItem(cloudItem || {});
  const beforePending = pendingPickQtyFromItem(cloudItem || {});
  const separateReservation = requestedSku !== stockSku;
  const reservationItem = separateReservation ? opts.reservationData || {} : cloudItem;
  const beforeReservation = reservedQtyFromItem(reservationItem);
  const beforeReservationPending = pendingPickQtyFromItem(reservationItem);
  const afterReservation =
    direction > 0 ? Math.max(0, beforeReservation - qty) : beforeReservation + qty;
  const afterReservationPending =
    direction > 0 ? Math.max(0, beforeReservationPending - qty) : beforeReservationPending + qty;
  const shortageQty = Math.max(0, qty - beforeQty);
  const itemRef = api.doc(db, COL_ROOT, loc, SUB_ITEMS, stockSku);

  let delta = 0;
  let afterQty = beforeQty;
  let afterReserved = beforeReserved;
  let afterPending = beforePending;
  let allocationResult = null;
  let consumedAllocations = [];
  let actionType = "";
  let note = "";

  if (direction > 0) {
    if (beforeQty < qty && !forceNegative) {
      throw makeForcePickAvailableError(
        `${requestedSku}: stock cloud insufficiente (${beforeQty} disponibili, richiesti ${qty}). Puoi forzare il prelievo: lo SKU andrà in negativo in inventario.`,
        { sku: requestedSku, stockSku, beforeQty, qty, shortageQty },
      );
    }
    allocationResult = consumeRackAllocationsForPicking(cloudItem, qty);
    consumedAllocations = allocationResult.consumedAllocations || [];
    if ((allocationResult.missingQty || 0) > 0 && !forceNegative) {
      throw makeForcePickAvailableError(
        `${requestedSku}: ubicazioni cloud insufficienti per il prelievo (mancano ${allocationResult.missingQty} pz ubicati). Puoi forzare il prelievo e scaricare comunque inventario.`,
        {
          sku: requestedSku,
          stockSku,
          beforeQty,
          qty,
          shortageQty,
          missingRackQty: allocationResult.missingQty || 0,
        },
      );
    }
    delta = -qty;
    afterQty = beforeQty - qty;
    afterReserved = separateReservation ? beforeReserved : afterReservation;
    afterPending = separateReservation ? beforePending : afterReservationPending;
    actionType = forceNegative ? "prelievo_picking_forzato" : "prelievo_picking";
    note = forceNegative ? "Scarico reale da Picking forzato" : "Scarico reale da Picking";
  } else {
    // Supporto transazionale anche per eventuali annullamenti futuri.
    consumedAllocations = Array.isArray(opts.consumedAllocations) ? opts.consumedAllocations : [];
    allocationResult = restoreRackAllocationsForPicking(cloudItem, consumedAllocations);
    delta = qty;
    afterQty = beforeQty + qty;
    afterReserved = separateReservation ? beforeReserved : afterReservation;
    afterPending = separateReservation ? beforePending : afterReservationPending;
    actionType = "annulla_prelievo_picking";
    note = "Annullamento prelievo Picking";
  }

  const itemPatch = pickingItemPatchFromAllocations(
    {
      sku: stockSku,
      requestedSku,
      aliasRequestedSku: requestedSku !== stockSku ? requestedSku : "",
      title: itemTitle,
      titleNorm: normalizeText(itemTitle || stockSku),
      ...asinPatch,
      qty: afterQty,
      sharedStockSourceSku: stockSku,
      sharedStockCanonicalSku: stockSku,
      sharedStockRevisionAtClient: nowClient,
      stockUpdatedAtClient: nowClient,
      lastStockMutationAtClient: nowClient,
      reservedQty: afterReserved,
      pendingPickQty: afterPending,
      reservationStatus:
        direction > 0 ? (forceNegative ? "prelevata_forzata" : "prelevata") : "in_attesa_picking",
      lastPickingFlowId: flow?.id || opts.flowId || "",
      lastPickingAt: api.serverTimestamp(),
      lastPickingAtClient: nowClient,
      lastPickingBy: who,
      lastPickingForced: forceNegative,
      lastPickingShortageQty: forceNegative ? shortageQty : 0,
      location: loc,
      updatedAt: api.serverTimestamp(),
      updatedAtClient: nowClient,
      updatedBy: who,
    },
    allocationResult.nextAllocations || [],
    allocationResult.cleanLocations || [],
    afterQty,
  );

  tx.set(itemRef, itemPatch, { merge: true });
  if (separateReservation) {
    tx.set(
      api.doc(db, COL_ROOT, loc, SUB_ITEMS, requestedSku),
      {
        sku: requestedSku,
        reservedQty: afterReservation,
        pendingPickQty: afterReservationPending,
        availableQty: Math.max(0, stockQtyFromDoc(reservationItem) - afterReservation),
        reservationStatus: afterReservationPending > 0 ? "in_attesa_picking" : "prelevata",
        lastPickingFlowId: flow?.id || opts.flowId || "",
        lastPickingAt: api.serverTimestamp(),
        lastPickingAtClient: nowClient,
        lastPickingBy: who,
        updatedAt: api.serverTimestamp(),
        updatedAtClient: nowClient,
        updatedBy: who,
      },
      { merge: true },
    );
    addProductMovementToBatch(tx, api, db, requestedSku, {
      type: "rilascio_prenotazione_alias",
      requestedSku,
      stockSku,
      qtySigned: 0,
      deltaSigned: 0,
      reservedQtySigned: afterReservation - beforeReservation,
      location: loc,
      source: "picking",
      flowId: flow?.id || opts.flowId || "",
      createdAtClient: nowClient,
    });
  }

  addProductMovementToBatch(tx, api, db, stockSku, {
    type: actionType,
    requestedSku,
    stockSku,
    asin,
    qtySigned: delta,
    deltaSigned: delta,
    reservationQty: separateReservation ? 0 : afterReservation - beforeReservation,
    reservedQtySigned: separateReservation ? 0 : afterReservation - beforeReservation,
    fromWarehouse: loc,
    toWarehouse: loc,
    location: loc,
    source: "picking",
    note: `${note}${flowDisplayName(flow) ? " • " + flowDisplayName(flow) : ""}`,
    flowKind: "scarica",
    flowId: flow?.id || opts.flowId || "",
    flowName: flowDisplayName(flow),
    rackAllocations: consumedAllocations,
    forced: forceNegative,
    forceNegative,
    shortageQty: forceNegative ? shortageQty : 0,
    missingRackQty: allocationResult.missingQty || 0,
    beforeQty,
    afterQty,
    createdAtClient: nowClient,
  });

  return {
    sku: requestedSku,
    requestedSku,
    stockSku,
    title: itemTitle,
    qty,
    delta,
    beforeQty,
    afterQty,
    beforeReserved,
    afterReserved,
    reservationSku: requestedSku,
    afterReservation,
    afterReservationPending,
    beforePending,
    afterPending,
    reservedDelta: direction > 0 ? -qty : qty,
    nextAllocations: allocationResult.nextAllocations || [],
    cleanLocations: allocationResult.cleanLocations || [],
    consumedAllocations,
    missingRackQty: allocationResult.missingQty || 0,
    shortageQty,
    forced: forceNegative,
    forceNegative,
    position: pickingPositionTextFromCloudItem(cloudItem),
  };
}

async function commitPickingCloudTransaction(loc, flowId, opts = {}) {
  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db || !api.runTransaction) {
    throw new Error("Firebase transaction non disponibile.");
  }
  const l = loc === "cerea" || loc === "concamarise" ? loc : "concamarise";
  const id = String(flowId || "").trim();
  const mode = String(opts.mode || "flow").toLowerCase();
  const requestedSku = toSkuId(opts.sku || "");
  if (!id) throw new Error("Flusso non valido.");
  if (mode === "sku" && !requestedSku) throw new Error("SKU non valido.");

  const nowClient = Number(opts.nowClient || Date.now());
  const who = opts.who || state.user?.email || state.user?.emailLower || state.user?.uid || "";
  const bulkId = opts.bulkId || "";
  const forceNegative = opts.forceNegative === true || opts.force === true;
  const flowRef = api.doc(db, COL_ROOT, l, SUB_LOGS, id);

  return await api.runTransaction(db, async (tx) => {
    const flowSnap = await tx.get(flowRef);
    if (!flowSnap.exists()) throw new Error("Flusso non trovato nel cloud.");
    const flow = normalizeFlowLogDoc(flowSnap, l);
    if (String(flow?.kind || "").toLowerCase() !== "scarica") {
      throw new Error("Questo flusso non è uno scarico prelevabile.");
    }
    if (flow?.voided === true) throw new Error("Questo flusso è annullato.");
    if (isShopifyFbmFlow(flow)) {
      throw new Error(
        "Questo è un flusso Shopify FBM: il picking operativo non deve scalare inventario.",
      );
    }
    if (!isPickingManagedFlow(flow)) {
      throw new Error(
        "Flusso non prenotato: questo scarico risulta già applicato con il vecchio metodo.",
      );
    }

    const validLines = pickingUniqueLines(flow).filter((x) => toSkuId(x?.sku || ""));
    let linesToPick = [];
    if (mode === "sku") {
      const line = validLines.find((x) => toSkuId(x?.sku || "") === requestedSku) || null;
      if (!line) throw new Error(`${requestedSku}: SKU non presente nel flusso cloud.`);
      if (isPickingLinePicked(flow, requestedSku))
        throw new Error(`${requestedSku}: risulta già prelevato nel cloud.`);
      linesToPick = [line];
    } else {
      linesToPick = validLines.filter((x) => !isPickingLinePicked(flow, toSkuId(x?.sku || "")));
      if (!linesToPick.length) throw new Error("Questo flusso risulta già prelevato nel cloud.");
    }

    const itemSnaps = new Map();
    const workingItems = new Map();
    const cloudSnaps = new Map();
    const idxPick = getInvIndexForMatch();
    for (const line of linesToPick) {
      const sku = toSkuId(line?.sku || "");
      if (!sku || itemSnaps.has(sku)) continue;
      const stockSku = stockSkuForSkuAny(sku, l, idxPick) || sku;
      for (const readSku of new Set([stockSku, sku])) {
        if (cloudSnaps.has(readSku)) continue;
        const snap = await tx.get(api.doc(db, COL_ROOT, l, SUB_ITEMS, readSku));
        cloudSnaps.set(readSku, snap);
        workingItems.set(readSku, snap.exists() ? snap.data() || {} : {});
      }
      itemSnaps.set(sku, { snap: cloudSnaps.get(stockSku), stockSku });
    }

    const pickedLines = {};
    const nextPickedMap = { ...pickingLineMap(flow) };
    const skuList = [];
    const stockInfos = [];
    let pieces = 0;

    for (const line of linesToPick) {
      const sku = toSkuId(line?.sku || "");
      if (!sku) continue;
      const key = pickingSkuKey(sku);
      if (nextPickedMap[key]?.picked === true || nextPickedMap[key]?.status === "prelevato") {
        throw new Error(`${sku}: risulta già prelevato nel cloud.`);
      }
      const qty = Math.abs(parseQty(line?.qty || 0) || 0);
      if (!qty) throw new Error(`${sku}: quantità zero nel flusso cloud.`);
      const title = pickingLineTitle(line, flow);
      const itemInfo = itemSnaps.get(sku) || {};
      const itemSnap = itemInfo.snap;
      const stockSku = itemInfo.stockSku || stockSkuForSkuAny(sku, l, idxPick) || sku;
      const itemData = workingItems.get(stockSku) || {};
      const reservationData = workingItems.get(sku) || {};
      const stockInfo = addPickingStockTransactionWrite(tx, api, db, l, flow, line, 1, {
        nowClient,
        who,
        title,
        flowId: id,
        itemData,
        reservationData,
        forceNegative,
        stockSku,
      });
      if (!stockInfo) continue;
      // Two child SKUs in one flow must consume the owner's stock cumulatively.
      workingItems.set(stockSku, {
        ...itemData,
        qty: stockInfo.afterQty,
        reservedQty: stockInfo.afterReserved,
        pendingPickQty: stockInfo.afterPending,
        rackAllocations: stockInfo.nextAllocations,
        rackLocations: stockInfo.cleanLocations,
      });
      if (sku !== stockSku)
        workingItems.set(sku, {
          ...reservationData,
          reservedQty: stockInfo.afterReservation,
          pendingPickQty: stockInfo.afterReservationPending,
        });
      stockInfos.push(stockInfo);
      const position = stockInfo.position || pickingPositionTextFromCloudItem(itemData) || "—";
      const rec = {
        picked: true,
        status: "prelevato",
        sku,
        requestedSku: sku,
        stockSku: stockInfo.stockSku || stockSku,
        title: stockInfo.title || title,
        qty,
        position,
        rackLocation: position,
        pickedAllocations: stockInfo.consumedAllocations || [],
        forced: !!stockInfo.forced,
        forceNegative: !!stockInfo.forceNegative,
        shortageQty: stockInfo.shortageQty || 0,
        missingRackQty: stockInfo.missingRackQty || 0,
        pickedAtClient: nowClient,
        pickedBy: who,
        ...(bulkId ? { bulkId } : {}),
      };
      pickedLines[key] = rec;
      nextPickedMap[key] = rec;
      pieces += qty;
      if (!skuList.includes(sku)) skuList.push(sku);
    }

    if (!skuList.length) throw new Error("Nessuna riga valida da prelevare nel cloud.");

    const allPicked =
      validLines.length > 0 &&
      validLines.every((x) => {
        const k = pickingSkuKey(x.sku);
        return !!nextPickedMap[k]?.picked;
      });

    const forcedLines = stockInfos.filter((x) => x && x.forced);
    const shortageLines = stockInfos
      .filter((x) => x && ((x.shortageQty || 0) > 0 || (x.missingRackQty || 0) > 0))
      .map((x) => ({
        sku: x.sku,
        requestedSku: x.requestedSku || x.sku,
        stockSku: x.stockSku || x.sku,
        beforeQty: x.beforeQty,
        requestedQty: x.qty,
        afterQty: x.afterQty,
        shortageQty: x.shortageQty || 0,
        missingRackQty: x.missingRackQty || 0,
      }));

    const event =
      mode === "sku"
        ? {
            type: "sku",
            sku: skuList[0],
            qty: pieces,
            position: pickedLines[pickingSkuKey(skuList[0])]?.position || "—",
            stockDelta: -pieces,
            reservationDelta: -pieces,
            forced: forcedLines.length > 0,
            forceNegative: forcedLines.length > 0,
            shortageLines,
            atClient: nowClient,
            by: who,
          }
        : {
            type: "flow",
            ...(bulkId ? { bulk: true, bulkId } : {}),
            skus: skuList,
            count: skuList.length,
            pieces,
            stockDelta: -pieces,
            reservationDelta: -pieces,
            forced: forcedLines.length > 0,
            forceNegative: forcedLines.length > 0,
            shortageLines,
            atClient: nowClient,
            by: who,
          };

    const pickingPatch = {
      status: allPicked ? "prelevato" : "parziale",
      managedByPicking: true,
      pickedLines:
        mode === "sku"
          ? { [pickingSkuKey(skuList[0])]: pickedLines[pickingSkuKey(skuList[0])] }
          : pickedLines,
      updatedAt: api.serverTimestamp(),
      updatedAtClient: nowClient,
      updatedBy: who,
      events: api.arrayUnion(event),
      flowPicked: allPicked,
      flowPickMode: allPicked ? (mode === "sku" ? "sku" : "flow") : "",
      flowPickGroup: mode !== "sku",
      ...(mode !== "sku" ? { flowPickedCount: skuList.length, flowPickedSkus: skuList } : {}),
      flowPickedAt: allPicked ? api.serverTimestamp() : null,
      flowPickedAtClient: allPicked ? nowClient : null,
      flowPickedBy: allPicked ? who : "",
      ...(bulkId ? { bulkPickId: bulkId } : {}),
    };

    tx.set(
      flowRef,
      {
        status: allPicked ? "PICKED" : "PARTIAL_PICKED",
        reservation: {
          active: !allPicked,
          status: allPicked ? "prelevato" : "parziale",
          pickedAtClient: allPicked ? nowClient : null,
          updatedAtClient: nowClient,
          updatedBy: who,
        },
        picking: pickingPatch,
      },
      { merge: true },
    );

    return {
      flowId: id,
      loc: l,
      flowName: flowDisplayName(flow),
      mode,
      sku: skuList[0] || "",
      skuList,
      skuCount: skuList.length,
      pieces,
      allPicked,
      stockInfos,
      forced: stockInfos.some((x) => x && x.forced),
      forceNegative: stockInfos.some((x) => x && x.forceNegative),
      shortageLines: stockInfos
        .filter((x) => x && ((x.shortageQty || 0) > 0 || (x.missingRackQty || 0) > 0))
        .map((x) => ({
          sku: x.sku,
          requestedSku: x.requestedSku || x.sku,
          stockSku: x.stockSku || x.sku,
          beforeQty: x.beforeQty,
          requestedQty: x.qty,
          afterQty: x.afterQty,
          shortageQty: x.shortageQty || 0,
          missingRackQty: x.missingRackQty || 0,
        })),
    };
  });
}

function isForcePickingAvailableError(err) {
  try {
    if (err && err.forcePickAvailable === true) return true;
    const msg = String(err?.message || err || "");
    return /stock cloud insufficiente|ubicazioni cloud insufficienti|forzare il prelievo|prelievo forzato/i.test(
      msg,
    );
  } catch (_e) {
    return false;
  }
}

function forcePickingConfirmText(err, ctx = {}) {
  const msg = String(err?.message || err || "").trim();
  const title = ctx.title || "Prelievo forzato";
  const flowName = ctx.flowName
    ? `
Flusso: ${ctx.flowName}`
    : "";
  const sku = ctx.sku
    ? `
SKU: ${ctx.sku}`
    : "";
  return `${title}${flowName}${sku}

${msg}

Vuoi FORZARE il prelievo?

Confermandolo, la transaction cloud scaricherà comunque la quantità richiesta e lo SKU potrà andare in negativo in inventario.`;
}

async function retryPickingForceCloudTransaction(loc, flowId, opts = {}, err, ctx = {}) {
  if (!isForcePickingAvailableError(err)) throw err;
  const ok = await uiConfirm({
    title: ctx.title || "Prelievo forzato",
    tone: "warning",
    message: String(err?.message || err || "").trim(),
    rows: [
      ["Flusso", ctx.flowName || ""],
      ["SKU", ctx.sku || ""],
    ],
    note: "Se forzi, la quantità richiesta viene scaricata comunque e lo SKU può andare in negativo in inventario.",
    noteTone: "warn",
    confirmLabel: "Forza prelievo",
  });
  if (!ok) return null;
  return await commitPickingCloudTransaction(loc, flowId, { ...opts, forceNegative: true });
}

// UI immediata dopo prelievo FBA/PDF: i log di picking sono caricati one-shot
// per performance, quindi dopo una transaction cloud aggiorniamo subito lo stato
// in memoria. Firestore resta la fonte ufficiale; un refresh one-shot riallinea dopo.
function applyPickingCloudResultToLocalState(res, opts = {}) {
  try {
    if (!res || !res.flowId) return false;
    const loc =
      res.loc === "cerea" || res.loc === "concamarise"
        ? res.loc
        : opts.loc === "cerea" || opts.loc === "concamarise"
          ? opts.loc
          : "concamarise";
    const flowId = String(res.flowId || opts.flowId || "").trim();
    const lg = state.logs?.[loc];
    if (!lg || !Array.isArray(lg.flows) || !flowId) return false;

    const idx = lg.flows.findIndex((f) => String(f?.id || "") === flowId);
    if (idx < 0) return false;

    const oldFlow = lg.flows[idx] || {};
    const nowClient = Number(opts.nowClient || res.nowClient || Date.now());
    const who = opts.who || state.user?.emailLower || state.user?.email || state.user?.uid || "";
    const stockInfos = Array.isArray(res.stockInfos) ? res.stockInfos : [];
    const pickedMap = { ...pickingLineMap(oldFlow) };
    const flowLines = Array.isArray(oldFlow.lines) ? oldFlow.lines : [];

    const infoByRequested = new Map();
    for (const info of stockInfos) {
      const sku = toSkuId(info?.requestedSku || info?.sku || "");
      if (sku) infoByRequested.set(sku, info || {});
    }

    const skuList =
      Array.isArray(res.skuList) && res.skuList.length
        ? res.skuList.map(toSkuId).filter(Boolean)
        : res.sku
          ? [toSkuId(res.sku)]
          : [];

    for (const sku of skuList) {
      if (!sku) continue;
      const key = pickingSkuKey(sku);
      const line = flowLines.find((l) => toSkuId(l?.sku || "") === sku) || {
        sku,
        qty: 0,
        title: sku,
      };
      const info = infoByRequested.get(sku) || {};
      const qty = Math.abs(parseQty(info.qty ?? line.qty ?? 0) || 0);
      const title = info.title || pickingLineTitle(line, oldFlow) || sku;
      const position =
        info.position ||
        pickingPositionTextFromCloudItem({
          sku: info.stockSku || sku,
          title,
          rackAllocations: info.nextAllocations || [],
          rackLocations: info.cleanLocations || [],
        }) ||
        "—";

      pickedMap[key] = {
        ...(pickedMap[key] || {}),
        picked: true,
        status: "prelevato",
        sku,
        requestedSku: sku,
        stockSku: info.stockSku || sku,
        title,
        qty,
        position,
        rackLocation: position,
        pickedAllocations: Array.isArray(info.consumedAllocations) ? info.consumedAllocations : [],
        forced: !!(info.forced || res.forced),
        forceNegative: !!(info.forceNegative || res.forceNegative),
        shortageQty: Number(info.shortageQty || 0) || 0,
        missingRackQty: Number(info.missingRackQty || 0) || 0,
        pickedAtClient: nowClient,
        pickedBy: who,
      };
    }

    const validLines = pickingUniqueLines({ ...oldFlow, lines: flowLines }).filter((x) =>
      toSkuId(x?.sku || ""),
    );
    const allPicked =
      validLines.length > 0 &&
      validLines.every((x) => {
        const k = pickingSkuKey(x.sku);
        return !!pickedMap[k]?.picked || pickedMap[k]?.status === "prelevato";
      });
    const anyPicked = validLines.some((x) => {
      const k = pickingSkuKey(x.sku);
      return !!pickedMap[k]?.picked || pickedMap[k]?.status === "prelevato";
    });

    const prevPicking =
      oldFlow.picking && typeof oldFlow.picking === "object" ? oldFlow.picking : {};
    const prevReservation =
      oldFlow.reservation && typeof oldFlow.reservation === "object" ? oldFlow.reservation : {};
    const event = {
      type: String(res.mode || opts.mode || "sku") === "flow" ? "flow" : "sku",
      sku: skuList[0] || "",
      skus: skuList,
      count: skuList.length,
      pieces:
        Number(
          res.pieces || stockInfos.reduce((a, x) => a + Math.abs(parseQty(x?.qty || 0) || 0), 0),
        ) || 0,
      forced: !!res.forced,
      forceNegative: !!res.forceNegative,
      atClient: nowClient,
      by: who,
      optimistic: true,
    };

    const nextFlow = {
      ...oldFlow,
      status: allPicked ? "PICKED" : anyPicked ? "PARTIAL_PICKED" : oldFlow.status || "RESERVED",
      reservation: {
        ...prevReservation,
        active: !allPicked,
        status: allPicked
          ? "prelevato"
          : anyPicked
            ? "parziale"
            : prevReservation.status || "in_attesa_picking",
        pickedAtClient: allPicked
          ? prevReservation.pickedAtClient || nowClient
          : prevReservation.pickedAtClient || null,
        updatedAtClient: nowClient,
        updatedBy: who,
      },
      picking: {
        ...prevPicking,
        managedByPicking: true,
        status: allPicked ? "prelevato" : anyPicked ? "parziale" : "da_prelevare",
        pickedLines: pickedMap,
        flowPicked: allPicked,
        flowPickMode: allPicked
          ? String(res.mode || opts.mode || "") === "flow"
            ? "flow"
            : "sku"
          : prevPicking.flowPickMode || "",
        flowPickedAtClient: allPicked
          ? prevPicking.flowPickedAtClient || nowClient
          : prevPicking.flowPickedAtClient || null,
        flowPickedBy: allPicked ? prevPicking.flowPickedBy || who : prevPicking.flowPickedBy || "",
        updatedAtClient: nowClient,
        updatedBy: who,
        events: [...(Array.isArray(prevPicking.events) ? prevPicking.events : []), event],
      },
      updatedAtClient: nowClient,
    };

    lg.flows.splice(idx, 1, nextFlow);
    // Versione monotona delle mutazioni locali: impedisce a una query one-shot partita
    // prima del prelievo successivo di rimettere in memoria uno stato più vecchio.
    lg.localMutationSeq = (Number(lg.localMutationSeq || 0) || 0) + 1;
    lg.meta = {
      ...(lg.meta || {}),
      loaded: true,
      oneShot: true,
      count: Array.isArray(lg.flows) ? lg.flows.length : lg.meta?.count || 0,
    };
    lg.loadedAtClient = Date.now();

    // Aggiorna anche inventario locale: quantità/ubicazioni cambiano subito nella UI,
    // poi il listener items confermerà il dato ufficiale dal cloud.
    for (const info of stockInfos) {
      const stockSku = toSkuId(info?.stockSku || info?.sku || "");
      if (!stockSku) continue;
      const inv = state.inventory?.[loc];
      if (!inv || !Array.isArray(inv.items)) continue;
      const itemIdx = inv.items.findIndex((it) => toSkuId(it?.sku || it?.id || "") === stockSku);
      if (itemIdx < 0) continue;
      if (info.reservationSku && info.reservationSku !== stockSku) {
        const reservationIdx = inv.items.findIndex(
          (it) => toSkuId(it?.sku || it?.id || "") === info.reservationSku,
        );
        if (reservationIdx >= 0) {
          const child = inv.items[reservationIdx];
          inv.items.splice(reservationIdx, 1, {
            ...child,
            reservedQty: info.afterReservation,
            pendingPickQty: info.afterReservationPending,
            availableQty: Math.max(0, stockQtyFromDoc(child) - info.afterReservation),
          });
        }
      }
      const prev = inv.items[itemIdx] || {};
      const afterQty = Number.isFinite(Number(info.afterQty))
        ? Math.round(Number(info.afterQty))
        : Math.max(0, (Number(prev.qty || 0) || 0) - (Number(info.qty || 0) || 0));
      const afterReserved = Number.isFinite(Number(info.afterReserved))
        ? Math.max(0, Math.round(Number(info.afterReserved)))
        : Math.max(0, reservedQtyFromItem(prev) - (Number(info.qty || 0) || 0));
      const afterPending = Number.isFinite(Number(info.afterPending))
        ? Math.max(0, Math.round(Number(info.afterPending)))
        : Math.max(0, pendingPickQtyFromItem(prev) - (Number(info.qty || 0) || 0));
      const nextAllocations = Array.isArray(info.nextAllocations)
        ? info.nextAllocations
        : readRackAllocationsFromDoc(prev || {});
      const cleanLocations = normalizeRackLocationsList(
        Array.isArray(info.cleanLocations)
          ? info.cleanLocations
          : nextAllocations.map((x) => x.code),
      );
      inv.items.splice(itemIdx, 1, {
        ...prev,
        qty: afterQty,
        reservedQty: afterReserved,
        pendingPickQty: afterPending,
        availableQty: Math.max(0, afterQty - afterReserved),
        rackAllocations: afterQty > 0 ? nextAllocations : [],
        rackLocations: afterQty > 0 ? cleanLocations : [],
        rackLocation: afterQty > 0 ? cleanLocations[0] || "" : "",
        reservationStatus: afterPending > 0 ? "in_attesa_picking" : "prelevata",
        lastPickingFlowId: flowId,
        lastPickingAtClient: nowClient,
        lastPickingBy: who,
        updatedAtClient: nowClient,
        location: loc,
      });
    }

    updatePickingPreviewCountsFromCurrentLogs(
      "local_pick_" + String(res.mode || opts.mode || "sku"),
    );
    if (typeof renderHomeDashboard === "function") renderHomeDashboard();
    if (typeof renderProductDetailsSheet === "function" && state.ui?.sheet === "productDetails")
      renderProductDetailsSheet();
    return true;
  } catch (err) {
    console.warn("apply local picking result", err);
    return false;
  }
}

function refreshPickingAfterCloudMutation(res, opts = {}) {
  try {
    applyPickingCloudResultToLocalState(res, opts);
    renderHomePickingBox();

    const loc =
      res?.loc === "cerea" || res?.loc === "concamarise"
        ? res.loc
        : opts.loc === "cerea" || opts.loc === "concamarise"
          ? opts.loc
          : "";
    const currentView = pickingHomeView();
    if (loc && (currentView === "pickingFba" || currentView === "pickingHistory")) {
      const bucket =
        state.__postPickingCloudRefreshTimers || (state.__postPickingCloudRefreshTimers = {});
      try {
        if (bucket[loc]) clearTimeout(bucket[loc]);
      } catch (_e) {}
      bucket[loc] = setTimeout(() => {
        try {
          bucket[loc] = null;
          startLogsFor(loc, {
            mode: currentView === "pickingFba" ? "fba" : "full",
            forceReload: true,
            staleMs: 0,
          });
        } catch (_e) {}
      }, 700);
    }
  } catch (err) {
    console.warn("refresh picking after cloud mutation", err);
  }
}

function firstRackLocationCodeFromItem(it) {
  try {
    const allocations = readRackAllocationsFromDoc(it || {});
    const withQty = allocations.find(
      (x) => normalizeRackLocation(x?.code || "") && Number(x?.qty || 0) > 0,
    );
    const anyAlloc = withQty || allocations.find((x) => normalizeRackLocation(x?.code || ""));
    if (anyAlloc) return normalizeRackLocation(anyAlloc.code || "");
    const locs = readRackLocationsFromDoc(it || {});
    return normalizeRackLocation(locs[0] || "");
  } catch (_e) {
    return "";
  }
}

function firstRackLocationCodeFromPicking(flow, sku) {
  try {
    const parts = pickingLinePositionParts(flow, sku);
    return normalizeRackLocation(parts?.[0]?.code || "");
  } catch (_e) {
    return "";
  }
}

// Tutte le ubicazioni valide di un prodotto (più posizioni): codici normalizzati,
// ordinati mettendo prima quelle con quantità > 0. Usato dalla mappa Trova per
// mostrare ogni posizione del prodotto, non solo la prima.
function allRackLocationCodesFromItem(it) {
  try {
    const out = [];
    const seen = new Set();
    const push = (codeRaw) => {
      const c = normalizeRackLocation(codeRaw || "");
      if (!c || seen.has(c) || !RACK_LOCATION_SET.has(c)) return;
      seen.add(c);
      out.push(c);
    };
    const allocations = readRackAllocationsFromDoc(it || {})
      .slice()
      .sort((a, b) => Number(b?.qty || 0) - Number(a?.qty || 0));
    for (const a of allocations) push(a?.code);
    for (const code of readRackLocationsFromDoc(it || {})) push(code);
    return out;
  } catch (_e) {
    return [];
  }
}

function allRackLocationCodesFromPicking(flow, sku) {
  try {
    const out = [];
    const seen = new Set();
    const parts = (pickingLinePositionParts(flow, sku) || [])
      .slice()
      .sort((a, b) => Number(b?.qty || 0) - Number(a?.qty || 0));
    for (const p of parts) {
      const c = normalizeRackLocation(p?.code || "");
      if (!c || seen.has(c) || !RACK_LOCATION_SET.has(c)) continue;
      seen.add(c);
      out.push(c);
    }
    return out;
  } catch (_e) {
    return [];
  }
}

const CAPANNONE_3D_FOCUS_DOC_ID = "capannone3dFocus";

async function openCapannone3dFind(code, codes) {
  const c = normalizeRackLocation(code || "");
  if (!c) {
    showToast("Non posizionato", "Questo SKU non ha ancora una posizione bancale.", 2200);
    return;
  }
  if (!RACK_LOCATION_SET.has(c)) {
    showToast("Posizione non valida", `${c} non è nella mappa del capannone 3D.`, 2600);
    return;
  }

  const api = state.firebase?.api;
  const db = state.firebase?.db;
  if (!api || !db || !state.user?.isWhitelisted) {
    showToast("Cloud non pronto", "Accesso o Firestore non ancora disponibile.", 2200);
    return;
  }

  const nowClient = Date.now();
  const focusSeq = `${nowClient}-${Math.random().toString(36).slice(2, 8)}`;
  const who = state.user?.emailLower || state.user?.email || state.user?.uid || "";

  try {
    const ref = api.doc(db, COL_PRODUCTS, CAPANNONE_3D_FOCUS_DOC_ID);
    await api.setDoc(
      ref,
      {
        _type: "capannone3dFocus",
        type: "capannone3dFocus",
        rackLocation: c,
        code: c,
        focusSeq,
        focusAt: api.serverTimestamp(),
        focusAtClient: nowClient,
        focusBy: who,
        source: "picking",
        note: "Comando Trova da Picking: tutti i Capannone 3D aperti si muovono su questo bancale.",
      },
      { merge: true },
    );

    showToast("Trova inviato", `Capannone 3D → ${c}`, 1200);
  } catch (err) {
    console.warn("capannone 3d focus command", err);
    showToast("Errore Trova", String(err?.message || err).slice(0, 180), 3000);
  }
}

function findPalletButtonHtml(code, codes, productInfo = {}, opts = {}) {
  const c = normalizeRackLocation(code || "");
  let list = Array.isArray(codes) ? codes.map((x) => normalizeRackLocation(x)).filter(Boolean) : [];
  if (c && !list.includes(c)) list = [c, ...list];
  const seen = new Set();
  list = list.filter((x) => {
    if (seen.has(x)) return false;
    seen.add(x);
    return true;
  });
  const primary = c || list[0] || "";
  const sku = toSkuId(productInfo?.sku || productInfo?.productSku || "");
  const rawTitle = squashWhitespace(
    productInfo?.title || productInfo?.name || productInfo?.productName || "",
  );
  const productTitle = squashWhitespace(parseTitleMeta(rawTitle || sku).main || rawTitle || "");
  if (!primary)
    return `<button class="btn btn--ghost btn--sm btn--find" type="button" disabled aria-disabled="true" title="Questo prodotto non ha ancora una posizione">${ICON.pin}<span>Trova</span></button>`;
  const title = `Trova ${primary}${list.length > 1 ? ` e altre ${list.length - 1} posizioni` : ""} sulla mappa e sul Capannone 3D`;
  const codesAttr = ` data-codes="${escapeHtml(list.join(","))}"`;
  const skuAttr = sku ? ` data-sku="${escapeHtml(sku)}"` : "";
  const titleAttr = productTitle ? ` data-title="${escapeHtml(productTitle)}"` : "";
  return `<button class="btn btn--ghost ${opts.size === "lg" ? "" : "btn--sm "}btn--find pickingFindBtn" type="button" data-action="findPallet" data-code="${escapeHtml(primary)}"${codesAttr}${skuAttr}${titleAttr} title="${escapeHtml(title)}">${ICON.pin}<span>Trova</span>${list.length > 1 ? `<span class="btn-count">${list.length}</span>` : ""}</button>`;
}

function pickingLineTitle(line, flow) {
  const requestedSku = toSkuId(line?.sku || "");
  const loc =
    flow?.location === "cerea" || flow?.location === "concamarise" ? flow.location : "concamarise";
  const hit = getItemBySkuAny(requestedSku, loc);
  const it = hit?.it || null;

  // Picking FBA/PDF: il flusso può essere stato creato giorni prima.
  // Nome e anagrafica devono quindi arrivare sempre dall'inventario cloud live,
  // non dal titolo fotografato dentro la riga del PDF/log.
  const liveRaw = squashWhitespace(it?.title || it?.name || "");
  const flowRaw = squashWhitespace(line?.title || line?.name || requestedSku);
  const raw = liveRaw || flowRaw || requestedSku;
  const meta = parseTitleMeta(raw);
  return meta.main || raw || requestedSku;
}

function pickingUniqueLines(flow) {
  const lines = Array.isArray(flow?.lines) ? flow.lines.filter((l) => toSkuId(l?.sku || "")) : [];
  const map = new Map();
  for (const l of lines) {
    const sku = toSkuId(l?.sku || "");
    if (!sku) continue;
    const qty = Math.abs(parseQty(l?.qty || 0) || 0);
    const title = pickingLineTitle(l, flow) || sku;
    const prev = map.get(sku);
    if (prev) {
      prev.qty = Math.round((Number(prev.qty || 0) + qty) * 1000) / 1000;
      if (title && (!prev.title || title.length > String(prev.title).length)) prev.title = title;
    } else {
      map.set(sku, { ...l, sku, title, qty });
    }
  }
  return Array.from(map.values());
}

function pickingFlowWasPickedAsGroup(flow) {
  if (isShopifyFbmCompletedByShopify(flow)) return true;
  const p = flow?.picking && typeof flow.picking === "object" ? flow.picking : {};
  if (p.flowPicked !== true) return false;
  if (p.flowPickMode === "flow" || p.flowPickGroup === true) return true;
  const events = Array.isArray(p.events) ? p.events : [];
  return events.some((e) => String(e?.type || "").toLowerCase() === "flow");
}

function pickingFlowGroupHistoryEntry(flow) {
  const lines = pickingUniqueLines(flow);
  const loc =
    flow?.location === "cerea" || flow?.location === "concamarise" ? flow.location : "concamarise";
  const picked = pickingLineMap(flow);
  const completedByShopify = isShopifyFbmCompletedByShopify(flow);
  let maxPickedAt = pickingFlowStableClientTs(flow, completedByShopify);
  let pickedBy = pickingStableOperatorLabel(
    flow?.picking?.flowPickedBy || flow?.picking?.updatedBy || "",
    completedByShopify,
  );
  let totalQty = 0;
  const skus = [];
  for (const line of lines) {
    const sku = toSkuId(line?.sku || "");
    if (!sku) continue;
    skus.push(sku);
    const qty = Math.abs(parseQty(line?.qty || 0) || 0);
    totalQty += qty;
    const rec = picked[pickingSkuKey(sku)] || {};
    const at = pickingLineStableClientTs(flow, sku, rec, completedByShopify);
    if (at) {
      if (completedByShopify) {
        if (!maxPickedAt || at < maxPickedAt) maxPickedAt = at;
      } else if (at > maxPickedAt) {
        maxPickedAt = at;
      }
    }
    if (!pickedBy && (rec.pickedBy || rec.by))
      pickedBy = pickingStableOperatorLabel(rec.pickedBy || rec.by || "", completedByShopify);
  }
  return {
    type: "flow",
    flow,
    flowId: String(flow?.id || ""),
    loc,
    sku: "FLUSSO",
    title: flowDisplayName(flow),
    qty: Math.round(totalQty),
    count: skus.length,
    skus,
    position: `${skus.length} SKU`,
    at: maxPickedAt || Number(flow?.appliedAtClient || 0) || 0,
    by: pickedBy,
    completedByShopify,
    completedLabel: completedByShopify ? "Completato Shopify" : "",
  };
}

function pickingPickedHistoryEntries() {
  const out = [];
  const flows = getPickingCandidateFlows();
  for (const flow of flows) {
    const st = pickingFlowStats(flow);
    if (st.done && pickingFlowWasPickedAsGroup(flow)) {
      out.push(pickingFlowGroupHistoryEntry(flow));
      continue;
    }

    const picked = pickingLineMap(flow);
    for (const [key, rec0] of Object.entries(picked || {})) {
      const rec = rec0 || {};
      if (!(rec.picked === true || rec.status === "prelevato")) continue;
      const sku = toSkuId(rec.sku || key || "");
      if (!sku) continue;
      out.push({
        type: "sku",
        flow,
        flowId: String(flow?.id || ""),
        loc:
          flow?.location === "cerea" || flow?.location === "concamarise"
            ? flow.location
            : "concamarise",
        sku,
        title: squashWhitespace(pickingLineTitle({ sku }, flow) || rec.title || sku),
        qty: Number.isFinite(Number(rec.qty)) ? Math.round(Number(rec.qty)) : 0,
        position: squashWhitespace(
          rec.position || rec.rackLocation || pickingLinePositionText(flow, sku) || "—",
        ),
        at: pickingLineStableClientTs(flow, sku, rec, isShopifyFbmCompletedByShopify(flow)),
        by: pickingStableOperatorLabel(
          rec.pickedBy || rec.by || flow?.picking?.flowPickedBy || "",
          isShopifyFbmCompletedByShopify(flow),
        ),
      });
    }
  }
  out.sort((a, b) => (b.at || 0) - (a.at || 0));
  return out;
}

function shopifySyncMetaTimestamp(meta) {
  try {
    const m = meta || {};
    return Math.max(
      readFlowLogTimestamp(m.lastCheckAtClient),
      readFlowLogTimestamp(m.lastCompletedAtClient),
      readFlowLogTimestamp(m.lastStartedAtClient),
      readFlowLogTimestamp(m.lastFailedAtClient),
      readFlowLogTimestamp(m.updatedAtClient),
      readFlowLogTimestamp(m.lastCheckAt),
      readFlowLogTimestamp(m.lastCompletedAt),
      readFlowLogTimestamp(m.lastStartedAt),
      readFlowLogTimestamp(m.lastFailedAt),
      readFlowLogTimestamp(m.updatedAt),
    );
  } catch (_e) {
    return 0;
  }
}

function shopifyFbmSyncLastCheckTs() {
  try {
    const meta = state.shopifySync?.meta || null;
    return shopifySyncMetaTimestamp(meta);
  } catch (_e) {
    return 0;
  }
}

function fmtTimeShort(ts) {
  try {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  } catch (_e) {
    return "—";
  }
}

function shopifyFbmSyncCaption() {
  try {
    const err = state.shopifySync?.error || "";
    const meta = state.shopifySync?.meta || null;
    const status = String(meta?.status || "").toLowerCase();
    if (status === "failed" || err) {
      return "Ultimo controllo: errore";
    }
    const ts = shopifyFbmSyncLastCheckTs();
    return ts ? `Ultimo controllo alle ${fmtTimeShort(ts)}` : "Ultimo controllo: —";
  } catch (_e) {
    return "Ultimo controllo: —";
  }
}

function renderHomePickingBox() {
  const box = $("homePickingBox");
  const list = $("homePickingList");
  const count = $("homePickingCount");
  const hint = $("homePickingHint");
  const btnPickAll = $("btnPickAllFlows");
  const sub = $("homePickingSub");
  if (!box || !list || !count) {
    renderHomePickingHistoryBox();
    return;
  }
  const hidePickAll = () => {
    if (!btnPickAll) return;
    btnPickAll.disabled = true;
    btnPickAll.hidden = true;
  };

  if (!state.user?.isWhitelisted) {
    count.textContent = "—";
    applyPickingPreviewNavCounts("—");
    list.innerHTML = uiEmpty("Accedi per vedere il picking.");
    hidePickAll();
    if (hint) hint.textContent = "";
    renderHomePickingHistoryBox();
    return;
  }

  const currentPickingView = pickingHomeView();
  const showFbaPicking = currentPickingView === "pickingFba";
  const showFbmPicking = currentPickingView === "pickingFbm";
  if (!showFbmPicking && !showFbaPicking) {
    hidePickAll();
    renderHomePickingHistoryBox();
    return;
  }
  if (showFbmPicking) {
    if (renderFastFbmPickingFromInventory(box, list, count, hint, btnPickAll)) return;
  }
  if (sub)
    sub.textContent = showFbaPicking
      ? "Flussi FBA da preparare, dal più recente. Il prelievo scarica subito l’inventario."
      : "Ordini Shopify FBM da preparare.";

  if (!logsRealtimeStarted()) {
    count.textContent = "—";
    applyPickingPreviewNavCounts("—");
    schedulePickingPreviewCounts("not_started", { delay: 900 });
    list.innerHTML = uiEmpty("Avvio lettura dei flussi…");
    hidePickAll();
    if (hint) hint.textContent = "";
    renderHomePickingHistoryBox();
    return;
  }

  if (!logsRealtimeLoaded()) {
    count.textContent = "…";
    if (showFbmPicking) setPickingPreviewLoading("fbm");
    else setPickingPreviewLoading("fba");
    applyPickingPreviewNavCounts("—");
    list.innerHTML = uiEmpty("Caricamento flussi dal cloud…");
    hidePickAll();
    if (hint) hint.textContent = "";
    renderHomePickingHistoryBox();
    return;
  }

  const flows = getPickingCandidateFlows();
  const fbaCandidateFlows = showFbaPicking ? flows.filter((f) => !isShopifyFbmFlow(f)) : [];
  const fbmCandidateFlows = showFbmPicking ? flows.filter((f) => isShopifyFbmFlow(f)) : [];
  const fbaActiveFlows = showFbaPicking
    ? fbaCandidateFlows.filter((f) => !pickingFlowStats(f).done)
    : [];
  const fbmActiveFlows = showFbmPicking
    ? fbmCandidateFlows.filter((f) => !pickingFlowStats(f).done)
    : [];
  const visibleFbaFlows = fbaActiveFlows.slice(0, 8);

  // Raggruppamento SKU FBM dai flussi (percorso di riserva se la vista inventario non è disponibile).
  const fbmGroups = [];
  if (showFbmPicking) {
    const map = new Map();
    for (const flow of fbmActiveFlows) {
      for (const line of Array.isArray(flow?.lines) ? flow.lines : []) {
        const sku = toSkuId(line?.sku || "");
        const qty = Math.abs(parseQty(line?.qty || 0) || 0);
        if (!sku || !qty || isPickingLinePicked(flow, sku)) continue;
        const g = map.get(sku) || { sku, title: "", qty: 0, flows: new Set(), parts: [] };
        const title = pickingLineTitle(line, flow) || sku;
        if (!g.title || title.length > g.title.length) g.title = title;
        g.qty += qty;
        g.flows.add(String(flow?.id || ""));
        for (const part of pickingLinePositionParts(flow, sku)) {
          const code = normalizeRackLocation(part?.code || "");
          if (!code) continue;
          const prev = g.parts.find((x) => x.code === code);
          const q = Math.round(Number(part?.qty) || 0);
          if (prev) prev.qty = Math.max(prev.qty, q);
          else g.parts.push({ code, qty: q });
        }
        map.set(sku, g);
      }
    }
    fbmGroups.push(...map.values());
  }

  count.textContent = showFbaPicking
    ? `${fmtN(fbaActiveFlows.length)} ${fbaActiveFlows.length === 1 ? "flusso" : "flussi"}`
    : `${fmtN(fbmGroups.length)} SKU`;
  if (showFbmPicking) setPickingPreviewCount("fbm", fbmGroups.length, "active_fbm");
  if (showFbaPicking) setPickingPreviewCount("fba", fbaActiveFlows.length, "active_fba");
  if (!showFbmPicking) updateFbmPreviewFromInventory("opposite_inventory");
  if (!showFbaPicking && !pickingPreviewState().fba.loaded) setPickingNavCount("pickingFba", "—");
  applyPickingPreviewNavCounts("—");

  if (btnPickAll) {
    btnPickAll.hidden = !showFbaPicking || fbaActiveFlows.length <= 0;
    btnPickAll.disabled = fbaActiveFlows.length <= 0;
    btnPickAll.innerHTML = `${ICON.check}<span>Preleva tutti i flussi</span><span class="btn-count">${escapeHtml(fmtN(fbaActiveFlows.length))}</span>`;
    btnPickAll.title = "Preleva tutti i flussi FBA in elenco";
  }

  if (showFbmPicking) {
    list.innerHTML = fbmGroups.length
      ? `<div class="pick-lines">${fbmGroups
          .map(
            (g) => `
          <article class="pick-line pick-line--fbm">
            <div class="pick-where">${uiLocList(g.parts, { size: "lg", none: "Senza posizione" })}</div>
            <div class="pick-what"><span class="pick-title">${escapeHtml(g.title)}</span><span class="pick-sub"><span class="sku">${escapeHtml(g.sku)}</span><span>${g.flows.size === 1 ? "1 ordine" : escapeHtml(fmtN(g.flows.size)) + " ordini"}</span></span></div>
            <div class="pick-qty"><strong>${escapeHtml(fmtN(g.qty))}</strong><span>pz</span></div>
            <div class="pick-actions">${findPalletButtonHtml(
              uiGroupedPositions(g.parts)[0]?.code || "",
              uiGroupedPositions(g.parts).map((p) => p.code),
              { sku: g.sku, title: g.title },
            )}</div>
          </article>`,
          )
          .join("")}</div>`
      : uiEmpty("Nessun SKU da preparare", "Non ci sono ordini Shopify FBM aperti.");
    if (hint) hint.textContent = "";
    renderHomePickingHistoryBox();
    return;
  }

  if (!fbaActiveFlows.length) {
    list.innerHTML = uiEmpty(
      "Nessun flusso da prelevare",
      "I flussi prelevati restano nello Storico prelievi, da dove puoi annullarli.",
    );
    if (hint) hint.textContent = "";
    renderHomePickingHistoryBox();
    return;
  }

  list.innerHTML = visibleFbaFlows
    .map((flow) => {
      const st = pickingFlowStats(flow);
      const loc =
        flow.location === "cerea" || flow.location === "concamarise"
          ? flow.location
          : "concamarise";
      const flowName = flowDisplayName(flow);
      const flowId = String(flow.id || "");
      const ids = `data-flowid="${escapeHtml(flowId)}" data-loc="${escapeHtml(loc)}"`;
      const rows = (flow.lines || [])
        .filter((l) => toSkuId(l?.sku || "") && !isPickingLinePicked(flow, l?.sku || ""))
        .map((line) => {
          const sku = toSkuId(line.sku || "");
          const qty = Math.abs(parseQty(line.qty || 0) || 0);
          const title = pickingLineTitle(line, flow);
          const findBtnHtml = findPalletButtonHtml(
            firstRackLocationCodeFromPicking(flow, sku),
            allRackLocationCodesFromPicking(flow, sku),
            { sku, title: title || sku },
          );
          return `
            <div class="pick-line">
              <div class="pick-where">${pickingLinePositionHtml(flow, sku)}</div>
              <div class="pick-what"><span class="pick-title">${escapeHtml(title || sku)}</span><span class="pick-sub"><span class="sku">${escapeHtml(sku)}</span></span></div>
              <div class="pick-qty"><strong>${escapeHtml(fmtN(qty))}</strong><span>pz</span></div>
              <div class="pick-actions">${findBtnHtml}<button class="btn btn--primary btn--sm" type="button" data-action="pickSku" ${ids} data-sku="${escapeHtml(sku)}">${ICON.check}<span>Preleva</span></button></div>
            </div>`;
        })
        .join("");
      const pct = st.total ? Math.round((st.picked / st.total) * 100) : 0;
      return `
        <article class="flow pickingFlowCard" ${ids}>
          <header class="flow-head">
            <div class="flow-title">
              <h3>${escapeHtml(flowName)}</h3>
              <p class="meta"><span>${escapeHtml(fmtDate(flow.appliedAtClient))}</span><span>${escapeHtml(fmtN(flow.totalPieces || 0))} pz</span><span>${escapeHtml(fmtN(st.total))} SKU</span></p>
            </div>
            <div class="flow-progress" aria-label="${escapeHtml(`${st.picked} di ${st.total} SKU prelevati`)}">
              <span class="flow-progress-text">${escapeHtml(fmtN(st.picked))} di ${escapeHtml(fmtN(st.total))} prelevati</span>
              <span class="bar"><span style="width:${pct}%"></span></span>
            </div>
          </header>
          <div class="pick-lines">${rows || uiEmpty("Nessuna riga valida.")}</div>
          <footer class="flow-foot">
            <button class="btn btn--ghost" type="button" data-action="mapFlow" ${ids}>${ICON.map}<span>Posizioni sulla mappa</span></button>
            <button class="btn btn--dark" type="button" data-action="pickFlow" ${ids}>${ICON.check}<span>Preleva tutto il flusso</span></button>
          </footer>
        </article>`;
    })
    .join("");
  if (hint)
    hint.textContent =
      fbaActiveFlows.length > visibleFbaFlows.length
        ? `Mostrati i ${visibleFbaFlows.length} flussi più recenti su ${fmtN(fbaActiveFlows.length)}. Preleva questi per vedere i successivi.`
        : "";
  renderHomePickingHistoryBox();
}

function renderHomePickingHistoryBox() {
  const box = $("homePickingHistoryBox");
  const histList = $("homePickedHistoryList");
  const histCount = $("homePickedHistoryCount");
  const histHint = $("homePickedHistoryHint");
  if (!box || !histList || !histCount) return;

  if (!state.user?.isWhitelisted) {
    histCount.textContent = "—";
    setPickingNavCount("pickingHistory", "—");
    histList.innerHTML = uiEmpty("Accedi per vedere lo storico prelievi.");
    if (histHint) histHint.textContent = "";
    return;
  }
  if (!logsRealtimeStarted()) {
    histCount.textContent = "—";
    setPickingNavCount("pickingHistory", "—");
    histList.innerHTML = uiEmpty("Lo storico si carica quando apri questa sezione.");
    if (histHint) histHint.textContent = "";
    return;
  }
  if (!logsRealtimeLoaded()) {
    histCount.textContent = "…";
    setPickingNavCount("pickingHistory", "…");
    histList.innerHTML = uiEmpty("Caricamento storico dal cloud…");
    if (histHint) histHint.textContent = "";
    return;
  }
  const activeLogMode =
    state.logs?.[INVENTORY_CANONICAL_LOC]?.mode ||
    state.logs?.[INVENTORY_CANONICAL_LOC]?.meta?.mode ||
    "";
  if (
    (activeLogMode === "fba" || activeLogMode === "fbm") &&
    pickingHomeView() !== "pickingHistory"
  ) {
    histCount.textContent = "—";
    setPickingNavCount("pickingHistory", "—");
    histList.innerHTML = uiEmpty("Lo storico completo si carica quando apri questa sezione.");
    if (histHint) histHint.textContent = "";
    return;
  }

  const hist = pickingPickedHistoryEntries();
  histCount.textContent = fmtN(hist.length);
  setPickingNavCount("pickingHistory", fmtN(hist.length));
  if (!hist.length) {
    histList.innerHTML = uiEmpty(
      "Nessun prelievo confermato",
      "Qui trovi i flussi e gli SKU prelevati. Da qui puoi annullarli.",
    );
    if (histHint) histHint.textContent = "";
    return;
  }

  histList.innerHTML = hist
    .slice(0, 80)
    .map((h) => {
      const flowName = flowDisplayName(h.flow);
      const isShopifyHistory = isShopifyFbmFlow(h.flow);
      const completedShopify =
        isShopifyFbmCompletedByShopify(h.flow) || h.completedByShopify === true;
      const isFlowRow = h.type === "flow";
      const flowId = escapeHtml(h.flowId || h.flow?.id || "");
      const loc = escapeHtml(h.loc || h.flow?.location || "");
      const kind = isShopifyHistory ? "fbm" : "fba";
      const statusLabel = completedShopify
        ? "Completato da Shopify"
        : isFlowRow
          ? "Flusso prelevato"
          : "SKU prelevato";
      const title = isFlowRow
        ? flowName || h.title || h.flowId || "Flusso"
        : h.title || h.sku || "—";
      const subParts = isFlowRow
        ? [h.count ? `${h.count} SKU` : "", h.at ? fmtDate(h.at) : "", h.by ? h.by : ""]
        : [h.sku, flowName ? `Flusso ${flowName}` : "", h.at ? fmtDate(h.at) : "", h.by || ""];
      const posLine =
        !isFlowRow && h.position && h.position !== "—"
          ? `<p class="hist-pos">Prelevato da ${escapeHtml(h.position)}</p>`
          : "";
      const action = completedShopify
        ? `<span class="tag tag--ok">Chiuso</span>`
        : isFlowRow
          ? `<button class="btn btn--ghost btn--sm btn--danger-text" type="button" data-action="undoPickFlow" data-kind="${kind}" data-flowid="${flowId}" data-loc="${loc}" data-title="${escapeHtml(title)}">${ICON.undo}<span>Annulla prelievo</span></button>`
          : `<button class="btn btn--ghost btn--sm btn--danger-text" type="button" data-action="undoPickSku" data-kind="${kind}" data-flowid="${flowId}" data-loc="${loc}" data-sku="${escapeHtml(h.sku)}" data-title="${escapeHtml(title)}">${ICON.undo}<span>Annulla prelievo</span></button>`;
      return `
        <article class="hist">
          <div class="hist-main">
            <div class="hist-tags"><span class="tag ${isShopifyHistory ? "tag--shop" : "tag--fba"}">${isShopifyHistory ? "Shopify FBM" : "FBA"}</span><span class="tag ${completedShopify ? "tag--ok" : ""}">${escapeHtml(statusLabel)}</span></div>
            <p class="hist-title">${escapeHtml(title)}</p>
            <p class="meta">${subParts
              .filter(Boolean)
              .map((x) => `<span>${escapeHtml(x)}</span>`)
              .join("")}</p>
            ${posLine}
          </div>
          <div class="hist-qty"><strong>${Number(h.qty) > 0 ? escapeHtml(fmtN(h.qty)) : "—"}</strong><span>pz</span></div>
          <div class="hist-action">${action}</div>
        </article>`;
    })
    .join("");
  if (histHint)
    histHint.textContent =
      hist.length > 80 ? `Mostrati gli ultimi 80 prelievi su ${fmtN(hist.length)}.` : "";
}

function buildShopifyFbmPickedLine(flow, line, sku, qty, nowClient, who, extra = {}) {
  const s = toSkuId(sku || line?.sku || "");
  const title = pickingLineTitle(line || { sku: s }, flow) || s;
  const position = pickingLinePositionText(flow, s);
  return {
    picked: true,
    status: "prelevato",
    sku: s,
    title,
    qty: Math.abs(parseQty(qty || line?.qty || 0) || 0),
    position,
    rackLocation: position,
    pickedAllocations: [],
    stockControlledBy: "shopify",
    stockDelta: 0,
    reservationDelta: 0,
    shopifyOperationalPick: true,
    pickedAtClient: nowClient,
    pickedBy: who,
    ...extra,
  };
}

async function saveShopifyFbmPickingSkuOnly(flow, loc, sku, opts = {}) {
  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db) {
    showToast("Errore", "Firebase non inizializzato.", 2200);
    return;
  }
  const id = String(flow?.id || "").trim();
  const l =
    loc === "cerea" || loc === "concamarise"
      ? loc
      : flow?.location === "cerea" || flow?.location === "concamarise"
        ? flow.location
        : "concamarise";
  const s = toSkuId(sku || "");
  if (!id || !s) {
    showToast("Errore", "Flusso o SKU non valido.", 2200);
    return;
  }
  const line = (flow.lines || []).find((x) => toSkuId(x?.sku || "") === s) || {
    sku: s,
    qty: 0,
    title: s,
  };
  if (isPickingLinePicked(flow, s) && !opts.force) {
    showToast("Già prelevato", `${s} risulta già prelevato.`, 1800);
    return;
  }
  const qty = Math.abs(parseQty(line.qty || 0) || 0);
  if (!qty) {
    showToast("Quantità non valida", `${s} ha quantità zero nel flusso.`, 2200);
    return;
  }
  const title = pickingLineTitle(line, flow);
  const position = pickingLinePositionText(flow, s);
  if (!opts.skipConfirm) {
    const ok = await uiConfirm({
      title: "Segnare lo SKU come preparato?",
      rows: [
        ["Ordine", flowDisplayName(flow)],
        ["SKU", s],
        ["Posizione", position],
        ["Pezzi", `${qty} pz`],
      ],
      note: "L’inventario non cambia ora: lo scarico avviene quando Shopify segna l’ordine come spedito.",
      confirmLabel: "Preparato",
    });
    if (!ok) return;
  }
  const nowClient = Date.now();
  const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
  const key = pickingSkuKey(s);
  const pickedLine = buildShopifyFbmPickedLine(flow, line, s, qty, nowClient, who);
  const pickedMap = { ...pickingLineMap(flow), [key]: pickedLine };
  const validLines = (flow.lines || []).filter((x) => toSkuId(x?.sku || ""));
  const allPicked =
    validLines.length > 0 &&
    validLines.every((x) => {
      const k = pickingSkuKey(x.sku);
      return !!pickedMap[k]?.picked;
    });
  const event = {
    type: "sku",
    shopifyFbm: true,
    sku: s,
    qty,
    position,
    stockDelta: 0,
    reservationDelta: 0,
    atClient: nowClient,
    by: who,
  };
  const ref = api.doc(db, COL_ROOT, l, SUB_LOGS, id);
  const pickingPatch = {
    status: allPicked ? "prelevato_attesa_shopify" : "parziale_attesa_shopify",
    managedByPicking: true,
    shopifyControlled: true,
    pickedLines: { [key]: pickedLine },
    updatedAt: api.serverTimestamp(),
    updatedAtClient: nowClient,
    updatedBy: who,
    events: api.arrayUnion(event),
    flowPicked: allPicked,
    flowPickMode: allPicked ? "sku" : "",
    flowPickGroup: false,
    flowPickedAt: allPicked ? api.serverTimestamp() : null,
    flowPickedAtClient: allPicked ? nowClient : null,
    flowPickedBy: allPicked ? who : "",
  };
  await api.setDoc(
    ref,
    {
      status: allPicked
        ? "SHOPIFY_PICKED_WAITING_SHIPMENT"
        : "SHOPIFY_PARTIAL_PICKED_WAITING_SHIPMENT",
      reservation: {
        active: true,
        status: allPicked
          ? "prelevato_attesa_shopify_spedito"
          : "parziale_prelevato_attesa_shopify_spedito",
        pickedAtClient: allPicked ? nowClient : null,
        updatedAtClient: nowClient,
        updatedBy: who,
      },
      picking: pickingPatch,
    },
    { merge: true },
  );
  try {
    flow.status = allPicked
      ? "SHOPIFY_PICKED_WAITING_SHIPMENT"
      : "SHOPIFY_PARTIAL_PICKED_WAITING_SHIPMENT";
    flow.reservation = {
      ...(flow.reservation || {}),
      active: true,
      status: allPicked
        ? "prelevato_attesa_shopify_spedito"
        : "parziale_prelevato_attesa_shopify_spedito",
      updatedAtClient: nowClient,
      updatedBy: who,
    };
    flow.picking = { ...(flow.picking || {}), ...pickingPatch, pickedLines: pickedMap };
  } catch (_e) {}
  showToast("FBM prelevato", `${s} • ${position} • ${qty} pz.`, 2200);
  renderHomePickingBox();
}

async function saveShopifyFbmPickingFlowOnly(flow, loc, opts = {}) {
  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db) {
    showToast("Errore", "Firebase non inizializzato.", 2200);
    return;
  }
  const id = String(flow?.id || "").trim();
  const l =
    loc === "cerea" || loc === "concamarise"
      ? loc
      : flow?.location === "cerea" || flow?.location === "concamarise"
        ? flow.location
        : "concamarise";
  if (!id) {
    showToast("Errore", "Flusso non valido.", 2200);
    return;
  }
  const st = pickingFlowStats(flow);
  if (st.done) {
    showToast("Già prelevato", "Questo flusso FBM risulta già prelevato.", 1800);
    return;
  }
  const validLines = pickingUniqueLines(flow);
  const linesToPick = validLines.filter((x) => !isPickingLinePicked(flow, toSkuId(x?.sku || "")));
  if (!linesToPick.length) {
    showToast("Nessuna riga", "Il flusso FBM non contiene SKU da prelevare.", 1800);
    return;
  }
  let pieces = 0;
  for (const line of linesToPick) {
    pieces += Math.abs(parseQty(line?.qty || 0) || 0);
  }
  if (!opts.skipConfirm) {
    const ok = await uiConfirm({
      title: "Segnare l’ordine come preparato?",
      rows: [
        ["Ordine", flowDisplayName(flow)],
        ["SKU", `${linesToPick.length} di ${st.total}`],
        ["Pezzi", `${pieces} pz`],
      ],
      note: "L’inventario non cambia ora: lo scarico avviene quando Shopify segna l’ordine come spedito.",
      confirmLabel: "Preparato",
    });
    if (!ok) return;
  }
  const nowClient = Date.now();
  const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
  const pickedLines = {};
  const nextPickedMap = { ...pickingLineMap(flow) };
  const skuList = [];
  let flowPieces = 0;
  for (const line of linesToPick) {
    const sku = toSkuId(line?.sku || "");
    if (!sku) continue;
    const qty = Math.abs(parseQty(line?.qty || 0) || 0);
    if (!qty) continue;
    const key = pickingSkuKey(sku);
    const rec = buildShopifyFbmPickedLine(
      flow,
      line,
      sku,
      qty,
      nowClient,
      who,
      opts.bulkId ? { bulkId: opts.bulkId } : {},
    );
    pickedLines[key] = rec;
    nextPickedMap[key] = rec;
    flowPieces += qty;
    if (!skuList.includes(sku)) skuList.push(sku);
  }
  if (!skuList.length) {
    showToast("Nessuna riga", "Il flusso FBM non contiene SKU validi da prelevare.", 1800);
    return;
  }
  const allPicked =
    validLines.length > 0 &&
    validLines.every((x) => {
      const k = pickingSkuKey(x.sku);
      return !!nextPickedMap[k]?.picked;
    });
  const event = {
    type: "flow",
    shopifyFbm: true,
    skus: skuList,
    count: skuList.length,
    pieces: flowPieces,
    stockDelta: 0,
    reservationDelta: 0,
    atClient: nowClient,
    by: who,
    ...(opts.bulkId ? { bulk: true, bulkId: opts.bulkId } : {}),
  };
  const ref = api.doc(db, COL_ROOT, l, SUB_LOGS, id);
  const pickingPatch = {
    status: allPicked ? "prelevato_attesa_shopify" : "parziale_attesa_shopify",
    managedByPicking: true,
    shopifyControlled: true,
    pickedLines,
    updatedAt: api.serverTimestamp(),
    updatedAtClient: nowClient,
    updatedBy: who,
    events: api.arrayUnion(event),
    flowPicked: allPicked,
    flowPickMode: "flow",
    flowPickGroup: true,
    flowPickedCount: skuList.length,
    flowPickedSkus: skuList,
    flowPickedAt: allPicked ? api.serverTimestamp() : null,
    flowPickedAtClient: allPicked ? nowClient : null,
    flowPickedBy: allPicked ? who : "",
    ...(opts.bulkId ? { bulkPickId: opts.bulkId } : {}),
  };
  await api.setDoc(
    ref,
    {
      status: allPicked
        ? "SHOPIFY_PICKED_WAITING_SHIPMENT"
        : "SHOPIFY_PARTIAL_PICKED_WAITING_SHIPMENT",
      reservation: {
        active: true,
        status: allPicked
          ? "prelevato_attesa_shopify_spedito"
          : "parziale_prelevato_attesa_shopify_spedito",
        pickedAtClient: allPicked ? nowClient : null,
        updatedAtClient: nowClient,
        updatedBy: who,
      },
      picking: pickingPatch,
    },
    { merge: true },
  );
  try {
    flow.status = allPicked
      ? "SHOPIFY_PICKED_WAITING_SHIPMENT"
      : "SHOPIFY_PARTIAL_PICKED_WAITING_SHIPMENT";
    flow.reservation = {
      ...(flow.reservation || {}),
      active: true,
      status: allPicked
        ? "prelevato_attesa_shopify_spedito"
        : "parziale_prelevato_attesa_shopify_spedito",
      updatedAtClient: nowClient,
      updatedBy: who,
    };
    flow.picking = { ...(flow.picking || {}), ...pickingPatch, pickedLines: nextPickedMap };
  } catch (_e) {}
  if (!opts.silent)
    showToast(
      "Flusso FBM prelevato",
      `${flowDisplayName(flow)} • ${skuList.length} SKU • ${flowPieces} pz.`,
      2400,
    );
  renderHomePickingBox();

  return {
    flowId: id,
    skuCount: skuList.length,
    pieces: flowPieces,
    pickedMap: nextPickedMap,
    pickingPatch,
  };
}

async function savePickingAllShopifyFbmFlows() {
  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  const flows = getPickingCandidateFlows();
  const activeFlows = flows.filter((f) => !pickingFlowStats(f).done && isShopifyFbmFlow(f));
  if (!activeFlows.length) {
    showToast("Nessun FBM", "Non ci sono ordini Shopify FBM da prelevare.", 1800);
    return;
  }
  let totalSku = 0;
  let totalPieces = 0;
  for (const flow of activeFlows) {
    const validLines = pickingUniqueLines(flow).filter(
      (line) => !isPickingLinePicked(flow, toSkuId(line?.sku || "")),
    );
    totalSku += validLines.length;
    for (const line of validLines) {
      totalPieces += Math.abs(parseQty(line?.qty || 0) || 0);
    }
  }
  const ok = await uiConfirm({
    title: "Segnare tutti gli ordini FBM come preparati?",
    rows: [
      ["Ordini", String(activeFlows.length)],
      ["SKU", String(totalSku)],
      ["Pezzi", `${totalPieces} pz`],
    ],
    note: "L’inventario non cambia ora: Shopify scarica quando l’ordine risulta spedito.",
    confirmLabel: "Preparati",
  });
  if (!ok) return;
  const bulkId = `bulk_fbm_pick_${Date.now()}`;
  let doneFlows = 0;
  let doneSku = 0;
  let donePieces = 0;
  for (const flow of activeFlows) {
    try {
      const loc =
        flow?.location === "cerea" || flow?.location === "concamarise"
          ? flow.location
          : "concamarise";
      const res = await saveShopifyFbmPickingFlowOnly(flow, loc, {
        skipConfirm: true,
        silent: true,
        bulkId,
      });
      if (res) {
        doneFlows++;
        doneSku += Number(res.skuCount || 0);
        donePieces += Number(res.pieces || 0);
      }
    } catch (err) {
      console.warn("pick all shopify fbm flow", err);
    }
  }
  showToast("FBM prelevati", `${doneFlows} flussi • ${doneSku} SKU • ${donePieces} pz.`, 2600);
  renderHomePickingBox();
}

async function savePickingSku(flowId, loc, sku, opts = {}) {
  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  const id = String(flowId || "").trim();
  const l = loc === "cerea" || loc === "concamarise" ? loc : "concamarise";
  const s = toSkuId(sku || "");
  if (!id || !s) {
    showToast("Errore", "Flusso o SKU non valido.", 2200);
    return;
  }

  const flow = (state.logs?.[l]?.flows || []).find((f) => String(f.id || "") === id) || null;
  if (!flow) {
    showToast("Flusso non trovato", "Riprova tra un attimo.", 2200);
    return;
  }
  if (!isPickingManagedFlow(flow)) {
    showToast(
      "Flusso non prenotato",
      "Questo scarico risulta già applicato con il vecchio metodo: non lo scalo dal Picking.",
      3200,
    );
    return;
  }
  if (isShopifyFbmFlow(flow)) {
    await saveShopifyFbmPickingSkuOnly(flow, l, s, opts);
    return;
  }

  const line = (flow.lines || []).find((x) => toSkuId(x?.sku || "") === s) || {
    sku: s,
    qty: 0,
    title: s,
  };
  if (isPickingLinePicked(flow, s) && !opts.force) {
    showToast("Già prelevato", `${s} risulta già prelevato.`, 1800);
    return;
  }
  const qty = Math.abs(parseQty(line.qty || 0) || 0);
  const title = pickingLineTitle(line, flow);
  const position = pickingLinePositionText(flow, s);
  if (!qty) {
    showToast("Quantità non valida", `${s} ha quantità zero nel flusso.`, 2200);
    return;
  }
  if (!opts.skipConfirm) {
    const ok = await uiConfirm({
      title: "Prelevare lo SKU?",
      rows: [
        ["Flusso", flowDisplayName(flow)],
        ["SKU", s],
        ["Posizione", position],
        ["Pezzi", `${qty} pz`],
      ],
      note: "I pezzi vengono scaricati subito dall’inventario.",
      confirmLabel: "Preleva",
    });
    if (!ok) return;
  }

  try {
    const nowClient = Date.now();
    const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
    let res = null;
    try {
      res = await commitPickingCloudTransaction(l, id, { mode: "sku", sku: s, nowClient, who });
    } catch (err) {
      console.warn("cloud pick sku blocked", err);
      res = await retryPickingForceCloudTransaction(
        l,
        id,
        { mode: "sku", sku: s, nowClient, who },
        err,
        { title: "Prelievo SKU forzato", flowName: flowDisplayName(flow), sku: s },
      );
      if (!res) {
        showToast("Prelievo annullato", `${s} non è stato scaricato.`, 1800);
        return;
      }
    }
    showToast(
      res.forced ? "SKU prelevato forzato" : "SKU prelevato",
      `${res.sku || s} • ${res.pieces || qty} pz • cloud OK${res.forced ? " • negativo consentito" : ""}`,
      res.forced ? 2600 : 1800,
    );
    refreshPickingAfterCloudMutation(res, { flow, loc: l, mode: "sku", sku: s, nowClient, who });
  } catch (err) {
    console.error("cloud pick sku", err);
    showToast("Prelievo bloccato", String(err?.message || err).slice(0, 260), 3600);
  }
}

async function savePickingFlow(flowId, loc) {
  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  const id = String(flowId || "").trim();
  const l = loc === "cerea" || loc === "concamarise" ? loc : "concamarise";
  const flow = (state.logs?.[l]?.flows || []).find((f) => String(f.id || "") === id) || null;
  if (!flow) {
    showToast("Flusso non trovato", "Riprova tra un attimo.", 2200);
    return;
  }
  if (!isPickingManagedFlow(flow)) {
    showToast(
      "Flusso non prenotato",
      "Questo scarico risulta già applicato con il vecchio metodo: non lo scalo dal Picking.",
      3200,
    );
    return;
  }
  if (isShopifyFbmFlow(flow)) {
    await saveShopifyFbmPickingFlowOnly(flow, l);
    return;
  }
  const st = pickingFlowStats(flow);
  if (st.done) {
    showToast("Già prelevato", "Questo flusso risulta già prelevato.", 1800);
    return;
  }
  const validLines = (flow.lines || []).filter((x) => toSkuId(x?.sku || ""));
  const linesToPick = validLines.filter((x) => !isPickingLinePicked(flow, toSkuId(x?.sku || "")));
  if (!linesToPick.length) {
    showToast("Nessuna riga", "Il flusso non contiene SKU da prelevare.", 1800);
    return;
  }
  const ok = await uiConfirm({
    title: "Prelevare tutto il flusso?",
    rows: [
      ["Flusso", flowDisplayName(flow)],
      ["SKU da prelevare", `${linesToPick.length} di ${st.total}`],
    ],
    note: "I pezzi vengono scaricati subito dall’inventario.",
    confirmLabel: "Preleva flusso",
  });
  if (!ok) return;

  try {
    const nowClient = Date.now();
    const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
    let res = null;
    try {
      res = await commitPickingCloudTransaction(l, id, { mode: "flow", nowClient, who });
    } catch (err) {
      console.warn("cloud pick flow blocked", err);
      res = await retryPickingForceCloudTransaction(l, id, { mode: "flow", nowClient, who }, err, {
        title: "Prelievo flusso forzato",
        flowName: flowDisplayName(flow),
      });
      if (!res) {
        showToast("Prelievo annullato", `${flowDisplayName(flow)} non è stato scaricato.`, 1800);
        return;
      }
    }
    showToast(
      res.forced ? "Flusso prelevato forzato" : "Flusso prelevato",
      `${res.flowName || flowDisplayName(flow)} • ${res.skuCount} SKU • ${res.pieces} pz • cloud OK${res.forced ? " • negativo consentito" : ""}`,
      res.forced ? 3000 : 2200,
    );
    refreshPickingAfterCloudMutation(res, { flow, loc: l, mode: "flow", nowClient, who });
  } catch (err) {
    console.error("cloud pick flow", err);
    showToast("Prelievo bloccato", String(err?.message || err).slice(0, 260), 3800);
  }
}

async function savePickingAllFlows() {
  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }

  const flows = getPickingCandidateFlows();
  const waitingShopifyFlows = flows.filter((f) => !pickingFlowStats(f).done && isShopifyFbmFlow(f));
  const activeFlows = flows.filter((f) => !pickingFlowStats(f).done && !isShopifyFbmFlow(f));
  if (!activeFlows.length) {
    const msg = waitingShopifyFlows.length
      ? "Ci sono solo flussi Shopify FBM: usa il tasto Preleva tutti FBM nel riquadro Shopify."
      : "Non ci sono flussi da prelevare.";
    showToast("Nessun flusso prelevabile", msg, 2600);
    return;
  }

  let totalSku = 0;
  let totalPieces = 0;
  for (const flow of activeFlows) {
    const validLines = pickingUniqueLines(flow).filter(
      (line) => !isPickingLinePicked(flow, toSkuId(line?.sku || "")),
    );
    totalSku += validLines.length;
    for (const line of validLines) {
      totalPieces += Math.abs(parseQty(line?.qty || 0) || 0);
    }
  }

  const ok = await uiConfirm({
    title: "Prelevare tutti i flussi FBA?",
    rows: [
      ["Flussi", String(activeFlows.length)],
      ["SKU", String(totalSku)],
      ["Pezzi", `${totalPieces} pz`],
    ],
    note: "I pezzi vengono scaricati subito dall’inventario. Se un flusso non ha pezzi sufficienti ti verrà chiesto se forzarlo.",
    confirmLabel: "Preleva tutti",
  });
  if (!ok) return;

  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db || !api.runTransaction) {
    showToast("Errore", "Firebase transaction non disponibile.", 2200);
    return;
  }

  const bulkId = `bulk_pick_${Date.now()}`;
  const btn = $("btnPickAllFlows");
  if (btn) btn.disabled = true;

  try {
    let committedFlows = 0;
    let committedSku = 0;
    let committedPieces = 0;
    let forcedFlows = 0;
    const errors = [];

    for (const flow of activeFlows) {
      const id = String(flow?.id || "").trim();
      const l =
        flow?.location === "cerea" || flow?.location === "concamarise"
          ? flow.location
          : "concamarise";
      if (!id || !isPickingManagedFlow(flow)) continue;
      const linesToPick = pickingUniqueLines(flow).filter(
        (line) => !isPickingLinePicked(flow, toSkuId(line?.sku || "")),
      );
      if (!linesToPick.length) continue;

      try {
        const nowClient = Date.now();
        const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
        let res = null;
        try {
          res = await commitPickingCloudTransaction(l, id, {
            mode: "flow",
            nowClient,
            who,
            bulkId,
          });
        } catch (err) {
          const label = flowDisplayName(flow) || id;
          if (isForcePickingAvailableError(err)) {
            res = await retryPickingForceCloudTransaction(
              l,
              id,
              { mode: "flow", nowClient, who, bulkId },
              err,
              { title: "Prelievo forzato da Preleva tutti", flowName: label },
            );
            if (!res) {
              errors.push(`${label}: prelievo forzato annullato`);
              continue;
            }
          } else {
            throw err;
          }
        }
        committedFlows++;
        committedSku += Number(res?.skuCount || 0);
        committedPieces += Number(res?.pieces || 0);
        if (res?.forced) forcedFlows++;
        refreshPickingAfterCloudMutation(res, { flow, loc: l, mode: "flow", nowClient, who });
      } catch (err) {
        const label = flowDisplayName(flow) || id;
        const msg = String(err?.message || err).slice(0, 220);
        errors.push(`${label}: ${msg}`);
        console.warn("cloud pick all flow blocked", id, err);
      }
    }

    if (committedFlows <= 0) {
      const first = errors[0] || "Nessuna riga valida da prelevare nel cloud.";
      showToast("Nessun flusso prelevato", first.slice(0, 260), 4200);
      return;
    }

    if (errors.length) {
      showToast(
        "Prelievo parziale",
        `${committedFlows} flussi OK${forcedFlows ? ` • ${forcedFlows} forzati` : ""} • ${errors.length} non prelevati. ${errors[0] || ""}`.slice(
          0,
          260,
        ),
        5600,
      );
    } else {
      showToast(
        forcedFlows ? "Flussi prelevati forzati" : "Tutti i flussi prelevati",
        `${committedFlows} flussi • ${committedSku} SKU • ${committedPieces} pz • cloud OK${forcedFlows ? ` • ${forcedFlows} forzati` : ""}`,
        forcedFlows ? 3400 : 2600,
      );
    }
    renderHomePickingBox();
  } catch (err) {
    console.error("pick all flows", err);
    showToast("Errore prelievo", String(err?.message || err).slice(0, 260), 3600);
  } finally {
    if (btn) btn.disabled = false;
    renderHomePickingBox();
  }
}

function isShopifyFbmAlreadyShippedByShopify(flow) {
  try {
    if (isShopifyFbmCompletedByShopify(flow)) return true;
    const rs = String(flow?.reservation?.status || "").toLowerCase();
    const ps = String(flow?.picking?.status || "").toLowerCase();
    const shop = flow?.shopify && typeof flow.shopify === "object" ? flow.shopify : {};
    const shippedTotal = Number(shop.shippedTotal || flow?.shippedTotal || 0);
    return !!(
      rs === "parziale_shopify_spedito" ||
      ps === "parziale_shopify_spedito" ||
      String(shop.lastShipmentKey || flow?.lastShipmentKey || flow?.trackingNumber || "").trim() ||
      (Number.isFinite(shippedTotal) && shippedTotal > 0)
    );
  } catch (_e) {
    return false;
  }
}

async function undoShopifyFbmPickingSkuOnly(flow, loc, sku) {
  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db) {
    showToast("Errore", "Firebase non inizializzato.", 2200);
    return;
  }

  const id = String(flow?.id || "").trim();
  const l =
    loc === "cerea" || loc === "concamarise"
      ? loc
      : flow?.location === "cerea" || flow?.location === "concamarise"
        ? flow.location
        : "concamarise";
  const s = toSkuId(sku || "");
  if (!id || !s) {
    showToast("Errore", "Flusso o SKU non valido.", 2200);
    return;
  }

  if (isShopifyFbmAlreadyShippedByShopify(flow)) {
    showToast(
      "Ordine già spedito",
      "Shopify ha già segnato questo ordine come spedito/evaso: non annullo il picking operativo.",
      3600,
    );
    return;
  }

  const key = pickingSkuKey(s);
  const currentMap = pickingLineMap(flow);
  const currentRec = currentMap[key] || null;
  if (!(currentRec?.picked === true || currentRec?.status === "prelevato")) {
    showToast("Già annullato", `${s} è già tornato da prelevare.`, 1600);
    return;
  }

  const ok = await uiConfirm({
    title: "Annullare la preparazione?",
    tone: "danger",
    rows: [
      ["Ordine", flowDisplayName(flow)],
      ["SKU", s],
    ],
    note: "L’inventario non cambia: restano i pezzi prenotati da Shopify.",
    confirmLabel: "Annulla preparazione",
    cancelLabel: "Indietro",
  });
  if (!ok) return;

  const nowClient = Date.now();
  const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
  const validLines = pickingUniqueLines(flow);
  const line = validLines.find((x) => toSkuId(x?.sku || "") === s) || {
    sku: s,
    title: currentRec.title || s,
    qty: currentRec.qty || 0,
  };
  const nextMap = { ...currentMap };
  const old = nextMap[key] || { sku: s };
  nextMap[key] = {
    ...old,
    sku: s,
    picked: false,
    status: "annullato_operativo_fbm",
    stockDelta: 0,
    reservationDelta: 0,
    undoneAtClient: nowClient,
    undoneBy: who,
  };

  const stillPicked = validLines.filter((x) => {
    const k = pickingSkuKey(x.sku);
    const rec = nextMap[k] || {};
    return rec.picked === true || rec.status === "prelevato";
  }).length;
  const nextStatus = stillPicked <= 0 ? "in_attesa_shopify_spedito" : "parziale_attesa_shopify";
  const event = {
    type: "undo_sku",
    shopifyFbm: true,
    sku: s,
    qty: Math.abs(parseQty(line?.qty || currentRec?.qty || 0) || 0),
    stockDelta: 0,
    reservationDelta: 0,
    atClient: nowClient,
    by: who,
  };
  const ref = api.doc(db, COL_ROOT, l, SUB_LOGS, id);
  const pickingPatch = {
    status: nextStatus,
    managedByPicking: true,
    shopifyControlled: true,
    pickedLines: { [key]: nextMap[key] },
    updatedAt: api.serverTimestamp(),
    updatedAtClient: nowClient,
    updatedBy: who,
    events: api.arrayUnion(event),
    flowPicked: false,
    flowPickedAt: null,
    flowPickedAtClient: null,
    flowPickedBy: "",
    flowPickMode: stillPicked <= 0 ? "" : flow?.picking?.flowPickMode || "sku",
    flowPickGroup: stillPicked <= 0 ? false : !!flow?.picking?.flowPickGroup,
  };

  await api.setDoc(
    ref,
    {
      status: stillPicked <= 0 ? "RESERVED" : "SHOPIFY_PARTIAL_PICKED_WAITING_SHIPMENT",
      reservation: {
        active: true,
        status:
          stillPicked <= 0
            ? "in_attesa_shopify_spedito"
            : "parziale_prelevato_attesa_shopify_spedito",
        updatedAtClient: nowClient,
        updatedBy: who,
      },
      picking: pickingPatch,
    },
    { merge: true },
  );

  try {
    flow.status = stillPicked <= 0 ? "RESERVED" : "SHOPIFY_PARTIAL_PICKED_WAITING_SHIPMENT";
    flow.reservation = {
      ...(flow.reservation || {}),
      active: true,
      status:
        stillPicked <= 0
          ? "in_attesa_shopify_spedito"
          : "parziale_prelevato_attesa_shopify_spedito",
      updatedAtClient: nowClient,
      updatedBy: who,
    };
    flow.picking = { ...(flow.picking || {}), ...pickingPatch, pickedLines: nextMap };
  } catch (_e) {}

  showToast("FBM annullato", `${s} è tornato da prelevare. Inventario invariato.`, 2200);
  renderHomePickingBox();
}

async function undoShopifyFbmPickingFlowOnly(flow, loc) {
  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db) {
    showToast("Errore", "Firebase non inizializzato.", 2200);
    return;
  }

  const id = String(flow?.id || "").trim();
  const l =
    loc === "cerea" || loc === "concamarise"
      ? loc
      : flow?.location === "cerea" || flow?.location === "concamarise"
        ? flow.location
        : "concamarise";
  if (!id) {
    showToast("Errore", "Flusso non valido.", 2200);
    return;
  }

  if (isShopifyFbmAlreadyShippedByShopify(flow)) {
    showToast(
      "Ordine già spedito",
      "Shopify ha già segnato questo ordine come spedito/evaso: non annullo il picking operativo.",
      3600,
    );
    return;
  }

  const validLines = pickingUniqueLines(flow);
  const currentMap = pickingLineMap(flow);
  const nextMap = { ...currentMap };
  const skuList = [];
  let pieces = 0;

  for (const line of validLines) {
    const s = toSkuId(line?.sku || "");
    if (!s) continue;
    const key = pickingSkuKey(s);
    const old = nextMap[key] || {
      sku: s,
      title: pickingLineTitle(line, flow),
      qty: Math.abs(parseQty(line?.qty || 0) || 0),
      position: pickingLinePositionText(flow, s),
    };
    if (!(old.picked === true || old.status === "prelevato")) continue;
    const q = Math.abs(parseQty(line?.qty || old.qty || 0) || 0);
    nextMap[key] = {
      ...old,
      sku: s,
      picked: false,
      status: "annullato_operativo_fbm",
      stockDelta: 0,
      reservationDelta: 0,
      undoneAtClient: Date.now(),
      undoneBy: state.user?.email || state.user?.emailLower || state.user?.uid || "",
    };
    pieces += q;
    skuList.push(s);
  }

  if (!skuList.length) {
    showToast("Già annullato", "Questo FBM è già tornato da prelevare.", 1800);
    return;
  }

  const ok = await uiConfirm({
    title: "Annullare la preparazione dell’ordine?",
    tone: "danger",
    rows: [
      ["Ordine", flowDisplayName(flow)],
      ["SKU", String(skuList.length)],
      ["Pezzi", `${pieces} pz`],
    ],
    note: "L’inventario non cambia: restano i pezzi prenotati da Shopify.",
    confirmLabel: "Annulla preparazione",
    cancelLabel: "Indietro",
  });
  if (!ok) return;

  const nowClient = Date.now();
  const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
  for (const s of skuList) {
    const key = pickingSkuKey(s);
    if (nextMap[key]) {
      nextMap[key].undoneAtClient = nowClient;
      nextMap[key].undoneBy = who;
    }
  }

  const event = {
    type: "undo_flow",
    shopifyFbm: true,
    skus: skuList,
    count: skuList.length,
    pieces,
    stockDelta: 0,
    reservationDelta: 0,
    atClient: nowClient,
    by: who,
  };
  const ref = api.doc(db, COL_ROOT, l, SUB_LOGS, id);
  const pickingPatch = {
    status: "in_attesa_shopify_spedito",
    managedByPicking: true,
    shopifyControlled: true,
    pickedLines: nextMap,
    updatedAt: api.serverTimestamp(),
    updatedAtClient: nowClient,
    updatedBy: who,
    events: api.arrayUnion(event),
    flowPicked: false,
    flowPickMode: "",
    flowPickGroup: false,
    flowPickedAt: null,
    flowPickedAtClient: null,
    flowPickedBy: "",
  };

  await api.setDoc(
    ref,
    {
      status: "RESERVED",
      reservation: {
        active: true,
        status: "in_attesa_shopify_spedito",
        updatedAtClient: nowClient,
        updatedBy: who,
      },
      picking: pickingPatch,
    },
    { merge: true },
  );

  try {
    flow.status = "RESERVED";
    flow.reservation = {
      ...(flow.reservation || {}),
      active: true,
      status: "in_attesa_shopify_spedito",
      updatedAtClient: nowClient,
      updatedBy: who,
    };
    flow.picking = { ...(flow.picking || {}), ...pickingPatch, pickedLines: nextMap };
  } catch (_e) {}

  showToast(
    "FBM annullato",
    `${flowDisplayName(flow)} è tornato da prelevare. Inventario invariato.`,
    2200,
  );
  renderHomePickingBox();
}

async function undoPickingSku(flowId, loc, sku) {
  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  const id = String(flowId || "").trim();
  const l = loc === "cerea" || loc === "concamarise" ? loc : "concamarise";
  const s = toSkuId(sku || "");
  if (!id || !s) {
    showToast("Errore", "Flusso o SKU non valido.", 2200);
    return;
  }

  const flow = (state.logs?.[l]?.flows || []).find((f) => String(f.id || "") === id) || null;
  if (!flow) {
    showToast("Flusso non trovato", "Riprova tra un attimo.", 2200);
    return;
  }
  if (isShopifyFbmFlow(flow)) {
    await undoShopifyFbmPickingSkuOnly(flow, l, s);
    return;
  }

  const key = pickingSkuKey(s);
  const currentMap = pickingLineMap(flow);
  const currentRec = currentMap[key] || null;
  if (!(currentRec?.picked === true || currentRec?.status === "prelevato")) {
    showToast("Già annullato", `${s} è già tornato da prelevare.`, 1600);
    return;
  }

  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db) {
    showToast("Errore", "Firebase non inizializzato.", 2200);
    return;
  }

  const nowClient = Date.now();
  const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
  const validLines = (flow.lines || []).filter((x) => toSkuId(x?.sku || ""));
  const line = validLines.find((x) => toSkuId(x?.sku || "") === s) || {
    sku: s,
    title: currentRec.title || s,
    qty: currentRec.qty || 0,
  };
  const nextMap = { ...currentMap };
  const old = nextMap[key] || { sku: s };
  nextMap[key] = {
    ...old,
    picked: false,
    status: "annullato",
    undoneAtClient: nowClient,
    undoneBy: who,
  };

  const stillPicked = validLines.filter((x) => {
    const k = pickingSkuKey(x.sku);
    const rec = nextMap[k] || {};
    return rec.picked === true || rec.status === "prelevato";
  }).length;
  const nextStatus = stillPicked <= 0 ? "da_prelevare" : "parziale";
  const event = {
    type: "undo_sku",
    sku: s,
    qty: Math.abs(parseQty(line?.qty || currentRec?.qty || 0) || 0),
    stockDelta: Math.abs(parseQty(line?.qty || currentRec?.qty || 0) || 0),
    reservationDelta: Math.abs(parseQty(line?.qty || currentRec?.qty || 0) || 0),
    atClient: nowClient,
    by: who,
  };
  const ref = api.doc(db, COL_ROOT, l, SUB_LOGS, id);

  const batch = api.writeBatch(db);
  addPickingStockWrite(batch, api, db, l, flow, line, -1, {
    nowClient,
    who,
    title: currentRec?.title || pickingLineTitle(line, flow),
    flowId: id,
    consumedAllocations: currentRec?.pickedAllocations || currentRec?.rackAllocations || [],
  });
  const pickingPatch = {
    status: nextStatus,
    managedByPicking: true,
    pickedLines: { [key]: nextMap[key] },
    updatedAt: api.serverTimestamp(),
    updatedAtClient: nowClient,
    updatedBy: who,
    events: api.arrayUnion(event),
    flowPicked: false,
    flowPickedAt: null,
    flowPickedAtClient: null,
    flowPickedBy: "",
  };
  batch.set(
    ref,
    {
      status: stillPicked <= 0 ? "RESERVED" : "PARTIAL_PICKED",
      reservation: {
        active: true,
        status: stillPicked <= 0 ? "in_attesa_picking" : "parziale",
        updatedAtClient: nowClient,
        updatedBy: who,
      },
      picking: pickingPatch,
    },
    { merge: true },
  );
  await batch.commit();

  try {
    flow.status = stillPicked <= 0 ? "RESERVED" : "PARTIAL_PICKED";
    flow.reservation = {
      ...(flow.reservation || {}),
      active: true,
      status: stillPicked <= 0 ? "in_attesa_picking" : "parziale",
      updatedAtClient: nowClient,
      updatedBy: who,
    };
    flow.picking = {
      ...(flow.picking || {}),
      status: nextStatus,
      pickedLines: nextMap,
      updatedAtClient: nowClient,
      updatedBy: who,
      flowPicked: false,
      flowPickedAtClient: null,
      flowPickedBy: "",
    };
  } catch (_e) {}

  showToast("Prelievo annullato", `${s} è tornato da prelevare.`, 1800);
  renderHomePickingBox();
}

async function undoPickingFlow(flowId, loc) {
  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  const id = String(flowId || "").trim();
  const l = loc === "cerea" || loc === "concamarise" ? loc : "concamarise";
  if (!id) {
    showToast("Errore", "Flusso non valido.", 2200);
    return;
  }

  const flow = (state.logs?.[l]?.flows || []).find((f) => String(f.id || "") === id) || null;
  if (!flow) {
    showToast("Flusso non trovato", "Riprova tra un attimo.", 2200);
    return;
  }
  if (isShopifyFbmFlow(flow)) {
    await undoShopifyFbmPickingFlowOnly(flow, l);
    return;
  }

  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db) {
    showToast("Errore", "Firebase non inizializzato.", 2200);
    return;
  }

  const nowClient = Date.now();
  const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
  const validLines = pickingUniqueLines(flow);
  const currentMap = pickingLineMap(flow);
  const nextMap = { ...currentMap };
  const skuList = [];
  let pieces = 0;
  const batch = api.writeBatch(db);

  for (const line of validLines) {
    const sku = toSkuId(line?.sku || "");
    if (!sku) continue;
    const key = pickingSkuKey(sku);
    const old = nextMap[key] || {
      sku,
      title: pickingLineTitle(line, flow),
      qty: Math.abs(parseQty(line?.qty || 0) || 0),
      position: pickingLinePositionText(flow, sku),
    };
    if (!(old.picked === true || old.status === "prelevato")) continue;
    const q = Math.abs(parseQty(line?.qty || old.qty || 0) || 0);
    addPickingStockWrite(batch, api, db, l, flow, line, -1, {
      nowClient,
      who,
      title: old.title || pickingLineTitle(line, flow),
      flowId: id,
      consumedAllocations: old.pickedAllocations || old.rackAllocations || [],
    });
    nextMap[key] = {
      ...old,
      sku,
      picked: false,
      status: "annullato",
      undoneAtClient: nowClient,
      undoneBy: who,
    };
    pieces += q;
    skuList.push(sku);
  }

  if (!skuList.length) {
    showToast("Già annullato", "Questo flusso è già tornato da prelevare.", 1800);
    return;
  }

  const event = {
    type: "undo_flow",
    skus: skuList,
    count: skuList.length,
    pieces,
    stockDelta: pieces,
    reservationDelta: pieces,
    atClient: nowClient,
    by: who,
  };
  const ref = api.doc(db, COL_ROOT, l, SUB_LOGS, id);
  const pickingPatch = {
    status: "da_prelevare",
    managedByPicking: true,
    pickedLines: nextMap,
    updatedAt: api.serverTimestamp(),
    updatedAtClient: nowClient,
    updatedBy: who,
    events: api.arrayUnion(event),
    flowPicked: false,
    flowPickMode: "",
    flowPickGroup: false,
    flowPickedAt: null,
    flowPickedAtClient: null,
    flowPickedBy: "",
  };
  batch.set(
    ref,
    {
      status: "RESERVED",
      reservation: {
        active: true,
        status: "in_attesa_picking",
        updatedAtClient: nowClient,
        updatedBy: who,
      },
      picking: pickingPatch,
    },
    { merge: true },
  );
  await batch.commit();

  try {
    flow.status = "RESERVED";
    flow.reservation = {
      ...(flow.reservation || {}),
      active: true,
      status: "in_attesa_picking",
      updatedAtClient: nowClient,
      updatedBy: who,
    };
    flow.picking = {
      ...(flow.picking || {}),
      status: "da_prelevare",
      pickedLines: nextMap,
      updatedAtClient: nowClient,
      updatedBy: who,
      flowPicked: false,
      flowPickMode: "",
      flowPickGroup: false,
      flowPickedAtClient: null,
      flowPickedBy: "",
    };
  } catch (_e) {}

  showToast("Flusso annullato", `${flowDisplayName(flow)} è tornato da prelevare.`, 1800);
  renderHomePickingBox();
}

function renderHomeLocatedBox() {
  const list = $("homeLocatedList");
  const count = $("homeLocatedCount");
  const hint = $("homeLocatedHint");
  if (!list || !count) return;

  if (!state.user?.isWhitelisted) {
    count.textContent = "—";
    setPickingNavCount("located", "—");
    list.innerHTML = uiEmpty("Accedi per vedere i prodotti ubicati.");
    if (hint) hint.textContent = "";
    return;
  }
  if (!inventoryReady()) {
    count.textContent = "—";
    list.innerHTML = uiEmpty("Caricamento inventario…");
    return;
  }

  const all = getItemsWithRackLocations();
  const q = getHomeSmartSearchValue("homeLocatedSearch", "homeLocatedSearch");
  const out = homeSmartCandidates(all, q, "ubicati");
  count.textContent = q ? `${fmtN(out.length)} di ${fmtN(all.length)}` : fmtN(all.length);
  setPickingNavCount("located", fmtN(all.length));
  const canEdit = canUsePickingActions();

  if (!all.length) {
    list.innerHTML = uiEmpty(
      "Nessun prodotto ubicato",
      "I prodotti compaiono qui dopo l’ubicazione.",
    );
    if (hint) hint.textContent = "";
    return;
  }
  if (!out.length) {
    list.innerHTML = uiEmpty(
      "Nessun prodotto trovato",
      "Prova con lo SKU, una parte del nome o un codice posizione come C02.",
    );
    if (hint) hint.textContent = "";
    return;
  }

  list.innerHTML = out
    .slice(0, 300)
    .map((it) => {
      const meta = parseTitleMeta(it.title || "");
      const title = meta.main || it.title || "Prodotto senza nome";
      const skuRaw = toSkuId(it.__stockSourceSku || it.sku || it.id || "");
      const displaySku = toSkuId(it.__canonicalSku || skuRaw) || skuRaw;
      const allocatedQty = Number.isFinite(Number(it.allocatedQty))
        ? Math.round(Number(it.allocatedQty))
        : Math.round(Number(it.qty) || 0);
      const totalQty = Number.isFinite(Number(it.totalQty))
        ? Math.round(Number(it.totalQty))
        : allocatedQty;
      const remainingQty = Math.round(Number(it.remainingQty) || 0);
      const rackSkuRaw = toSkuId(it.__rackSourceSku || skuRaw) || skuRaw;
      const findBtnHtml = findPalletButtonHtml(
        firstRackLocationCodeFromItem(it),
        allRackLocationCodesFromItem(it),
        { sku: displaySku, title },
      );
      const attrs = `data-sku="${escapeHtml(skuRaw)}" data-loc="${escapeHtml(it.loc || "")}"`;
      return `
        <article class="item">
          <button class="item-body" type="button" data-action="openHomeLocatedItem" ${attrs} data-rack-sku="${escapeHtml(rackSkuRaw)}">
            <span class="item-title">${escapeHtml(title)}</span>
            <span class="item-sub"><span class="sku">${escapeHtml(displaySku)}</span>${remainingQty ? `<span class="tag tag--warn">${escapeHtml(fmtN(remainingQty))} pz da ubicare</span>` : `<span>Totale ${escapeHtml(fmtN(totalQty))} pz</span>`}</span>
          </button>
          <div class="item-figure item-figure--ok"><strong>${escapeHtml(fmtN(allocatedQty))}</strong><span>pz ubicati</span></div>
          <div class="item-extra">${uiLocList(rackLocationDisplayPartsFromItem({ ...it, qty: totalQty }), { size: "md" })}</div>
          <div class="item-actions">
            ${canEdit ? `<button class="btn btn--ghost btn--sm" type="button" data-action="editHomeLocatedQty" ${attrs} data-current="${escapeHtml(String(allocatedQty))}" data-total="${escapeHtml(String(totalQty))}" title="Correggi i pezzi presenti nelle posizioni">${ICON.edit}<span>Correggi</span></button>` : ""}
            ${findBtnHtml}
          </div>
        </article>`;
    })
    .join("");
  if (hint)
    hint.textContent =
      out.length > 300
        ? `Mostrati i primi 300 di ${fmtN(out.length)}. Cerca per restringere l’elenco.`
        : "";
}

function refreshPickingHomeOverview() {
  pickingHomeDashboard?.scheduleRender();
  if (pickingHomeView() === "map") pickingMapView?.render();
  if (state.ui?.sheet === "find" || $("sheetFind")?.classList.contains("show"))
    pickingFindMap?.render();
  if (__qrRackScanner?.map) __qrRackScanner.map.render();
}

function renderHomeDashboard() {
  refreshPickingHomeOverview();
  renderHomeNoLocationBox();
  renderHomeCereaBox();
  renderHomeLocatedBox();
  syncPickingHomeView();
  syncLiveStatus();
  const view = pickingHomeView();
  if (view === "pickingFbm" || view === "pickingFba") renderHomePickingBox();
  if (view === "pickingHistory") renderHomePickingHistoryBox();
}

// --- inventory render ---

// --- Sheets ---
function sheetEl(name) {
  if (name === "productDetails") return $("sheetProductDetails");
  if (name === "shopifyOrderDetails") return $("sheetShopifyOrderDetails");
  if (name === "find") return $("sheetFind");
  if (name === "menu") return $("menuSheet");
  return null;
}

const SHEET_ANIM_MS = 180;
const __sheetTimers = new WeakMap();

function __anySheetOpen() {
  return !!document.querySelector(".sheet.show, .sheet.prep, .sheet.closing, .qrRackOverlay");
}

function __lockBody() {
  // Scroll naturale: non blocco più html/body con overflow:hidden.
  // Lo sheet resta sopra come overlay, ma lo scroll mantiene il comportamento classico del browser.
  try {
    document.documentElement.classList.add("sheet-open");
    document.body.classList.add("sheet-open");
  } catch (_e) {}
}

function __unlockBody() {
  try {
    document.documentElement.classList.remove("sheet-open");
    document.body.classList.remove("sheet-open");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  } catch (_e) {}
}

function __unlockBodyIfNone() {
  if (!__anySheetOpen()) {
    __unlockBody();
    if (!state.ui.sheet) state.ui.sheetStack = [];
  } else {
    __lockBody();
  }
}

function openSheet(name) {
  const el = sheetEl(name);
  if (!el) return;
  state.ui.sheet = name;
  state.ui.sheetStack = (state.ui.sheetStack || []).filter((x) => x !== name).concat(name);
  // L'ultimo foglio aperto resta sempre sopra (es. Trova aperto dalla scheda prodotto).
  el.style.zIndex = String(60 + state.ui.sheetStack.length);
  el.classList.remove("closing");
  el.classList.add("prep");
  el.setAttribute("aria-hidden", "false");
  __lockBody();
  requestAnimationFrame(() => {
    el.classList.remove("prep");
    el.classList.add("show");
  });
}

function closeSheet(name, opts = {}) {
  const el = sheetEl(name);
  if (!el) return;
  el.classList.remove("prep", "show", "closing");
  el.setAttribute("aria-hidden", "true");
  state.ui.sheetStack = (state.ui.sheetStack || []).filter((x) => x !== name);
  if (state.ui.sheet === name)
    state.ui.sheet = state.ui.sheetStack[state.ui.sheetStack.length - 1] || null;
  __unlockBodyIfNone();
}

// --- Extract from PDF (backend) ---

// --- Carica: modalità + campo libero ---

function getInvIndexForMatch() {
  state.cache = state.cache || {};
  const cInv = state.inventory?.concamarise || { items: [], meta: {} };
  const rInv = state.inventory?.cerea || { items: [], meta: {} };

  const cCount =
    cInv?.meta && Number.isFinite(cInv.meta.count)
      ? cInv.meta.count
      : Array.isArray(cInv.items)
        ? cInv.items.length
        : 0;
  const rCount =
    rInv?.meta && Number.isFinite(rInv.meta.count)
      ? rInv.meta.count
      : Array.isArray(rInv.items)
        ? rInv.items.length
        : 0;

  const cTs =
    cInv?.meta && Number.isFinite(cInv.meta.lastUpdatedAtClient)
      ? cInv.meta.lastUpdatedAtClient
      : 0;
  const rTs =
    rInv?.meta && Number.isFinite(rInv.meta.lastUpdatedAtClient)
      ? rInv.meta.lastUpdatedAtClient
      : 0;

  const key = `${cCount}|${cTs}|${rCount}|${rTs}`;
  if (state.cache.invIndexForMatch?.key === key) return state.cache.invIndexForMatch;

  const invConca = Array.isArray(cInv.items) ? cInv.items : [];
  const invCerea = Array.isArray(rInv.items) ? rInv.items : [];

  const mapConca = new Map();
  const stockSkuConca = new Map();
  const mapCerea = new Map();
  const stockSkuCerea = new Map();

  // L'indice operativo usa la stessa vista logica di Ubicati/Da ubicare.
  // Ogni alias punta alla medesima fotografia stock+rack e tutte le scritture
  // continuano a usare lo SKU proprietario dello stock (__stockSourceSku).
  const registerLogicalRepresentativesForIndex = (map, stockMap, representatives) => {
    for (const item of Array.isArray(representatives) ? representatives : []) {
      const stockSku = toSkuId(item?.__stockSourceSku || item?.sku || item?.id || "");
      if (!stockSku) continue;
      const members = normalizeSkuAliases(
        [
          ...(Array.isArray(item?.__aliasSkus) ? item.__aliasSkus : []),
          item?.__canonicalSku || "",
          stockSku,
        ],
        stockSku,
      );
      for (const alias of members) {
        const a = toSkuId(alias || "");
        if (!a) continue;
        map.set(a, item);
        stockMap.set(a, stockSku);
      }
    }
  };

  registerLogicalRepresentativesForIndex(
    mapConca,
    stockSkuConca,
    stockRepresentativeItemsForLoc("concamarise"),
  );
  registerLogicalRepresentativesForIndex(
    mapCerea,
    stockSkuCerea,
    stockRepresentativeItemsForLoc("cerea"),
  );

  // lista unica per matching testuale
  const all = [];
  for (const it of invConca) {
    const s = toSkuId(it.sku || it.id || "");
    if (!s) continue;
    all.push({ loc: "concamarise", it, sku: s });
  }
  for (const it of invCerea) {
    const s = toSkuId(it.sku || it.id || "");
    if (!s) continue;
    all.push({ loc: "cerea", it, sku: s });
  }

  const idx = { key, invConca, invCerea, mapConca, mapCerea, stockSkuConca, stockSkuCerea, all };
  state.cache.invIndexForMatch = idx;
  return idx;
}

function resolveLocForSkuAny(sku, locHint, idx) {
  const i = idx || getInvIndexForMatch();
  const s = toSkuId(sku || "");
  if (!s) return locHint === "cerea" || locHint === "concamarise" ? locHint : "concamarise";

  const inConca = i.mapConca.has(s);
  const inCerea = i.mapCerea.has(s);

  if (inConca && !inCerea) return "concamarise";
  if (inCerea && !inConca) return "cerea";

  // presente su entrambe: prova hint -> qty -> default concamarise
  if (inConca && inCerea) {
    if (locHint === "cerea" || locHint === "concamarise") return locHint;

    const qa = Number.isFinite(i.mapConca.get(s)?.qty) ? i.mapConca.get(s).qty : 0;
    const qb = Number.isFinite(i.mapCerea.get(s)?.qty) ? i.mapCerea.get(s).qty : 0;

    if (qa === 0 && qb !== 0) return "cerea";
    return "concamarise";
  }

  // non presente in nessuno: fallback su hint o concamarise
  return locHint === "cerea" || locHint === "concamarise" ? locHint : "concamarise";
}

function getItemBySkuAny(sku, locHint) {
  const idx = getInvIndexForMatch();
  const s = toSkuId(sku || "");
  if (!s) return null;

  const target = resolveLocForSkuAny(s, locHint, idx);
  if (target === "cerea") {
    const it = idx.mapCerea.get(s) || idx.mapConca.get(s) || null;
    if (!it) return null;
    const loc = idx.mapCerea.has(s) ? "cerea" : "concamarise";
    const stockSku =
      loc === "cerea"
        ? idx.stockSkuCerea?.get(s) || toSkuId(it?.sku || it?.id || s)
        : idx.stockSkuConca?.get(s) || toSkuId(it?.sku || it?.id || s);
    return { it, loc, stockSku };
  } else {
    const it = idx.mapConca.get(s) || idx.mapCerea.get(s) || null;
    if (!it) return null;
    const loc = idx.mapConca.has(s) ? "concamarise" : "cerea";
    const stockSku =
      loc === "cerea"
        ? idx.stockSkuCerea?.get(s) || toSkuId(it?.sku || it?.id || s)
        : idx.stockSkuConca?.get(s) || toSkuId(it?.sku || it?.id || s);
    return { it, loc, stockSku };
  }
}

function stockSkuForSkuAny(sku, locHint = "", idx = null) {
  const i = idx || getInvIndexForMatch();
  const s = toSkuId(sku || "");
  if (!s) return "";
  const loc = resolveLocForSkuAny(s, locHint, i);
  if (loc === "cerea") return i.stockSkuCerea?.get(s) || s;
  return i.stockSkuConca?.get(s) || s;
}

function savedTitleForExistingInventorySku(sku, locHint = "") {
  try {
    const s = toSkuId(sku || "");
    if (!s) return "";
    const hit = getItemBySkuAny(s, locHint);
    return squashWhitespace(hit?.it?.title || hit?.it?.name || "");
  } catch (_e) {
    return "";
  }
}

// --- Articoli: sheet (modifica / elimina) ---

// --- Dettagli articolo (sheet) ---
function openProductDetailsSheet(sku) {
  const s = toSkuId(sku || "");
  if (!s) return;
  state.route.loc = INVENTORY_CANONICAL_LOC;
  state.ui.productDetailsSku = s;
  state.ui.productDetailsEditMode = true;
  renderProductDetailsSheet();
  openSheet("productDetails");
}

function getProductBySku(loc, sku) {
  const inv = state.inventory[loc];
  if (!inv) return null;
  const s = toSkuId(sku || "");
  return (inv.items || []).find((x) => toSkuId(x.sku) === s) || null;
}

// --- Combo prodotto: configurazione cloud + scarichi componenti ---

function renderLocationOnlyProductDetailsSheet() {
  let loc = state.route.loc;
  const sku = toSkuId(state.ui.productDetailsSku || "");
  const titleEl = $("productDetailsTitle");
  const sub = $("productDetailsSub");
  const hint = $("productDetailsHint");
  const content = $("productDetailsContent");
  const actions = $("productDetailsActions");
  if (!hint || !content || !actions) return;
  if (!sku) {
    if (titleEl) titleEl.textContent = "Prodotto";
    if (sub) sub.textContent = "";
    hint.textContent = "";
    content.innerHTML = uiEmpty("Nessun prodotto selezionato.");
    actions.innerHTML = "";
    return;
  }

  let it = loc ? getProductBySku(loc, sku) : null;
  if (!it) {
    for (const candidate of INVENTORY_ALL_CLOUD_LOCS) {
      const found = getProductBySku(candidate, sku);
      if (found) {
        it = found;
        loc = candidate;
        break;
      }
    }
  }
  if (loc === "cerea" || loc === "concamarise") state.route.loc = loc;
  if (!it) {
    if (titleEl) titleEl.textContent = sku;
    if (sub) sub.textContent = "";
    hint.textContent = "";
    content.innerHTML = uiEmpty(
      "Prodotto non disponibile",
      "Non risulta nell’inventario: potrebbe essere stato scaricato del tutto.",
    );
    actions.innerHTML = "";
    return;
  }

  // Conserva editor aperti e valori digitati quando arriva un aggiornamento realtime.
  const keep = new Map();
  content.querySelectorAll(".rackAllocRow").forEach((row) => {
    const det = row.querySelector("details");
    if (!det?.open) return;
    const sel = row.querySelector('[data-field="allocRackLocation"]');
    const qty = row.querySelector('[data-field="allocQty"]');
    const selDefault = Array.from(sel?.options || []).find((o) => o.defaultSelected)?.value || "";
    keep.set(`${row.dataset.oldCode}|${row.dataset.lot}`, {
      // Solo i valori cambiati dall'utente: quelli non toccati devono seguire il cloud.
      code: sel && sel.value !== selDefault ? sel.value : "",
      qty: qty && qty.value !== qty.defaultValue ? qty.value : "",
    });
  });

  const meta = parseTitleMeta(it.title || "");
  const titleMain = squashWhitespace(meta.main || it.title || sku) || sku;
  const totalSkuQty = stockQtyFromDoc(it || {});
  const allAllocatedQty = rackAllocatedQtyFromDoc(it || {});
  const allRemainingQty = rackUnallocatedQtyFromDoc(it || {});
  const allCereaQty = cereaQtyFromDoc(it || {});
  const canEdit = canUsePickingActions();
  const lots = readStockLotsFromDoc(it || {});
  const defaultLot = getDefaultLotForItem(it || {});
  const defaultLotRemaining = rackUnallocatedQtyByLotFromDoc(it || {}, defaultLot);
  const lotsWithRemaining = lots.filter((l) => rackUnallocatedQtyByLotFromDoc(it, l.lot) > 0);
  const codes = allRackLocationCodesFromItem(it || {});
  const pct = (v) => (totalSkuQty ? (v / totalSkuQty) * 100 : 0).toFixed(2) + "%";

  if (titleEl) titleEl.textContent = titleMain;
  if (sub) sub.textContent = sku;
  hint.textContent = canEdit ? "" : "Sola lettura: il tuo account non è abilitato alle modifiche.";

  const cta = [];
  if (canEdit && defaultLotRemaining > 0)
    cta.push(
      `<button class="btn btn--primary btn--lg" type="button" data-action="pdUbica" data-lot="${escapeHtml(defaultLot)}">${ICON.put}<span>${lotsWithRemaining.length > 1 ? `Ubica ${escapeHtml(lotLabelFromId(defaultLot))}, ${escapeHtml(fmtN(defaultLotRemaining))} pz` : `Ubica ${escapeHtml(fmtN(defaultLotRemaining))} pz`}</span></button>`,
    );
  if (codes.length)
    cta.push(
      findPalletButtonHtml(codes[0], codes, { sku, title: titleMain }, { size: "lg" }).replace(
        "<span>Trova</span>",
        "<span>Trova sulla mappa</span>",
      ),
    );

  const lotsHtml = lots.length
    ? `<div class="lots">${lots
        .map((l) => {
          const alloc = rackAllocatedQtyByLotFromDoc(it, l.lot);
          const rem = rackUnallocatedQtyByLotFromDoc(it, l.lot);
          const legacy = l.lot === LOT_LEGACY_ID;
          return `<div class="lot-row">
            <div class="lot-id"><b>${escapeHtml(legacy ? "Lotto storico" : lotLabelFromId(l.lot))}</b><small>${escapeHtml(legacy ? "Pezzi registrati prima dei lotti" : "Prodotto il " + lotDateLabelFromId(l.lot))}</small></div>
            <div class="lot-nums"><span><b>${escapeHtml(fmtN(l.qty))}</b> pz</span><span class="muted">${escapeHtml(fmtN(alloc))} ubicati</span>${rem > 0 ? `<span class="warn">${escapeHtml(fmtN(rem))} da ubicare</span>` : ""}</div>
            ${canEdit && rem > 0 && lotsWithRemaining.length > 1 ? `<button class="btn btn--ghost btn--sm" type="button" data-action="pdUbica" data-lot="${escapeHtml(l.lot)}">Ubica</button>` : ""}
          </div>`;
        })
        .join("")}</div>`
    : uiEmpty("Nessun lotto con pezzi disponibili.");

  const attrs = `data-sku="${escapeHtml(sku)}" data-loc="${escapeHtml(loc || INVENTORY_CANONICAL_LOC)}"`;
  content.innerHTML = `
    <div class="pd">
      <section class="pd-stock" aria-label="Giacenza">
        <div class="pd-figs">
          <div><span>Disponibili</span><strong>${escapeHtml(fmtN(totalSkuQty))}</strong></div>
          <div class="is-loc"><span>Ubicati</span><strong>${escapeHtml(fmtN(allAllocatedQty))}</strong></div>
          <div class="is-unloc"><span>Da ubicare</span><strong>${escapeHtml(fmtN(allRemainingQty))}</strong>${allCereaQty > 0 ? `<small>${escapeHtml(fmtN(allCereaQty))} a Cerea</small>` : ""}</div>
        </div>
        <div class="stock-bar" aria-hidden="true"><span class="sb-loc" style="width:${pct(allAllocatedQty)}"></span><span class="sb-cerea" style="width:${pct(allCereaQty)}"></span><span class="sb-unloc" style="width:${pct(Math.max(0, allRemainingQty - allCereaQty))}"></span></div>
      </section>
      ${cta.length ? `<div class="pd-cta">${cta.join("")}</div>` : ""}
      <section class="pd-sec">
        <header class="sec-head"><h3>Posizioni</h3><span class="sec-meta">Pezzi presenti in ogni posto</span></header>
        ${rackAllocationsEditorHtml(it || {}, sku, loc, canEdit)}
      </section>
      <section class="pd-sec">
        <header class="sec-head"><h3>Lotti</h3></header>
        ${lotsHtml}
      </section>
      ${
        canEdit
          ? `<section class="pd-sec pd-sec--quiet">
        <header class="sec-head"><h3>Correggi giacenza</h3></header>
        <p class="sec-text">Solo se i pezzi contati non corrispondono: la correzione cambia la giacenza totale del prodotto.</p>
        <div class="pd-fix">
          <button class="btn btn--ghost" type="button" data-action="editHomeNoLocationQty" ${attrs} data-current="${escapeHtml(String(allRemainingQty))}">${ICON.edit}<span>Pezzi da ubicare</span></button>
          ${allAllocatedQty > 0 ? `<button class="btn btn--ghost" type="button" data-action="editHomeLocatedQty" ${attrs}>${ICON.edit}<span>Pezzi ubicati</span></button>` : ""}
        </div>
      </section>`
          : ""
      }
    </div>`;
  actions.innerHTML = "";

  content.querySelectorAll(".rackAllocRow").forEach((row) => {
    const k = keep.get(`${row.dataset.oldCode}|${row.dataset.lot}`);
    if (!k) return;
    const det = row.querySelector("details");
    if (det) det.open = true;
    const sel = row.querySelector('[data-field="allocRackLocation"]');
    const qty = row.querySelector('[data-field="allocQty"]');
    if (sel && k.code && Array.from(sel.options).some((o) => o.value === k.code))
      sel.value = k.code;
    if (qty && k.qty) qty.value = k.qty;
  });
}

function readLocationOnlySelection() {
  const wrap = $("productDetailsContent");
  const pickerChoices = wrap?.querySelectorAll?.('[data-field="rackLocationChoice"]');
  if (pickerChoices && pickerChoices.length) return readRackPickerSelection(wrap);
  const single = wrap?.querySelector?.('[data-field="rackLocation"]');
  const multiple = wrap?.querySelector?.('[data-field="rackLocations"]');
  const raw = multiple
    ? Array.from(multiple.selectedOptions || []).map((opt) => opt.value)
    : single?.value || "";
  return normalizeRackLocationsList(raw);
}

function removeMobileQuickRackSelector() {
  try {
    document.querySelectorAll(".mobileQuickRackOverlay").forEach((el) => el.remove());
  } catch (_e) {}
}

// QR ubicazione: il QR sulla trave identifica campata+posto (es. C02-P1),
// poi l'operatore sceglie uno dei livelli realmente previsti per quella campata.
let __qrRackScanner = null;
let __qrRackJsQrPromise = null;

function removeQrRackScanner() {
  try {
    stopQrRackCamera();
  } catch (_e) {}
  try {
    __qrRackScanner?.map?.destroy?.();
  } catch (_e) {}
  try {
    document.querySelectorAll(".qrRackOverlay").forEach((el) => el.remove());
  } catch (_e) {}
  __qrRackScanner = null;
  __unlockBodyIfNone();
}

function stopQrRackCamera() {
  try {
    const s = __qrRackScanner;
    if (!s) return;
    s.active = false;
    if (s.raf) cancelAnimationFrame(s.raf);
    s.raf = 0;
    if (s.stream) {
      try {
        s.stream.getTracks().forEach((t) => t.stop());
      } catch (_e) {}
    }
    s.stream = null;
    if (s.video) {
      try {
        s.video.pause();
      } catch (_e) {}
      try {
        s.video.srcObject = null;
      } catch (_e) {}
    }
  } catch (_e) {}
}

function qrRackBaseFromFinalCode(code) {
  const c = normalizeRackLocation(code || "");
  const m = c.match(/^([A-G]\d{2})-L([123])-P([123])$/);
  return m ? `${m[1]}-P${m[3]}` : "";
}

function qrRackFinalCodesFromBase(baseRaw) {
  const base = normalizeRackLocation(baseRaw || "")
    .replace(/_/g, "-")
    .replace(/:/g, "-")
    .replace(/\|/g, "-");
  const m = base.match(/^([A-G]\d{2})-P([123])$/);
  if (!m) return [];
  const bay = m[1];
  const p = m[2];
  return [1, 2, 3].map((l) => `${bay}-L${l}-P${p}`).filter((code) => RACK_LOCATION_SET.has(code));
}

function qrRackBaseIsValid(base) {
  return qrRackFinalCodesFromBase(base).length > 0;
}

function qrRackParsePayload(raw) {
  let t = String(raw || "")
    .trim()
    .toUpperCase();
  if (!t) return { ok: false, reason: "QR vuoto" };
  try {
    t = decodeURIComponent(t);
  } catch (_e) {}
  t = t.replace(/^HTTPS?:\/\//, "").trim();
  t = t.replace(/\s+/g, "");
  t = t.replace(/[–—]/g, "-");

  // Formati accettati:
  // AMZLOC|C02|P1, AMZLOC:C02:P1, C02-P1, C02-L1/L2/L3-P1, C02-L2-P1.
  let m = t.match(/^AMZLOC[\|:;-]([A-G]\d{2})[\|:;-](P[123])$/i);
  if (m) {
    const base = `${m[1]}-${m[2]}`;
    return qrRackBaseIsValid(base)
      ? { ok: true, base }
      : { ok: false, reason: `Base QR non valida: ${base}` };
  }

  m = t.match(/^([A-G]\d{2})-L([123])-P([123])$/i);
  if (m) {
    const code = `${m[1]}-L${m[2]}-P${m[3]}`;
    return RACK_LOCATION_SET.has(code)
      ? { ok: true, finalCode: code, base: qrRackBaseFromFinalCode(code) }
      : { ok: false, reason: `Ubicazione QR non valida: ${code}` };
  }

  m = t.match(/^([A-G]\d{2})[-_:;|]?(?:L1\/L2\/L3[-_:;|]?)?P([123])$/i);
  if (m) {
    const base = `${m[1]}-P${m[2]}`;
    return qrRackBaseIsValid(base)
      ? { ok: true, base }
      : { ok: false, reason: `Base QR non valida: ${base}` };
  }

  // fallback URL/query: cerca una posizione dentro al testo
  m = t.match(/([A-G]\d{2})[-_:;|]?(?:L1\/L2\/L3[-_:;|]?)?P([123])/i);
  if (m) {
    const base = `${m[1]}-P${m[2]}`;
    return qrRackBaseIsValid(base)
      ? { ok: true, base }
      : { ok: false, reason: `Base QR non valida: ${base}` };
  }
  m = t.match(/([A-G]\d{2})-L([123])-P([123])/i);
  if (m) {
    const code = `${m[1]}-L${m[2]}-P${m[3]}`;
    return RACK_LOCATION_SET.has(code)
      ? { ok: true, finalCode: code, base: qrRackBaseFromFinalCode(code) }
      : { ok: false, reason: `Ubicazione QR non valida: ${code}` };
  }

  return { ok: false, reason: `QR non riconosciuto: ${String(raw || "").slice(0, 80)}` };
}

function qrRackAvailabilityForBase(base, sku, loc) {
  const it = getProductBySku(loc, sku) || {};
  const alreadyForSku = new Set(readRackLocationsFromDoc(it || {}));
  return qrRackFinalCodesFromBase(base).map((code) => {
    const level = (code.match(/-L([123])-/) || [])[1] || "";
    const occ = rackLocationOccupantInfo(code, sku, loc);
    const already = alreadyForSku.has(code) || rackLocationIsUsedBySameLogicalSku(code, sku, loc);
    const valid = RACK_LOCATION_SET.has(code);
    // Già usata dallo stesso SKU = consentita: la quantità residua viene sommata cloud.
    const available = valid && (already || isRackLocationAvailableForItem(code, sku, loc));
    let reason = already ? "Già usata dallo stesso SKU: verrà sommata" : "Disponibile";
    if (!valid) reason = "Non valida";
    else if (!already && occ) reason = `Occupata da ${occ.sku}`;
    return { code, level, available, reason, occupant: !already && occ ? occ : null, already };
  });
}

function qrRackStatus(text, tone = "") {
  try {
    const el = __qrRackScanner?.overlay?.querySelector?.("[data-qr-status]");
    if (el) {
      el.textContent = text || "";
      el.dataset.tone = tone || "";
    }
  } catch (_e) {}
}

function qrRackSetVideoVisible(visible) {
  try {
    const box = __qrRackScanner?.overlay?.querySelector?.("[data-qr-video-box]");
    if (box) box.style.display = visible ? "" : "none";
  } catch (_e) {}
}

function qrRackRenderLevels(base) {
  try {
    const s = __qrRackScanner;
    if (!s?.overlay) return;
    const result = s.overlay.querySelector("[data-qr-result]");
    const levels = s.overlay.querySelector("[data-qr-levels]");
    if (!levels) return;
    const infos = qrRackAvailabilityForBase(base, s.sku, s.loc);
    const free = infos.filter((x) => x.available);
    if (result) {
      result.style.display = "";
      result.innerHTML = `<div class="qrRackResultCode">${escapeHtml(base)}</div><div class="qrRackResultSub">QR letto. Scegli il livello in cui si trova il bancale.</div>`;
    }
    levels.innerHTML = infos
      .slice()
      .reverse()
      .map((info) => {
        const label = info.level ? `L${info.level}` : "—";
        const disabled = info.available ? "" : " disabled";
        const note = !info.available
          ? info.reason
          : info.already
            ? "Stesso prodotto, si somma"
            : "Libero";
        return `<button class="qrRackLevelBtn${info.available ? "" : " disabled"}" type="button" data-action="qrRackChooseLevel" data-code="${escapeHtml(info.code)}"${disabled}><strong>${escapeHtml(label)}</strong><span>${escapeHtml(note)}</span></button>`;
      })
      .join("");
    qrRackSetVideoVisible(false);
    qrRackStatus(
      free.length
        ? "Tocca il livello giusto."
        : "Tutti i livelli di questo posto sono occupati da altri prodotti.",
      free.length ? "ok" : "warn",
    );
  } catch (err) {
    console.warn("qrRackRenderLevels", err);
    qrRackStatus("Lettura dei livelli non riuscita.", "bad");
  }
}

async function qrRackLoadJsQr() {
  if (window.jsQR) return window.jsQR;
  if (__qrRackJsQrPromise) return __qrRackJsQrPromise;
  __qrRackJsQrPromise = new Promise((resolve, reject) => {
    try {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
      script.async = true;
      script.onload = () =>
        window.jsQR ? resolve(window.jsQR) : reject(new Error("jsQR non caricato"));
      script.onerror = () => reject(new Error("jsQR non raggiungibile"));
      document.head.appendChild(script);
    } catch (err) {
      reject(err);
    }
  });
  return __qrRackJsQrPromise;
}

async function qrRackGetDecoder() {
  try {
    if ("BarcodeDetector" in window) {
      let ok = true;
      try {
        const formats = await BarcodeDetector.getSupportedFormats?.();
        if (Array.isArray(formats)) ok = formats.includes("qr_code");
      } catch (_e) {}
      if (ok) return { type: "barcode", detector: new BarcodeDetector({ formats: ["qr_code"] }) };
    }
  } catch (_e) {}
  const jsqr = await qrRackLoadJsQr();
  return { type: "jsqr", jsqr };
}

async function qrRackDetectOnce() {
  const s = __qrRackScanner;
  if (!s || !s.active || !s.video) return "";
  const video = s.video;
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return "";

  if (s.decoder?.type === "barcode") {
    const codes = await s.decoder.detector.detect(video);
    const first = Array.isArray(codes) ? codes.find((x) => x && x.rawValue) : null;
    return first ? String(first.rawValue || "") : "";
  }

  if (s.decoder?.type === "jsqr") {
    const canvas = s.canvas;
    const ctx = s.ctx;
    if (!canvas || !ctx) return "";
    const maxSide = 720;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(1, maxSide / Math.max(vw, vh));
    const w = Math.max(1, Math.round(vw * scale));
    const h = Math.max(1, Math.round(vh * scale));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const code = s.decoder.jsqr(imageData.data, w, h, { inversionAttempts: "dontInvert" });
    return code && code.data ? String(code.data || "") : "";
  }
  return "";
}

function qrRackStartLoop() {
  const s = __qrRackScanner;
  if (!s) return;
  s.active = true;
  s.scanning = false;
  const loop = async () => {
    const cur = __qrRackScanner;
    if (!cur || !cur.active) return;
    if (!cur.scanning) {
      cur.scanning = true;
      try {
        const raw = await qrRackDetectOnce();
        if (raw) {
          cur.active = false;
          if (cur.raf) cancelAnimationFrame(cur.raf);
          cur.raf = 0;
          handleQrRackScan(raw);
          return;
        }
      } catch (err) {
        console.warn("qr detect", err);
      } finally {
        if (__qrRackScanner) __qrRackScanner.scanning = false;
      }
    }
    if (__qrRackScanner?.active) __qrRackScanner.raf = requestAnimationFrame(loop);
  };
  s.raf = requestAnimationFrame(loop);
}

async function qrRackStartCamera() {
  const s = __qrRackScanner;
  if (!s?.video) return;
  stopQrRackCamera();
  __qrRackScanner = { ...s, active: false, stream: null, raf: 0 };
  const cur = __qrRackScanner;
  qrRackSetVideoVisible(true);
  const result = cur.overlay?.querySelector?.("[data-qr-result]");
  const levels = cur.overlay?.querySelector?.("[data-qr-levels]");
  if (result) {
    result.style.display = "none";
    result.innerHTML = "";
  }
  if (levels) levels.innerHTML = "";
  qrRackStatus("Avvio fotocamera…");

  if (!navigator.mediaDevices?.getUserMedia) {
    qrRackStatus("Fotocamera non supportata su questo browser: usa Mappa o Elenco.", "bad");
    return;
  }

  try {
    cur.decoder = await qrRackGetDecoder();
    cur.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    if (__qrRackScanner !== cur || (cur.pane && cur.pane !== "scan")) {
      try {
        cur.stream.getTracks().forEach((t) => t.stop());
      } catch (_e) {}
      cur.stream = null;
      return;
    }
    cur.video.srcObject = cur.stream;
    cur.video.setAttribute("playsinline", "true");
    cur.video.muted = true;
    await cur.video.play();
    if (__qrRackScanner !== cur || (cur.pane && cur.pane !== "scan")) {
      try {
        cur.stream?.getTracks().forEach((t) => t.stop());
      } catch (_e) {}
      cur.stream = null;
      return;
    }
    qrRackStatus("Inquadra il QR sulla trave.");
    qrRackStartLoop();
  } catch (err) {
    console.warn("qr camera", err);
    qrRackStatus(
      "Fotocamera non avviata: consenti l’accesso alla fotocamera oppure usa Mappa o Elenco.",
      "bad",
    );
  }
}

function handleQrRackScan(raw) {
  const s = __qrRackScanner;
  if (!s) return;
  stopQrRackCamera();
  const parsed = qrRackParsePayload(raw);
  const result = s.overlay?.querySelector?.("[data-qr-result]");
  const levels = s.overlay?.querySelector?.("[data-qr-levels]");
  if (!parsed.ok) {
    qrRackSetVideoVisible(false);
    if (result) {
      result.style.display = "";
      result.innerHTML = `<div class="qrRackResultCode">QR non valido</div><div class="qrRackResultSub">${escapeHtml(parsed.reason || "Formato non riconosciuto")}</div>`;
    }
    if (levels) levels.innerHTML = "";
    qrRackStatus("Inquadra di nuovo il QR oppure usa Mappa o Elenco.", "bad");
    return;
  }
  if (parsed.finalCode) {
    const code = normalizeRackLocation(parsed.finalCode);
    if (!isRackLocationUsableForItem(code, s.sku, s.loc)) {
      const occ = rackLocationOccupantInfo(code, s.sku, s.loc);
      qrRackSetVideoVisible(false);
      if (result) {
        result.style.display = "";
        result.innerHTML = `<div class="qrRackResultCode">${escapeHtml(code)}</div><div class="qrRackResultSub">${escapeHtml(occ ? `Occupata da ${occ.sku}` : "Posizione non disponibile")}</div>`;
      }
      if (levels) levels.innerHTML = "";
      qrRackStatus("Scegli un’altra posizione.", "warn");
      return;
    }
    confirmQrRackCode(code);
    return;
  }
  qrRackRenderLevels(parsed.base);
}

function confirmQrRackCode(codeRaw) {
  const s = __qrRackScanner;
  const code = normalizeRackLocation(codeRaw || "");
  if (!s || !code) return;
  if (!RACK_LOCATION_SET.has(code) && !isCereaLocation(code)) {
    qrRackStatus("Posizione non valida.", "bad");
    return;
  }
  if (!isRackLocationUsableForItem(code, s.sku, s.loc)) {
    const occ = rackLocationOccupantInfo(code, s.sku, s.loc);
    showToast(
      "Posizione occupata",
      occ ? `${code} contiene ${occ.sku}.` : `${code} non è disponibile.`,
      2600,
    );
    return;
  }
  stopQrRackCamera();
  const it = getProductBySku(s.loc, s.sku) || {};
  const remaining = rackUnallocatedQtyByLotFromDoc(it, s.lot);
  const cereaQty = cereaQtyFromDoc(it, s.lot);
  const assignable = isCereaLocation(code) ? Math.max(0, remaining - cereaQty) : remaining;
  if (assignable <= 0) {
    showToast(
      isCereaLocation(code) ? "Già a Cerea" : "Niente da ubicare",
      isCereaLocation(code)
        ? "Tutti i pezzi da ubicare di questo lotto sono già a Cerea."
        : "Questo lotto risulta già ubicato.",
      2600,
    );
    return;
  }
  __qrRackScanner.chosen = code;
  __qrRackScanner.remaining = remaining;
  __qrRackScanner.cereaQty = cereaQty;
  __qrRackScanner.assignable = assignable;
  __qrRackScanner.qty = assignable;
  ubicaRenderConfirm();
  ubicaShowStep("confirm");
  __qrRackScanner.overlay.querySelector("[data-ubica-qty]")?.focus({ preventScroll: true });
}

function openQrRackScannerForSku(skuRaw, locRaw, opts = {}) {
  const sku = toSkuId(skuRaw || "");
  const loc = locRaw === "cerea" || locRaw === "concamarise" ? locRaw : state.route.loc;
  if (!sku || !(loc === "cerea" || loc === "concamarise")) return false;
  if (!canUsePickingActions()) {
    showToast("Permessi", "Il tuo account non è abilitato al picking.", 2200);
    return true;
  }
  const it = getProductBySku(loc, sku);
  if (!it) {
    showToast("Prodotto non trovato", "Aggiorna la pagina e riprova.", 2200);
    return false;
  }
  const selectedLot =
    normalizeLotId(opts.lot || state.ui.productDetailsLot || "") || getDefaultLotForItem(it || {});
  const remaining = rackUnallocatedQtyByLotFromDoc(it || {}, selectedLot);
  if (remaining <= 0) {
    showToast("Niente da ubicare", "Questo lotto risulta già ubicato.", 2200);
    return false;
  }
  const returnToSheet = state.ui.sheet === "productDetails";
  state.route.loc = loc;
  state.ui.productDetailsSku = sku;
  state.ui.productDetailsLot = selectedLot;
  state.ui.productDetailsEditMode = true;
  removeMobileQuickRackSelector();
  removeQrRackScanner();

  const meta = parseTitleMeta(it.title || "");
  const title = squashWhitespace(meta.main || it.title || sku) || sku;
  const cereaQty = cereaQtyFromDoc(it, selectedLot);
  const hasCamera = !!navigator.mediaDevices?.getUserMedia;
  const coarse = (() => {
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch (_e) {
      return false;
    }
  })();
  const overlay = document.createElement("div");
  overlay.className = "qrRackOverlay ubica";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "ubicaTitle");
  overlay.innerHTML = `
    <div class="qrRackPanel ubica-panel">
      <header class="ubica-head">
        <div class="ubica-headtext">
          <h2 id="ubicaTitle">Ubica</h2>
          <p class="ubica-product">${escapeHtml(title)}</p>
          <p class="meta"><span class="sku">${escapeHtml(sku)}</span><span>${escapeHtml(uiLotText(selectedLot))}</span></p>
        </div>
        <div class="ubica-todo"><strong>${escapeHtml(fmtN(remaining))}</strong><span>pz da ubicare</span>${cereaQty ? `<small>${escapeHtml(fmtN(cereaQty))} a Cerea</small>` : ""}</div>
        <button class="icon-btn" type="button" data-action="qrRackClose" aria-label="Chiudi">${ICON.close}</button>
      </header>
      <div class="ubica-body">
        <div data-ubica-step="where">
          <p class="ubica-ask">Dove metti il bancale?</p>
          <div class="seg" role="tablist" aria-label="Come scegliere la posizione">
            <button class="seg-btn" type="button" role="tab" data-ubica-tab="scan" aria-selected="false">${ICON.qr}<span>QR</span></button>
            <button class="seg-btn" type="button" role="tab" data-ubica-tab="map" aria-selected="false">${ICON.map}<span>Mappa</span></button>
            <button class="seg-btn" type="button" role="tab" data-ubica-tab="list" aria-selected="false">${ICON.list}<span>Elenco</span></button>
          </div>
          <div class="ubica-pane" data-ubica-pane="scan" hidden>
            <div class="qrRackVideoBox" data-qr-video-box>
              <video data-qr-video autoplay muted playsinline></video>
              <canvas data-qr-canvas style="display:none"></canvas>
              <div class="qrRackFrame" aria-hidden="true"></div>
            </div>
            <div class="qrRackResult" data-qr-result style="display:none"></div>
            <div class="qrRackLevels" data-qr-levels></div>
            <p class="qrRackStatus" data-qr-status>Inquadra il QR sulla trave.</p>
            <button class="btn btn--ghost btn--block" type="button" data-action="qrRackRetry">Scansiona di nuovo</button>
          </div>
          <div class="ubica-pane ubica-pane--map" data-ubica-pane="map" hidden><div class="ubica-map" data-ubica-map></div></div>
          <div class="ubica-pane" data-ubica-pane="list" hidden>
            <label class="field"><span class="field-label">Posizione</span>
              <select class="input qrRackManualSelect" id="qrRackManualSelect" data-action="qrRackSelectRack">${rackLocationSelectOptions([], sku, loc, { hideEmpty: true, exclude: [] })}</select>
            </label>
            <p class="field-help">Sono elencati solo i posti liberi e quelli già usati da questo prodotto. Cerea, la posizione temporanea, è in fondo.</p>
          </div>
        </div>
        <div data-ubica-step="confirm" hidden><div class="ubica-confirm" data-ubica-confirm></div></div>
      </div>
    </div>`;

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) return removeQrRackScanner();
    const t = e.target?.closest?.(
      "[data-action],[data-ubica-tab],[data-ubica-step-qty],[data-ubica-all]",
    );
    if (!t) return;
    if (t.dataset.ubicaTab) return ubicaSetPane(t.dataset.ubicaTab);
    if (t.dataset.ubicaStepQty) {
      const input = overlay.querySelector("[data-ubica-qty]");
      const s = __qrRackScanner;
      const n = Number(String(input?.value || "").trim()) || 0;
      const next = Math.max(1, Math.min(s?.assignable || 1, n + Number(t.dataset.ubicaStepQty)));
      if (input) input.value = String(next);
      return ubicaSyncQty();
    }
    if (t.hasAttribute("data-ubica-all")) {
      const input = overlay.querySelector("[data-ubica-qty]");
      if (input) input.value = String(__qrRackScanner?.assignable || "");
      return ubicaSyncQty();
    }
    const a = t.dataset.action;
    if (a === "qrRackClose") return removeQrRackScanner();
    if (a === "qrRackRetry") return void qrRackStartCamera();
    if (a === "ubicaSave") return void ubicaSave(t);
    if (a === "ubicaBack") {
      if (__qrRackScanner) __qrRackScanner.chosen = "";
      ubicaShowStep("where");
      const sel = overlay.querySelector("#qrRackManualSelect");
      if (sel) sel.value = "";
      return ubicaSetPane(__qrRackScanner?.pane || "map");
    }
    if (a === "qrRackChooseLevel") {
      if (t.disabled || t.classList.contains("disabled")) return;
      const code = normalizeRackLocation(t.getAttribute("data-code") || "");
      if (!isRackLocationUsableForItem(code, sku, loc)) {
        const occ = rackLocationOccupantInfo(code, sku, loc);
        qrRackStatus(occ ? `Livello occupato da ${occ.sku}.` : "Livello non disponibile.", "warn");
        qrRackRenderLevels(qrRackBaseFromFinalCode(code));
        return;
      }
      confirmQrRackCode(code);
    }
  });
  overlay.addEventListener("input", (e) => {
    if (e.target?.matches?.("[data-ubica-qty]")) ubicaSyncQty();
  });
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target?.matches?.("[data-ubica-qty]")) {
      e.preventDefault();
      const btn = overlay.querySelector('[data-action="ubicaSave"]');
      if (btn && !btn.disabled) void ubicaSave(btn);
    }
  });
  overlay.addEventListener("change", (e) => {
    const select = e.target?.closest?.("[data-action='qrRackSelectRack']");
    if (!select) return;
    const code = normalizeRackLocation(select.value || "");
    if (!code) return;
    if (!RACK_LOCATION_SET.has(code) && !isCereaLocation(code)) {
      showToast("Posizione non valida", "Scegli una posizione dall’elenco.", 2200);
      select.value = "";
      return;
    }
    confirmQrRackCode(code);
  });

  document.body.appendChild(overlay);
  __lockBody();
  const video = overlay.querySelector("[data-qr-video]");
  const canvas = overlay.querySelector("[data-qr-canvas]");
  __qrRackScanner = {
    overlay,
    sku,
    loc,
    lot: selectedLot,
    video,
    canvas,
    ctx: canvas?.getContext?.("2d", { willReadFrequently: true }) || null,
    stream: null,
    decoder: null,
    active: false,
    raf: 0,
    scanning: false,
    returnToSheet,
    remaining,
    cereaQty,
    chosen: "",
    map: null,
    pane: "",
  };
  ubicaSetPane(opts.pane || (hasCamera && coarse ? "scan" : "map"));
  return true;
}

async function saveLocationOnlyFromDetails(opts = {}) {
  let loc = state.route.loc;
  const sku = toSkuId(state.ui.productDetailsSku || "");
  const quickMode = !!(opts && opts.quick);
  const quickSelectedCode = normalizeRackLocation(
    opts && opts.rackLocation ? opts.rackLocation : "",
  );
  // Quantità e conferma già raccolte dalla schermata Ubica: le validazioni restano qui sotto.
  const qtyFromUi = Number.isSafeInteger(opts?.qty) ? opts.qty : null;
  const preConfirmed = opts?.confirmed === true;
  loc = INVENTORY_CANONICAL_LOC;
  state.route.loc = loc;

  if (!canUsePickingActions()) {
    showToast("Permessi", "Utente non abilitato al picking.", 2200);
    return;
  }
  if (!(loc === "cerea" || loc === "concamarise") || !sku) {
    showToast("Errore", "Prodotto o magazzino non valido.", 2200);
    return;
  }

  const it = getProductBySku(loc, sku) || getProductBySku("cerea", sku);
  if (!it) {
    showToast("Errore", "Prodotto non trovato.", 2200);
    return;
  }

  const lot = normalizeLotId(state.ui.productDetailsLot || "") || getDefaultLotForItem(it || {});
  state.ui.productDetailsLot = lot;
  const totalSkuQty = stockQtyFromDoc(it || {});
  const lotQty = stockLotQtyFromDoc(it || {}, lot);
  const qty = lotQty || totalSkuQty;
  const remainingBefore = rackUnallocatedQtyByLotFromDoc(it || {}, lot);
  const existingAllocationsBefore = normalizeRackAllocationsForWrite(
    readRackAllocationsFromDoc(it || {}),
  );
  const selected = quickSelectedCode ? [quickSelectedCode] : readLocationOnlySelection();
  const selectedCode = selected[0] || "";
  const assigningCerea = isCereaLocation(selectedCode);
  const assignableBefore = assigningCerea
    ? Math.max(0, remainingBefore - cereaQtyFromDoc(it, lot))
    : remainingBefore;

  if (!quickMode) setPdFieldError("rackLocation", "");

  if (qty <= 0) {
    if (!quickMode)
      setPdFieldError("rackLocation", "Disponibilità zero: nessuna ubicazione da assegnare.");
    showToast("Disponibilità zero", "Il prodotto non ha pezzi da ubicare.", 2200);
    return;
  }
  if (!selectedCode) {
    if (!quickMode) setPdFieldError("rackLocation", "Seleziona un’ubicazione.");
    showToast("Ubicazione mancante", "Seleziona una posizione libera.", 2200);
    return;
  }
  if (selected.length > 1) {
    if (!quickMode) setPdFieldError("rackLocation", "Seleziona una sola ubicazione per volta.");
    showToast(
      "Una posizione per volta",
      `Scegli una posizione alla volta: puoi anche assegnare quantità superiori a ${RACK_PALLET_CAPACITY} pz nella stessa posizione.`,
      2600,
    );
    return;
  }
  if (!RACK_LOCATION_SET.has(selectedCode) && !assigningCerea) {
    if (!quickMode) setPdFieldError("rackLocation", "Ubicazione non valida.");
    showToast("Ubicazione non valida", "Scegli una posizione dalla lista.", 2200);
    return;
  }
  if (!isRackLocationUsableForItem(selectedCode, sku, loc)) {
    const occ = rackLocationOccupantInfo(selectedCode, sku, loc);
    if (!quickMode)
      setPdFieldError(
        "rackLocation",
        occ
          ? `Ubicazione già occupata da ${occ.sku} (${prettyLoc(occ.loc)}).`
          : "Ubicazione non disponibile.",
      );
    showToast("Ubicazione occupata", "Scegli solo ubicazioni libere.", 2400);
    return;
  }
  // Se selectedCode è già usata dallo stesso SKU nello stesso magazzino, è valida:
  // la nuova quantità residua verrà sommata nella stessa allocazione cloud (code+lot).
  if (assigningCerea && assignableBefore <= 0) {
    showToast("Cerea", "Tutti i pezzi da ubicare di questo lotto sono già a Cerea.", 2600);
    if (!quickMode) renderProductDetailsSheet();
    return;
  }

  let qtyToAssign = 0;
  if (qtyFromUi !== null && assignableBefore <= 0) {
    // Il lotto risulta già ubicato (es. da un altro operatore mentre la schermata era aperta):
    // non si passa al riposizionamento dell'intero lotto senza una scelta esplicita.
    showToast(
      "Lotto già ubicato",
      "Nel frattempo i pezzi di questo lotto hanno ricevuto una posizione. Riapri il prodotto per vedere dove.",
      3600,
    );
    return false;
  }
  if (assignableBefore > 0 && qtyFromUi !== null) {
    if (qtyFromUi <= 0) {
      showToast("Quantità non valida", "Inserisci un numero intero positivo.", 2400);
      return;
    }
    if (qtyFromUi > assignableBefore) {
      showToast("Quantità eccessiva", `Restano da assegnare ${assignableBefore} pz.`, 2600);
      return;
    }
    qtyToAssign = qtyFromUi;
  } else if (assignableBefore > 0) {
    {
      const raw = await uiQuantity({
        title: `Quanti pezzi in ${assigningCerea ? "Cerea" : selectedCode}?`,
        rows: [
          ["SKU", sku],
          ["Da assegnare", `${assignableBefore} pz`],
        ],
        value: assignableBefore,
        min: 1,
        max: assignableBefore,
        quick: [{ label: `Tutti, ${assignableBefore} pz`, value: assignableBefore }],
        note: assigningCerea ? "Cerea è temporanea: i pezzi restano in Da ubicare." : "",
        confirmLabel: "Continua",
      });
      if (raw === null) {
        if (!quickMode) renderProductDetailsSheet();
        return;
      }
      const parsed = parseSignedQtyStrict(raw);
      if (parsed === null || !Number.isFinite(parsed) || parsed <= 0) {
        showToast("Quantità non valida", "Inserisci un numero intero positivo.", 2400);
        return;
      }
      if (parsed > assignableBefore) {
        showToast("Quantità eccessiva", `Restano da assegnare ${assignableBefore} pz.`, 2600);
        return;
      }
      qtyToAssign = parsed;
    }
  } else {
    // Lotto già completamente ubicato: cambio posizione unica e assegno tutta la disponibilità del lotto.
    qtyToAssign = qty;
  }

  const remainingAfterPreview = assigningCerea
    ? remainingBefore
    : Math.max(0, remainingBefore > 0 ? remainingBefore - qtyToAssign : 0);
  const transferLabel =
    loc === "cerea" ? `${prettyLoc(loc)} → ${prettyLoc("concamarise")}` : prettyLoc(loc);
  const remainingLabel = loc === "cerea" ? "Da ubicare dopo in Cerea" : "Da ubicare dopo";
  const ok =
    (preConfirmed && qtyFromUi !== null && qtyToAssign === qtyFromUi) ||
    (await uiConfirm({
      title: "Confermi l’ubicazione?",
      lead: locationLabelHTML(assigningCerea ? "CEREA" : selectedCode, { size: "xl" }),
      rows: [
        ["SKU", sku],
        ["Lotto", `${lotLabelFromId(lot)} (${lotDateLabelFromId(lot)})`],
        ["Pezzi in questa posizione", `${qtyToAssign} pz`],
        [remainingLabel, `${remainingAfterPreview} pz`],
      ],
      note: assigningCerea ? "I pezzi a Cerea restano da ubicare." : "",
      confirmLabel: "Ubica",
    }));
  if (!ok) {
    if (!quickMode) renderProductDetailsSheet();
    return;
  }

  const api = state.firebase.api;
  const db = state.firebase.db;
  if (!api || !db) {
    showToast("Errore", "Firebase non inizializzato.", 2200);
    return;
  }

  try {
    // Inventario unico: il vecchio trasferimento automatico Cerea → Concamarise è disattivato.
    if (false && loc === "cerea") {
      const sourceLoc = "cerea";
      const destLoc = "concamarise";
      const sourceRef = api.doc(db, COL_ROOT, sourceLoc, SUB_ITEMS, sku);
      const destRef = api.doc(db, COL_ROOT, destLoc, SUB_ITEMS, sku);
      const productRef = api.doc(db, COL_PRODUCTS, sku);
      const nowClient = Date.now();
      const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
      const title = squashWhitespace(it.title || sku) || sku;
      const transferMovementId = api.doc(api.collection(db, COL_PRODUCTS, sku, SUB_MOVES)).id;

      let movedQty = qtyToAssign;
      let finalRemaining = remainingAfterPreview;
      let destTotal = 0;

      await api.runTransaction(db, async (tx) => {
        const sourceSnap = await tx.get(sourceRef);
        const destSnap = await tx.get(destRef);

        if (!sourceSnap.exists()) throw new Error("Prodotto non trovato in Cerea.");
        const sourceFresh = sourceSnap.data() || {};
        const sourceQty = stockQtyFromDoc(sourceFresh);
        if (sourceQty <= 0) throw new Error("Disponibilità zero: nessuna ubicazione da assegnare.");

        const sourceAllocations = normalizeRackAllocationsForWrite(
          readRackAllocationsFromDoc(sourceFresh),
        );
        const sourceLotQty = stockLotQtyFromDoc(sourceFresh, lot);
        const sourceRemaining = rackUnallocatedQtyByLotFromDoc(sourceFresh, lot);

        if (sourceLotQty <= 0) throw new Error("Lotto non trovato o senza disponibilità.");

        if (sourceRemaining > 0) {
          // stesso SKU + stesso rack consentito: normalizeRackAllocationsForWrite sommerà code+lot.
          if (qtyToAssign > sourceRemaining)
            throw new Error(`Restano da ubicare ${sourceRemaining} pz in Cerea per questo lotto.`);
          movedQty = qtyToAssign;
          finalRemaining = Math.max(0, sourceRemaining - movedQty);
        } else {
          // Se il lotto è già ubicato in Cerea, trasferisco quel lotto a Concamarise.
          movedQty = sourceLotQty;
          finalRemaining = 0;
        }

        if (movedQty <= 0) throw new Error("Quantità da trasferire non valida.");

        const destFresh = destSnap.exists() ? destSnap.data() || {} : {};
        const destQty = stockQtyFromDoc(destFresh);
        const destAllocations = normalizeRackAllocationsForWrite(
          readRackAllocationsFromDoc(destFresh),
        );

        // stesso SKU + stesso rack in Concamarise consentito: viene sommato cloud.

        const destCleanAllocations = normalizeRackAllocationsForWrite([
          ...destAllocations,
          {
            code: selectedCode,
            lot,
            qty: movedQty,
            movementId: transferMovementId,
            movementKey: transferMovementId,
            createdAtClient: nowClient,
          },
        ]);
        const destCleanLocations = normalizeRackLocationsList(
          destCleanAllocations.map((x) => x.code),
        );
        const destCleanLocation = destCleanLocations[0] || "";
        destTotal = destQty + movedQty;

        const sourceNewQty = sourceQty - movedQty;
        const movingAllocatedLot = sourceRemaining <= 0;
        const sourceCleanStockLots = stockLotsWithDeltaForWrite(
          sourceFresh,
          lot,
          -movedQty,
          nowClient,
          "ubicazione_transfer",
          transferMovementId,
        );
        const destCleanStockLots = stockLotsWithDeltaForWrite(
          destFresh,
          lot,
          movedQty,
          nowClient,
          "ubicazione_transfer",
          transferMovementId,
        );
        const sourceCleanAllocations =
          sourceNewQty > 0 && movingAllocatedLot
            ? sourceAllocations.filter((x) => (normalizeLotId(x.lot) || LOT_LEGACY_ID) !== lot)
            : sourceNewQty > 0
              ? sourceAllocations
              : [];
        const sourceCleanLocations =
          sourceNewQty > 0
            ? normalizeRackLocationsList(sourceCleanAllocations.map((x) => x.code))
            : [];
        tx.set(
          sourceRef,
          {
            sku,
            title,
            titleNorm: normalizeText(title || sku),
            qty: Math.max(0, Math.round(Number(sourceNewQty) || 0)),
            rackLocation: sourceCleanLocations[0] || "",
            rackLocations: sourceCleanLocations,
            rackAllocations: sourceCleanAllocations,
            stockLots: sourceNewQty > 0 ? sourceCleanStockLots : [],
            zeroStock: sourceNewQty <= 0,
            zeroStockAt: sourceNewQty <= 0 ? api.serverTimestamp() : null,
            zeroStockAtClient: sourceNewQty <= 0 ? nowClient : null,
            lastRackMovementId: transferMovementId,
            lastRackMovementKey: transferMovementId,
            lastRackMovementLot: lot,
            updatedAt: api.serverTimestamp(),
            updatedAtClient: nowClient,
            updatedBy: who,
            location: sourceLoc,
          },
          { merge: true },
        );

        tx.set(
          destRef,
          {
            sku,
            title,
            titleNorm: normalizeText(title || sku),
            qty: destTotal,
            rackLocation: destCleanLocation,
            rackLocations: destCleanLocations,
            rackAllocations: destCleanAllocations,
            stockLots: destCleanStockLots,
            lastRackMovementId: transferMovementId,
            lastRackMovementKey: transferMovementId,
            lastRackMovementLot: lot,
            lastProductionLot: lot,
            lastProductionAtClient: nowClient,
            updatedAt: api.serverTimestamp(),
            updatedAtClient: nowClient,
            updatedBy: who,
            location: destLoc,
          },
          { merge: true },
        );

        tx.set(
          productRef,
          {
            sku,
            title,
            titleNorm: normalizeText(title || sku),
            rackLocation: destCleanLocation,
            rackLocations: destCleanLocations,
            rackAllocations: destCleanAllocations,
            lastRackMovementId: transferMovementId,
            lastRackMovementKey: transferMovementId,
            lastRackMovementLot: lot,
            lastProductionLot: lot,
            lastProductionAtClient: nowClient,
            lastSeenAt: api.serverTimestamp(),
            lastSeenAtClient: nowClient,
            lastSeenBy: who,
            lastSeenLocation: destLoc,
            lastSeenKind: "location_transfer_from_cerea",
          },
          { merge: true },
        );

        addProductMovementToBatch(tx, api, db, sku, {
          type: "move",
          movementId: transferMovementId,
          movementKey: transferMovementId,
          writeKey: transferMovementId,
          qtySigned: movedQty,
          deltaSigned: movedQty,
          beforeFromQty: sourceQty,
          afterFromQty: sourceNewQty,
          beforeToQty: destQty,
          afterToQty: destTotal,
          fromWarehouse: sourceLoc,
          toWarehouse: destLoc,
          source: "ubicazione",
          note: `Ubicazione ${selectedCode} con trasferimento automatico Cerea → Concamarise`,
          rackLocation: selectedCode,
          rackLocations: destCleanLocations,
          assignedQty: movedQty,
          remainingQty: finalRemaining,
          lot,
          lotLabel: lotLabelFromId(lot),
          createdAtClient: nowClient,
        });
      });

      await syncRackLocationGroupCloud(sku, destLoc, "rack_location_transfer");
      showToast(
        "Ubicazione salvata",
        `${sku} → ${selectedCode} • ${movedQty} pz spostati in Concamarise${finalRemaining ? ` • restano ${finalRemaining} in Cerea` : ""}`,
        2600,
      );
      try {
        const sourceFreshRuntime = getProductBySku(sourceLoc, sku) || it || {};
        const sourceQtyRuntime = stockQtyFromDoc(sourceFreshRuntime || {});
        const sourceNewQtyRuntime = Math.max(0, sourceQtyRuntime - movedQty);
        const sourceAllocRuntime = normalizeRackAllocationsForWrite(
          readRackAllocationsFromDoc(sourceFreshRuntime || {}),
        );
        const sourceStockLotsRuntime = stockLotsWithDeltaForWrite(
          sourceFreshRuntime || {},
          lot,
          -movedQty,
          nowClient,
          "ubicazione_transfer",
          transferMovementId,
        );
        const movedAllocatedLot =
          rackUnallocatedQtyByLotFromDoc(sourceFreshRuntime || {}, lot) <= 0;
        const sourceAllocNextRuntime = movedAllocatedLot
          ? sourceAllocRuntime.filter((x) => (normalizeLotId(x.lot) || LOT_LEGACY_ID) !== lot)
          : sourceAllocRuntime;
        const sourceLocsNextRuntime = normalizeRackLocationsList(
          sourceAllocNextRuntime.map((x) => x.code),
        );
        patchRuntimeInventoryItem(sourceLoc, sku, {
          sku,
          title,
          qty: Math.max(0, Math.round(Number(sourceNewQtyRuntime) || 0)),
          stockLots: sourceNewQtyRuntime > 0 ? sourceStockLotsRuntime : [],
          rackAllocations: sourceNewQtyRuntime > 0 ? sourceAllocNextRuntime : [],
          rackLocations: sourceNewQtyRuntime > 0 ? sourceLocsNextRuntime : [],
          rackLocation: sourceNewQtyRuntime > 0 ? sourceLocsNextRuntime[0] || "" : "",
          zeroStock: sourceNewQtyRuntime <= 0,
          zeroStockAtClient: sourceNewQtyRuntime <= 0 ? nowClient : null,
          updatedAtClient: nowClient,
          updatedBy: who,
          location: sourceLoc,
        });

        const destFreshRuntime = getProductBySku(destLoc, sku) || {};
        const destAllocRuntime = normalizeRackAllocationsForWrite(
          readRackAllocationsFromDoc(destFreshRuntime || {}),
        );
        const destAllocNextRuntime = normalizeRackAllocationsForWrite([
          ...destAllocRuntime,
          {
            code: selectedCode,
            lot,
            qty: movedQty,
            movementId: transferMovementId,
            movementKey: transferMovementId,
            createdAtClient: nowClient,
          },
        ]);
        const destLocsRuntime = normalizeRackLocationsList(destAllocNextRuntime.map((x) => x.code));
        const destStockLotsRuntime = stockLotsWithDeltaForWrite(
          destFreshRuntime || {},
          lot,
          movedQty,
          nowClient,
          "ubicazione_transfer",
          transferMovementId,
        );
        patchRuntimeInventoryItem(destLoc, sku, {
          sku,
          title,
          qty: destTotal,
          stockLots: destStockLotsRuntime,
          rackAllocations: destAllocNextRuntime,
          rackLocations: destLocsRuntime,
          rackLocation: destLocsRuntime[0] || "",
          lastProductionLot: lot,
          lastProductionAtClient: nowClient,
          updatedAtClient: nowClient,
          updatedBy: who,
          location: destLoc,
        });
      } catch (_e) {}
      state.route.loc = destLoc;
      state.ui.productDetailsSku = null;
      state.ui.productDetailsLot = "";
      state.ui.productDetailsEditMode = false;
      removeMobileQuickRackSelector();
      if (!quickMode) closeSheet("productDetails");
      renderHomeDashboard();

      return true;
    }

    const itemRef = api.doc(db, COL_ROOT, loc, SUB_ITEMS, sku);
    const productRef = api.doc(db, COL_PRODUCTS, sku);
    const nowClient = Date.now();
    const who = state.user?.email || state.user?.emailLower || state.user?.uid || "";
    const title = squashWhitespace(it.title || sku) || sku;
    const locationMovementId = api.doc(api.collection(db, COL_PRODUCTS, sku, SUB_MOVES)).id;

    let finalRemaining = remainingAfterPreview;
    let assignedQtyFinal = qtyToAssign;
    let runtimePatch = null;
    await api.runTransaction(db, async (tx) => {
      const snap = await tx.get(itemRef);
      if (!snap.exists()) throw new Error("Prodotto non trovato.");
      const fresh = snap.data() || {};
      const freshQty = stockQtyFromDoc(fresh);
      if (freshQty <= 0) throw new Error("Disponibilità zero: nessuna ubicazione da assegnare.");

      const freshAllocations = normalizeRackAllocationsForWrite(readRackAllocationsFromDoc(fresh));
      const freshLotQty = stockLotQtyFromDoc(fresh, lot);
      const freshRemaining = rackUnallocatedQtyByLotFromDoc(fresh, lot);
      let cleanAllocations;
      let cleanCereaAllocations = readCereaAllocationsFromDoc(fresh);
      let beforeAllocatedQty = rackAllocatedQtyByLotFromDoc(fresh, lot);
      let afterAllocatedQty = beforeAllocatedQty;

      if (freshLotQty <= 0) throw new Error("Lotto non trovato o senza disponibilità.");
      if (remainingBefore > 0 && freshRemaining <= 0) {
        throw new Error(
          "Questo lotto è già stato ubicato durante la conferma. Riapri il prodotto per vedere le ubicazioni aggiornate.",
        );
      }

      if (assigningCerea) {
        const freeForCerea = Math.max(0, freshRemaining - cereaQtyFromDoc(fresh, lot));
        if (qtyToAssign > freeForCerea)
          throw new Error(
            `Restano ${freeForCerea} pz da assegnare a Cerea per questo lotto. Riapri il prodotto.`,
          );
        assignedQtyFinal = qtyToAssign;
        cleanAllocations = freshAllocations;
        cleanCereaAllocations = readCereaAllocationsFromDoc({
          ...fresh,
          cereaAllocations: [...cleanCereaAllocations, { lot, qty: qtyToAssign }],
        });
        finalRemaining = freshRemaining;
      } else if (freshRemaining > 0) {
        // stesso SKU + stesso rack consentito: la nuova quantità viene sommata cloud.
        if (qtyToAssign > freshRemaining)
          throw new Error(`Restano da ubicare ${freshRemaining} pz per questo lotto.`);
        assignedQtyFinal = qtyToAssign;
        cleanAllocations = normalizeRackAllocationsForWrite([
          ...freshAllocations,
          {
            code: selectedCode,
            lot,
            qty: assignedQtyFinal,
            movementId: locationMovementId,
            movementKey: locationMovementId,
            createdAtClient: nowClient,
          },
        ]);
        finalRemaining = Math.max(0, freshRemaining - assignedQtyFinal);
        afterAllocatedQty = beforeAllocatedQty + assignedQtyFinal;
      } else {
        // Riposizionamento del singolo lotto già interamente ubicato.
        assignedQtyFinal = freshLotQty;
        const otherLotAllocations = freshAllocations.filter(
          (x) => (normalizeLotId(x.lot) || LOT_LEGACY_ID) !== lot,
        );
        cleanAllocations = normalizeRackAllocationsForWrite([
          ...otherLotAllocations,
          {
            code: selectedCode,
            lot,
            qty: assignedQtyFinal,
            movementId: locationMovementId,
            movementKey: locationMovementId,
            createdAtClient: nowClient,
          },
        ]);
        finalRemaining = 0;
        afterAllocatedQty = assignedQtyFinal;
      }

      const cleanLocations = normalizeRackLocationsList(cleanAllocations.map((x) => x.code));
      const cleanLocation = cleanLocations[0] || "";
      if (!assigningCerea)
        cleanCereaAllocations = consumeCereaAllocations(fresh, lot, assignedQtyFinal);

      tx.set(
        itemRef,
        {
          sku,
          title,
          titleNorm: normalizeText(title || sku),
          rackLocation: cleanLocation,
          rackLocations: cleanLocations,
          rackAllocations: cleanAllocations,
          cereaAllocations: cleanCereaAllocations,
          lastRackMovementId: locationMovementId,
          lastRackMovementKey: locationMovementId,
          lastRackMovementLot: lot,
          updatedAt: api.serverTimestamp(),
          updatedAtClient: nowClient,
          updatedBy: who,
          location: loc,
        },
        { merge: true },
      );

      tx.set(
        productRef,
        {
          sku,
          title,
          titleNorm: normalizeText(title || sku),
          rackLocation: cleanLocation,
          rackLocations: cleanLocations,
          rackAllocations: cleanAllocations,
          cereaAllocations: cleanCereaAllocations,
          lastRackMovementId: locationMovementId,
          lastRackMovementKey: locationMovementId,
          lastRackMovementLot: lot,
          lastProductionLot: lot,
          lastProductionAtClient: nowClient,
          lastSeenAt: api.serverTimestamp(),
          lastSeenAtClient: nowClient,
          lastSeenBy: who,
          lastSeenLocation: loc,
          lastSeenKind: "location_update",
        },
        { merge: true },
      );

      addProductMovementToBatch(tx, api, db, sku, {
        type: assigningCerea ? "ubicazione_temporanea" : "ubicazione",
        movementId: locationMovementId,
        movementKey: locationMovementId,
        writeKey: locationMovementId,
        qtySigned: assignedQtyFinal,
        deltaSigned: 0,
        assignedQty: assignedQtyFinal,
        beforeAllocatedQty,
        afterAllocatedQty,
        remainingQty: finalRemaining,
        fromWarehouse: loc,
        toWarehouse: loc,
        location: loc,
        source: "ubicazione",
        note: `Ubicazione ${assigningCerea ? "Cerea temporanea (resta da ubicare)" : selectedCode} • lotto ${lotLabelFromId(lot)}`,
        rackLocation: selectedCode,
        rackLocations: cleanLocations,
        lot,
        lotLabel: lotLabelFromId(lot),
        deleteLocked: true,
        locked: true,
        createdAtClient: nowClient,
      });
      runtimePatch = {
        sku,
        title,
        qty: freshQty,
        stockLots: readStockLotsFromDoc(fresh),
        rackAllocations: cleanAllocations,
        rackLocations: cleanLocations,
        rackLocation: cleanLocation,
        cereaAllocations: cleanCereaAllocations,
        lastRackMovementId: locationMovementId,
        lastRackMovementKey: locationMovementId,
        lastRackMovementLot: lot,
        updatedAtClient: nowClient,
        updatedBy: who,
        location: loc,
      };
      runtimePatch.__raw = { ...fresh, ...runtimePatch };
    });

    // Mostra l'esito confermato dalla transazione, senza sommare nuovamente
    // i pezzi se lo snapshot realtime ha già ricevuto la stessa ubicazione.
    if (runtimePatch) patchRuntimeInventoryItem(loc, sku, runtimePatch);
    await syncRackLocationGroupCloud(sku, loc, "rack_location_assign");
    showToast(
      "Ubicazione salvata",
      `${sku} → ${selectedCode} • ${assignedQtyFinal} pz${finalRemaining ? ` • restano ${finalRemaining}` : ""}`,
      2400,
    );
    state.ui.productDetailsSku = null;
    state.ui.productDetailsLot = "";
    state.ui.productDetailsEditMode = false;
    removeMobileQuickRackSelector();
    if (!quickMode) closeSheet("productDetails");
    renderHomeDashboard();
    return true;
  } catch (err) {
    console.error(err);
    showToast("Errore salvataggio", String(err?.message || err).slice(0, 220), 3000);
    return false;
  }
}

function renderProductDetailsSheet() {
  renderLocationOnlyProductDetailsSheet();
}

function setPdFieldError(key, msg) {
  const wrap = $("productDetailsContent");
  const el = wrap?.querySelector?.(`[data-err="${key}"]`);
  if (el) {
    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";
  }
}

function clearPdFieldErrors() {
  setPdFieldError("sku", "");
  setPdFieldError("qty", "");
  setPdFieldError("lowStockThreshold", "");
  setPdFieldError("rackLocation", "");
}

function normalizeInventoryLoc(v) {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  return s === "unica" || s === "cerea" || s === "concamarise" || s === INVENTORY_CANONICAL_LOC
    ? INVENTORY_CANONICAL_LOC
    : "";
}

// --- UI navigation ---

// --- bind ---
function bindUI() {
  const closeDetails = () => {
    state.ui.productDetailsSku = null;
    state.ui.productDetailsLot = "";
    state.ui.productDetailsEditMode = false;
    clearPdFieldErrors();
    removeMobileQuickRackSelector();
    closeSheet("productDetails");
  };
  const backdropClose = (id, fn) =>
    $(id)?.addEventListener("click", (e) => {
      if (e.target?.id === id) fn();
    });
  $("btnCloseProductDetails")?.addEventListener("click", closeDetails);
  backdropClose("sheetProductDetails", closeDetails);
  $("btnCloseShopifyOrderDetails")?.addEventListener("click", closeShopifyOrderDetailsSheet);
  backdropClose("sheetShopifyOrderDetails", closeShopifyOrderDetailsSheet);
  backdropClose("sheetFind", closeFindSheet);
  backdropClose("menuSheet", () => setPickingMobileMenu(false));
  document
    .querySelectorAll("[data-close-find]")
    .forEach((b) => b.addEventListener("click", closeFindSheet));
  document
    .querySelectorAll("[data-open-menu]")
    .forEach((b) => b.addEventListener("click", () => setPickingMobileMenu(true)));
  document
    .querySelectorAll("[data-close-menu]")
    .forEach((b) => b.addEventListener("click", () => setPickingMobileMenu(false)));
  document.querySelectorAll("[data-open-ubi]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      setPickingMobileMenu(false);
      openUbiModeFullscreen();
      void callUbiVoiceAgentFromPicking();
    }),
  );

  $("productDetailsContent")?.addEventListener("click", async (e) => {
    const t = e.target?.closest?.("[data-action]");
    if (!t) return;
    const a = t.dataset.action;
    if (a === "pdSaveRackAlloc" || a === "pdDeleteRackAlloc") {
      e.preventDefault();
      e.stopPropagation();
      void saveRackAllocationFromDetails(t, a === "pdDeleteRackAlloc" ? { remove: true } : {});
    } else if (a === "pdUbica") {
      openQrRackScannerForSku(state.ui.productDetailsSku || "", INVENTORY_CANONICAL_LOC, {
        lot: t.dataset.lot || "",
      });
    } else if (a === "findPallet") {
      await openCapannone3dFind(t.dataset.code || "", t.dataset.codes || "", {
        sku: t.dataset.sku || "",
        title: t.dataset.title || "",
      });
    } else if (a === "pdPickOnMap") {
      const row = t.closest(".rackAllocRow");
      const code = await openMapPicker({
        sku: toSkuId(state.ui.productDetailsSku || ""),
        loc: INVENTORY_CANONICAL_LOC,
        current: t.dataset.oldCode || "",
      });
      if (!code || !row || !document.contains(row)) return;
      const sel = row.querySelector('[data-field="allocRackLocation"]');
      if (sel) {
        if (!Array.from(sel.options).some((o) => o.value === code)) {
          const opt = document.createElement("option");
          opt.value = code;
          opt.textContent = code;
          sel.appendChild(opt);
        }
        sel.value = code;
      }
      row.querySelector('[data-field="allocQty"]')?.focus();
    } else if (a === "editHomeNoLocationQty") {
      await editHomeNoLocationQtyPrompt(
        t.dataset.sku || "",
        t.dataset.loc || INVENTORY_CANONICAL_LOC,
      );
    } else if (a === "editHomeLocatedQty") {
      await editHomeLocatedQtyPrompt(t.dataset.sku || "", t.dataset.loc || INVENTORY_CANONICAL_LOC);
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.body.classList.contains("drone-mode-active")) {
      void closeDroneModeFullscreen();
      return;
    }
    if (document.querySelector(".qrRackOverlay")) {
      if (document.querySelector(".qrRackOverlay.mappick")) return;
      removeQrRackScanner();
      return;
    }
    const stack = state.ui.sheetStack || [];
    const top = stack[stack.length - 1] || state.ui.sheet;
    if (top === "shopifyOrderDetails") return closeShopifyOrderDetailsSheet();
    if (top === "productDetails") return closeDetails();
    if (top === "find") return closeFindSheet();
    if (top === "menu") return setPickingMobileMenu(false);
  });
  $("btnCloseDroneMode")?.addEventListener("click", () => {
    void closeDroneModeFullscreen();
  });
  $("btnPickingCallUbi")?.addEventListener("click", () => {
    void callUbiVoiceAgentFromPicking();
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && document.body.classList.contains("drone-mode-active"))
      void closeDroneModeFullscreen({ skipExitFullscreen: true });
  });
  window.addEventListener("pagehide", () => {
    try {
      removeQrRackScanner();
    } catch (_e) {}
    try {
      if (_droneNativeActive) void stopDroneNativeController();
    } catch (_e) {}
  });
  window.addEventListener(
    "resize",
    () => {
      if (!isPickingMobileNav()) setPickingMobileMenu(false);
    },
    { passive: true },
  );
  window.addEventListener("online", syncLiveStatus);
  window.addEventListener("offline", syncLiveStatus);
  document
    .querySelectorAll("[data-picking-view]")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        setPickingHomeView(btn.getAttribute("data-picking-view") || "home"),
      ),
    );

  const bindSearch = (inputId, buttonId, stateKey, render) => {
    const input = $(inputId),
      button = $(buttonId);
    if (!input) return;
    const sync = () => {
      if (button) button.hidden = !String(input.value || "").length;
    };
    let timer = null;
    input.addEventListener("input", () => {
      state.ui[stateKey] = input.value || "";
      sync();
      clearTimeout(timer);
      timer = setTimeout(render, 80);
    });
    button?.addEventListener("click", () => {
      input.value = "";
      state.ui[stateKey] = "";
      sync();
      render();
      input.focus({ preventScroll: true });
    });
    sync();
  };
  bindSearch(
    "homeNoLocationSearch",
    "btnClearHomeNoLocationSearch",
    "homeNoLocationSearch",
    renderHomeNoLocationBox,
  );
  bindSearch(
    "homeLocatedSearch",
    "btnClearHomeLocatedSearch",
    "homeLocatedSearch",
    renderHomeLocatedBox,
  );
  bindSearch("homeCereaSearch", "btnClearHomeCereaSearch", "homeCereaSearch", renderHomeCereaBox);

  const listHandler = async (e) => {
    const t = e.target?.closest?.("[data-action]");
    if (!t) return;
    const a = t.dataset.action;
    const sku = t.dataset.sku || "";
    if (a === "editHomeNoLocationQty") {
      e.preventDefault();
      await editHomeNoLocationQtyPrompt(sku, t.dataset.loc || INVENTORY_CANONICAL_LOC);
    } else if (a === "editHomeLocatedQty") {
      e.preventDefault();
      await editHomeLocatedQtyPrompt(sku, t.dataset.loc || INVENTORY_CANONICAL_LOC);
    } else if (a === "ubicaItem") {
      state.route.loc = INVENTORY_CANONICAL_LOC;
      state.ui.productDetailsLot = "";
      if (!openQrRackScannerForSku(sku, INVENTORY_CANONICAL_LOC)) openProductDetailsSheet(sku);
    } else if (a === "findPallet") {
      e.preventDefault();
      await openCapannone3dFind(t.dataset.code || "", t.dataset.codes || "", {
        sku: t.dataset.sku || "",
        title: t.dataset.title || "",
      });
    } else if (a === "openHomeNoLocationItem" || a === "openHomeCereaItem") {
      state.route.loc = INVENTORY_CANONICAL_LOC;
      state.ui.productDetailsLot = "";
      openProductDetailsSheet(sku);
    } else if (a === "openHomeLocatedItem") {
      state.ui.productDetailsLot = "";
      openProductDetailsSheet(t.dataset.rackSku || sku);
    }
  };
  $("homeNoLocationList")?.addEventListener("click", listHandler);
  $("homeCereaList")?.addEventListener("click", listHandler);
  $("homeLocatedList")?.addEventListener("click", listHandler);

  $("homePickingList")?.addEventListener("click", async (e) => {
    const t = e.target?.closest?.("[data-action]");
    if (!t) return;
    const a = t.dataset.action || "";
    if (a === "uploadBrtLabels") {
      e.preventDefault();
      openBrtLabelFilePicker(t);
      return;
    }
    if (a === "openShopifyOrderDetails") {
      e.preventDefault();
      await openShopifyOrderDetailsSheet({
        orderId: t.dataset.orderId || "",
        orderName: t.dataset.orderName || "",
        customerName: t.dataset.customerName || "",
        updatedAtClient: Number(t.dataset.orderUpdated || 0) || 0,
      });
      return;
    }
    if (a === "findPallet") {
      e.preventDefault();
      await openCapannone3dFind(t.dataset.code || "", t.dataset.codes || "", {
        sku: t.dataset.sku || "",
        title: t.dataset.title || "",
      });
      return;
    }
    if (a === "mapFlow") return openFlowOnMap(t.dataset.flowid || "", t.dataset.loc || "");
    if (a === "mapFbm") return openFbmOnMap();
    const flow = t.dataset.flowid || "",
      loc = t.dataset.loc || INVENTORY_CANONICAL_LOC;
    if (a === "pickAllShopifyFbm")
      return void (await withPickingActionLock([a], t, savePickingAllShopifyFbmFlows));
    if (a === "pickAllFbaPdf")
      return void (await withPickingActionLock([a], t, savePickingAllFlows));
    // Tutte le scritture FBA sullo stesso flusso condividono il medesimo lock:
    // due SKU toccati in rapida successione non aprono transazioni concorrenti.
    if (a === "pickSku")
      return void (await withPickingActionLock(["pickFbaFlowMutation", loc, flow], t, () =>
        savePickingSku(flow, loc, t.dataset.sku || "", { skipConfirm: true }),
      ));
    if (a === "pickFlow")
      await withPickingActionLock(["pickFbaFlowMutation", loc, flow], t, () =>
        savePickingFlow(flow, loc),
      );
  });
  $("brtLabelUploadInput")?.addEventListener("change", (e) => {
    const file = e.target?.files?.[0] || null;
    if (file) void processBrtLabelFile(file);
  });
  $("btnPickAllFlows")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await withPickingActionLock(["pickAllFbaPdf"], e.currentTarget, savePickingAllFlows);
    renderHomePickingBox();
  });
  $("homePickedHistoryList")?.addEventListener("click", async (e) => {
    const btn = e.target?.closest?.("[data-action='undoPickSku'],[data-action='undoPickFlow']");
    if (!btn) return;
    e.preventDefault();
    const a = btn.dataset.action || "",
      flow = btn.dataset.flowid || "",
      loc = btn.dataset.loc || INVENTORY_CANONICAL_LOC;
    // Gli annullamenti FBA rimettono i pezzi in inventario: chiedo conferma.
    // Gli FBM hanno già la loro conferma dentro la funzione di annullamento.
    if (btn.dataset.kind === "fba") {
      const ok = await uiConfirm({
        title:
          a === "undoPickFlow" ? "Annullare il prelievo del flusso?" : "Annullare il prelievo?",
        tone: "danger",
        rows:
          a === "undoPickFlow"
            ? [["Flusso", btn.dataset.title || flow]]
            : [
                ["Prodotto", btn.dataset.title || ""],
                ["SKU", btn.dataset.sku || ""],
              ],
        note: "I pezzi tornano in inventario e la riga torna da prelevare.",
        confirmLabel: "Annulla prelievo",
        cancelLabel: "Indietro",
      });
      if (!ok) return;
    }
    if (a === "undoPickFlow")
      await withPickingActionLock([a, loc, flow], btn, () => undoPickingFlow(flow, loc));
    else
      await withPickingActionLock([a, loc, flow, btn.dataset.sku || ""], btn, () =>
        undoPickingSku(flow, loc, btn.dataset.sku || ""),
      );
  });
}

// ===== UI: componenti condivisi =====
const ICON = {
  chev: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>',
  pin: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  edit: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h3.5L19 8.5 15.5 5 5 15.5z"/><path d="m13.5 7 3.5 3.5"/></svg>',
  put: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11"/><path d="m7.5 10 4.5 4.5 4.5-4.5"/><path d="M4 17.5h16v3H4z"/></svg>',
  map: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
  check:
    '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  undo: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5 4.5 11 9 15.5"/><path d="M5 11h9.5a5 5 0 0 1 0 10H12"/></svg>',
  qr: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><path d="M7.5 12h9"/></svg>',
  list: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/></svg>',
  upload:
    '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0-4 4m4-4 4 4M5 14v5h14v-5"/></svg>',
  close:
    '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
  back: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>',
};

function uiEmpty(title, body = "") {
  return `<div class="empty"><p class="empty-title">${escapeHtml(title)}</p>${body ? `<p class="empty-text">${escapeHtml(body)}</p>` : ""}</div>`;
}

function uiLotText(lot) {
  const l = normalizeLotId(lot) || LOT_LEGACY_ID;
  if (l === LOT_LEGACY_ID) return "Lotto storico";
  return `Lotto ${lotLabelFromId(l)} del ${lotDateLabelFromId(l)}`;
}

function uiGroupedPositions(parts) {
  const grouped = new Map();
  for (const part of Array.isArray(parts) ? parts : []) {
    const code = normalizeRackLocation(part?.code || "");
    if (!code) continue;
    const prev = grouped.get(code) || { code, qty: 0, hasQty: false };
    const q = Number(part?.qty);
    if (Number.isFinite(q) && q > 0) {
      prev.qty += Math.round(q);
      prev.hasQty = true;
    }
    grouped.set(code, prev);
  }
  return Array.from(grouped.values()).sort((a, b) =>
    String(a.code).localeCompare(String(b.code), "it", { numeric: true, sensitivity: "base" }),
  );
}

function uiLocList(parts, opts = {}) {
  const list = uiGroupedPositions(parts);
  if (!list.length)
    return `<span class="loc-none">${escapeHtml(opts.none || "Nessuna posizione")}</span>`;
  const max = Number(opts.max || 0);
  const shown = max > 0 ? list.slice(0, max) : list;
  return `<span class="locs">${shown
    .map(
      (p) =>
        `<span class="locq">${locationLabelHTML(p.code, { size: opts.size || "md" })}${p.hasQty ? `<span class="locq-n">${escapeHtml(fmtN(p.qty))} pz</span>` : ""}</span>`,
    )
    .join(
      "",
    )}${max > 0 && list.length > max ? `<span class="locs-more">+${list.length - max}</span>` : ""}</span>`;
}

function setNavBadge(kind, n) {
  document.querySelectorAll(`[data-nav-badge="${kind}"]`).forEach((el) => {
    const v = Number(n) || 0;
    el.hidden = !(v > 0);
    if (!el.classList.contains("tab-badge--dot")) el.textContent = v > 99 ? "99+" : String(v);
  });
}

function syncNavBadges() {
  try {
    const p = pickingPreviewState();
    const due = (p.fbm.loaded && p.fbm.count > 0) || (p.fba.loaded && p.fba.count > 0);
    setNavBadge("picking", due ? 1 : 0);
  } catch (_e) {}
}

function syncLiveStatus() {
  const el = $("liveStatus");
  if (!el) return;
  const inv = state.inventory?.[INVENTORY_CANONICAL_LOC];
  let st = "off";
  let text = "";
  if (state.user?.isWhitelisted) {
    if (!inv?.meta?.loaded) {
      st = "loading";
      text = "Caricamento";
    } else if (inv.meta.error) {
      st = "error";
      text = "Non aggiornato";
    } else if (navigator.onLine === false || inv.meta.fromCache) {
      st = "stale";
      text = "Ultimi dati";
    } else {
      st = "live";
      text = "Aggiornato";
    }
  }
  el.dataset.state = st;
  const t = el.querySelector(".live-text");
  if (t && t.textContent !== text) t.textContent = text;
  el.title =
    st === "live"
      ? "Inventario sincronizzato con il cloud"
      : st === "stale"
        ? "Connessione assente: stai vedendo gli ultimi dati ricevuti"
        : st === "error"
          ? "Aggiornamento non disponibile"
          : "";
}

// ===== Navigazione =====
const PICKING_VIEW_TITLES = {
  home: "Home",
  map: "Mappa",
  noLocation: "Da ubicare",
  located: "Ubicati",
  cerea: "Cerea",
  pickingFbm: "Picking",
  pickingFba: "Picking",
  pickingHistory: "Storico prelievi",
  bioneeShop: "Bionee shop",
  notifications: "Notifiche email",
};

// ===== Da ubicare =====
function inventoryReady() {
  return !!state.inventory?.[INVENTORY_CANONICAL_LOC]?.meta?.loaded;
}

// ===== Ubica: QR, mappa o elenco, poi conferma quantità =====
function ubicaAvailability(sku, loc) {
  const it = getProductBySku(loc, sku) || {};
  const qtyByCode = new Map();
  for (const a of readRackAllocationsFromDoc(it || {})) {
    const c = normalizeRackLocation(a?.code || "");
    if (c) qtyByCode.set(c, (qtyByCode.get(c) || 0) + (Math.round(Number(a?.qty) || 0) || 0));
  }
  return (code) => {
    const c = normalizeRackLocation(code);
    if (!RACK_LOCATION_SET.has(c)) return { state: "busy" };
    const already = qtyByCode.has(c) || rackLocationIsUsedBySameLogicalSku(c, sku, loc);
    const occ = rackLocationOccupantInfo(c, sku, loc);
    if (already && !occ) return { state: "same", qty: qtyByCode.get(c) || 0 };
    if (occ) return { state: "busy", occupant: occ.sku };
    return isRackLocationAvailableForItem(c, sku, loc) ? { state: "free" } : { state: "busy" };
  };
}

function ubicaSetPane(pane) {
  const s = __qrRackScanner;
  if (!s?.overlay) return;
  s.pane = pane;
  s.overlay.querySelectorAll("[data-ubica-tab]").forEach((b) => {
    b.setAttribute("aria-selected", b.dataset.ubicaTab === pane ? "true" : "false");
  });
  s.overlay.querySelectorAll("[data-ubica-pane]").forEach((p) => {
    p.hidden = p.dataset.ubicaPane !== pane;
  });
  if (pane === "scan") void qrRackStartCamera();
  else stopQrRackCamera();
  if (pane === "map") {
    const host = s.overlay.querySelector("[data-ubica-map]");
    if (host && !__qrRackScanner.map) {
      __qrRackScanner.map = createWarehouseMap({
        root: host,
        mode: "pick",
        locationCodes: RACK_LOCATION_OPTIONS,
        getSnapshot: pickingWarehouseSnapshot,
        availability: ubicaAvailability(s.sku, s.loc),
        onPick: (code) => confirmQrRackCode(code),
        emptyHint:
          "Tocca una campata: vedrai i posti liberi e quelli già usati da questo prodotto.",
      });
    } else __qrRackScanner.map?.render();
  }
}

function ubicaShowStep(step) {
  const s = __qrRackScanner;
  if (!s?.overlay) return;
  s.overlay.querySelectorAll("[data-ubica-step]").forEach((el) => {
    el.hidden = el.dataset.ubicaStep !== step;
  });
  s.overlay.querySelector(".ubica-body")?.scrollTo?.({ top: 0 });
}

function ubicaRenderConfirm() {
  const s = __qrRackScanner;
  if (!s?.overlay || !s.chosen) return;
  const box = s.overlay.querySelector("[data-ubica-confirm]");
  if (!box) return;
  const cerea = isCereaLocation(s.chosen);
  const av = cerea ? { state: "cerea" } : ubicaAvailability(s.sku, s.loc)(s.chosen);
  const stateText = cerea
    ? "Cerea è temporanea: i pezzi restano anche in Da ubicare."
    : av.state === "same"
      ? av.qty > 0
        ? `Questo posto contiene già ${fmtN(av.qty)} pz dello stesso prodotto: i pezzi si sommano.`
        : "Questo posto è già usato dallo stesso prodotto: i pezzi si sommano."
      : "Posto libero.";
  box.innerHTML = `
    <div class="ubica-where">
      <span class="field-label">Posizione</span>
      ${locationLabelHTML(s.chosen, { size: "xl" })}
      <p class="ubica-state${av.state === "same" ? " is-same" : ""}">${escapeHtml(stateText)}</p>
    </div>
    <label class="dlg-field"><span>Pezzi da mettere in questa posizione</span>
      <div class="stepper">
        <button type="button" class="stepper-btn" data-ubica-step-qty="-1" aria-label="Diminuisci">−</button>
        <input class="stepper-input" data-ubica-qty inputmode="numeric" autocomplete="off" enterkeyhint="done" value="${escapeHtml(String(s.qty))}">
        <button type="button" class="stepper-btn" data-ubica-step-qty="1" aria-label="Aumenta">+</button>
      </div>
    </label>
    <div class="dlg-quick"><button type="button" class="chip" data-ubica-all>Tutti, ${escapeHtml(fmtN(s.assignable))} pz</button></div>
    <p class="ubica-after" data-ubica-after></p>
    <p class="dlg-error" data-ubica-error hidden></p>
    <button class="btn btn--primary btn--lg btn--block" type="button" data-action="ubicaSave"></button>
    <button class="btn btn--ghost btn--block" type="button" data-action="ubicaBack">${ICON.back}<span>Cambia posizione</span></button>`;
  ubicaSyncQty();
}

function ubicaSyncQty() {
  const s = __qrRackScanner;
  if (!s?.overlay) return false;
  const input = s.overlay.querySelector("[data-ubica-qty]");
  const err = s.overlay.querySelector("[data-ubica-error]");
  const after = s.overlay.querySelector("[data-ubica-after]");
  const save = s.overlay.querySelector('[data-action="ubicaSave"]');
  if (!input || !save) return false;
  const t = String(input.value || "").trim();
  const n = /^\d+$/.test(t) ? Number(t) : null;
  let msg = "";
  if (n === null || n <= 0) msg = "Inserisci un numero di pezzi maggiore di zero.";
  else if (n > s.assignable) msg = `Al massimo ${fmtN(s.assignable)} pz.`;
  if (err) {
    err.hidden = !msg;
    err.textContent = msg;
  }
  s.qty = msg ? s.qty : n;
  const cerea = isCereaLocation(s.chosen);
  if (after)
    after.textContent = msg
      ? ""
      : cerea
        ? `Da ubicare resta ${fmtN(s.remaining)} pz, di cui ${fmtN(s.cereaQty + n)} a Cerea.`
        : s.remaining - n > 0
          ? `Dopo restano da ubicare ${fmtN(s.remaining - n)} pz di questo lotto.`
          : "Il lotto sarà tutto ubicato.";
  save.disabled = !!msg;
  save.innerHTML = `${ICON.check}<span>${msg ? "Ubica" : `Ubica ${escapeHtml(fmtN(n))} pz in ${escapeHtml(cerea ? "Cerea" : s.chosen)}`}</span>`;
  return !msg;
}

async function ubicaSave(btn) {
  const s = __qrRackScanner;
  if (!s?.chosen || !ubicaSyncQty()) return;
  const { sku, lot, loc, chosen, qty, returnToSheet } = s;
  state.route.loc = loc;
  state.ui.productDetailsSku = sku;
  state.ui.productDetailsLot = lot;
  const ok = await withPickingActionLock(["ubica", loc, sku], btn, () =>
    saveLocationOnlyFromDetails({ quick: true, rackLocation: chosen, qty, confirmed: true }),
  );
  if (!ok) {
    if (__qrRackScanner === s) ubicaSyncQty();
    return;
  }
  removeQrRackScanner();
  if (returnToSheet) {
    state.ui.productDetailsSku = sku;
    state.ui.productDetailsLot = "";
    renderProductDetailsSheet();
  }
}

// Scelta posto sulla mappa per l'editor di una posizione esistente.
function openMapPicker({ sku, loc, current = "" }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "qrRackOverlay mappick";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Scegli il posto sulla mappa");
    overlay.innerHTML = `<div class="qrRackPanel ubica-panel ubica-panel--map">
        <header class="ubica-head"><div class="ubica-headtext"><h2>Scegli il nuovo posto</h2><p class="meta"><span class="sku">${escapeHtml(sku)}</span>${current ? `<span>Ora in ${escapeHtml(isCereaLocation(current) ? "Cerea" : current)}</span>` : ""}</p></div><button class="icon-btn" type="button" data-close aria-label="Chiudi">${ICON.close}</button></header>
        <div class="ubica-map" data-map></div>
      </div>`;
    let map = null;
    const done = (value) => {
      map?.destroy();
      overlay.remove();
      document.removeEventListener("keydown", onKey, true);
      __unlockBodyIfNone();
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        done(null);
      }
    };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest("[data-close]")) done(null);
    });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    __lockBody();
    map = createWarehouseMap({
      root: overlay.querySelector("[data-map]"),
      mode: "pick",
      locationCodes: RACK_LOCATION_OPTIONS,
      getSnapshot: pickingWarehouseSnapshot,
      availability: ubicaAvailability(sku, loc),
      onPick: (code) => done(code),
      emptyHint: "Tocca una campata per vedere i posti disponibili.",
    });
    const c = parseLocationCode(current);
    if (c) requestAnimationFrame(() => map.select(c.bayCode, { zoom: true, mark: c.code }));
  });
}

// ===== Mappa, Trova e Home =====
let pickingMapView = null;

let pickingFindMap = null;

function pickingWarehouseSnapshot() {
  const inventory = state.inventory[INVENTORY_CANONICAL_LOC];
  const allowed = !!state.user?.isWhitelisted;
  const loaded = !!inventory?.meta?.loaded;
  return {
    userId: allowed ? state.user.uid : null,
    allowed,
    loaded,
    ready: allowed && loaded,
    fromCache: !!inventory?.meta?.fromCache,
    error: inventory?.meta?.error || "",
    online: navigator.onLine !== false,
    preview: state.pickingPreview,
    items:
      allowed && loaded
        ? stockRepresentativeItemsForLoc(INVENTORY_CANONICAL_LOC).map((it) => ({
            sku: toSkuId(it.__rackSourceSku || it.__stockSourceSku || it.sku || it.id),
            displaySku: toSkuId(it.__canonicalSku || it.sku),
            aliases: it.__aliasSkus || [],
            title: parseTitleMeta(it.title || "").main || it.title || it.sku,
            total: stockQtyFromDoc(it),
            allocated: rackAllocatedQtyFromDoc(it),
            cerea: cereaQtyFromDoc(it),
            allocations: readRackAllocationsFromDoc(it).map((a) => ({
              ...a,
              lotLabel: lotLabelFromId(a.lot),
            })),
          }))
        : [],
  };
}

function openProductFromMap({ sku, lot = "", code = "" }) {
  if (!state.user?.isWhitelisted || !getProductBySku(INVENTORY_CANONICAL_LOC, sku)) return;
  state.ui.productDetailsLot = normalizeLotId(lot || "");
  openProductDetailsSheet(sku);
  if (!code) return;
  requestAnimationFrame(() => {
    const row = Array.from(
      $("productDetailsContent")?.querySelectorAll(".rackAllocRow") || [],
    ).find((el) => el.dataset.oldCode === code && (!lot || el.dataset.lot === lot));
    if (row) {
      row.classList.add("is-target");
      row.scrollIntoView({ block: "nearest" });
    }
  });
}

function openMapView({ bay = "", row = "", query = "" } = {}) {
  setPickingHomeView("map");
  requestAnimationFrame(() => {
    if (!pickingMapView) return;
    if (query) pickingMapView.setQuery(query);
    else if (bay) pickingMapView.select(bay, { zoom: true, open: true });
    else if (row) pickingMapView.goToRow(row);
  });
}

function openFindSheet({ codes = [], primary = "", title = "Trova", sub = "" }) {
  const valid = [];
  for (const c of codes) {
    const p = parseLocationCode(c);
    if (p && !valid.includes(p.code)) valid.push(p.code);
  }
  if (!valid.length) {
    showToast("Nessuna posizione", "Non ci sono posizioni da mostrare sulla mappa.", 2200);
    return;
  }
  const t = $("findTitle");
  const s = $("findSub");
  if (t) t.textContent = title || "Trova";
  if (s) s.textContent = sub || (valid.length === 1 ? valid[0] : `${valid.length} posizioni`);
  openSheet("find");
  if (!pickingFindMap)
    pickingFindMap = createWarehouseMap({
      root: $("findMap"),
      mode: "focus",
      locationCodes: RACK_LOCATION_OPTIONS,
      getSnapshot: pickingWarehouseSnapshot,
      onOpenProduct: openProductFromMap,
    });
  const p = parseLocationCode(primary)?.code || valid[0];
  requestAnimationFrame(() => pickingFindMap.focus({ codes: valid, primary: p }));
}

function closeFindSheet() {
  closeSheet("find");
  if (state.ui.sheet === "productDetails") renderProductDetailsSheet();
}

function setupPickingMaps() {
  pickingHomeDashboard = createPickingHomeDashboard({
    root: $("homeOverviewBox"),
    locationCodes: RACK_LOCATION_OPTIONS,
    navigate: setPickingHomeView,
    openMap: openMapView,
    refreshPreview: () => {
      if (state.user?.isWhitelisted)
        schedulePickingPreviewCounts("home_overview", {
          delay: 200,
          includeRemote: true,
          includeFba: true,
        });
    },
    readSnapshot: pickingWarehouseSnapshot,
    openProduct: ({ sku }) => openProductFromMap({ sku }),
  });
  pickingMapView = createWarehouseMap({
    root: $("homeMapBox"),
    mode: "browse",
    locationCodes: RACK_LOCATION_OPTIONS,
    getSnapshot: pickingWarehouseSnapshot,
    onOpenProduct: openProductFromMap,
  });

  // Trova: il comando Firestore verso il Capannone 3D resta quello originale;
  // in più si apre la mappa con tutte le posizioni del prodotto.
  if (typeof openCapannone3dFind === "function" && !openCapannone3dFind.__trovaWrapped) {
    const original = openCapannone3dFind;
    openCapannone3dFind = async function (code, codes, productInfo) {
      const sent = original.apply(this, arguments);
      try {
        const rawList = Array.isArray(codes) ? codes : String(codes || "").split(/[,\s;]+/g);
        const all = [code, ...rawList].map((c) => normalizeRackLocation(c || "")).filter(Boolean);
        if (parseLocationCode(code)) {
          const info = productInfo || {};
          const sku = toSkuId(info.sku || "");
          const name = squashWhitespace(parseTitleMeta(info.title || "").main || info.title || "");
          openFindSheet({
            codes: all,
            primary: code,
            title: name || sku || "Trova",
            sub: [
              sku,
              all.length > 1 ? `${new Set(all).size} posizioni` : normalizeRackLocation(code),
            ]
              .filter(Boolean)
              .join(", "),
          });
        }
      } catch (err) {
        console.warn("trova map", err);
      }
      try {
        return await sent;
      } catch (err) {
        console.warn("openCapannone3dFind (orig)", err);
        return undefined;
      }
    };
    openCapannone3dFind.__trovaWrapped = true;
  }
}

function openFlowOnMap(flowId, loc) {
  const l = loc === "cerea" || loc === "concamarise" ? loc : INVENTORY_CANONICAL_LOC;
  const flow = (state.logs?.[l]?.flows || []).find((f) => String(f.id || "") === String(flowId));
  if (!flow) return showToast("Flusso non trovato", "Riprova tra un attimo.", 2000);
  const codes = [];
  for (const line of pickingUniqueLines(flow)) {
    const sku = toSkuId(line?.sku || "");
    if (!sku || isPickingLinePicked(flow, sku)) continue;
    for (const c of allRackLocationCodesFromPicking(flow, sku))
      if (!codes.includes(c)) codes.push(c);
  }
  codes.sort((a, b) => a.localeCompare(b, "it", { numeric: true }));
  openFindSheet({
    codes,
    primary: codes[0],
    title: flowDisplayName(flow),
    sub: `${codes.length} ${codes.length === 1 ? "posizione" : "posizioni"} da visitare`,
  });
}

function openFbmOnMap() {
  const groups = updateFbmPreviewFromInventory("map_fbm");
  const codes = [];
  for (const g of groups)
    for (const p of g.positions || []) {
      const c = normalizeRackLocation(p?.code || "");
      if (c && !codes.includes(c)) codes.push(c);
    }
  codes.sort((a, b) => a.localeCompare(b, "it", { numeric: true }));
  openFindSheet({
    codes,
    primary: codes[0],
    title: "Picking FBM",
    sub: `${codes.length} ${codes.length === 1 ? "posizione" : "posizioni"} da visitare`,
  });
}

// --- boot ---
setView("home");
bindUI();
initFirebase();

setupPickingMaps();
