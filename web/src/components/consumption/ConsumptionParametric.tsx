import { useEffect, useState } from "react";
import type { HouseParams } from "../../../../src/core/consumption/houseLoad.ts";
import type { CanonicalConsumption } from "../../../../src/core/consumption/canonical.ts";
import type { ConsumptionSpec, StoredSetup } from "../../lib/setupTypes.ts";
import { PARAMETRIC_DISCLAIMER, parametricConsumption } from "../../lib/parametricConsumption.ts";
import { InfoTip } from "../InfoTip.tsx";
import { NumberField } from "../NumberField.tsx";
import { ConsumptionPreview } from "./ConsumptionPreview.tsx";

interface FieldSpec {
  key: keyof HouseParams;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  /** Descrizione + esempio, mostrata come tooltip ⓘ accanto alla label. */
  desc: string;
}

const BASE_FIELDS: FieldSpec[] = [
  { key: "heatedAreaM2", label: "Superficie riscaldata", unit: "m²", min: 20, max: 1000, step: 5, desc: "Metri quadri effettivamente riscaldati dalla pompa di calore (escludi garage, cantina, locali spenti). Es. 120 m² per una villetta media." },
  { key: "specificHeatDemandKwhM2y", label: "Fabbisogno termico specifico", unit: "kWh/m²·anno", min: 20, max: 200, step: 5, desc: "Quanta energia termica chiede la casa per m² all'anno: dipende dall'isolamento. 40 ≈ nuova costruzione ben isolata; 90 ≈ casa ristrutturata; 120+ ≈ casa non isolata. Lo trovi anche sull'APE." },
  { key: "occupants", label: "Occupanti", min: 1, max: 10, step: 1, desc: "Persone che vivono in casa: scala l'acqua calda sanitaria e i consumi legati alla presenza." },
  { key: "wfhOccupants", label: "Occupanti in smart-working", min: 0, max: 10, step: 1, desc: "Quante persone restano a casa nei giorni feriali (lavoro da remoto): aggiungono consumo diurno nei feriali (PC, luci, cucina a pranzo)." },
  { key: "heatPumpScop", label: "SCOP pompa di calore", min: 2, max: 6, step: 0.1, desc: "Rendimento STAGIONALE della pompa di calore: kWh termici resi per kWh elettrico assorbito, in media sull'inverno. È sulla scheda tecnica (SCOP). Tipico 3–4.5; fissa la scala del consumo elettrico per riscaldare." },
  { key: "dhwKwhPerPersonY", label: "ACS per persona", unit: "kWh term/anno", min: 0, max: 2000, step: 50, desc: "Energia TERMICA annua per l'acqua calda sanitaria, per persona. ~700 kWh tipico (docce quotidiane); 0 se l'acqua calda non è elettrica (es. caldaia a gas)." },
  { key: "baseLoadAnnualKwh", label: "Consumo base annuo", unit: "kWh", min: 500, max: 8000, step: 100, desc: "Tutto tranne riscaldamento e acqua calda: elettrodomestici, luci, standby, cucina. 2000–3500 kWh tipico per una famiglia; è circa la bolletta annua di chi NON ha pompa di calore." },
];

