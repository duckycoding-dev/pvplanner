---
title: Economia — costo installazione, incentivi, tempo di rientro
last_updated: 2026-06-29
summary: Come si calcola il tempo di rientro (payback) di un impianto a partire dal costo di installazione, dagli incentivi e dal risparmio annuo in bolletta rispetto al non avere impianto. Calcolo live nel browser.
status: draft
legend:
  - "CAPEX: costo di installazione del sistema [€]"
  - "risparmio annuo: bolletta evitata = netto(senza FV) − netto(sistema) [€/anno]"
  - "incentivo: detrazione/bonus, % del CAPEX o importo fisso, restituito in N anni [€]"
  - "payback: anni perché il cumulato dei flussi torni ≥ 0"
related:
  - 05-costi-fasce.md
  - 04-confronto-sistemi.md
---

# Economia — costo installazione, incentivi, tempo di rientro

Sopra al calcolo dei costi a fasce (`05-costi-fasce.md`) si stima il **tempo di rientro** della spesa
di installazione. Tutto live nel browser; nessun nuovo dato scaricato.

## Dati
- **CAPEX per sistema** (€): modificabile nel menu sia per il Sistema A sia per il Sistema B; il valore
  iniziale (seed) viene da `config.json` → `economics.installation_cost_eur` (→
  `viz.meta.installationCostEur`); per «senza FV» è 0.
- **Incentivo** (policy condivisa, modificabile nel menu, seed da `config.json` →
  `economics.incentive`): **% del CAPEX** *oppure* **importo fisso €**, restituito in **N anni**
  (1 = immediato).

## Formule
- **Risparmio annuo** del sistema = `netto(senza FV) − netto(sistema)`, dove i netti sono quelli
  calcolati con la tariffa a fasce (vedi `05-costi-fasce.md`). «senza FV» = intero consumo importato,
  niente export.
- **Importo incentivo** = `mode = "percent" ? CAPEX × value/100 : value`.
- **Tempo di rientro** = primo anno in cui il **cashflow cumulato** torna ≥ 0:
  ```
  cum(0) = −CAPEX
  cum(y) = cum(y−1) + risparmio annuo + (y ≤ N ? incentivo/N : 0)
  ```
  Si restituisce l'anno **frazionario** di attraversamento dello zero; `null`/«oltre 40 anni» se non
  rientra entro l'orizzonte. Funzione pura `paybackYears` in `src/core/economics/payback.ts`.

## Dove si vede
- **Panoramica annuale**: card «Tempo di rientro» per il **Sistema A** (con la sua batteria, se
  presente) vs «senza FV»; se A non ha batteria è il payback del solo FV.
- **Confronto**: riga «Tempo di rientro» per ogni colonna (la colonna «senza FV», priva di CAPEX,
  mostra «—»).

## Limiti (v1)
Stima **semplice**: nessuna inflazione dei prezzi dell'energia, nessun degrado dei pannelli, nessun
fade della batteria, nessuna attualizzazione (NPV/TIR). Il risparmio annuo è assunto costante. Questi
raffinamenti (cashflow pluriennale, NPV, sensibilità) sono evoluzioni naturali sopra questa base.

## Implementazione
- `src/core/economics/payback.ts` (puro): `paybackYears`.
- `web/src/lib/economics.ts`: `Incentive`, `incentiveTotalEur`, `systemPaybackYears`.
- `web/src/lib/viewCosts.ts`: `noPvCost` (bolletta senza impianto).
- UI: `IncentiveEditor` (menu), campo CAPEX in `SystemBEditor`, card in `AnnualOverview`, riga in
  `ComparePage`.
