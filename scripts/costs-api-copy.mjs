import assert from 'node:assert/strict';
// User-approved API migration, 17 October 2026: reverse only six audited copy edits.
export const COSTS_API_COPY = [
  [
    "Prima lettura dal browser locale in attesa.",
    "Prima lettura dei costi in attesa."
  ],
  [
    "Ultimo invio dal Mac mini:",
    "Ultimo aggiornamento:"
  ],
  [
    "Invio non recente. Verificare che il Mac mini sia acceso e che gli accessi siano validi.",
    "Aggiornamento non recente. Verificare lo stato delle fonti e degli accessi."
  ],
  [
    "Accesso locale da rinnovare.",
    "Accesso da rinnovare."
  ],
  [
    "Controllo locale ogni 15 minuti.",
    "Controllo ogni 15 minuti."
  ],
  [
    "In attesa della verifica dal browser locale. Stime Google Cloud al netto dei crediti.",
    "Stime Google Cloud al netto dei crediti."
  ]
];
export function restoreCostsCopy(value) {
 let result=value;
 for(const [before,after] of [...COSTS_API_COPY].sort((a,b)=>b[1].length-a[1].length)) {
   assert.equal(result.split(after).length,2,'Cost copy must occur exactly once: '+after);
   result=result.replace(after,before);
 }
 return result;
}
