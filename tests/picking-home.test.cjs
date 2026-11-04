const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../public/picking.js"), "utf8");
const home = import("../public/picking-home.js");
const map = import("../public/picking-map.js");
const from = source.indexOf("function buildRackLocationOptions(");
const to = source.indexOf("const RACK_LOCATION_OPTIONS", from);
assert.ok(from >= 0 && to > from);
const ctx = vm.createContext({});
vm.runInContext(source.slice(from, to) + "\nglobalThis.codes=buildRackLocationOptions();", ctx);
const codes = Array.from(ctx.codes);

test("Home reconciles partial allocations, lots and temporary Cerea without double counting stock", async () => {
  const { buildHomeModel } = await home;
  const model = buildHomeModel(
    [
      {
        sku: "OWNER",
        displaySku: "SKU",
        total: 100,
        allocated: 60,
        cerea: 25,
        allocations: [
          { code: "C00-L1-P1", lot: "LOT-A", qty: 20 },
          { code: "C00-L1-P1", lot: "LOT-B", qty: 10 },
          { code: "C00-L3-P3", lot: "LOT-A", qty: 30 },
        ],
      },
      { sku: "OTHER", total: 50, allocated: 0, cerea: 50 },
      { sku: "EMPTY", total: 0, allocated: 40, allocations: [{ code: "A01-L1-P1", qty: 40 }] },
    ],
    codes,
  );
  assert.equal(model.stats.total, 150);
  assert.equal(model.stats.allocated, 60);
  assert.equal(model.stats.unallocated, 90);
  assert.equal(model.stats.cerea, 75);
  assert.equal(model.stats.products, 2);
  assert.equal(model.stats.occupied, 2, "two lots in one slot occupy a single position");
  assert.equal(model.positions.get("C00-L1-P1").length, 2);
  assert.equal(model.positions.get("C00-L1-P1")[0].sku, "OWNER");
  assert.equal(model.stats.total, model.stats.allocated + model.stats.unallocated);
  assert.equal(model.rows.get("C").occupied, 2, "row totals follow occupied positions");
  assert.equal(model.rows.get("C").qty, 60);
});

test("a cloud move/removal updates occupancy while preserving stock and returning released pieces to Da ubicare", async () => {
  const { buildHomeModel } = await home;
  const item = {
    sku: "SKU",
    total: 80,
    allocated: 80,
    allocations: [{ code: "A04-L2-P2", qty: 80 }],
  };
  const before = buildHomeModel([item], codes);
  const moved = buildHomeModel([{ ...item, allocations: [{ code: "G03-L1-P2", qty: 80 }] }], codes);
  const removed = buildHomeModel([{ ...item, allocated: 0, allocations: [] }], codes);
  assert.equal(before.positions.get("A04-L2-P2")[0].qty, 80);
  assert.equal(moved.positions.get("A04-L2-P2").length, 0);
  assert.equal(moved.positions.get("G03-L1-P2")[0].qty, 80);
  assert.equal(removed.stats.occupied, 0);
  assert.equal(removed.stats.unallocated, 80);
  assert.equal(removed.stats.total, 80);
});

test("legacy locations stay visible without inventing precise quantities for each slot", async () => {
  const { buildHomeModel } = await home;
  const model = buildHomeModel(
    [
      {
        sku: "LEGACY",
        total: 100,
        allocated: 100,
        allocations: [
          { code: "A01-L1-P1", qty: 100, legacy: true },
          { code: "A01-L1-P2", qty: 0, legacy: true },
        ],
      },
    ],
    codes,
  );
  assert.equal(model.stats.occupied, 2);
  assert.equal(model.positions.get("A01-L1-P1")[0].qty, null);
  assert.equal(model.positions.get("A01-L1-P2")[0].unknown, true);
  assert.equal(model.stats.allocated, 100);
});

