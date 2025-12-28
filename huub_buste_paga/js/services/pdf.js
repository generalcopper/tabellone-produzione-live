export async function ensurePdfLib() {
  if (globalThis.PDFLib && globalThis.PDFLib.PDFDocument) return globalThis.PDFLib;
  if (!globalThis.__PAYROLL_PDFLIB_PROMISE__) {
    globalThis.__PAYROLL_PDFLIB_PROMISE__ = (async () => {
      await loadPdfScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js");
      if (!globalThis.PDFLib || !globalThis.PDFLib.PDFDocument) throw new Error("pdf-lib non disponibile");
      return globalThis.PDFLib;
    })();
  }
  return await globalThis.__PAYROLL_PDFLIB_PROMISE__;
}

export async function splitPdf(bytes, pageIndices) {
  const lib = await ensurePdfLib();
  const PDFDocument = lib.PDFDocument;
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  (await out.copyPages(src, pageIndices)).forEach((p) => out.addPage(p));
  return await out.save();
}

function loadPdfScript(src) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.getElementsByTagName("script")).find((s) => s && s.src === src);
    if (existing) {
      if (existing.dataset?.loaded === "1") return resolve();
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      try {
        s.dataset.loaded = "1";
      } catch (_) {}
      resolve();
    };
    s.onerror = () => reject(new Error("Impossibile caricare libreria PDF (pdf-lib)."));
    document.head.appendChild(s);
  });
}
