// Dati di prova per il test di interfaccia: inventario, flussi FBA e ordini Shopify finti,
// più un Firestore in memoria. Sostituisce initFirebase() nella copia caricata dal browser
// di test: nessuna richiesta di rete e nessuna scrittura reale.
// ---- FIXTURE DI TEST (solo QA locale, nessuna rete) ----
const __now = Date.now();
const L = (d) => "LOTTO-" + d;
const __items = [
  {
    sku: "BN-CONC-1L",
    title: "Concime liquido universale 1 L",
    qty: 240,
    stockLots: [
      { lot: L("20261020"), qty: 180, createdAtClient: 1 },
      { lot: L("20261104"), qty: 60, createdAtClient: 2 },
    ],
    rackAllocations: [
      { code: "C02-L1-P1", lot: L("20261020"), qty: 120 },
      { code: "C02-L2-P1", lot: L("20261020"), qty: 60 },
    ],
    cereaAllocations: [{ lot: L("20261104"), qty: 20 }],
    updatedAtClient: __now - 50000,
  },
  {
    sku: "BN-TERR-20",
    title: "Terriccio universale 20 L",
    qty: 50,
    stockLots: [{ lot: L("20261103"), qty: 50 }],
    rackAllocations: [{ code: "G03-L1-P2", lot: L("20261103"), qty: 50 }],
  },
  {
    sku: "BN-POLT-5K",
    title: "Poltiglia bordolese 5 kg",
    qty: 80,
    stockLots: [{ lot: L("20261101"), qty: 80 }],
    updatedAtClient: __now - 10000,
  },
  {
    sku: "BN-NEEM-250",
    title: "Olio di neem 250 ml",
    qty: 420,
    stockLots: [{ lot: L("20260915"), qty: 420 }],
    rackAllocations: [
      { code: "A01-L1-P1", lot: L("20260915"), qty: 200 },
      { code: "A01-L1-P2", lot: L("20260915"), qty: 220 },
    ],
  },
  {
    sku: "BN-SAPO-1L",
    title: "Sapone molle potassico 1 L",
    qty: 300,
    stockLots: [{ lot: L("20261002"), qty: 300 }],
    rackAllocations: [
      { code: "B02-L1-P3", lot: L("20261002"), qty: 150 },
      { code: "B02-L3-P3", lot: L("20261002"), qty: 150 },
    ],
  },
  {
    sku: "BN-RADI-500",
    title: "Stimolante radicale 500 ml",
    qty: 96,
    stockLots: [{ lot: L("20261012"), qty: 96 }],
    rackAllocations: [{ code: "D03-L2-P2", lot: L("20261012"), qty: 96 }],
  },
  {
    sku: "BN-LUMA-1K",
    title: "Antilumache biologico 1 kg",
    qty: 160,
    stockLots: [{ lot: L("20261021"), qty: 160 }],
    rackAllocations: [{ code: "E02-L1-P1", lot: L("20261021"), qty: 100 }],
    updatedAtClient: __now - 30000,
  },
  {
    sku: "BN-ORCH-500",
    title: "Concime per orchidee 500 ml",
    qty: 72,
    stockLots: [{ lot: L("20261028"), qty: 72 }],
    rackAllocations: [{ code: "F01-L3-P2", lot: L("20261028"), qty: 72 }],
  },
  {
    sku: "BN-ZOLF-1K",
    title: "Zolfo bagnabile 1 kg",
    qty: 130,
    stockLots: [{ lot: L("20260901"), qty: 130 }],
    rackAllocations: [{ code: "C00-L1-P1", lot: L("20260901"), qty: 130 }],
  },
  { sku: "BN-RAME-1K", title: "Rame ossicloruro 1 kg", qty: 64, rackLocation: "A03-L2-P1" },
  {
    sku: "BN-BACI-250",
    title: "Bacillus thuringiensis 250 g",
    qty: 45,
    stockLots: [{ lot: L("20261030"), qty: 45 }],
    cereaAllocations: [{ lot: L("20261030"), qty: 45 }],
    updatedAtClient: __now - 20000,
  },
  {
    sku: "BN-TOPO-300",
    title: "Esca topicida in blocchetti 300 g",
    qty: 210,
    stockLots: [{ lot: L("20261015"), qty: 210 }],
    rackAllocations: [
      { code: "D01-L1-P1", lot: L("20261015"), qty: 70 },
      { code: "D01-L1-P2", lot: L("20261015"), qty: 70 },
      { code: "D01-L1-P3", lot: L("20261015"), qty: 70 },
    ],
  },
  {
    sku: "BN-FERR-1K",
    title: "Chelato di ferro 1 kg",
    qty: 88,
    stockLots: [{ lot: L("20261025"), qty: 88 }],
    rackAllocations: [{ code: "A04-L3-P2", lot: L("20261025"), qty: 88 }],
  },
  {
    sku: "BN-ACID-1L",
    title: "Concime per acidofile 1 L",
    qty: 150,
    stockLots: [{ lot: L("20261019"), qty: 150 }],
    rackAllocations: [{ code: "B01-L2-P1", lot: L("20261019"), qty: 150 }],
  },
];
state.user = {
  uid: "fx",
  email: "operatore@example.com",
  emailLower: "operatore@example.com",
  displayName: "Operatore Test",
  isWhitelisted: true,
  isAdmin: true,
  isUser: true,
  role: "admin",
  roles: ["admin"],
};
state.authGateState = "signed_in";
state.inventory.concamarise.meta = { loaded: true, count: __items.length };
state.inventory.concamarise.items = __items;
const __flows = [
  {
    id: "fx-fba-1",
    kind: "scarica",
    location: "concamarise",
    status: "RESERVED",
    reservation: { active: true },
    workflow: { label: "FBA19K3XW7Q2" },
    appliedAtClient: __now - 2 * 3600e3,
    totalPieces: 156,
    lines: [
      { sku: "BN-NEEM-250", qty: 120, title: "Olio di neem 250 ml" },
      { sku: "BN-SAPO-1L", qty: 24 },
      { sku: "BN-ZOLF-1K", qty: 12 },
    ],
    picking: {
      managedByPicking: true,
      pickedLines: {
        "BN-ZOLF-1K": {
          picked: true,
          sku: "BN-ZOLF-1K",
          qty: 12,
          pickedAtClient: __now - 3600e3,
          pickedBy: "operatore@example.com",
        },
      },
    },
  },
  {
    id: "fx-fba-2",
    kind: "scarica",
    location: "concamarise",
    status: "RESERVED",
    reservation: { active: true },
    workflow: { label: "FBA19K3XA1B8" },
    appliedAtClient: __now - 5 * 3600e3,
    totalPieces: 60,
    lines: [
      { sku: "BN-RADI-500", qty: 36 },
      { sku: "BN-TOPO-300", qty: 24 },
    ],
    picking: { managedByPicking: true, pickedLines: {} },
  },
  {
    id: "fx-fba-3",
    kind: "scarica",
    location: "concamarise",
    status: "PICKED",
    reservation: { active: false },
    workflow: { label: "FBA19K2ZZ0P1" },
    appliedAtClient: __now - 26 * 3600e3,
    totalPieces: 40,
    lines: [{ sku: "BN-ACID-1L", qty: 40 }],
    picking: {
      managedByPicking: true,
      flowPicked: true,
      flowPickMode: "flow",
      flowPickedBy: "operatore@example.com",
      pickedLines: {
        "BN-ACID-1L": {
          picked: true,
          sku: "BN-ACID-1L",
          qty: 40,
          pickedAtClient: __now - 20 * 3600e3,
        },
      },
      events: [{ type: "flow" }],
    },
  },
];
state.logs.concamarise.flows = __flows;
state.logs.concamarise.unsub = () => {};
state.logs.concamarise.mode = "full";
state.logs.concamarise.meta = { loaded: true, count: __flows.length, mode: "full" };
__shopifyActiveOrdersState.items = [
  {
    active: true,
    orderId: "gid-1001",
    orderName: "#1042",
    customerName: "Giulia Bianchi",
    orderDetails: {
      createdAtClient: __now - 4e6,
      lineItems: [
        { sku: "BN-ORCH-500", title: "Concime per orchidee 500 ml", quantity: 2 },
        { sku: "BN-FERR-1K", title: "Chelato di ferro 1 kg", quantity: 1 },
      ],
    },
  },
  {
    active: true,
    orderId: "gid-1002",
    orderName: "#1043",
    customerName: "Marco Rossi",
    orderDetails: {
      createdAtClient: __now - 3e6,
      lineItems: [{ sku: "BN-ORCH-500", title: "Concime per orchidee 500 ml", quantity: 1 }],
    },
  },
  {
    active: true,
    orderId: "gid-1003",
    orderName: "#1044",
    customerName: "Elena Verdi",
    orderDetails: {
      createdAtClient: __now - 2e6,
      lineItems: [
        { sku: "BN-LUMA-1K", title: "Antilumache biologico 1 kg", quantity: 3 },
        { sku: "BN-RAME-1K", title: "Rame ossicloruro 1 kg", quantity: 2 },
      ],
    },
  },
];
__shopifyActiveOrdersState.loaded = true;
__shopifyActiveOrdersState.loadedAtClient = __now;
__shopifyActiveOrdersState.syncVersion = __now + 1e10;
state.shopifySync.meta = { lastCheckAtClient: __now - 120000, status: "ok" };
state.pickingPreview.fba = { loaded: true, count: 2 };
document.documentElement.classList.remove("bootCold");
document.getElementById("authOverlay").setAttribute("aria-hidden", "true");
syncPickingMailAuth();
syncHeaderSub();
invalidateInventoryRuntimeCaches("fixture");
window.__t = {
  toggleAuthOverlay: (v) => toggleAuthOverlay(v),
  state,
  navigate: setPickingHomeView,
  find: (...a) => openCapannone3dFind(...a),
  openProduct: openProductDetailsSheet,
  ubica: openQrRackScannerForSku,
  render: () => {
    invalidateInventoryRuntimeCaches("fx");
    renderHomeDashboard();
  },
  openMap: openMapView,
  findSheet: openFindSheet,
  uiConfirm,
  uiQuantity,
};
renderHomeDashboard();
// ---- Firestore finto in memoria: verifica dei percorsi di scrittura senza rete ----
const __store = new Map();
const __clone = (v) => JSON.parse(JSON.stringify(v ?? null));
for (const it of state.inventory.concamarise.items)
  __store.set("amzInventory/concamarise/items/" + it.sku, __clone(it));
