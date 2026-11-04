// Finestre di conferma e inserimento quantità al posto di confirm()/prompt() del browser.
// Restituiscono Promise con lo stesso significato delle API native (true/false, testo/null),
// così le transazioni cloud esistenti restano invariate.

const html = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );

function rowsHTML(rows) {
  const list = (rows || []).filter((r) => r && r[1] !== undefined && r[1] !== null && r[1] !== "");
  if (!list.length) return "";
  return `<dl class="dlg-rows">${list
    .map(
      ([label, value, raw]) =>
        `<div><dt>${html(label)}</dt><dd>${raw ? value : html(value)}</dd></div>`,
    )
    .join("")}</dl>`;
}

function open(markup, setup) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "dlg";
    dialog.innerHTML = markup;
    let result = setup.cancelValue;
    const finish = (value) => {
      result = value;
      if (dialog.open) dialog.close();
    };
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      finish(setup.cancelValue);
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) finish(setup.cancelValue);
      if (e.target.closest?.("[data-dlg-cancel]")) finish(setup.cancelValue);
    });
    dialog.addEventListener("keydown", (e) => e.stopPropagation());
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        document.documentElement.classList.remove("dlg-open");
        resolve(result);
      },
      { once: true },
    );
    document.body.appendChild(dialog);
    document.documentElement.classList.add("dlg-open");
    setup.bind?.(dialog, finish);
    dialog.showModal();
    setup.focus?.(dialog);
  });
}

export function uiConfirm(opts = {}) {
  const o = typeof opts === "string" ? { message: opts } : opts;
  const tone = o.tone || "primary";
  const markup = `<form method="dialog" class="dlg-card" data-tone="${tone}">
      <div class="dlg-grip" aria-hidden="true"></div>
      <h2 class="dlg-title">${html(o.title || "Confermi?")}</h2>
      ${o.message ? `<p class="dlg-text">${html(o.message)}</p>` : ""}
      ${o.lead ? `<div class="dlg-lead">${o.lead}</div>` : ""}
      ${rowsHTML(o.rows)}
      ${o.note ? `<p class="dlg-note${o.noteTone ? " is-" + o.noteTone : ""}">${html(o.note)}</p>` : ""}
      <div class="dlg-actions">
        <button type="button" class="btn btn--ghost" data-dlg-cancel>${html(o.cancelLabel || "Annulla")}</button>
        <button type="submit" class="btn btn--${tone === "danger" ? "danger" : tone === "warning" ? "warning" : "primary"}" data-dlg-ok>${html(o.confirmLabel || "Conferma")}</button>
      </div>
    </form>`;
  return open(markup, {
    cancelValue: false,
    bind(dialog, finish) {
      dialog.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        finish(true);
      });
    },
    focus(dialog) {
      dialog.querySelector("[data-dlg-ok]")?.focus();
    },
  });
}

// Inserimento di una quantità intera. Restituisce la stringa digitata (come prompt) o null.
export function uiQuantity(opts = {}) {
  const max = Number.isFinite(Number(opts.max)) ? Math.round(Number(opts.max)) : null;
  const min = Number.isFinite(Number(opts.min)) ? Math.round(Number(opts.min)) : 0;
  const value = opts.value ?? max ?? "";
  const quick = (opts.quick || []).filter((q) => q && Number.isFinite(Number(q.value)));
  const markup = `<form method="dialog" class="dlg-card" data-tone="primary" novalidate>
      <div class="dlg-grip" aria-hidden="true"></div>
      <h2 class="dlg-title">${html(opts.title || "Quantità")}</h2>
      ${opts.message ? `<p class="dlg-text">${html(opts.message)}</p>` : ""}
      ${rowsHTML(opts.rows)}
      <label class="dlg-field"><span>${html(opts.label || "Pezzi")}</span>
        <div class="stepper">
          <button type="button" class="stepper-btn" data-step="-1" aria-label="Diminuisci">−</button>
          <input class="stepper-input" data-dlg-input inputmode="numeric" autocomplete="off" enterkeyhint="done" value="${html(String(value))}" aria-describedby="dlgHelp">
          <button type="button" class="stepper-btn" data-step="1" aria-label="Aumenta">+</button>
        </div>
      </label>
      ${quick.length ? `<div class="dlg-quick">${quick.map((q) => `<button type="button" class="chip" data-quick="${html(String(q.value))}">${html(q.label)}</button>`).join("")}</div>` : ""}
      <p class="dlg-help" id="dlgHelp">${html(opts.help || (max !== null ? `Da ${min} a ${max} pz.` : "Numero intero."))}</p>
      <p class="dlg-error" data-dlg-error hidden></p>
      ${opts.note ? `<p class="dlg-note">${html(opts.note)}</p>` : ""}
      <div class="dlg-actions">
        <button type="button" class="btn btn--ghost" data-dlg-cancel>${html(opts.cancelLabel || "Annulla")}</button>
        <button type="submit" class="btn btn--primary" data-dlg-ok>${html(opts.confirmLabel || "Conferma")}</button>
      </div>
    </form>`;
  return open(markup, {
    cancelValue: null,
    bind(dialog, finish) {
      const input = dialog.querySelector("[data-dlg-input]");
      const err = dialog.querySelector("[data-dlg-error]");
      const ok = dialog.querySelector("[data-dlg-ok]");
      const parse = () => {
        const t = String(input.value || "").trim();
        if (!/^\d+$/.test(t)) return null;
        return Number(t);
      };
      const validate = () => {
        const n = parse();
        let msg = "";
        if (n === null) msg = "Inserisci un numero intero.";
        else if (n < min) msg = `Il minimo è ${min}.`;
        else if (max !== null && n > max) msg = `Il massimo è ${max}.`;
        err.hidden = !msg;
        err.textContent = msg;
        ok.disabled = !!msg;
        return !msg;
      };
      dialog.addEventListener("click", (e) => {
        const s = e.target.closest?.("[data-step]");
        if (s) {
          const n = parse() ?? min;
          let next = n + Number(s.dataset.step);
          if (max !== null) next = Math.min(max, next);
          input.value = String(Math.max(min, next));
          validate();
        }
        const q = e.target.closest?.("[data-quick]");
        if (q) {
          input.value = q.dataset.quick;
          validate();
        }
      });
      input.addEventListener("input", validate);
      dialog.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        if (!validate()) return;
        finish(String(parse()));
      });
      validate();
    },
    focus(dialog) {
      const input = dialog.querySelector("[data-dlg-input]");
      input?.focus();
      input?.select();
    },
  });
}
