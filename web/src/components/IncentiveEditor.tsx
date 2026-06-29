import type { Incentive } from "../lib/economics.ts";
import { NumberField } from "./NumberField.tsx";

/** Shared incentive policy: % of CAPEX or fixed €, returned over N years. */
export function IncentiveEditor({ incentive, setIncentive }: { incentive: Incentive; setIncentive: (i: Incentive) => void }) {
  return (
    <div className="editor">
      <span className="seg">
        <button className={incentive.mode === "percent" ? "active" : ""} onClick={() => setIncentive({ ...incentive, mode: "percent" })}>
          % del costo
        </button>
        <button className={incentive.mode === "fixed" ? "active" : ""} onClick={() => setIncentive({ ...incentive, mode: "fixed" })}>
          importo fisso
        </button>
      </span>
      <NumberField
        label={incentive.mode === "percent" ? "Incentivo (% del costo)" : "Incentivo (€)"}
        value={incentive.value}
        min={0}
        max={incentive.mode === "percent" ? 100 : 60000}
        step={incentive.mode === "percent" ? 1 : 100}
        onChange={(v) => setIncentive({ ...incentive, value: v })}
      />
      <NumberField
        label="Restituito in (anni)"
        value={incentive.years}
        min={1}
        max={20}
        step={1}
        onChange={(v) => setIncentive({ ...incentive, years: Math.max(1, Math.round(v)) })}
      />
      <p className="note">1 anno = immediato. L'incentivo riduce il tempo di rientro.</p>
    </div>
  );
}
