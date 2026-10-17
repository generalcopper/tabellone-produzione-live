// Generated from cedoly-crm/apps/control-center-web/src/amazon-finance.tsx
export function createAmazonFinance(React){
const {useEffect,useMemo,useRef,useState}=React;
const money = (v, c = "EUR") => v == null ? "—" : new Intl.NumberFormat("it-IT", {
	style: "currency",
	currency: c,
	useGrouping: "always"
}).format(v);
const num = (v, d = 0) => v == null ? "—" : new Intl.NumberFormat("it-IT", { maximumFractionDigits: d }).format(v);
const at = (s) => s ? new Intl.DateTimeFormat("it-IT", {
	timeZone: "Europe/Rome",
	day: "2-digit",
	month: "2-digit",
	hour: "2-digit",
	minute: "2-digit"
}).format(new Date(s)) : "in attesa";
const periodOf = (now) => new Intl.DateTimeFormat("sv-SE", {
	timeZone: "Europe/Rome",
	year: "numeric",
	month: "2-digit"
}).format(now).slice(0, 7);
const dateLabel = (s) => s ? s.slice(8, 10) + "/" + s.slice(5, 7) : "—";
const checkState = {
	matched: "Quadrato",
	partial: "Parziale",
	difference: "Scarto aperto",
	unavailable: "Fonte in attesa",
	estimate: "Confronto con stima"
};
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
function amazonNetComparison(period, now = Date.now()) {
	const revenue = period?.vatRevenue.find((r) => r.marketplace === "amazon.it" && r.currency === "EUR"), netRevenue = revenue?.net ?? null, netCosts = period?.invoiceNet ?? null;
	const cents = (n) => n == null ? null : Math.round(n * 100);
	const monthEnd = period ? new Date(Date.UTC(Number(period.period.slice(0, 4)), Number(period.period.slice(5, 7)), 0)).toISOString().slice(0, 10) : null;
	const complete = !!period && period.period < periodOf(now) && period.start === period.period + "-01" && period.end === monthEnd && period.vatThrough === monthEnd;
	const invoicesAgree = !!period && netCosts !== null && period.invoiceTax !== null && period.invoiceGross !== null && Math.round(netCosts * 100) + Math.round(period.invoiceTax * 100) === cents(period.invoiceGross) && cents(period.feeBridge.alignedCosts) === cents(period.invoiceGross) && cents(period.feeBridge.invoiceGross) === cents(period.invoiceGross);
	const reconciled = !!period && period.feeBridge.unresolvedGroups === 0 && period.feeBridge.difference === 0 && ["sales-vat", "fees-invoices"].every((id) => period.checks.some((c) => c.id === id && c.state === "matched"));
	const ready = netRevenue !== null && complete && invoicesAgree && reconciled;
	const pending = netRevenue === null ? "Report IVA Italia in attesa" : netCosts === null ? "In attesa delle fatture Amazon" : !complete ? "Copertura mensile ancora incompleta" : "Riconciliazione vendite e fatture da completare";
	return {
		netRevenue,
		netCosts,
		ready,
		difference: ready ? (cents(netRevenue) - cents(netCosts)) / 100 : null,
		pending
	};
}
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
	const analysis = data?.analysis, period = analysis?.periods.find((p) => p.period === month), business = analysis?.business.find((p) => p.period === month), global = analysis?.global.find((p) => p.period === month);
	const totals = currencyTotals(period), eur = totals.find((r) => r.currency === "EUR"), economics = amazonNetComparison(period, now);
	const openChecks = period?.checks.filter((c) => c.state !== "matched").length ?? 0;
	const months = [...new Set([new Intl.DateTimeFormat("sv-SE", {
		timeZone: "Europe/Rome",
		year: "numeric",
		month: "2-digit"
	}).format(now), ...data?.ledgers.map((r) => r.periodStart.slice(0, 7)) ?? []])].sort().reverse();
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
	}, /* @__PURE__ */ React.createElement("header", { className: "af-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "af-kicker" }, "Bionee LG · Amazon"), /* @__PURE__ */ React.createElement("h2", { id: "af-title" }, "Vendite, costi e riconciliazione"), /* @__PURE__ */ React.createElement("p", null, data ? "Ultima raccolta " + at(data.observedAt) + (stale ? " · da aggiornare" : "") : "In attesa della prima raccolta dei report")), /* @__PURE__ */ React.createElement("button", {
		onClick: close,
		"aria-label": "Chiudi dettagli Amazon"
	}, "×")), /* @__PURE__ */ React.createElement("div", { className: "af-toolbar" }, /* @__PURE__ */ React.createElement("nav", { "aria-label": "Dettagli Amazon" }, [
		["summary", "Riepilogo"],
		["reconciliation", "Riconciliazione"],
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
	}).format(new Date(m + "-15T12:00:00Z"))))))), /* @__PURE__ */ React.createElement("div", { className: "af-body" }, tab === "summary" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "af-statusline" }, /* @__PURE__ */ React.createElement("span", null, "Mese ", month, " · ", periodOf(now) === month ? "in corso" : "con rettifiche possibili"), /* @__PURE__ */ React.createElement("button", {
		className: "af-textlink",
		onClick: () => setTab("reconciliation")
	}, period ? openChecks + " controlli da completare" : "Riconciliazione in attesa", " ↗")), /* @__PURE__ */ React.createElement("section", {
		className: "af-net-comparison",
		"aria-label": "Confronto netto IVA Italia"
	}, /* @__PURE__ */ React.createElement("div", { className: "af-section-title" }, /* @__PURE__ */ React.createElement("h3", null, "Confronto netto IVA · Italia"), /* @__PURE__ */ React.createElement("small", null, "Stesso mercato · mese ", month)), /* @__PURE__ */ React.createElement("div", { className: "af-kpis" }, /* @__PURE__ */ React.createElement(Metric, {
		title: "Ricavi Italia · netto IVA",
		value: money(economics.netRevenue),
		note: "Vendite meno rimborsi · report IVA al " + dateLabel(period?.vatThrough)
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Costi Amazon · netto IVA",
		value: money(economics.netCosts),
		note: economics.netCosts === null ? "In attesa delle fatture Amazon" : economics.ready ? "Fatture meno note di credito · riconciliati" : "Fatture acquisite · copertura da completare"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Ricavi meno costi Amazon",
		value: money(economics.difference),
		note: economics.ready ? "Prima di prodotti, altre componenti e imposte" : economics.pending
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Guadagno netto",
		value: "—",
		note: "Costo prodotti, costi esterni e fiscalità ancora da collegare"
	})), /* @__PURE__ */ React.createElement("p", { className: "af-context" }, "Ricavi e costi documentati Italia sono entrambi al netto IVA. La differenza viene calcolata solo con copertura mensile completa e vendite e fatture riconciliate; non è utile netto. Gli addebiti IVA inclusa restano nei movimenti del conto.")), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("div", { className: "af-section-title" }, /* @__PURE__ */ React.createElement("h3", null, "Vendite Italia · B2B compreso"), /* @__PURE__ */ React.createElement("small", null, "Report attività aziendali · ", business ? dateLabel(business.start) + " – " + dateLabel(business.end) : "in attesa")), /* @__PURE__ */ React.createElement("div", { className: "af-kpis af-kpis-small" }, /* @__PURE__ */ React.createElement(Metric, {
		title: "Totale prodotti ordinati",
		value: money(business?.orderedSales),
		note: business ? num(business.units) + " unità · " + num(business.orderItems) + " articoli d’ordine" : "Fonte in attesa"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Di cui Amazon Business",
		value: money(business?.b2bSales),
		note: business ? num(business.b2bUnits) + " unità · " + num(business.b2bOrderItems) + " articoli · " + num(business.orderedSales ? business.b2bSales / business.orderedSales * 100 : 0, 2) + "% del totale" : "Identificazione B2B ufficiale in attesa"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Altri ordini",
		value: money(business?.nonB2bSales),
		note: "Totale meno Amazon Business"
	})), /* @__PURE__ */ React.createElement("p", null, "Il B2B è un sottoinsieme del totale, non un importo da aggiungere. La classificazione viene dalle colonne B2B del report Amazon, non dalla presenza di una partita IVA.")), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("div", { className: "af-section-title" }, /* @__PURE__ */ React.createElement("h3", null, "Fatturato complessivo documentato"), /* @__PURE__ */ React.createElement("small", null, "Report Transazioni IVA · fino al ", dateLabel(period?.vatThrough))), /* @__PURE__ */ React.createElement("div", { className: "af-kpis af-kpis-small" }, /* @__PURE__ */ React.createElement(Metric, {
		title: "Vendite ordinate · mondo",
		value: global?.completeFromStart ? money(global.orderedSales) : "—",
		note: global ? "Dal " + dateLabel(global.start) + " al " + dateLabel(global.end) + " · lettura " + at(global.observedAt) + (global.partial ? " · include dati provvisori" : "") + (global.completeFromStart ? "" : " · copertura incompleta") : "Storico globale del mese in attesa"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Fatturato complessivo · netto IVA",
		value: money(eur?.net),
		note: "Mercati in EUR · vendite meno rimborsi · al " + dateLabel(period?.vatThrough)
	})), /* @__PURE__ */ React.createElement("p", null, "Questi totali comprendono più mercati e non vengono sottratti ai soli costi Italia. Gli ordini e gli eventi fiscali hanno date e basi di rilevazione diverse."), /* @__PURE__ */ React.createElement("p", null, "Vendite e rimborsi di tutti i mercati presenti nel file. Fatture dei servizi, liquidazioni di inventario e trasferimenti di magazzino sono esclusi da questo fatturato clienti. Nessuna conversione valutaria ipotizzata."), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Mercato / valuta"), /* @__PURE__ */ React.createElement("th", null, "Vendite lorde"), /* @__PURE__ */ React.createElement("th", null, "Rimborsi lordi"), /* @__PURE__ */ React.createElement("th", null, "Fatturato netto IVA"), /* @__PURE__ */ React.createElement("th", null, "IVA del report"), /* @__PURE__ */ React.createElement("th", null, "Totale lordo"))), /* @__PURE__ */ React.createElement("tbody", null, period?.vatRevenue.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.marketplace + r.currency }, /* @__PURE__ */ React.createElement("th", null, r.marketplace, /* @__PURE__ */ React.createElement("small", null, r.currency, " · ", num(r.rows), " righe")), /* @__PURE__ */ React.createElement("td", null, money(r.salesGross, r.currency)), /* @__PURE__ */ React.createElement("td", null, money(r.refundsGross, r.currency)), /* @__PURE__ */ React.createElement("td", null, money(r.net, r.currency)), /* @__PURE__ */ React.createElement("td", null, money(r.tax, r.currency)), /* @__PURE__ */ React.createElement("td", null, money(r.gross, r.currency))))), /* @__PURE__ */ React.createElement("tfoot", null, totals.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.currency }, /* @__PURE__ */ React.createElement("th", null, "Totale ", r.currency), /* @__PURE__ */ React.createElement("td", null, money(r.salesGross, r.currency)), /* @__PURE__ */ React.createElement("td", null, money(r.refundsGross, r.currency)), /* @__PURE__ */ React.createElement("td", null, money(r.net, r.currency)), /* @__PURE__ */ React.createElement("td", null, money(r.tax, r.currency)), /* @__PURE__ */ React.createElement("td", null, money(r.gross, r.currency))))))), !period?.vatRevenue.length && /* @__PURE__ */ React.createElement("p", null, "Report IVA del periodo non ancora disponibile.")), period && /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("div", { className: "af-section-title" }, /* @__PURE__ */ React.createElement("h3", null, "Vendite registrate in Pagamenti · Italia"), /* @__PURE__ */ React.createElement("small", null, dateLabel(period.start), " – ", dateLabel(period.end), " · FBA + gestione venditore")), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Voce"), /* @__PURE__ */ React.createElement("th", null, "Netto IVA"), /* @__PURE__ */ React.createElement("th", null, "IVA"), /* @__PURE__ */ React.createElement("th", null, "Lordo"))), /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Vendite clienti", /* @__PURE__ */ React.createElement("small", null, "Prodotti, spedizioni, confezioni regalo e promozioni")), /* @__PURE__ */ React.createElement("td", null, money(period.revenue.salesNet)), /* @__PURE__ */ React.createElement("td", null, money(period.revenue.salesTax)), /* @__PURE__ */ React.createElement("td", null, money(period.revenue.salesGross))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Rimborsi clienti"), /* @__PURE__ */ React.createElement("td", null, money(period.revenue.refundsNet)), /* @__PURE__ */ React.createElement("td", null, money(period.revenue.refundsTax)), /* @__PURE__ */ React.createElement("td", null, money(period.revenue.refundsGross))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Vendite meno rimborsi"), /* @__PURE__ */ React.createElement("td", null, money(period.revenue.net)), /* @__PURE__ */ React.createElement("td", null, money(period.revenue.tax)), /* @__PURE__ */ React.createElement("td", null, money(period.revenue.gross)))))), /* @__PURE__ */ React.createElement("p", null, "IVA trattenuta dal marketplace: ", money(period.revenue.withheld), ". La riconciliazione spiega il passaggio al report fiscale, incluse le registrazioni in mesi diversi.")), ledger && /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Movimenti del conto Amazon · Italia"), /* @__PURE__ */ React.createElement("div", { className: "af-kpis af-kpis-small" }, /* @__PURE__ */ React.createElement(Metric, {
		title: "Saldo operativo Amazon",
		value: money(ledger.operatingBalance),
		note: "Include IVA; prima del costo prodotti. Non è utile netto."
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Bonifici e trasferimenti",
		value: money(ledger.transfers),
		note: "Movimenti di cassa, non nuovi costi"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Totale movimenti del report",
		value: money(ledger.transactionTotal),
		note: "Saldo operativo + trasferimenti"
	})), /* @__PURE__ */ React.createElement("p", null, ledger.statuses.map((r) => r.label + ": " + money(r.amount)).join(" · "), ". Questi stati non equivalgono al saldo disponibile del conto. La riconciliazione bancaria richiede gli estratti dei versamenti e della banca."), /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Ripartizione FBA / gestione venditore"), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Gestione"), /* @__PURE__ */ React.createElement("th", null, "Righe"), /* @__PURE__ */ React.createElement("th", null, "Prodotti al netto dei rimborsi, senza IVA"), /* @__PURE__ */ React.createElement("th", null, "Costi attribuiti · IVA inclusa"), /* @__PURE__ */ React.createElement("th", null, "Saldo movimenti"))), /* @__PURE__ */ React.createElement("tbody", null, ledger.fulfillments.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.label }, /* @__PURE__ */ React.createElement("th", null, r.label), /* @__PURE__ */ React.createElement("td", null, num(r.rows)), /* @__PURE__ */ React.createElement("td", null, money(r.sales)), /* @__PURE__ */ React.createElement("td", null, money(r.fees)), /* @__PURE__ */ React.createElement("td", null, money(r.amount))))))))), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "IVA e risultato economico"), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "IVA sui servizi documentati · IT"), /* @__PURE__ */ React.createElement("td", null, money(period?.invoiceTax)), /* @__PURE__ */ React.createElement("td", null, "Fatture meno note di credito; detraibilità da verificare.")), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "IVA netta da versare"), /* @__PURE__ */ React.createElement("td", null, "—"), /* @__PURE__ */ React.createElement("td", null, "Richiede acquisti, crediti IVA, regimi e contabilità di tutti i paesi.")), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Margine dopo costo dei prodotti"), /* @__PURE__ */ React.createElement("td", null, "—"), /* @__PURE__ */ React.createElement("td", null, "Costo per SKU e costi esterni non ancora collegati.")), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Utile dopo imposte"), /* @__PURE__ */ React.createElement("td", null, "—"), /* @__PURE__ */ React.createElement("td", null, "Non ricavabile dai soli report Amazon.")))))), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Attenzioni sulle scorte ", /* @__PURE__ */ React.createElement("small", null, "Snapshot ", inventory?.snapshotDate ?? "in attesa", " · indipendente dal periodo contabile")), /* @__PURE__ */ React.createElement("div", { className: "af-kpis af-kpis-small" }, /* @__PURE__ */ React.createElement(Metric, {
		title: "Supplemento anzianità stimato",
		value: money(aged.value),
		note: aged.known + "/" + skus.length + " righe con stima · non è un addebito"
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
	}, /* @__PURE__ */ React.createElement("strong", null, r.sku, " · ", r.title), /* @__PURE__ */ React.createElement("p", null, "Amazon riporta ", num((r.cubicMeters ?? 0) * 1e3, 2), " L di volume della confezione, fascia ", r.storageType, ". ", r.storageEvidence && /* @__PURE__ */ React.createElement(React.Fragment, null, "Il report ", r.storageEvidence.period, " indica ", num(r.storageEvidence.longest), " × ", num(r.storageEvidence.median), " × ", num(r.storageEvidence.shortest), " ", r.storageEvidence.dimensionUnit === "centimeters" ? "cm" : r.storageEvidence.dimensionUnit, ". "), "È una bottiglia da 1 L: misure da verificare."), /* @__PURE__ */ React.createElement("small", null, "Disponibili ", num(r.available), " · supplemento stimato ", money(r.agedEstimate, r.currency), " · addebito effettivo non confermato."))))), tab === "reconciliation" && /* @__PURE__ */ React.createElement(Reconciliation, { period }), tab === "costs" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("div", { className: "af-section-title" }, /* @__PURE__ */ React.createElement("h3", null, "Costi documentati · Italia"), /* @__PURE__ */ React.createElement("small", null, "Fatture meno note di credito · mese ", month)), /* @__PURE__ */ React.createElement("div", { className: "af-kpis af-kpis-small" }, /* @__PURE__ */ React.createElement(Metric, {
		title: "Costi Amazon · netto IVA",
		value: money(period?.invoiceNet),
		note: period?.invoiceNet == null ? "In attesa delle fatture Amazon" : "Imponibile dei documenti acquisiti"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "IVA sui servizi",
		value: money(period?.invoiceTax),
		note: "IVA dei documenti acquisiti; detraibilità da verificare"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Costi Amazon · IVA inclusa",
		value: money(period?.invoiceGross),
		note: "Netto + IVA delle stesse fatture e note di credito"
	})), /* @__PURE__ */ React.createElement("p", null, "Il netto viene dalle fatture, senza applicare un’aliquota presunta. Per il confronto economico si usano i costi netti dello stesso periodo e mercato dei ricavi. Nessuna IVA è sottratta due volte.")), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Addebiti registrati · Italia · IVA inclusa"), /* @__PURE__ */ React.createElement("div", { className: "af-kpis af-kpis-small" }, /* @__PURE__ */ React.createElement(Metric, {
		title: "Addebiti logistica FBA",
		value: money(period?.fbaCosts),
		note: "IVA inclusa · gestione, stoccaggio, rimozioni, resi e trasporto FBA"
	}), /* @__PURE__ */ React.createElement(Metric, {
		title: "Tutti gli addebiti Amazon",
		value: money(ledger?.amazonFees == null ? null : -ledger.amazonFees),
		note: "IVA inclusa · commissioni e servizi; segue la data del movimento"
	})), /* @__PURE__ */ React.createElement("p", null, "Gli addebiti seguono la data di registrazione in Pagamenti; le fatture seguono il mese fiscale. Il ponte nella riconciliazione spiega gli importi registrati in mesi diversi. L’IVA non viene ripartita per SKU o tipo di costo senza il dettaglio documentale.")), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Movimenti contabilizzati ", /* @__PURE__ */ React.createElement("small", null, ledger ? ledger.periodStart + " → " + ledger.periodEnd : "Report Transazioni in preparazione o da acquisire")), ledger ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Voce del report"), /* @__PURE__ */ React.createElement("th", null, "Righe"), /* @__PURE__ */ React.createElement("th", null, "Importo registrato"))), /* @__PURE__ */ React.createElement("tbody", null, ledger.lines.map((r, i) => /* @__PURE__ */ React.createElement("tr", { key: i }, /* @__PURE__ */ React.createElement("th", null, r.label), /* @__PURE__ */ React.createElement("td", null, num(r.rows)), /* @__PURE__ */ React.createElement("td", null, money(r.amount, ledger.currency))))))), /* @__PURE__ */ React.createElement("p", null, ledger.detail)) : /* @__PURE__ */ React.createElement("p", { className: "af-empty" }, "Il dettaglio si popola con gli importi del file ufficiale. Nessun costo è considerato pari a zero in assenza del report.")), ledger && /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Dettaglio effettivo per SKU · ", ledger.skus.length, " righe"), /* @__PURE__ */ React.createElement("p", null, "Vendite prodotti al netto IVA, IVA vendite separata e costi IVA inclusa: sono componenti dei movimenti di cassa, non un calcolo di margine. I costi senza SKU restano nel riepilogo comune: non vengono attribuiti arbitrariamente ai prodotti. Il saldo non include costo del venduto e imposte sul reddito."), /* @__PURE__ */ React.createElement("label", { className: "af-search" }, "Cerca SKU", /* @__PURE__ */ React.createElement("input", {
		value: query,
		onChange: (e) => setQuery(e.target.value),
		placeholder: "Es. ros1"
	})), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "SKU / gestione"), /* @__PURE__ */ React.createElement("th", null, "Vendite prodotti · netto IVA"), /* @__PURE__ */ React.createElement("th", null, "IVA vendite"), /* @__PURE__ */ React.createElement("th", null, "Costi · IVA inclusa"), /* @__PURE__ */ React.createElement("th", null, "Altre componenti"), /* @__PURE__ */ React.createElement("th", null, "Saldo movimenti"))), /* @__PURE__ */ React.createElement("tbody", null, ledger.skus.filter((r) => r.sku.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.sku + "|" + r.fulfillment }, /* @__PURE__ */ React.createElement("th", null, r.sku, /* @__PURE__ */ React.createElement("small", null, r.fulfillment)), /* @__PURE__ */ React.createElement("td", null, money(r.sales)), /* @__PURE__ */ React.createElement("td", null, money(r.tax)), /* @__PURE__ */ React.createElement("td", null, money(r.fees)), /* @__PURE__ */ React.createElement("td", null, money(r.other)), /* @__PURE__ */ React.createElement("td", null, money(r.total))))))))), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Fatture e note di credito dei servizi Amazon"), vat && vat.lines.some((r) => r.kind === "invoice") ? /* @__PURE__ */ React.createElement(ReportDetail, { data: {
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
	}))))), /* @__PURE__ */ React.createElement("p", null, "Le commissioni per unità e le ultime due colonne sono stime Amazon. Il volume descrive la confezione, non il contenuto liquido. «—» significa campo mancante.")), tab === "reports" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "af-notice" }, "Pagamenti e costi: account Italia. Vendite ordinate: globale e dettaglio Italia/B2B. Fatturato documentato: tutti i mercati del report IVA. Il report IVA europeo mantiene i mercati e le valute separati. Ogni file conserva periodo, data di acquisizione e riscontro SHA-256."), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Report"), /* @__PURE__ */ React.createElement("th", null, "Periodo"), /* @__PURE__ */ React.createElement("th", null, "Stato"), /* @__PURE__ */ React.createElement("th", null, "Acquisizione"), /* @__PURE__ */ React.createElement("th", null, "Utilizzo e limiti"))), /* @__PURE__ */ React.createElement("tbody", null, data?.reports.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.id + "|" + r.period }, /* @__PURE__ */ React.createElement("th", null, r.title, /* @__PURE__ */ React.createElement("small", null, r.sha256 ? "SHA-256 " + r.sha256.slice(0, 12) : "File non ancora acquisito")), /* @__PURE__ */ React.createElement("td", null, r.period, r.coverageStart && /* @__PURE__ */ React.createElement("small", null, r.coverageStart, " → ", r.coverageEnd)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "af-badge af-" + r.state }, states[r.state]), r.rows !== null && /* @__PURE__ */ React.createElement("small", null, num(r.rows), " righe")), /* @__PURE__ */ React.createElement("td", null, at(r.downloadedAt), r.requestedAt && /* @__PURE__ */ React.createElement("small", null, "Richiesto ", at(r.requestedAt))), /* @__PURE__ */ React.createElement("td", null, r.purpose, /* @__PURE__ */ React.createElement("small", null, r.detail), data?.details.find((d) => d.id === r.id && d.period === r.period) && /* @__PURE__ */ React.createElement("details", { className: "af-report-detail" }, /* @__PURE__ */ React.createElement("summary", null, "Apri dettaglio del file"), /* @__PURE__ */ React.createElement(ReportDetail, { data: data.details.find((d) => d.id === r.id && d.period === r.period) })))))))), !data && /* @__PURE__ */ React.createElement("p", { className: "af-empty" }, "In attesa del primo riepilogo verificato."), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Per completare il netto"), /* @__PURE__ */ React.createElement("p", null, "Servono costo prodotto e confezionamento per SKU, fatture di trasporto e servizi esterni, fatture commissioni Amazon, trattamento IVA e imposte. Riserve e bonifici restano movimenti di cassa; non sono nuovi costi.")))));
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
function currencyTotals(period) {
	const totals = new Map();
	for (const r of period?.vatRevenue ?? []) {
		const t = totals.get(r.currency) ?? {
			currency: r.currency,
			salesGross: 0,
			refundsGross: 0,
			net: 0,
			tax: 0,
			gross: 0
		};
		for (const k of [
			"salesGross",
			"refundsGross",
			"net",
			"tax",
			"gross"
		]) t[k] += Math.round(r[k] * 100);
		totals.set(r.currency, t);
	}
	return [...totals.values()].map((t) => ({
		...t,
		salesGross: t.salesGross / 100,
		refundsGross: t.refundsGross / 100,
		net: t.net / 100,
		tax: t.tax / 100,
		gross: t.gross / 100
	}));
}
function Reconciliation({ period }) {
	if (!period) return /* @__PURE__ */ React.createElement("p", { className: "af-empty" }, "Riconciliazione del periodo in attesa dei report verificati.");
	const m = period.matching;
	return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "af-statusline" }, /* @__PURE__ */ React.createElement("span", null, "Pagamenti ", dateLabel(period.start), " – ", dateLabel(period.end), " · IVA fino al ", dateLabel(period.vatThrough)), /* @__PURE__ */ React.createElement("strong", null, period.checks.filter((c) => c.state === "matched").length, "/", period.checks.length, " controlli quadrati")), /* @__PURE__ */ React.createElement("p", { className: "af-context" }, "Ogni confronto mantiene la propria copertura. «Quadrato» riguarda le righe indicate; non certifica la chiusura contabile dell’intero mese. Differenza = fonte A meno fonte B."), /* @__PURE__ */ React.createElement("div", { className: "af-checks" }, period.checks.map((c) => /* @__PURE__ */ React.createElement("article", {
		key: c.id,
		className: "af-check af-check-" + c.state
	}, /* @__PURE__ */ React.createElement("div", { className: "af-section-title" }, /* @__PURE__ */ React.createElement("h3", null, c.title), /* @__PURE__ */ React.createElement("span", { className: "af-badge af-" + c.state }, checkState[c.state])), /* @__PURE__ */ React.createElement("div", { className: "af-check-values" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", null, c.sourceA), /* @__PURE__ */ React.createElement("strong", null, money(c.amountA, c.currency))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", null, c.sourceB), /* @__PURE__ */ React.createElement("strong", null, money(c.amountB, c.currency))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", null, "Differenza"), /* @__PURE__ */ React.createElement("strong", null, money(c.difference, c.currency)))), /* @__PURE__ */ React.createElement("p", null, c.detail), c.totalGroups > 0 && /* @__PURE__ */ React.createElement("small", null, num(c.matchedGroups), " / ", num(c.totalGroups), " ", c.id === "payments" ? "righe" : "gruppi ordine / SKU / tipo", " abbinati")))), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Ponte commissioni · mese di registrazione e competenza"), /* @__PURE__ */ React.createElement("p", null, "Il totale degli addebiti registrati, IVA inclusa, resta ", money(period.feeBridge.postedCosts), ". I movimenti seguenti sono attribuiti al mese fiscale solo quando ordine, SKU, tipo e importo cliente coincidono nei report."), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Movimento"), /* @__PURE__ */ React.createElement("th", null, "Gruppi"), /* @__PURE__ */ React.createElement("th", null, "Costi IVA inclusa"), /* @__PURE__ */ React.createElement("th", null, "Rettifica IVA inclusa"))), /* @__PURE__ */ React.createElement("tbody", null, period.feeBridge.lines.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.fromPeriod + r.toPeriod }, /* @__PURE__ */ React.createElement("th", null, "Registrati ", r.fromPeriod, " · competenza ", r.toPeriod), /* @__PURE__ */ React.createElement("td", null, num(r.groups)), /* @__PURE__ */ React.createElement("td", null, money(r.amount)), /* @__PURE__ */ React.createElement("td", null, money(r.adjustment)))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Rettifica complessiva"), /* @__PURE__ */ React.createElement("td", null, num(period.feeBridge.groups)), /* @__PURE__ */ React.createElement("td", null, "—"), /* @__PURE__ */ React.createElement("td", null, money(period.feeBridge.adjustment)))), /* @__PURE__ */ React.createElement("tfoot", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Costi riallineati al mese fiscale · IVA inclusa"), /* @__PURE__ */ React.createElement("td", null), /* @__PURE__ */ React.createElement("td", null), /* @__PURE__ */ React.createElement("td", null, money(period.feeBridge.alignedCosts))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Fatture e note di credito · lordo IT"), /* @__PURE__ */ React.createElement("td", null), /* @__PURE__ */ React.createElement("td", null), /* @__PURE__ */ React.createElement("td", null, money(period.feeBridge.invoiceGross))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Differenza residua"), /* @__PURE__ */ React.createElement("td", null), /* @__PURE__ */ React.createElement("td", null), /* @__PURE__ */ React.createElement("td", null, money(period.feeBridge.difference)))))), /* @__PURE__ */ React.createElement("p", null, period.feeBridge.unresolvedGroups ? num(period.feeBridge.unresolvedGroups) + " gruppi ordine non ancora attribuibili con certezza; non vengono spostati di mese." : "Tutti i gruppi ordine del periodo hanno un abbinamento verificato.", " Il riallineamento non genera un nuovo costo e non cambia il saldo del conto.")), m && /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Ponte tra Pagamenti e report IVA · clienti Italia"), /* @__PURE__ */ React.createElement("p", null, "Pagamenti contiene vendite meno rimborsi per ", money(period.revenue.gross), ". Dopo l’IVA trattenuta da Amazon (", money(m.withheld), "), il valore confrontabile è ", money(m.paymentTotal), ". Nel report IVA: ", money(m.vatTotal), "."), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Esito dell’abbinamento"), /* @__PURE__ */ React.createElement("th", null, "Gruppi"), /* @__PURE__ */ React.createElement("th", null, "Pagamenti"), /* @__PURE__ */ React.createElement("th", null, "Report IVA"), /* @__PURE__ */ React.createElement("th", null, "Differenza"))), /* @__PURE__ */ React.createElement("tbody", null, m.buckets.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.label }, /* @__PURE__ */ React.createElement("th", null, r.label), /* @__PURE__ */ React.createElement("td", null, num(r.groups)), /* @__PURE__ */ React.createElement("td", null, money(r.payments)), /* @__PURE__ */ React.createElement("td", null, money(r.vat)), /* @__PURE__ */ React.createElement("td", null, money(r.difference))))), /* @__PURE__ */ React.createElement("tfoot", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Totale riconciliato nel ponte"), /* @__PURE__ */ React.createElement("td", null, "—"), /* @__PURE__ */ React.createElement("td", null, money(m.paymentTotal)), /* @__PURE__ */ React.createElement("td", null, money(m.vatTotal)), /* @__PURE__ */ React.createElement("td", null, money(m.paymentTotal - m.vatTotal)))))), /* @__PURE__ */ React.createElement("p", null, "I gruppi possono avere una parte abbinata e una parte successiva alla copertura: i conteggi delle categorie non sono sommabili. Le voci «solo» restano da verificare, anche quando vicine al cambio mese."), m.exceptions.length > 0 && /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Scarti ancora da verificare per SKU · ", m.exceptions.length, " gruppi"), /* @__PURE__ */ React.createElement("div", { className: "af-table" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "SKU / evento"), /* @__PURE__ */ React.createElement("th", null, "Righe Pagamenti / IVA"), /* @__PURE__ */ React.createElement("th", null, "Pagamenti"), /* @__PURE__ */ React.createElement("th", null, "IVA"), /* @__PURE__ */ React.createElement("th", null, "Differenza"), /* @__PURE__ */ React.createElement("th", null, "Motivo"))), /* @__PURE__ */ React.createElement("tbody", null, m.exceptions.map((r, i) => /* @__PURE__ */ React.createElement("tr", { key: i }, /* @__PURE__ */ React.createElement("th", null, r.sku, /* @__PURE__ */ React.createElement("small", null, r.event)), /* @__PURE__ */ React.createElement("td", null, r.paymentRows, " / ", r.vatRows), /* @__PURE__ */ React.createElement("td", null, money(r.payments)), /* @__PURE__ */ React.createElement("td", null, money(r.vat)), /* @__PURE__ */ React.createElement("td", null, money(r.difference)), /* @__PURE__ */ React.createElement("td", null, r.reason)))))))), /* @__PURE__ */ React.createElement("section", { className: "af-section" }, /* @__PURE__ */ React.createElement("h3", null, "Chiusura ancora necessaria"), /* @__PURE__ */ React.createElement("p", null, "Estratti dei versamenti e banca per gli accrediti; dettaglio delle fatture per gli eventuali scarti residui sui costi; costi prodotto e contabilità per utile, IVA da versare e valore delle rimanenze. Il B2B è verificato nel totale ordinato Italia; il report Pagamenti non espone una colonna B2B per riconciliare separatamente questo sottoinsieme.")));
}
function AmazonFinanceSummary({ data, now = Date.now(), kind = "sales", onOpen }) {
	const month = periodOf(now), a = data?.analysis, p = a?.periods.find((p) => p.period === month), b = a?.business.find((p) => p.period === month), g = a?.global.find((p) => p.period === month), ledger = data?.ledgers.find((p) => p.periodStart.startsWith(month));
	const aged = data?.inventory?.skus.filter((s) => s.marketplace === "IT" && s.currency === "EUR" && s.agedEstimate !== null), agedValue = aged?.length ? aged.reduce((n, s) => n + Math.round(s.agedEstimate * 100), 0) / 100 : null;
	const stale = !data || now - Date.parse(data.observedAt) > 6 * 36e5;
	const entries = kind === "sales" ? [[
		"Mese · Amazon globale",
		g?.completeFromStart ? money(g.orderedSales) : "—",
		"Mese"
	], [
		"Di cui B2B · Italia",
		money(b?.b2bSales),
		"B2B IT"
	]] : [
		[
			"Addebiti FBA · IT",
			money(p?.fbaCosts),
			"FBA lordo"
		],
		[
			"Addebiti Amazon · IT",
			money(ledger?.amazonFees == null ? null : -ledger.amazonFees),
			"Tot. lordo"
		],
		[
			"Anzianità · stima",
			money(agedValue),
			"Anz."
		]
	];
	return /* @__PURE__ */ React.createElement("button", {
		type: "button",
		className: "af-glance af-glance-" + kind,
		onClick: onOpen,
		"aria-label": kind === "sales" ? "Apri panoramica e riconciliazione Amazon" : "Apri costi FBA e rimanenze",
		"aria-haspopup": "dialog"
	}, /* @__PURE__ */ React.createElement("span", { className: "af-glance-values" }, entries.map(([label, value, short]) => /* @__PURE__ */ React.createElement("span", { key: label }, /* @__PURE__ */ React.createElement("small", { "data-short": short }, label), /* @__PURE__ */ React.createElement("strong", null, value)))), /* @__PURE__ */ React.createElement("span", { className: "af-glance-foot" }, stale ? "Fonti da aggiornare" : kind === "sales" ? "Mondo al " + dateLabel(g?.end) + (g?.partial ? "*" : "") + " · B2B al " + dateLabel(b?.end) : "Addebiti al " + dateLabel(p?.end) + " · IVA inclusa", /* @__PURE__ */ React.createElement("span", null, p ? "Quadratura " + p.checks.filter((c) => c.state === "matched").length + "/" + p.checks.length : "Fonti in attesa", " ↗")));
}

return Object.assign(AmazonFinanceDialog,{Summary:AmazonFinanceSummary});
}
