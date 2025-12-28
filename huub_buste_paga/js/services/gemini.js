import { ensurePdfLib } from "./pdf.js";

const DEFAULT_ENDPOINT = "https://gemini-pdf-extract-537555699968.europe-west1.run.app/extract";

export async function extractPayrollPdf(file, onProgress) {
  if (!file) throw new Error("File PDF mancante");
  const updateProgress = (p, label) => {
    if (typeof onProgress === "function") onProgress(p, label);
  };
  const arrayBuffer = await file.arrayBuffer();
  updateProgress(6, "Preparo PDF…");

  let totalPages = 0;
  try {
    const lib = await ensurePdfLib();
    const srcPdf = await lib.PDFDocument.load(arrayBuffer);
    totalPages = typeof srcPdf.getPageCount === "function" ? srcPdf.getPageCount() : srcPdf?.getPageIndices?.()?.length || 0;
  } catch (_) {
    totalPages = 0;
  }

  let sourceFileHash = "";
  try {
    const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
    sourceFileHash = Array.from(new Uint8Array(digest)).map((v) => v.toString(16).padStart(2, "0")).join("");
  } catch (_) {}

  const endpoint = globalThis.__PAYROLL_EXTRACT_ENDPOINT__ || DEFAULT_ENDPOINT;
  const form = new FormData();
  form.append("file", new Blob([arrayBuffer], { type: "application/pdf" }), file.name || "documento.pdf");

  const uploadWithProgress = (body) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.upload.onprogress = (evt) => {
        if (evt?.lengthComputable) {
          const p = Math.round((evt.loaded / evt.total) * 100);
          updateProgress(p, `Upload ${p}%`);
        } else {
          updateProgress(25, "Upload in corso…");
        }
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        }
      };
      xhr.onerror = () => reject(new Error("Upload fallito"));
      xhr.send(body);
    });

  const raw = await uploadWithProgress(form);
  updateProgress(72, "Elaborazione server…");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    throw new Error("Risposta non valida dal servizio di estrazione");
  }

  const normalizeMonthKey = (val) => {
    const t = String(val || "").trim();
    if (!t) return "";
    if (/^\d{4}-\d{2}$/.test(t)) return t;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t.slice(0, 7);
    const n = t.match(/(20[0-9]{2})\D(\d{1,2})/);
    return n ? `${n[1]}-${String(n[2]).padStart(2, "0")}` : "";
  };

  const normalizePageList = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "number" && Number.isFinite(val)) return [val];
    if (typeof val === "string") {
      const parts = val
        .split(/[,;\s]+/)
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v));
      if (parts.length) return parts;
    }
    return [];
  };

  const toZeroBasedPages = (arr) => {
    const unique = Array.from(new Set((arr || []).map((v) => Number(v)).filter((v) => Number.isFinite(v)).map((v) => Math.round(v))));
    if (!unique.length) return [];
    const hasZero = unique.some((v) => v === 0);
    const min = Math.min(...unique);
    const max = Math.max(...unique);
    const assumeOneBased = !hasZero && min >= 1 && (!totalPages || max <= totalPages);
    return Array.from(new Set(unique.map((v) => (assumeOneBased ? v - 1 : v)))).filter((v) => v >= 0).sort((a, b) => a - b);
  };

  const docs = [];
  const pagesFlat = [];
  const docList = Array.isArray(parsed.documents) ? parsed.documents : [];
  const toCurrency = (val) => {
    const t = Number(val);
    if (!Number.isFinite(t)) return "";
    const n = Math.round(t);
    const s = (n / 100).toFixed(2).replace(".", ",");
    const [i, a] = s.split(",");
    const r = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${r},${a}`;
  };

  for (let idx = 0; idx < docList.length; idx++) {
    const t = docList[idx] || {};
    const rawText = String(t.rawText || t.text || "").trim();
    const fullName = String(t.fullName || "").trim();
    const fiscalCode = String(t.fiscalCode || t.codiceFiscale || t.taxCode || "").replace(/\s+/g, "").toUpperCase();
    const monthKey = normalizeMonthKey(t.documentDate || t.monthKey || "");
    const netPayCents = t.netPayCents ?? null;
    let netPayText = String(t.netPayText || "").trim();
    netPayText || netPayCents === null || (netPayText = toCurrency(netPayCents));
    const pageIndicesRaw = normalizePageList(t.pageNos || t.pageIndices || t.pages || t.pageIndex);
    let pageIndices = toZeroBasedPages(pageIndicesRaw);
    if (!pageIndices.length && Number.isFinite(t.pageIndex)) pageIndices = toZeroBasedPages([t.pageIndex]);
    if (!pageIndices.length) pageIndices = [idx];

    const doc = {
      docIndex: idx,
      rawText,
      confidence: t.confidence ?? null,
      fields: { fullName, monthKey, fiscalCode, netPayText, netPayCents },
      fullName,
      fiscalCode,
      documentDate: monthKey,
      netPayText,
      netPayCents,
      pageIndices,
      pageNosOriginal: pageIndicesRaw
    };
    docs.push(doc);
    pageIndices.forEach((pi) => {
      pagesFlat.push({
        pageIndex: pi,
        rawText,
        confidence: doc.confidence,
        fields: { fullName, monthKey, fiscalCode, netPayText, netPayCents },
        sourceDocIndex: idx
      });
    });
  }

  updateProgress(100, "Analisi completata");
  return {
    docs,
    pages: pagesFlat,
    totalPages,
    sourceFileHash,
    sourceFileName: file.name || "documento.pdf",
    originalPdfBytes: arrayBuffer
  };
}
