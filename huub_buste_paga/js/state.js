export const DEFAULT_BACK_URL = "/tabellone-produzione-live/";

export const COLLECTIONS = {
  USERS: "powderUsers",
  PAYROLL_DIRECTORY: "payrollDirectory",
  PAYROLL_DOCS: "payrollDocs",
  PAYROLL_LOGS: "payrollIngestLogs"
};

export const state = {
  user: null,
  firebase: {
    ok: false,
    app: null,
    auth: null,
    authApi: null,
    db: null,
    api: null,
    storage: null,
    storageApi: null
  },
  ui: {
    error: ""
  },
  payroll: {
    admin: {
      step: "idle",
      lastFlowStep: "idle",
      files: [],
      originalPdfBytes: null,
      sourceFileName: "",
      sourceFileHash: "",
      gemini: { loading: false, error: "", pages: [], docs: [], totalPages: 0 },
      groupedRows: [],
      match: { pages: [], grouped: [], unmatched: [], matchedCount: 0, ambiguousCount: 0, unmatchedCount: 0, conflictPages: [], unassignedPages: [] },
      previewRowKey: "",
      users: [],
      loadingUsers: false,
      sending: false,
      sendSummary: null
    },
    userView: {
      docs: [],
      ready: false,
      error: "",
      selectedMonth: "",
      months: [],
      loading: false,
      emailLower: "",
      searchTerm: "",
      filteredMonths: [],
      currentUrl: ""
    },
    directory: { entries: [], ready: false, unsub: null, suggestions: [], error: "" },
    emailLink: { sending: false, error: "", sentTo: "" }
  }
};

export function resetPayrollState() {
  const prev = state.payroll || {};
  const prevDir = prev.directory || {};
  const prevEmail = prev.emailLink || {};
  const prevUserView = prev.userView || {};
  state.payroll = {
    admin: {
      step: "idle",
      lastFlowStep: prev.admin?.lastFlowStep || "idle",
      files: [],
      originalPdfBytes: null,
      sourceFileName: "",
      sourceFileHash: "",
      gemini: { loading: false, error: "", pages: [], docs: [], totalPages: 0 },
      groupedRows: [],
      match: { pages: [], grouped: [], unmatched: [], matchedCount: 0, ambiguousCount: 0, unmatchedCount: 0, conflictPages: [], unassignedPages: [] },
      previewRowKey: "",
      users: [],
      loadingUsers: false,
      sending: false,
      sendSummary: null
    },
    userView: {
      docs: [],
      ready: false,
      error: "",
      selectedMonth: "",
      months: [],
      loading: false,
      emailLower: prevUserView.emailLower || "",
      searchTerm: prevUserView.searchTerm || "",
      filteredMonths: prevUserView.filteredMonths || [],
      currentUrl: prevUserView.currentUrl || ""
    },
    directory: {
      entries: Array.isArray(prevDir.entries) ? prevDir.entries : [],
      ready: !!prevDir.ready,
      unsub: prevDir.unsub || null,
      suggestions: Array.isArray(prevDir.suggestions) ? prevDir.suggestions : [],
      error: prevDir.error || ""
    },
    emailLink: {
      sending: !!prevEmail.sending,
      error: prevEmail.error || "",
      sentTo: prevEmail.sentTo || ""
    }
  };
}
