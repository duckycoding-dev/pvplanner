import { type DragEvent, useState } from "react";
import { detectEDistribuzione, parseEDistribuzione } from "../../../../src/core/consumption/parseEDistribuzione.ts";
import { type CsvParseOptions, parseConsumptionCsv } from "../../../../src/core/consumption/parseCsv.ts";
import type { CanonicalConsumption } from "../../../../src/core/consumption/canonical.ts";
import type { ConsumptionSpec, StoredSetup } from "../../lib/setupTypes.ts";
import { ConsumptionPreview } from "./ConsumptionPreview.tsx";

export interface CsvState {
  filename: string;
  result: CanonicalConsumption;
  warnings: string[];
}

/**
 * Metodo CSV: file reale (curva di carico e-distribuzione o CSV generico timestamp,kWh).
 * Auto-detect del formato; mostra copertura, warning collassabili e anteprima.
 */
export function ConsumptionCsv({
  setup,
  state,
  setState,
  apply,
}: {
  setup: StoredSetup;
  state: CsvState | null;
  setState: (s: CsvState | null) => void;
  apply: (spec: ConsumptionSpec, result: CanonicalConsumption) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [showWarnings, setShowWarnings] = useState(false);
  const [drag, setDrag] = useState(false);

  const parse = async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const opts: CsvParseOptions = {
        timeZone: setup.inputs.timeZone,
        timestampsUtc: setup.viz.hourly.timestampsUtc,
        months: setup.viz.hourly.months,
      };
      const outcome = detectEDistribuzione(text)
        ? parseEDistribuzione(text, file.name, opts)
        : parseConsumptionCsv(text, file.name, opts);
      setState({ filename: file.name, result: outcome.result, warnings: outcome.warnings });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState(null);
    }
  };

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) void parse(file);
  };

  return (
    <div className="consumption-method">
      <p className="note">
        Carica la <strong>curva di carico</strong> reale (dal portale del distributore, es. e-distribuzione) oppure un
        CSV a due colonne <code>timestamp, kWh</code> (orario o quartorario). Il formato viene riconosciuto in automatico.
      </p>

      <div
        className={drag ? "dropzone drag" : "dropzone"}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        trascina qui il CSV, oppure{" "}
        <label className="file-pick">
          scegli file
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void parse(file);
            }}
          />
        </label>
      </div>

      {error !== null && <p className="err">{error}</p>}

      {state !== null && (
        <>
          <p className="note">
            <strong>{state.filename}</strong> · copertura {state.result.meta.coveragePct}%
          </p>
          {state.warnings.length > 0 && (
            <div className="consumption-warnings">
              <button className="section-toggle" onClick={() => setShowWarnings((o) => !o)}>
                {showWarnings ? "▾" : "▸"} {state.warnings.length} avvisi
              </button>
              {showWarnings && (
                <ul>
                  {state.warnings.map((w, i) => (
                    <li key={i} className="note">
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <ConsumptionPreview result={state.result} viz={setup.viz} />
          <button className="wizard-primary" onClick={() => apply({ method: "csv", filename: state.filename }, state.result)}>
            Applica
          </button>
        </>
      )}
    </div>
  );
}
