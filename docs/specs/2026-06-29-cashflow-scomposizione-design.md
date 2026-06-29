---
title: Andamento economico (cashflow) + scomposizione del rientro — design
last_updated: 2026-06-29
summary: Sezione nel Confronto che mostra l'andamento del cashflow cumulato di due sistemi scelti (tra A, B, senza FV) su un orizzonte di anni regolabile, con tabella per-anno e una scomposizione del rientro (da dove viene il risparmio) per rendere comprensibile il payback.
status: draft
legend:
  - "cashflow cumulato: € netti rispetto al non installare nulla, da anno 0 (−CAPEX) in avanti"
  - "risparmio annuo: bolletta evitata = netto(senza FV) − netto(sistema) [€/anno]"
  - "acquisto evitato: minor spesa di prelievo rispetto a senza FV [€/anno]"
  - "ricavo export: incasso da vendita in rete del sistema [€/anno]"
  - "payback: anno in cui il cumulato torna ≥ 0"
related:
  - 06-economia.md
  - 05-costi-fasce.md
  - 04-confronto-sistemi.md
---

# Andamento economico (cashflow) + scomposizione del rientro — design

## Obiettivo
Rendere **comprensibile il payback**: oggi è solo un numero ("X anni"). Una curva del cashflow
cumulato + la **scomposizione** del risparmio annuo mostrano *da dove* viene il rientro e *quando* il
sistema va in pari. Nuova sezione nella scheda **Confronto**, tutto live nel browser.

## Modello
Per un sistema S, il **cashflow cumulato** rispetto a «senza FV» è:
```
cum(0) = −CAPEX(S)
cum(y) = cum(y−1) + risparmio_annuo(S) + (y ≤ N ? incentivo(S)/N : 0)
```
identico alla formula del payback (`06-economia.md`), così la curva attraversa lo zero esattamente al
`paybackYears`. «senza FV» ha CAPEX=0 e risparmio=0 → linea piatta a **0** (la soglia di pareggio).

**Scomposizione del risparmio annuo** (esatta):
```
risparmio_annuo = netto(senzaFV) − netto(S)
               = (acquisto_senzaFV − acquisto_S)  +  (vendita_S − vendita_senzaFV)
               = acquisto evitato  +  ricavo export      (vendita_senzaFV = 0)
```
Quindi il rientro annuo è la somma di **bolletta di acquisto evitata** + **ricavi da export**; sopra,
nei primi N anni, si aggiunge la **quota incentivo**.

## Componenti
### Lib pura `web/src/lib/cashflow.ts`
```ts
export interface CashflowInput {
  capex: number; annualSaving: number; incentiveTotal: number; incentiveYears: number; years: number;
}
// cumulato a fine di ciascun anno 0..years (indice 0 = −capex); coerente con paybackYears
export function cashflowSeries(input: CashflowInput): number[];
```
`incYears = max(1, round(incentiveYears))`, `incPerYear = incentiveTotal/incYears`. Test: lunghezza
`years+1`, `[0]=−capex`, l'anno di attraversamento dello zero coincide con `paybackYears`, lo slope
cala dopo `incYears`.

### `web/src/lib/metricsTable.ts`
Nuovo tipo `Money = "pay" | "earn" | "net" | "benefit"`. `benefit`: `v>0 → verde`, `v<0 → rosso`
(opposto di `net`), per il cumulato.

### Componente `web/src/components/CashflowSection.tsx`
Props da `ComparePage` (riusa i casi già calcolati): la base «senza FV»
(`net/buy/sell`) e l'elenco sistemi selezionabili `[{id,label,capex,buy,sell,net}]` per A, B, senza FV,
più `incentive`.

Stato locale: `sel1`, `sel2` (∈ {a,b,novf}); `years` (slider 5–40, default 20). Default: `sel1=A`,
`sel2 = B` se B≠A altrimenti `senza FV` (così si vede subito A attraversare lo zero).

Per ciascun sistema selezionato calcola: `annualSaving = noPvNet − net`,
`buyAvoided = noPvBuy − buy`, `exportRevenue = sell − noPvSell`,
`incentiveTotal = incentiveTotalEur(incentive, capex)`, `series = cashflowSeries(...)`,
`payback = paybackYears({capex, annualSavingEur: annualSaving, incentiveEur: incentiveTotal,
incentiveYears, horizonYears: years})`.

Render:
1. **Controlli**: due `<select>` (A / B / senza FV) + slider anni.
2. **Grafico** (LineChart): una linea per sistema selezionato, X = anni 0..N, Y = € cumulati;
   `ReferenceLine y=0` (pareggio); `ReferenceDot` al payback di ciascun sistema (se entro l'orizzonte).
3. **Scomposizione del rientro** (`MetricsTable`, colonne = sistemi selezionati): righe
   «Spesa acquisto evitata» (earn), «Ricavo vendita export» (earn), «Risparmio annuo» (earn),
   «Incentivo/anno (×N)» (earn), «Costo impianto (CAPEX)» (pay), «Tempo di rientro» (lower, "anni").
4. **Cumulato per anno** (`MetricsTable` collassabile, colonne = sistemi, righe = anni 0..N),
   valori `benefit` (segno), colonna Δ = differenza tra i due sistemi.

## Posizionamento
In fondo alla scheda **Confronto**, dopo i grafici A vs B. Non tocca le altre schede.

## Limiti (v1)
Stessa semplificazione del payback (`06-economia.md`): nessuna inflazione prezzi, nessun degrado
pannelli/fade batteria, risparmio annuo costante, nessuna attualizzazione (NPV/TIR). La sezione è la
base naturale per aggiungerli in seguito.

## File toccati
- Nuovo: `web/src/lib/cashflow.ts` + `test/cashflow.test.ts`.
- Nuovo: `web/src/components/CashflowSection.tsx`.
- `web/src/lib/metricsTable.ts`: tipo `benefit`.
- `web/src/components/ComparePage.tsx`: monta `CashflowSection` passando i casi.
- `web/src/styles.css`: controlli (select/slider) se serve.
- Doc: questo file + `06-economia.md` (rimando alla visualizzazione) + `index.md`.