test("search locates aliases, accents, lots and exact positions and reports unallocated matches", async () => {
  const { buildHomeModel } = await home;
  const items = [
    {
      sku: "OWNER",
      displaySku: "DISPLAY",
      aliases: ["ALIAS"],
      title: "Caffè biologico",
      total: 50,
      allocated: 30,
      allocations: [{ code: "F00-L3-P2", lot: "LOT-20261104", qty: 30 }],
    },
  ];
  for (const query of ["alias", "caffe", "F00-L3-P2", "20261104", "biologico F00"]) {
    const model = buildHomeModel(items, codes, query);
    assert.equal(model.bays.get("F00").matched, true, query);
    assert.equal(model.bays.get("A01").matched, false, query);
    assert.ok(model.matchedCodes.has("F00-L3-P2"), query);
  }
  const byName = buildHomeModel(items, codes, "caffe");
  assert.equal(byName.unlocatedMatches, 1);
  assert.deepEqual(byName.matchedProducts[0].codes, ["F00-L3-P2"]);
  assert.equal(byName.matchedProducts[0].remaining, 20);
  assert.equal(
    [...buildHomeModel(items, codes, "missing").bays.values()].filter((x) => x.matched).length,
    0,
  );
});

test("map geometry covers every real location: short bays, mirrored rows and ground-only G", async () => {
  const { BAYS, ROWS, parseLocationCode, buildPlanSVG, buildWarehouseModel } = await map;
  for (const code of codes) assert.ok(parseLocationCode(code), "parsable " + code);
  assert.equal(parseLocationCode("G01-L2-P1"), null, "G has no upper levels");
  assert.equal(parseLocationCode("A04-L1-P3"), null, "A04 has two pallets");
  assert.equal(parseLocationCode("Z01-L1-P1"), null);
  for (const bay of BAYS) {
    const expected = bay.pal * ROWS[bay.row].levels;
    assert.equal(codes.filter((c) => c.startsWith(bay.code + "-")).length, expected, bay.code);
  }
  assert.equal(new Set(codes.map((c) => c.split("-")[0])).size, BAYS.length);
  const model = buildWarehouseModel([], codes);
  const plan = buildPlanSVG({ model, mode: "browse", selectedBay: "G03", ready: true });
  const bays = [...plan.matchAll(/data-bay="([A-G]\d{2})"/g)].map((x) => x[1]);
  assert.deepEqual(bays.sort(), [...model.bays.keys()].sort());
  const slots = [...plan.matchAll(/class="pm-slot [^"]+" data-code="([^"]+)"/g)].map((x) => x[1]);
  assert.deepEqual(slots.sort(), [...codes].sort(), "one drawn slot per real position");
  assert.ok(!plan.includes("NaN"));
  assert.ok(plan.includes('aria-pressed="true"'));
});

test("focus and pick modes mark targets and availability without reading the cloud", async () => {
  const { buildPlanSVG, buildBayElevationHTML, buildWarehouseModel } = await map;
  const model = buildWarehouseModel(
    [
      {
        sku: "S",
        title: "P",
        total: 10,
        allocated: 10,
        allocations: [{ code: "C02-L1-P1", qty: 10, lot: "L" }],
      },
    ],
    codes,
  );
  const focus = buildPlanSVG({
    model,
    mode: "focus",
    targets: new Set(["C02-L1-P1"]),
    targetBays: new Set(["C02"]),
    primary: "C02-L1-P1",
    pins: [{ code: "C02-L1-P1", primary: true }],
  });
  assert.ok(focus.includes('data-code="C02-L1-P1" '));
  assert.match(focus, /s-target-primary" data-code="C02-L1-P1"/);
  assert.ok(focus.includes('class="pm-pin is-primary"'));
  const availability = (code) =>
    code === "C02-L1-P1"
      ? { state: "busy", occupant: "S" }
      : code === "C02-L2-P1"
        ? { state: "same", qty: 4 }
        : { state: "free" };
  const elev = buildBayElevationHTML("C02", { model, mode: "pick", availability });
  assert.ok(!elev.includes('data-wm-pick="C02-L1-P1"'), "occupied position is not selectable");
  assert.ok(elev.includes('data-wm-pick="C02-L2-P1"'));
  assert.ok(elev.includes('data-wm-pick="C02-L3-P3"'));
  assert.equal((elev.match(/data-wm-pick=/g) || []).length, 8);
});

test("location labels escape untrusted text and keep the full code for assistive tech", async () => {
  const { locationLabelHTML } = await map;
  assert.ok(locationLabelHTML("C02-L1-P3").includes('aria-label="Posizione C02-L1-P3"'));
  assert.ok(locationLabelHTML("CEREA").includes("Cerea"));
  const odd = locationLabelHTML('<img src=x onerror="1">');
  assert.ok(!odd.includes("<img"));
});
