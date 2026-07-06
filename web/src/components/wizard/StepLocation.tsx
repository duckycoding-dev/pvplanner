import { useMemo, useState } from "react";
import type { WizardInputs } from "../../lib/setupTypes.ts";
import { NumberField } from "../NumberField.tsx";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Step 1 — località: coordinate (lat/lon), ricerca testuale via Nominatim (solo su
 * click, per rispettare la rate policy 1 req/s di OSM), fuso orario e toggle orizzonte.
 */
export function StepLocation({
  inputs,
  patch,
}: {
  inputs: WizardInputs;
  patch: (p: Partial<WizardInputs>) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ~600 fusi orari: calcolati una sola volta.
  const zones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  const setLocation = (patchLoc: Partial<WizardInputs["location"]>): void => {
    patch({ location: { ...inputs.location, ...patchLoc } });
  };

  const search = async (): Promise<void> => {
    const q = query.trim();
    if (q === "") return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as NominatimResult[];
      setResults(data);
      if (data.length === 0) setSearchError("Nessun risultato.");
    } catch {
      setSearchError("Ricerca non riuscita. Riprova tra qualche secondo.");
    } finally {
      setSearching(false);
    }
  };

  const pick = (r: NominatimResult): void => {
    setLocation({ latitude: Number(r.lat), longitude: Number(r.lon), label: r.display_name });
    setResults([]);
    setQuery("");
  };

  return (
    <div className="wizard-body">
      <h4>Località</h4>

      <div className="wizard-search">
        <label className="text-field">
          Cerca un luogo
          <input
            value={query}
            placeholder="es. Roma, Via Nazionale 1"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
          />
        </label>
        <button onClick={() => void search()} disabled={searching || query.trim() === ""}>
          {searching ? "Cerco…" : "Cerca"}
        </button>
      </div>
      {searchError !== null && <p className="err">{searchError}</p>}
      {results.length > 0 && (
        <ul className="wizard-results">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lon}-${i}`} onClick={() => pick(r)}>
              {r.display_name}
            </li>
          ))}
        </ul>
      )}
      <p className="wizard-attribution">© OpenStreetMap contributors</p>

      {inputs.location.label !== "" && (
        <p className="note">
          Selezionata: <b>{inputs.location.label}</b>
        </p>
      )}

      <NumberField
        label="Latitudine"
        value={inputs.location.latitude}
        min={-90}
        max={90}
        step={0.001}
        onChange={(v) => setLocation({ latitude: v })}
      />
      <NumberField
        label="Longitudine"
        value={inputs.location.longitude}
        min={-180}
        max={180}
        step={0.001}
        onChange={(v) => setLocation({ longitude: v })}
      />

      <label className="text-field">
        Fuso orario
        <select value={inputs.timeZone} onChange={(e) => patch({ timeZone: e.target.value })}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>

      <label className="wizard-toggle">
        <input
          type="checkbox"
          checked={inputs.useHorizon}
          onChange={(e) => patch({ useHorizon: e.target.checked })}
        />
        Considera l'orizzonte (ombreggiamento del terreno)
      </label>
    </div>
  );
}
