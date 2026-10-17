// Generated from cedoly-crm/apps/control-center-web/src/amazon-finance.tsx
export function createAmazonFinance(React){
const {useEffect,useMemo,useRef,useState}=React;
const money = (v, c = "EUR") => v == null ? "—" : new Intl.NumberFormat("it-IT", {
	style: "currency",
	currency: c
}).format(v);
const num = (v, d = 0) => v == null ? "—" : new Intl.NumberFormat("it-IT", { maximumFractionDigits: d }).format(v);
const at = (s) => s ? new Intl.DateTimeFormat("it-IT", {
	timeZone: "Europe/Rome",
	day: "2-digit",
	month: "2-digit",
	hour: "2-digit",
	minute: "2-digit"
}).format(new Date(s)) : "in attesa";
const states = {
	waiting: "Da acquisire",
	requested: "In preparazione",
	available: "File acquisito",
	unavailable: "Da verificare",
	review: "File da verificare"
};
const costMap = [
	[
		"Commissioni di vendita e gestione FBA",
		"Pagamenti · Transazioni",
		"Importi contabilizzati, con eventuali storni. Anteprima commissioni solo per il confronto."
	],
	[
		"Stoccaggio mensile e utilizzo dello spazio",
		"Pagamenti + Stoccaggio mensile",
		"L’addebito può arrivare il mese successivo. La previsione non è un costo definitivo."
	],
	[
		"Inventario vecchio e supplementi",
		"Pagamenti + Supplemento inventario vecchio",
		"Dettaglio per età e SKU; le previsioni restano separate dagli addebiti."
	],
	[
		"Rimozioni, smaltimenti e liquidazioni",
		"Pagamenti + Rimozioni + Spedizioni rimozioni",
		"Separare richiesta, esecuzione e addebito. Il ricavo da liquidazione è distinto dalla tariffa."
	],
	[
		"Resi, rimborso cliente e rimborso FBA",
		"Pagamenti + Resi clienti + Rimborsi FBA",
		"Rimborso, tariffa, storno e recupero in merce sono eventi diversi."
	],
	[
		"Trasporto verso FBA, preparazione ed etichette",
		"Pagamenti + fatture del fornitore",
		"I trasporti esterni e i costi interni non sono necessariamente nei report Amazon."
	],
	[
		"Supplementi stagionali, carburante, scorte basse e servizio transfrontaliero",
		"Pagamenti + dettaglio tariffe applicabili",
		"Possono essere inclusi nella tariffa FBA: non aggiungerli nuovamente."
	],
	[
		"Abbonamento, coupon, offerte, Vine e altri servizi",
		"Pagamenti + fatture Amazon",
		"Costi del canale distinti dalla logistica FBA; tutte le voci restano visibili."
	],
	[
		"Imposte sulle vendite e sui servizi",
		"Transazioni IVA + fatture Amazon",
		"Aliquote e paese per transazione. IVA da versare e imposte sul reddito richiedono la contabilità."
	]
];
function AmazonFinanceDialog({ data, close, now = Date.now() }) {
	const ref = useRef(null), [tab, setTab] = useState("summary"), [month, setMonth] = useState(new Intl.DateTimeFormat("sv-SE", {
		timeZone: "Europe/Rome",
		year: "numeric",
		month: "2-digit"
	}).format(now).slice(0, 7)), [query, setQuery] = useState(""), [filter, setFilter] = useState("all");
	useEffect(() => {
		const previous = document.activeElement;
		ref.current?.showModal();
		return () => {
			if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
		};
	}, []);
	const inventory = data?.inventory, skus = inventory?.skus ?? [], ledger = data?.ledgers.find((l) => l.periodStart.startsWith(month)), vat = data?.details.find((r) => r.id === "VAT_TRANSACTION" && r.period === month);
	const months = [...new Set([new Intl.DateTimeFormat("sv-SE", {
		timeZone: "Europe/Rome",
		year: "numeric",
		month: "2-digit"
	}).format(now), ...data?.reports.map((r) => r.period.slice(0, 7)).filter((v) => /^\d{4}-\d\d$/.test(v)) ?? []])].sort().reverse();
	const partialTotal = (key) => {
		const known = skus.filter((r) => r.marketplace === "IT" && r.currency === "EUR" && r[key] !== null);
		return {
			value: known.length ? known.reduce((n, r) => n + (r[key] ?? 0), 0) : null,
			known: known.length
		};
	};
	const aged = partialTotal("agedEstimate"), excess = partialTotal("excess"), unsellable = partialTotal("unfulfillable");
	const visible = useMemo(() => skus.filter((r) => (r.title + " " + r.sku + " " + r.asin).toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (filter === "all" || filter === "aged" && (r.agedEstimate ?? 0) > 0 || filter === "excess" && (r.excess ?? 0) > 0 || filter === "flags" && r.flags.length > 0)).sort((a, b) => Number(b.flags.some((f) => f.includes("anomalo"))) - Number(a.flags.some((f) => f.includes("anomalo"))) || (b.agedEstimate ?? 0) - (a.agedEstimate ?? 0) || (b.excess ?? 0) - (a.excess ?? 0)), [
		skus,
		query,
		filter
	]);
	const stale = !!data && now - Date.parse(data.observedAt) > 6 * 36e5;
	return /* @__PURE__ */ React.createElement("dialog", {
		ref,
		className: "af-dialog",
		onCancel: close,
		onClick: (e) => {
			if (e.target === e.currentTarget) close();
		},
		"aria-labelledby": "af-title"
	}, /* @__PURE__ */ React.createElement("header", { className: "af-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "af-kicker" }, "Bionee LG · Amazon Italia · EUR"), /* @__PURE__ */ React.createElement("h2", { id: "af-title" }, "Costi, margine e rimanenze"), /* @__PURE__ */ React.createElement("p", null, data ? "Ultima raccolta " + at(data.observedAt) + (stale ? " · da aggiornare" : "") : "In attesa della prima raccolta dei report")), /* @__PURE__ */ React.createElement("button", {
		onClick: close,
		"aria-label": "Chiudi dettagli Amazon"
	}, "×")), /* @__PURE__ */ React.createElement("div", { className: "af-toolbar" }, /* @__PURE__ */ React.createElement("nav", { "aria-label": "Dettagli Amazon" }, [
		["summary", "Riepilogo"],
		["costs", "Costi e commissioni"],
		["stock", "Rimanenze"],
		["reports", "Report e copertura"]
	].map(([id, label]) => /* @__PURE__ */ React.createElement("button", {
		key: id,
		"aria-current": tab === id ? "page" : undefined,
		onClick: () => setTab(id)
	}, label))), /* @__PURE__ */ React.createElement("label", null, "Periodo ", /* @__PURE__ */ React.createElement("select", {
		value: month,
		onChange: (e) => setMonth(e.target.value)
	}, months.map((m) => /* @__PURE__ */ React.createElement("option", {
		key: m,
		value: m
	}, new Intl.DateTimeFormat("it-IT", {
		month: "long",
		year: "numeric"
	}).format(new Date(m + "-15T12:00:00Z"))))))), /* @__PURE__ */ React.createElement("div", { className: "af-body" }, tab === "summary" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "af-notice" }, "Il mese corrente è provvisorio; anche i mesi chiusi possono ricevere rettifiche. Vendite ordinate, movimenti contabilizzati e accredito bancario hanno tempi diversi. Gli importi mancanti restano «—»."), /* @__PURE__ */ React.createElement("div", { className: "af-kpis" }, /* @__PURE__ */ React.createElement(Metric, {
		title: "Vendite prodotti nel report",
		value: money(ledger?.productSales),
		note: ledger ? "Copertura " + ledger.periodStart + " → " + ledger.periodEnd : "Report Transazioni in attesa"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Costi Amazon registrati",
		value: money(ledger?.amazonFees),
		note: "Costi del canale e storni; IVA servizi da riconciliare"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Saldo operativo Amazon",
		value: money(ledger?.operatingBalance),
		note: "Esclusi bonifici e trasferimenti tra conti; IVA inclusa"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Guadagno netto",
		value: "—",
		note: "Richiede costo prodotti, costi esterni e imposte"
	})), ledger && /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Perimetro e disponibilità dei movimenti"), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Gestione"), /* @__PURE__ */ React.createElement("th", null, "Righe"), /* @__PURE__ */ React.createElement("th", null, "Vendite prodotti"), /* @__PURE__ */ React.createElement("th", null, "Costi attribuiti"), /* @__PURE__ */ React.createElement("th", null, "Saldo movimenti"))), /* @__PURE__ */ React.createElement("tbody", null, ledger.fulfillments.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.label }, /* @__PURE__ */ React.createElement("th", null, r.label), /* @__PURE__ */ React.createElement("td", null, num(r.rows)), /* @__PURE__ */ React.createElement("td", null, money(r.sales)), /* @__PURE__ */ React.createElement("td", null, money(r.fees)), /* @__PURE__ */ React.createElement("td", null, money(r.amount))))))), /* @__PURE__ */ React.createElement("p", null, ledger.statuses.map((r) => r.label + ": " + num(r.rows) + " righe, " + money(r.amount)).join(" · "), ". Questi stati non equivalgono al saldo disponibile del conto.")), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "IVA e risultato economico"), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "IVA vendite nel report Pagamenti"), /* @__PURE__ */ React.createElement("td", null, money(ledger?.salesTax)), /* @__PURE__ */ React.createElement("td", null, "Da riconciliare con Transazioni IVA e fatture.")), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "IVA netta da versare"), /* @__PURE__ */ React.createElement("td", null, "—"), /* @__PURE__ */ React.createElement("td", null, "Richiede anche acquisti, crediti IVA e regime fiscale.")), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Margine dopo costo dei prodotti"), /* @__PURE__ */ React.createElement("td", null, "—"), /* @__PURE__ */ React.createElement("td", null, "Costo per SKU e costo del venduto non ancora collegati.")), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Utile dopo imposte"), /* @__PURE__ */ React.createElement("td", null, "—"), /* @__PURE__ */ React.createElement("td", null, "Non ricavabile dai soli report Amazon.")))))), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Imponibile, IVA e lordo dai report fiscali"), /* @__PURE__ */ React.createElement("p", null, "Il report IVA può avere copertura e paesi diversi da Pagamenti. Le fatture dei servizi restano distinte dalle vendite. Gli importi non determinano da soli l’IVA da versare."), vat ? /* @__PURE__ */ React.createElement(ReportDetail, { data: vat }) : /* @__PURE__ */ React.createElement("p", null, "Report IVA del periodo non ancora acquisito."))), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Attenzioni sulle scorte ", /* @__PURE__ */ React.createElement("small", null, "Snapshot ", inventory?.snapshotDate ?? "in attesa", " · periodo indipendente dal filtro contabile")), /* @__PURE__ */ React.createElement("div", { className: "af-kpis" }, /* @__PURE__ */ React.createElement(Metric, {
		title: "Supplemento anzianità stimato",
		value: money(aged.value),
		note: aged.known + "/" + skus.length + " righe con stima · previsione, non prova di addebito"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Eccedenza stimata",
		value: num(excess.value) + " pz",
		note: excess.known + "/" + skus.length + " righe disponibili"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Non vendibili",
		value: num(unsellable.value) + " pz",
		note: unsellable.known + "/" + skus.length + " righe disponibili"
	})), skus.filter((r) => r.flags.some((f) => f.includes("anomalo"))).map((r) => /* @__PURE__ */ React.createElement("div", {
		className: "af-warning",
		key: r.sku
	}, /* @__PURE__ */ React.createElement("strong", null, r.sku, " · ", r.title), /* @__PURE__ */ React.createElement("p", null, "Amazon riporta ", num((r.cubicMeters ?? 0) * 1e3, 2), " litri di volume della confezione e fascia ", r.storageType, ". ", r.storageEvidence && /* @__PURE__ */ React.createElement(React.Fragment, null, "Il report di stoccaggio ", r.storageEvidence.period, " indica ", num(r.storageEvidence.longest), " × ", num(r.storageEvidence.median), " × ", num(r.storageEvidence.shortest), " ", r.storageEvidence.dimensionUnit === "centimeters" ? "cm" : r.storageEvidence.dimensionUnit, ". "), "Il prodotto è una bottiglia da 1 L: misure da verificare, senza sostituirle con una dimensione ipotizzata."), /* @__PURE__ */ React.createElement("small", null, "Disponibili ", num(r.available), " · supplemento anzianità stimato ", money(r.agedEstimate, r.currency), " · addebito effettivo da verificare."))))), tab === "costs" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Movimenti contabilizzati ", /* @__PURE__ */ React.createElement("small", null, ledger ? ledger.periodStart + " → " + ledger.periodEnd : "Report Transazioni in preparazione o da acquisire")), ledger ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Voce del report"), /* @__PURE__ */ React.createElement("th", null, "Righe"), /* @__PURE__ */ React.createElement("th", null, "Importo"))), /* @__PURE__ */ React.createElement("tbody", null, ledger.lines.map((r, i) => /* @__PURE__ */ React.createElement("tr", { key: i }, /* @__PURE__ */ React.createElement("th", null, r.label), /* @__PURE__ */ React.createElement("td", null, num(r.rows)), /* @__PURE__ */ React.createElement("td", null, money(r.amount, ledger.currency))))))), /* @__PURE__ */ React.createElement("p", null, ledger.detail)) : /* @__PURE__ */ React.createElement("p", { className: "af-empty" }, "Il dettaglio si popola con gli importi del file ufficiale. Nessun costo è considerato pari a zero in assenza del report.")), ledger && /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Dettaglio effettivo per SKU · ", ledger.skus.length, " righe"), /* @__PURE__ */ React.createElement("p", null, "Ricavi, imposte e costi registrati. I costi senza SKU restano nel riepilogo comune: non vengono attribuiti arbitrariamente ai prodotti. Il saldo non include costo del venduto e imposte sul reddito."), /* @__PURE__ */ React.createElement("label", { className: "af-search" }, "Cerca SKU", /* @__PURE__ */ React.createElement("input", {
		value: query,
		onChange: (e) => setQuery(e.target.value),
		placeholder: "Es. ros1"
	})), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "SKU / gestione"), /* @__PURE__ */ React.createElement("th", null, "Vendite prodotti"), /* @__PURE__ */ React.createElement("th", null, "IVA vendite"), /* @__PURE__ */ React.createElement("th", null, "Costi"), /* @__PURE__ */ React.createElement("th", null, "Altre componenti"), /* @__PURE__ */ React.createElement("th", null, "Saldo movimenti"))), /* @__PURE__ */ React.createElement("tbody", null, ledger.skus.filter((r) => r.sku.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.sku + "|" + r.fulfillment }, /* @__PURE__ */ React.createElement("th", null, r.sku, /* @__PURE__ */ React.createElement("small", null, r.fulfillment)), /* @__PURE__ */ React.createElement("td", null, money(r.sales)), /* @__PURE__ */ React.createElement("td", null, money(r.tax)), /* @__PURE__ */ React.createElement("td", null, money(r.fees)), /* @__PURE__ */ React.createElement("td", null, money(r.other)), /* @__PURE__ */ React.createElement("td", null, money(r.total))))))))), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Fatture e note di credito dei servizi Amazon"), vat && vat.lines.some((r) => r.kind === "invoice") ? /* @__PURE__ */ React.createElement(ReportDetail, { data: {
		...vat,
		lines: vat.lines.filter((r) => r.kind === "invoice")
	} }) : /* @__PURE__ */ React.createElement("p", null, "Nessun documento di servizio acquisito per il periodo. Non significa assenza di costi o IVA sui servizi."))), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Copertura di tutti i costi del canale"), /* @__PURE__ */ React.createElement("p", null, "Pagamenti è la base monetaria. Gli altri report spiegano o riconciliano gli stessi importi: non vengono sommati una seconda volta."), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Costo o movimento"), /* @__PURE__ */ React.createElement("th", null, "Fonte necessaria"), /* @__PURE__ */ React.createElement("th", null, "Come viene trattato"))), /* @__PURE__ */ React.createElement("tbody", null, costMap.map(([a, b, c]) => /* @__PURE__ */ React.createElement("tr", { key: a }, /* @__PURE__ */ React.createElement("th", null, a), /* @__PURE__ */ React.createElement("td", null, b), /* @__PURE__ */ React.createElement("td", null, c)))))))), tab === "stock" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "af-stock-tools" }, /* @__PURE__ */ React.createElement("label", null, "Cerca prodotto, SKU o ASIN", /* @__PURE__ */ React.createElement("input", {
		value: query,
		onChange: (e) => setQuery(e.target.value),
		placeholder: "Es. ros1"
	})), /* @__PURE__ */ React.createElement("label", null, "Mostra", /* @__PURE__ */ React.createElement("select", {
		value: filter,
		onChange: (e) => setFilter(e.target.value)
	}, /* @__PURE__ */ React.createElement("option", { value: "all" }, "Tutti gli articoli"), /* @__PURE__ */ React.createElement("option", { value: "flags" }, "Da verificare"), /* @__PURE__ */ React.createElement("option", { value: "aged" }, "Con supplemento stimato"), /* @__PURE__ */ React.createElement("option", { value: "excess" }, "Con eccedenza")))), /* @__PURE__ */ React.createElement("p", null, visible.length, " / ", skus.length, " righe · snapshot ", inventory?.snapshotDate ?? "in attesa", " · Italia. Le quantità disponibili, riservate e non vendibili sono distinte. Valore delle rimanenze a costo: in attesa del costo per SKU."), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Prodotto"), /* @__PURE__ */ React.createElement("th", null, "Disponibili / riservati"), /* @__PURE__ */ React.createElement("th", null, "Non vendibili / eccedenza"), /* @__PURE__ */ React.createElement("th", null, "Venduti 30 gg"), /* @__PURE__ */ React.createElement("th", null, "Volume confezione"), /* @__PURE__ */ React.createElement("th", null, "Commissioni stimate / unità"), /* @__PURE__ */ React.createElement("th", null, "Anzianità stimata"), /* @__PURE__ */ React.createElement("th", null, "Stoccaggio prossimo mese"))), /* @__PURE__ */ React.createElement("tbody", null, visible.map((r) => /* @__PURE__ */ React.createElement(StockRow, {
		key: r.sku + "|" + r.asin + "|" + r.marketplace,
		r
	}))))), /* @__PURE__ */ React.createElement("p", null, "Le commissioni per unità e le ultime due colonne sono stime Amazon. Il volume descrive la confezione, non il contenuto liquido. «—» significa campo mancante.")), tab === "reports" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "af-notice" }, "Copertura finanziaria attuale: account Italia. Le vendite globali nella dashboard hanno un perimetro diverso. Il report IVA europeo mantiene i mercati e le valute separati. Ogni file conserva periodo, data di acquisizione e riscontro SHA-256."), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Report"), /* @__PURE__ */ React.createElement("th", null, "Periodo"), /* @__PURE__ */ React.createElement("th", null, "Stato"), /* @__PURE__ */ React.createElement("th", null, "Acquisizione"), /* @__PURE__ */ React.createElement("th", null, "Utilizzo e limiti"))), /* @__PURE__ */ React.createElement("tbody", null, data?.reports.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.id + "|" + r.period }, /* @__PURE__ */ React.createElement("th", null, r.title, /* @__PURE__ */ React.createElement("small", null, r.sha256 ? "SHA-256 " + r.sha256.slice(0, 12) : "File non ancora acquisito")), /* @__PURE__ */ React.createElement("td", null, r.period, r.coverageStart && /* @__PURE__ */ React.createElement("small", null, r.coverageStart, " → ", r.coverageEnd)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "af-badge af-" + r.state }, states[r.state]), r.rows !== null && /* @__PURE__ */ React.createElement("small", null, num(r.rows), " righe")), /* @__PURE__ */ React.createElement("td", null, at(r.downloadedAt), r.requestedAt && /* @__PURE__ */ React.createElement("small", null, "Richiesto ", at(r.requestedAt))), /* @__PURE__ */ React.createElement("td", null, r.purpose, /* @__PURE__ */ React.createElement("small", null, r.detail), data?.details.find((d) => d.id === r.id && d.period === r.period) && /* @__PURE__ */ React.createElement("details", { className: "af-report-detail" }, /* @__PURE__ */ React.createElement("summary", null, "Apri dettaglio del file"), /* @__PURE__ */ React.createElement(ReportDetail, { data: data.details.find((d) => d.id === r.id && d.period === r.period) })))))))), !data && /* @__PURE__ */ React.createElement("p", { className: "af-empty" }, "In attesa del primo riepilogo verificato."), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Per completare il netto"), /* @__PURE__ */ React.createElement("p", null, "Servono costo prodotto e confezionamento per SKU, fatture di trasporto e servizi esterni, fatture commissioni Amazon, trattamento IVA e imposte. Riserve e bonifici restano movimenti di cassa; non sono nuovi costi.")))));
}
function Metric({ title, value, note }) {
	return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", null, title), /* @__PURE__ */ React.createElement("strong", null, value), /* @__PURE__ */ React.createElement("small", null, note));
}
function StockRow({ r }) {
	return /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, r.title, /* @__PURE__ */ React.createElement("small", null, r.sku, " · ", r.asin), r.flags.map((f) => /* @__PURE__ */ React.createElement("small", {
		className: "af-flag",
		key: f
	}, f))), /* @__PURE__ */ React.createElement("td", null, num(r.available), " / ", num(r.reserved)), /* @__PURE__ */ React.createElement("td", null, num(r.unfulfillable), " / ", num(r.excess)), /* @__PURE__ */ React.createElement("td", null, num(r.sold30)), /* @__PURE__ */ React.createElement("td", null, r.cubicMeters == null ? "—" : num(r.cubicMeters * 1e3, 3) + " L", /* @__PURE__ */ React.createElement("small", null, r.storageType), r.storageEvidence && /* @__PURE__ */ React.createElement("small", null, "Stoccaggio ", r.storageEvidence.period, ": ", num(r.storageEvidence.longest, 2), " × ", num(r.storageEvidence.median, 2), " × ", num(r.storageEvidence.shortest, 2), " ", r.storageEvidence.dimensionUnit === "centimeters" ? "cm" : r.storageEvidence.dimensionUnit), r.feePreview && /* @__PURE__ */ React.createElement("small", null, num(r.feePreview.longest, 2), " × ", num(r.feePreview.median, 2), " × ", num(r.feePreview.shortest, 2), " ", r.feePreview.dimensionUnit, /* @__PURE__ */ React.createElement("br", null), num(r.feePreview.weight, 2), " ", r.feePreview.weightUnit, " · ", r.feePreview.tier)), /* @__PURE__ */ React.createElement("td", null, money(r.feePreview?.total, r.currency), /* @__PURE__ */ React.createElement("small", null, "Vendita ", money(r.feePreview?.referral, r.currency), /* @__PURE__ */ React.createElement("br", null), "Gestione ", money(r.feePreview?.fulfillment, r.currency))), /* @__PURE__ */ React.createElement("td", null, money(r.agedEstimate, r.currency), /* @__PURE__ */ React.createElement("small", null, "Età al ", r.ageDate ?? "—")), /* @__PURE__ */ React.createElement("td", null, money(r.storageNextMonthEstimate, r.currency)));
}
function AmazonFinanceButton({ data, now, children }) {
	const [open, setOpen] = useState(false);
	return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", {
		type: "button",
		className: "af-open",
		onClick: () => setOpen(true),
		title: "Apri costi, commissioni e rimanenze Amazon",
		"aria-haspopup": "dialog"
	}, children), open && /* @__PURE__ */ React.createElement(AmazonFinanceDialog, {
		data,
		now,
		close: () => setOpen(false)
	}));
}
function ReportDetail({ data }) {
	return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", null, data.notes), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Voce / SKU"), /* @__PURE__ */ React.createElement("th", null, "Righe / unità"), /* @__PURE__ */ React.createElement("th", null, "Imponibile del report"), /* @__PURE__ */ React.createElement("th", null, "IVA del report"), /* @__PURE__ */ React.createElement("th", null, "Importo del report"))), /* @__PURE__ */ React.createElement("tbody", null, data.lines.map((r, i) => /* @__PURE__ */ React.createElement("tr", { key: i }, /* @__PURE__ */ React.createElement("th", null, r.label, r.sku && /* @__PURE__ */ React.createElement("small", null, r.sku)), /* @__PURE__ */ React.createElement("td", null, num(r.rows), " / ", num(r.units)), /* @__PURE__ */ React.createElement("td", null, money(r.net, r.currency ?? "EUR")), /* @__PURE__ */ React.createElement("td", null, money(r.tax, r.currency ?? "EUR")), /* @__PURE__ */ React.createElement("td", null, money(r.amount, r.currency ?? "EUR"))))))), data.rows === 0 && /* @__PURE__ */ React.createElement("p", null, "Il file acquisito non contiene righe. La copertura resta quella dichiarata da Amazon."));
}

return AmazonFinanceDialog;
}
