import { initFirebase, watchAuth, signInWithGoogle, signOut, getAccessByEmail } from "./services/firebase.js";
import { state, resetPayrollState, DEFAULT_BACK_URL } from "./state.js";
import { initUploadFeature, onSignedIn as payrollSignedIn, onSignedOut as payrollSignedOut, showAdminUI, getUserDocsCount, getLastElaboration } from "./features/upload.js";
import { initViewerFeature, setGreeting } from "./features/viewer.js";
import { renderDonut } from "./ui/charts.js";

const selectors = {
  gate: document.getElementById("loginCard"),
  loading: document.getElementById("appLoading"),
  dashboard: document.getElementById("dashboard"),
  errorBanner: document.getElementById("errorBanner")
};

function setView(mode) {
  selectors.loading?.classList.toggle("show", mode === "loading");
  selectors.gate?.classList.toggle("show", mode === "login");
  selectors.dashboard?.classList.toggle("show", mode === "dashboard");
}

function setSessionMessage(text) {
  const el = document.getElementById("sessionMessage");
  if (el) el.textContent = text || "";
}

function wireBackButton() {
  document.getElementById("backBtn")?.addEventListener("click", () => {
    if (history.length > 1) {
      history.back();
    } else if (document.referrer) {
      location.href = document.referrer;
    } else {
      location.href = DEFAULT_BACK_URL;
    }
  });
}

function wireLogin() {
  document.getElementById("googleLogin")?.addEventListener("click", async () => {
    selectors.errorBanner?.classList.remove("show");
    try {
      await signInWithGoogle();
    } catch (err) {
      showError("Accesso", err?.message || String(err));
    }
  });
}

function wireLogout() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOut();
  });
}

function showError(title, body) {
  if (!selectors.errorBanner) return;
  selectors.errorBanner.querySelector(".error-title").textContent = title;
  selectors.errorBanner.querySelector(".error-body").textContent = body || "";
  selectors.errorBanner.classList.add("show");
}

function updateSummaryCards() {
  const emailLabel = document.getElementById("summaryEmail");
  const docLabel = document.getElementById("summaryDocs");
  const pagesLabel = document.getElementById("summaryPages");
  const updatedLabel = document.getElementById("summaryUpdated");
  const counts = getUserDocsCount();
  emailLabel && (emailLabel.textContent = state.user?.email || "—");
  docLabel && (docLabel.textContent = counts.docs || 0);
  pagesLabel && (pagesLabel.textContent = counts.pages || 0);
  updatedLabel && (updatedLabel.textContent = getLastElaboration());
  const donut = document.getElementById("statusChart");
  renderDonut(donut, { matched: counts.docs, unmatched: Math.max(0, counts.pages - counts.docs) });
}

async function handleAuthState(user) {
  if (!user) {
    state.user = null;
    resetPayrollState();
    setView("login");
    setSessionMessage("Sessione scaduta, accedi di nuovo");
    payrollSignedOut();
    return;
  }
  setView("loading");
  const access = await getAccessByEmail(user.email || "");
  if (!access || access.enabled === false) {
    await signOut().catch(() => {});
    setView("login");
    setSessionMessage(access && access.enabled === false ? "Accesso disabilitato." : "Email non presente in elenco autorizzati.");
    return;
  }
  const displayName = user.displayName || access?.displayName || user.email || "";
  state.user = {
    uid: user.uid,
    displayName,
    email: user.email || "",
    emailLower: String(user.email || "").toLowerCase(),
    isAdmin: Boolean(access && access.isAdmin)
  };
  setGreeting();
  setSessionMessage("Sessione attiva");
  showAdminUI(state.user.isAdmin);
  await payrollSignedIn();
  setView("dashboard");
  updateSummaryCards();
}

async function bootstrap() {
  setView("loading");
  wireBackButton();
  wireLogin();
  wireLogout();
  initUploadFeature();
  initViewerFeature();
  await initFirebase();
  watchAuth(handleAuthState);
}

bootstrap().catch((err) => {
  console.error(err);
  showError("Avvio", err?.message || String(err));
  setView("login");
});
