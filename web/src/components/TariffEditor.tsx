import { useState } from "react";
import type { Tariff, TariffBand } from "../../../src/core/economics/tariff.ts";
import { f1f2f3Tariff, monorarioTariff, parseTariff, serializeTariff, validateTariff } from "../lib/tariffPresets.ts";
import { NumberField } from "./NumberField.tsx";
import { ImportModal } from "./ImportModal.tsx";

const DAY_LABELS = ["L", "M", "M", "G", "V", "S", "D"]; // index 0=Lun .. 6=Dom

let bandSeq = 0;
function newBand(): TariffBand {
  bandSeq += 1;
  return { id: `b${bandSeq}`, name: `Fascia ${bandSeq}`, color: "#3b82f6", hours: [[8, 20]], days: [0, 1, 2, 3, 4], buyPrice: 0.25 };
}

export function TariffEditor({ tariff, setTariff }: { tariff: Tariff; setTariff: (t: Tariff) => void }) {
  const [importing, setImporting] = useState(false);

  const updateBand = (id: string, patch: Partial<TariffBand>): void => {
    setTariff({ ...tariff, bands: tariff.bands.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  };
  const toggleDay = (b: TariffBand, day: number): void => {
    const days = b.days.includes(day) ? b.days.filter((d) => d !== day) : [...b.days, day].sort((x, y) => x - y);
    updateBand(b.id, { days });
  };
  const setHour = (b: TariffBand, which: 0 | 1, value: number): void => {
    const first = b.hours[0] ?? [0, 24];
    const pair: [number, number] = which === 0 ? [value, first[1]] : [first[0], value];
    updateBand(b.id, { hours: [pair] });
  };

  const exportTariff = (): void => {
    const blob = new Blob([serializeTariff(tariff)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tariffa.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="editor">
      <div className="editor-actions">
        <button onClick={() => setTariff(monorarioTariff(0.25, 0.1))}>Monorario</button>
        <button onClick={() => setTariff(f1f2f3Tariff())}>F1/F2/F3</button>
      </div>

      <label className="text-field">
        Nome
        <input value={tariff.label} onChange={(e) => setTariff({ ...tariff, label: e.target.value })} />
      </label>

      <NumberField
        label="Prezzo acquisto default"
        unit="€/kWh"
        value={tariff.defaultBuyPrice}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => setTariff({ ...tariff, defaultBuyPrice: v })}
      />
      <NumberField
        label="Prezzo vendita"
        unit="€/kWh"
        value={tariff.sellPrice}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => setTariff({ ...tariff, sellPrice: v })}
      />

      {tariff.bands.map((b) => {
        const [from, to] = b.hours[0] ?? [0, 24];
        return (
          <fieldset className="band-edit" key={b.id} style={{ borderLeftColor: b.color }}>
            <legend>
              <input
                className="band-name"
                value={b.name}
                onChange={(e) => updateBand(b.id, { name: e.target.value })}
              />
              <input
                type="color"
                value={b.color}
                onChange={(e) => updateBand(b.id, { color: e.target.value })}
              />
              <button className="band-del" onClick={() => setTariff({ ...tariff, bands: tariff.bands.filter((x) => x.id !== b.id) })}>
                ✕
              </button>
            </legend>
            <div className="band-hours">
              <NumberField label="dalle ora" value={from} min={0} max={24} step={1} onChange={(v) => setHour(b, 0, v)} />
              <NumberField label="alle ora" value={to} min={0} max={24} step={1} onChange={(v) => setHour(b, 1, v)} />
            </div>
            <div className="band-days">
              {DAY_LABELS.map((lbl, d) => (
                <button
                  key={d}
                  className={b.days.includes(d) ? "day on" : "day"}
                  onClick={() => toggleDay(b, d)}
                  title={`giorno ${lbl}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <NumberField
              label="prezzo acquisto"
              unit="€/kWh"
              value={b.buyPrice}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateBand(b.id, { buyPrice: v })}
            />
          </fieldset>
        );
      })}

      <div className="editor-actions">
        <button onClick={() => setTariff({ ...tariff, bands: [...tariff.bands, newBand()] })}>+ fascia</button>
        <button onClick={exportTariff}>Esporta</button>
        <button onClick={() => setImporting(true)}>Importa</button>
      </div>
      <p className="note">Le ore non coperte da alcuna fascia usano il prezzo default. Risoluzione oraria.</p>

      {importing && (
        <ImportModal
          title="Importa Tariffa"
          parse={parseTariff}
          validate={validateTariff}
          onImport={setTariff}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  );
}
