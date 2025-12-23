import { test, expect } from "@playwright/test";

const PAGE_PATH = "/";

test.describe("Hub linea polveri (GitHub Pages)", () => {
  test("carica senza errori, mostra stato online e ordini conclusi, conclude riga mock", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Stubs to keep flow simple in CI
    await page.addInitScript(() => {
      (window as any).openSignModal = (_ctx: any, cb: (sig: string) => void) => cb("data:image/png;base64,stub");
      (window as any).speak = () => {};
    });

    await page.goto(PAGE_PATH, { waitUntil: "networkidle" });

    // Fail if any console error surfaced
    expect(errors, `Console errors: ${errors.join("\n")}`).toHaveLength(0);

    // Stato online badge
    const onlinePill = page.locator("#pillOnline");
    await expect(onlinePill).toBeVisible();

    // Sezione ordini conclusi
    const completedCard = page.locator("#completedCard");
    await expect(completedCard).toBeVisible();

    // Mock state and conclude a production: ensure row disappears
    await page.evaluate(() => {
      (window as any).state = (window as any).state || {};
      const st = (window as any).state;
      st.user = { uid: "test", fullName: "Tester", isAdmin: true };
      st.powderOrders = [
        {
          customer: "Cliente Demo",
          number: "999",
          conclusion: "oggi",
          lines: [{ lineKey: "l1", desc: "Prodotto Demo", qty: 1, um: "pz" }],
          totalKg: 0,
        },
      ];
      st.activeProductions = [
        {
          id: "p1",
          operator: "Tester",
          operatorUid: "test",
          customer: "Cliente Demo",
          orderNo: "999",
          selectedLineKeys: ["l1"],
          startedAt: new Date().toISOString(),
          totalKg: 0,
          active: true,
        },
      ];
      (window as any).renderHome?.();
    });

    await page.evaluate(() => (window as any).openRunningModal?.());
    const runningItem = page.locator("#runList .item").first();
    await expect(runningItem).toBeVisible();
    await runningItem.click();

    // Conclude
    const concludeBtn = page.locator("#btnConclude");
    await expect(concludeBtn).toBeVisible();
    await concludeBtn.click();

    // After conclude, the running list should be empty
    await expect(page.locator("#runList .item")).toHaveCount(0);
  });
});