const ADVANCED_FIELDS: FieldSpec[] = [
  { key: "heatingBaseTempC", label: "Temperatura base riscaldamento", unit: "°C", min: 10, max: 20, step: 1, desc: "Temperatura esterna sopra la quale il riscaldamento resta spento: sotto questa soglia il fabbisogno cresce col freddo. Tipico 15–16 °C." },
  { key: "copRef", label: "COP di riferimento", min: 1, max: 6, step: 0.1, desc: "COP dichiarato dalla scheda tecnica al punto di riferimento (vedi campo successivo). Serve a modellare come il rendimento cala col freddo. Es. 4.5 per una PdC dichiarata A7/W35." },
  { key: "copRefOutdoorC", label: "T esterna del COP rif.", unit: "°C", min: -10, max: 20, step: 1, desc: "Temperatura esterna a cui è dichiarato il COP di riferimento: nelle schede \"A7/W35\" è il 7 di A7." },
  { key: "flowTempC", label: "Temperatura mandata", unit: "°C", min: 25, max: 60, step: 1, desc: "Temperatura dell'acqua che circola nei terminali: ~35 °C pavimento radiante, 45–55 °C radiatori. Più è alta, peggiore il COP reale." },
  { key: "dhwCop", label: "COP ACS", min: 1, max: 5, step: 0.1, desc: "Rendimento della pompa di calore quando scalda l'acqua sanitaria: più basso del riscaldamento perché l'acqua va portata a 50–60 °C. Tipico 2.5–3." },
  { key: "standbyLossPct", label: "Perdite di standby", unit: "%", min: 0, max: 20, step: 1, desc: "Perdite del serbatoio/accumulo (calore disperso da mantenere), in % del fabbisogno termico di riscaldamento + ACS. Tipico 3–5%." },
  { key: "bufferSmoothingHours", label: "Inerzia puffer", unit: "ore", min: 0, max: 12, step: 1, desc: "Inerzia termica del puffer/impianto: distribuisce i picchi di riscaldamento su questa finestra di ore, appiattendo la curva. 0 = nessun accumulo; 2–4 tipico con puffer." },
];

/**
 * Metodo parametrico: modello fisico deterministico (houseLoad) sulle temperature reali
 * del sito. Disclaimer sempre visibile. Anteprima live con debounce. Nessun LLM a runtime.
 * Richiede `hourlyT2m` (temperatura del sito): sul demo / senza setup è disabilitato.
 */
export function ConsumptionParametric({
  setup,
  house,
  setHouse,
  apply,
}: {
  setup: StoredSetup;
  house: HouseParams;
  setHouse: (h: HouseParams) => void;
  apply: (spec: ConsumptionSpec, result: CanonicalConsumption) => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  const [preview, setPreview] = useState<CanonicalConsumption | null>(null);

  const hasT2m = setup.hourlyT2m.length > 0;

  // Ricalcolo live con debounce 300 ms (modello fisico, deterministico).
  useEffect(() => {
    if (!hasT2m) {
      setPreview(null);
      return;
    }
    const id = setTimeout(() => {
      try {
        setPreview(parametricConsumption(house, setup));
      } catch {
        setPreview(null);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [house, setup, hasT2m]);

  if (!hasT2m) {
    return (
      <div className="consumption-method">
        <p className="note">
          La stima parametrica è disponibile dopo il setup della tua località (serve la temperatura oraria reale del
          sito). Esegui prima il setup dati PVGIS.
        </p>
      </div>
    );
  }

  const set = (key: keyof HouseParams, v: number): void => setHouse({ ...house, [key]: v });

  const renderField = (f: FieldSpec) => (
    <NumberField
      key={f.key}
      label={f.label}
      unit={f.unit}
      value={house[f.key]}
      min={f.min}
      max={f.max}
      step={f.step}
      onChange={(v) => set(f.key, v)}
      tip={{ term: f.label, desc: f.desc }}
    />
  );

  return (
    <div className="consumption-method">
      <div className="consumption-disclaimer">{PARAMETRIC_DISCLAIMER}</div>

      {BASE_FIELDS.map(renderField)}

      <label className="consumption-adv-toggle">
        <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} /> parametri avanzati
        (pompa di calore, puffer)
        <InfoTip
          entry={{
            term: "Parametri avanzati",
            desc: "Dettagli della pompa di calore e dell'accumulo termico. I default sono valori tipici: toccali solo se hai la scheda tecnica della tua PdC.",
          }}
        />
      </label>
      {advanced && ADVANCED_FIELDS.map(renderField)}

      {preview !== null && (
        <>
          <ConsumptionPreview result={preview} viz={setup.viz} />
          <button className="wizard-primary" onClick={() => apply({ method: "parametric", house }, preview)}>
            Applica
          </button>
        </>
      )}
    </div>
  );
}
