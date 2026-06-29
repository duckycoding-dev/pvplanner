import type { CostResult } from "../../../src/core/economics/tariff.ts";
import { fmt } from "../lib/format.ts";
import { InfoTip } from "./InfoTip.tsx";

/** Compact cost block: buy / sell / net (+ optional battery saving), in euro. */
export function CostSummary({ cost, savingEur }: { cost: CostResult; savingEur?: number }) {
  const eur = (v: number): string => `${fmt(v, 2)} €`;
  return (
    <div className="cost-summary">
      <span>
        spesa acquisto<InfoTip k="costo" /> <b>{eur(cost.annual.buyCost)}</b>
      </span>
      <span>
        ricavo vendita<InfoTip k="ricavo" /> <b>{eur(cost.annual.sellRevenue)}</b>
      </span>
      <span>
        netto<InfoTip k="nettoCosto" /> <b>{eur(cost.annual.netCost)}</b>
      </span>
      {savingEur !== undefined && (
        <span>
          risparmio batteria/anno<InfoTip k="risparmioBatteria" /> <b>{eur(savingEur)}</b>
        </span>
      )}
      <span className="unit">€/anno</span>
    </div>
  );
}