for (const fl of state.logs.concamarise.flows)
  __store.set("amzInventory/concamarise/logs/" + fl.id, __clone(fl));
let __auto = 0;
const __ref = (path) => ({ kind: "doc", path, id: path.split("/").pop() });
const __snap = (ref) => {
  const d = __store.get(ref.path);
  return { id: ref.id, ref, exists: () => d !== undefined, data: () => __clone(d) };
};
const __merge = (path, data, merge) => {
  const prev = merge ? __store.get(path) || {} : {};
  const next = { ...prev };
  for (const [k, v] of Object.entries(__clone(data) || {})) {
    if (v && typeof v === "object" && "__inc" in v) next[k] = (Number(prev[k]) || 0) + v.__inc;
    else next[k] = v;
  }
  __store.set(path, next);
};
window.__writes = [];
const __query = (col) => {
  const prefix = (col && col.path ? col.path : "") + "/";
  const docs = [];
  for (const [path, data] of __store) {
    if (!path.startsWith(prefix) || path.slice(prefix.length).includes("/")) continue;
    const r = __ref(path);
    docs.push({ id: r.id, ref: r, exists: () => true, data: () => __clone(data) });
  }
  return {
    empty: !docs.length,
    size: docs.length,
    docs,
    forEach: (fn) => docs.forEach(fn),
    docChanges: () => docs.map((doc) => ({ type: "added", doc })),
    metadata: { fromCache: false },
  };
};
const __api = {
  collection: (db, ...segs) => ({ kind: "col", path: segs.join("/") }),
  collectionGroup: () => ({ kind: "col", path: "*" }),
  doc: (a, ...segs) =>
    a && a.kind === "col"
      ? __ref(a.path + "/" + (segs[0] || "auto" + ++__auto))
      : __ref(segs.join("/")),
  getDoc: async (ref) => __snap(ref),
  getDocFromServer: async (ref) => __snap(ref),
  getDocs: async (q) => __query(q),
  getDocsFromServer: async (q) => __query(q),
  setDoc: async (ref, data, opts) => {
    window.__writes.push(["set", ref.path]);
    __merge(ref.path, data, opts?.merge);
  },
  updateDoc: async (ref, data) => {
    window.__writes.push(["update", ref.path]);
    __merge(ref.path, data, true);
  },
  addDoc: async (col, data) => {
    const r = __ref(col.path + "/auto" + ++__auto);
    __merge(r.path, data, false);
    return r;
  },
  deleteDoc: async (ref) => {
    __store.delete(ref.path);
  },
  serverTimestamp: () => ({ __ts: Date.now() }),
  increment: (n) => ({ __inc: n }),
  arrayUnion: (...a) => a,
  query: (...a) => a[0],
  where: () => null,
  orderBy: () => null,
  limit: () => null,
  onSnapshot: (ref, opts, cb) => {
    if (typeof opts === "function") cb = opts;
    setTimeout(() => {
      if (!cb) return;
      if (ref && ref.kind === "col") cb(__query(ref));
      else
        cb({
          exists: () => false,
          metadata: { fromCache: false },
          data: () => ({}),
          forEach() {},
          docs: [],
          docChanges: () => [],
        });
    }, 10);
    return () => {};
  },
  writeBatch: () => {
    const ops = [];
    return {
      set: (r, d, o) => ops.push(() => __merge(r.path, d, o?.merge)),
      update: (r, d) => ops.push(() => __merge(r.path, d, true)),
      delete: (r) => ops.push(() => __store.delete(r.path)),
      commit: async () => {
        ops.forEach((f) => f());
        window.__writes.push(["batch", ops.length]);
      },
    };
  },
  runTransaction: async (db, fn) => {
    const ops = [];
    const tx = {
      get: async (r) => __snap(r),
      set: (r, d, o) => {
        ops.push(() => __merge(r.path, d, o?.merge));
        return tx;
      },
      update: (r, d) => {
        ops.push(() => __merge(r.path, d, true));
        return tx;
      },
      delete: (r) => {
        ops.push(() => __store.delete(r.path));
        return tx;
      },
    };
    const res = await fn(tx);
    ops.forEach((f) => f());
    window.__writes.push(["tx", ops.length]);
    return res;
  },
};
state.firebase = {
  ok: true,
  auth: { currentUser: { uid: "fx", getIdToken: async () => "x" } },
  db: {},
  api: __api,
};
window.__store = __store;
window.__t.pick = (code) => confirmQrRackCode(code);
window.__t.doc = (sku) => __clone(__store.get("amzInventory/concamarise/items/" + sku));
window.__t.flowDoc = (id) => __clone(__store.get("amzInventory/concamarise/logs/" + id));
window.__t.scanner = () => __qrRackScanner;
window.__t.avail = (sku, loc) => ubicaAvailability(sku, loc);
window.__t.renderSheet = () => renderProductDetailsSheet();
window.__t.setItem = (sku, patch) => {
  const it = state.inventory.concamarise.items.find((x) => x.sku === sku);
  Object.assign(it, patch);
  window.__store.set("amzInventory/concamarise/items/" + sku, JSON.parse(JSON.stringify(it)));
  invalidateInventoryRuntimeCaches("test");
  renderHomeDashboard();
  if (state.ui.sheet === "productDetails") renderProductDetailsSheet();
};
