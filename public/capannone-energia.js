
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const ENDPOINT = "https://cedoly-crm-prod.web.app/v1/tabellone/power";
const CONTRACT_WATTS = 10000;
const MAX_AGE_MS = 30000;
const kw = value => value === null ? "—" : new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 1000);

// Same contract, freshness checks and continuous colour progression as LG Control Center.
export function powerState(reading, now = Date.now()) {
  const age = reading ? now - Date.parse(reading.observedAt) : Infinity;
  const fresh = !!reading && reading.coverage === "site-total" && Number.isFinite(reading.gridWatts)
    && Math.abs(reading.gridWatts) <= 100000 && age >= -5000 && age <= MAX_AGE_MS;
  if (!fresh) return { fresh: false, watts: null, available: null, excess: null, percent: null, hue: null, band: "unknown", exporting: false };
  const used = Math.max(0, reading.gridWatts), percent = used * 100 / CONTRACT_WATTS;
  const hue = percent <= 60 ? 150 : percent <= 80 ? 150 - (percent - 60) * 5.25 : percent <= 95 ? 45 - (percent - 80) * 3 : 0;
  return { fresh: true, watts: Math.abs(reading.gridWatts), available: Math.max(0, CONTRACT_WATTS - used),
    excess: Math.max(0, used - CONTRACT_WATTS), percent, hue,
    band: percent >= 95 ? "critical" : percent >= 80 ? "high" : "normal", exporting: reading.gridWatts < 0 };
}

export function mountCapannoneEnergy(auth) {
  const panel = document.getElementById("capEnergy");
  if (!panel || panel.dataset.mounted === "true") return;
  panel.dataset.mounted = "true";
  const el = name => document.getElementById("capEnergy" + name);
  let telemetry = { state: "unavailable", reading: null };
  let user = null, epoch = 0, pending = false, controller = null, stopped = false;

  function render() {
    const p = powerState(telemetry.reading), over = (p.excess ?? 0) > 0;
    panel.className = "cap-energy " + p.band;
    if (p.fresh) panel.style.setProperty("--energy-color", "hsl(" + p.hue + " 88% 58%)");
    else panel.style.removeProperty("--energy-color");
    const time = p.fresh ? new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(telemetry.reading.observedAt)) : null;
    const status = !p.fresh ? telemetry.state === "mapping_required" ? "Totale da confermare" : telemetry.reading ? "Lettura non aggiornata" : "Lettura non disponibile"
      : over ? "Oltre il contratto" : p.band === "critical" ? "Margine ridotto" : p.band === "high" ? "Carico elevato" : "Margine disponibile";
    el("Status").textContent = status + (time ? " · " + time : "");
    el("Percent").textContent = p.percent === null ? "—" : new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(p.percent) + "%";
    el("Fill").hidden = !p.fresh;
    el("Fill").style.width = p.fresh ? Math.min(100, p.percent) + "%" : "0%";
    el("Used").textContent = kw(p.watts);
    el("Available").textContent = kw(over ? p.excess : p.available);
    el("UsedLabel").textContent = p.exporting ? "IMMESSI" : "UTILIZZATI";
    el("AvailableLabel").textContent = over ? "OLTRE IL CONTRATTO" : "DISPONIBILI";
    el("Gauge").setAttribute("aria-label", p.fresh
      ? (p.exporting ? "Immissione " : "Prelievo ") + kw(p.watts) + " kW; " + (over ? "oltre il contratto " + kw(p.excess) : "margine " + kw(p.available)) + " kW; contratto 10 kW; lettura " + time
      : "Potenza non disponibile; contratto 10 kW");
  }

  async function poll() {
    if (stopped || pending || !user || document.visibilityState === "hidden") return;
    const current = user, generation = epoch;
    pending = true;
    const abort = new AbortController();
    controller = abort;
    const timeout = setTimeout(() => abort.abort(), 8000);
    try {
      const token = await current.getIdToken();
      if (generation !== epoch || stopped) return;
      const response = await fetch(ENDPOINT, { headers: { Authorization: "Bearer " + token }, cache: "no-store",
        credentials: "omit", redirect: "error", signal: abort.signal });
      if (!response.ok) throw Error("power_unavailable");
      const next = await response.json();
      if (generation === epoch && auth.currentUser?.uid === current.uid && !stopped) {
        telemetry = next && typeof next === "object" ? next : { state: "unavailable", reading: null };
        render();
      }
    } catch {
      if (generation === epoch && !stopped) { telemetry = { state: "unavailable", reading: null }; render(); }
    } finally {
      clearTimeout(timeout);
      pending = false;
      if (controller === abort) controller = null;
      if (generation !== epoch && !stopped) void poll();
    }
  }

  render();
  const unsubscribe = onAuthStateChanged(auth, next => {
    epoch++; controller?.abort(); user = next;
    telemetry = { state: "unavailable", reading: null }; render();
    if (next) void poll();
  });
  const pollTimer = setInterval(() => void poll(), 5000);
  const ageTimer = setInterval(() => { if (document.visibilityState !== "hidden") render(); }, 1000);
  const onVisible = () => { render(); if (document.visibilityState === "visible") void poll(); };
  document.addEventListener("visibilitychange", onVisible);
  const onPageShow = event => { if (event.persisted) { render(); void poll(); } };
  window.addEventListener("pageshow", onPageShow);
  return () => {
    stopped = true; epoch++; controller?.abort(); unsubscribe();
    clearInterval(pollTimer); clearInterval(ageTimer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", onPageShow);
  };
}
