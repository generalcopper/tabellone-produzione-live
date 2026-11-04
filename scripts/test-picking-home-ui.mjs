// Test di integrazione nel browser sul vero picking.html, con dati di prova e Firestore in memoria.
// Tutte le richieste di rete sono intercettate: nessuna lettura o scrittura di produzione.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = resolve(process.env.PICKING_PUBLIC_ROOT || "public");
const origin = "https://tabellone-produzione-liv-e313e.firebaseapp.com";
const html = await readFile(root + "/picking.html", "utf8");
let main = await readFile(root + "/picking.js", "utf8");
const startup = /^[ \t]*initFirebase\(\);/m;
assert.ok(startup.test(main));
main = main.replace(startup, await readFile("tests/fixtures/picking-ui-fixture.js", "utf8"));
const channel = process.env.PICKING_UI_CHANNEL ?? "chrome";
const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
let requests = 0;
const passed = [];
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      serviceWorkers: "block",
      hasTouch: width < 900,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", async (route) => {
      requests++;
      const url = new URL(route.request().url());
      if (url.origin !== origin)
        return route.fulfill({ status: 200, contentType: "text/plain", body: "" });
      const file = resolve(root, "." + url.pathname);
      assert.ok(file.startsWith(root + "/"));
      try {
        return route.fulfill({
          status: 200,
          contentType:
            {
              ".html": "text/html",
              ".js": "text/javascript",
              ".css": "text/css",
              ".png": "image/png",
            }[extname(file)] || "application/octet-stream",
          body: file.endsWith("/picking.html")
            ? html
            : file.endsWith("/picking.js")
              ? main
              : await readFile(file),
        });
      } catch {
        return route.fulfill({ status: 404, body: "" });
      }
    });
    await page.goto(origin + "/picking.html");
    await page.waitForFunction(() => window.__t?.pick);
    const toast = () => page.locator("#toastTitle").innerText();
    const noOverflow = async (label) =>
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `no horizontal overflow: ${label} at ${width}`,
      );

    // Home: numeri coerenti con i dati e pianta completa
    await page.locator("#phTotal").filter({ hasText: "2105" }).waitFor();
    assert.equal(await page.locator("#phUnlocated").innerText(), "245 pz");
    assert.equal(await page.locator("#phMap [data-bay]").count(), 27);
    await noOverflow("home");

    // Mappa: campata, prospetto, ricerca
    await page.evaluate(() => __t.openMap({ bay: "C02" }));
    await page.locator("#homeMapBox .wm-bay-head h3").filter({ hasText: "Campata C02" }).waitFor();
    assert.equal(await page.locator("#homeMapBox .wm-cell").count(), 9);
    assert.equal(await page.locator('#homeMapBox [data-cell="C02-L1-P1"] .wm-entry').count(), 1);
    await page.locator("#homeMapBox [data-wm-q]").fill("neem");
    await page.locator("#homeMapBox .wm-result").first().waitFor();
    assert.equal(await page.locator("#homeMapBox .wm-result").count(), 2);
    await noOverflow("map");

    // Ubica: posto dalla mappa, quantità parziale, salvataggio
    await page.evaluate(() => __t.navigate("noLocation"));
    await page
      .locator('#homeNoLocationList [data-action="ubicaItem"][data-sku="BN-POLT-5K"]')
      .click();
    await page.locator('[data-ubica-tab="map"]').click();
    await page.evaluate(() => __t.scanner().map.select("C02", { zoom: true }));
    assert.equal(await page.locator('.qrRackOverlay [data-wm-pick="C02-L1-P1"]').count(), 0);
    await page.locator('.qrRackOverlay [data-wm-pick="C02-L3-P2"]').click();
    await page.locator("[data-ubica-qty]").fill("50");
    await page.locator('[data-action="ubicaSave"]').click();
    await page.locator(".qrRackOverlay").waitFor({ state: "detached" });
    assert.equal(await toast(), "Ubicazione salvata");
    const placed = await page.evaluate(() => __t.doc("BN-POLT-5K").rackAllocations);
    assert.ok(placed.some((a) => a.code === "C02-L3-P2" && a.qty === 50));

    // Lotto ubicato da un altro operatore mentre la conferma è aperta: nessuna scrittura
    await page
      .locator('#homeNoLocationList [data-action="ubicaItem"][data-sku="BN-BACI-250"]')
      .click();
    await page.evaluate(() => __t.pick("C02-L3-P3"));
    await page.locator("[data-ubica-qty]").fill("20");
    await page.evaluate(() =>
      __t.setItem("BN-BACI-250", {
        rackAllocations: [{ code: "C04-L1-P1", lot: "LOTTO-20261030", qty: 45 }],
        cereaAllocations: [],
      }),
    );
    const writesBeforeStale = await page.evaluate(() => window.__writes.length);
    await page.locator('[data-action="ubicaSave"]').click();
    await page.locator("#toastTitle").filter({ hasText: "Lotto già ubicato" }).waitFor();
    assert.equal(await page.evaluate(() => window.__writes.length), writesBeforeStale);
    assert.deepEqual(
      (await page.evaluate(() => __t.doc("BN-BACI-250").rackAllocations)).map((a) => a.code),
      ["C04-L1-P1"],
    );
    await page.locator('[data-action="qrRackClose"]').click();

    // Scheda prodotto: stessi controlli di modifica e rimozione per ogni posizione
    await page.evaluate(() => __t.openProduct("BN-CONC-1L"));
    await page.locator("#sheetProductDetails.show").waitFor();
    assert.equal(await page.locator('[data-action="pdSaveRackAlloc"]').count(), 3);
    assert.equal(await page.locator('[data-action="pdDeleteRackAlloc"]').count(), 3);
    const row = page.locator('#productDetailsContent .rackAllocRow[data-old-code="C02-L1-P1"]');
    await row.locator("summary").click();
    await row.locator('[data-field="allocRackLocation"]').selectOption("C03-L1-P1");
    await row.locator('[data-action="pdSaveRackAlloc"]').click();
    await page.locator("dialog.dlg [data-dlg-ok]").click();
    await page.waitForFunction(() =>
      __t.doc("BN-CONC-1L").rackAllocations.some((a) => a.code === "C03-L1-P1"),
    );
    // Un aggiornamento dal cloud aggiorna anche i campi aperti ma non modificati
    const openRow = page.locator('#productDetailsContent .rackAllocRow[data-old-code="C02-L2-P1"]');
    await openRow.locator("summary").click();
    await page.evaluate(() =>
      __t.setItem("BN-CONC-1L", {
        rackAllocations: __t
          .doc("BN-CONC-1L")
          .rackAllocations.map((a) => (a.code === "C02-L2-P1" ? { ...a, qty: 40 } : a)),
      }),
    );
    assert.equal(
      await page
        .locator(
          '#productDetailsContent .rackAllocRow[data-old-code="C02-L2-P1"] [data-field="allocQty"]',
        )
        .inputValue(),
      "40",
    );
    const writes = await page.evaluate(() => window.__writes.length);
    const row2 = page.locator('#productDetailsContent .rackAllocRow[data-old-code="C02-L2-P1"]');
    await row2.locator('[data-action="pdDeleteRackAlloc"]').click();
    await page.locator("dialog.dlg [data-dlg-cancel]").click();
    await page.locator("dialog.dlg").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => window.__writes.length), writes, "Annulla non scrive");
    await page.locator("#btnCloseProductDetails").click();

    // Picking FBA: prelievo SKU e annullamento dallo storico
    await page.evaluate(() => __t.navigate("pickingFba"));
    const before = await page.evaluate(() => __t.doc("BN-RADI-500").qty);
    await page.locator('[data-action="pickSku"][data-sku="BN-RADI-500"]').click();
    await page.waitForFunction(() =>
      /prelevato/i.test(document.getElementById("toastTitle").textContent),
    );
    assert.equal(await page.evaluate(() => __t.doc("BN-RADI-500").qty), before - 36);
    await noOverflow("picking");
    await page.evaluate(() => __t.navigate("pickingHistory"));
    await page.locator('[data-action="undoPickSku"][data-sku="BN-RADI-500"]').click();
    await page.locator("dialog.dlg [data-dlg-ok]").click();
    await page.waitForFunction((q) => __t.doc("BN-RADI-500").qty === q, before);

    // Trova: mappa con tutte le posizioni del prodotto
    await page.evaluate(() => __t.navigate("located"));
    await page
      .locator('#homeLocatedList .item:has-text("BN-NEEM-250") [data-action="findPallet"]')
      .click();
    await page.locator("#sheetFind.show").waitFor();
    assert.equal(await page.locator("#findMap .wm-chip").count(), 2);
    assert.equal(await page.locator("#findMap .pm-pin").count(), 2);
    await page.locator("[data-close-find]").click();

    // Dati sconosciuti o uscita: mai un magazzino vuoto fuorviante
    await page.evaluate(() => {
      __t.state.inventory.concamarise.meta.loaded = false;
      __t.render();
    });
    await page.waitForFunction(() => document.querySelector("#phTotal").textContent === "—");
    await page.evaluate(() => {
      __t.state.inventory.concamarise.meta.loaded = true;
      __t.state.user = null;
      __t.render();
    });
    await page.waitForFunction(() => document.querySelector("#phTotal").textContent === "—");
    assert.deepEqual(errors, [], "runtime errors at " + width);
    passed.push(width);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(
  JSON.stringify({
    passed: true,
    widths: passed,
    interceptedRequests: requests,
    productionWrites: 0,
  }),
);
