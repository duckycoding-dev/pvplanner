import { ALLOWED_YEARS } from "../../../../src/core/pvgis/allowedYears.ts";
import type { WizardInputs } from "../../lib/setupTypes.ts";
import { NumberField } from "../NumberField.tsx";
import { useT } from "../../i18n/useT.tsx";

type Falda = WizardInputs["falde"][number];

/** id progressivo del tipo "falda-N" evitando collisioni con quelli esistenti. */
function nextFaldaId(falde: Falda[]): string {
  let max = 0;
  for (const f of falde) {
    const m = /^falda-(\d+)$/.exec(f.id);
    if (m !== null) max = Math.max(max, Number(m[1]));
  }
  return `falda-${Math.max(max, falde.length) + 1}`;
}

/**
 * Step 2 — tetto: falde ripetibili (orientamento/inclinazione/pannelli/Wp) più i
 * parametri comuni (posa, perdite, database di radiazione, intervallo anni).
 */
export function StepRoof({
  inputs,
  patch,
}: {
  inputs: WizardInputs;
  patch: (p: Partial<WizardInputs>) => void;
}) {
  const { t } = useT();
  const range = ALLOWED_YEARS[inputs.radiationDb];
  const yearOptions: number[] = [];
  for (let y = range.min; y <= range.max; y++) yearOptions.push(y);

  // Le righe sono indicizzate per posizione (non per id): l'id è editabile e usarlo
  // come chiave farebbe perdere il focus a ogni battuta (remount del fieldset) e
  // patcherebbe più righe in caso di id transitoriamente duplicati.
  const updateFalda = (index: number, p: Partial<Falda>): void => {
    patch({ falde: inputs.falde.map((f, i) => (i === index ? { ...f, ...p } : f)) });
  };
  const addFalda = (): void => {
    patch({
      falde: [...inputs.falde, { id: nextFaldaId(inputs.falde), azimuth: 0, tilt: 30, panelCount: 10, wp: 450 }],
    });
  };
  const removeFalda = (index: number): void => {
    patch({ falde: inputs.falde.filter((_, i) => i !== index) });
  };

  const changeDb = (db: WizardInputs["radiationDb"]): void => {
    const r = ALLOWED_YEARS[db];
    // Riporta gli anni dentro il nuovo intervallo consentito.
    const from = Math.min(Math.max(inputs.years.from, r.min), r.max);
    const to = Math.min(Math.max(inputs.years.to, r.min), r.max);
    patch({ radiationDb: db, years: { from, to } });
  };

  const multiYear = inputs.years.from < inputs.years.to;

  return (
    <div className="wizard-body">
      <h4>{t("wizard.roof.title")}</h4>

      {inputs.falde.map((f, i) => (
        <fieldset className="falda-edit" key={i}>
          <legend>
            <div className="wizard-falda-head">
              <input
                className="wizard-falda-id"
                value={f.id}
                onChange={(e) => updateFalda(i, { id: e.target.value })}
                aria-label={t("wizard.roof.faldaIdAria")}
              />
              {inputs.falde.length > 1 && (
                <button className="wizard-falda-del" onClick={() => removeFalda(i)} aria-label={t("wizard.roof.removeFalda")}>
                  ✕
                </button>
              )}
            </div>
          </legend>
          <NumberField
            label={t("wizard.roof.azimuth")}
            value={f.azimuth}
            min={-180}
            max={180}
            step={5}
            onChange={(v) => updateFalda(i, { azimuth: v })}
          />
          <span className="wizard-hint">{t("wizard.roof.azimuthHint")}</span>
          <NumberField
            label={t("wizard.roof.tilt")}
            value={f.tilt}
            min={0}
            max={90}
            step={1}
            onChange={(v) => updateFalda(i, { tilt: v })}
          />
          <NumberField
            label={t("wizard.roof.panelCount")}
            value={f.panelCount}
            min={1}
            max={200}
            step={1}
            onChange={(v) => updateFalda(i, { panelCount: v })}
          />
          <NumberField
            label={t("wizard.roof.panelPower")}
            unit="Wp"
            value={f.wp}
            min={50}
            max={1000}
            step={5}
            onChange={(v) => updateFalda(i, { wp: v })}
          />
        </fieldset>
      ))}

      <button className="wizard-add" onClick={addFalda}>
        {t("wizard.roof.addFalda")}
      </button>

      <label className="text-field">
        {t("wizard.roof.mounting")}
        <select
          value={inputs.mounting}
          onChange={(e) => patch({ mounting: e.target.value === "free" ? "free" : "building" })}
        >
          <option value="building">{t("wizard.roof.mountingBuilding")}</option>
          <option value="free">{t("wizard.roof.mountingFree")}</option>
        </select>
      </label>

      <NumberField
        label={t("wizard.roof.systemLoss")}
        unit="%"
        value={inputs.systemLossPct}
        min={0}
        max={40}
        step={1}
        onChange={(v) => patch({ systemLossPct: v })}
      />

      <label className="text-field">
        {t("wizard.roof.radiationDb")}
        <select value={inputs.radiationDb} onChange={(e) => changeDb(e.target.value as WizardInputs["radiationDb"])}>
          {(Object.keys(ALLOWED_YEARS) as WizardInputs["radiationDb"][]).map((db) => (
            <option key={db} value={db}>
              {db}
            </option>
          ))}
        </select>
      </label>

      <div className="wizard-search">
        <label className="text-field">
          {t("wizard.roof.yearFrom")}
          <select
            value={inputs.years.from}
            onChange={(e) => patch({ years: { ...inputs.years, from: Number(e.target.value) } })}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-field">
          {t("wizard.roof.yearTo")}
          <select
            value={inputs.years.to}
            onChange={(e) => patch({ years: { ...inputs.years, to: Number(e.target.value) } })}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      {multiYear && (
        <p className="note">
          {t("wizard.roof.multiYearNote", {
            n: inputs.years.to - inputs.years.from + 1,
            from: inputs.years.from,
            to: inputs.years.to,
          })}
        </p>
      )}
    </div>
  );
}
