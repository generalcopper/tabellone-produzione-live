import { state } from "../state.js";
import { openPayrollPdfWindow, getCurrentPayrollUrl, refreshUserPanel } from "./upload.js";

export function initViewerFeature() {
  document.getElementById("btnPayrollOpenPdf")?.addEventListener("click", () => openPayrollPdfWindow());
  document.getElementById("btnPayrollPrint")?.addEventListener("click", () => {
    const url = getCurrentPayrollUrl();
    if (!url) return;
    const win = window.open(url, "_blank");
    try {
      win?.print();
    } catch (_) {}
  });
  document.getElementById("btnPayrollShare")?.addEventListener("click", async () => {
    const url = getCurrentPayrollUrl();
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Busta paga", url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showInlineToast("Link copiato", "URL copiato negli appunti.");
      }
    } catch (_) {
      showInlineToast("Condivisione non riuscita", "Riprovare.");
    }
  });

  document.getElementById("refreshViewer")?.addEventListener("click", () => refreshUserPanel());
}

function showInlineToast(title, body) {
  const banner = document.getElementById("errorBanner");
  if (!banner) return;
  banner.querySelector(".error-title").textContent = title;
  banner.querySelector(".error-body").textContent = body || "";
  banner.classList.add("show");
}

export function setGreeting() {
  const nameFallback = (state.user?.email || "").split("@")[0] || "utente";
  const displayName = (state.user?.displayName || state.user?.name || "").trim() || nameFallback;
  const greet = document.getElementById("welcomeText");
  if (greet) greet.textContent = `Ciao ${displayName} e benvenuto`;
}
