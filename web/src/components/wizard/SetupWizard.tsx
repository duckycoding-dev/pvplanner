import { useEffect, useRef, useState } from "react";
import { type StoredSetup, type WizardInputs, validateWizardInputs } from "../../lib/setupTypes.ts";
import { ALLOWED_YEARS } from "../../../../src/core/pvgis/allowedYears.ts";
import { saveSetup } from "../../lib/datasetStore.ts";
import { StepLocation } from "./StepLocation.tsx";
import { StepRoof } from "./StepRoof.tsx";
import { StepConsumption } from "./StepConsumption.tsx";
import { StepFetch } from "./StepFetch.tsx";
import { useT } from "../../i18n/useT.tsx";

// Nota: i consumi seguono lo scarico perché l'editor ha bisogno dell'asse orario e
// della temperatura reale del sito, disponibili solo dopo il download PVGIS.
const STEP_KEYS = ["wizard.step.location", "wizard.step.roof", "wizard.step.fetch", "wizard.step.consumption"] as const;

/** Input di partenza quando non c'è un setup salvato: Roma, una falda a Sud, SARAH3. */
function defaultInputs(): WizardInputs {
  const db = "PVGIS-SARAH3" as const;
  const year = ALLOWED_YEARS[db].max;
  return {
    location: { latitude: 41.902, longitude: 12.496, label: "" },
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    radiationDb: db,
    useHorizon: true,
    mounting: "building",
    systemLossPct: 14,
    years: { from: year, to: year },
    falde: [{ id: "falda-1", azimuth: 0, tilt: 30, panelCount: 10, wp: 450 }],
  };
}

/**
 * Wizard di setup dati PVGIS: dialog nativo (stesso pattern del menu di configurazione).
 * Quattro step: Località → Tetto → Scarico (fetch, costruisce e salva lo StoredSetup) →
 * Consumi (editor sul dataset scaricato, saltabile). Al termine `onComplete` riceve lo
 * StoredSetup (con o senza consumi). `initialInputs` prefilla i campi (null → default).
 */
export function SetupWizard({
  open,
  setOpen,
  initialInputs,
  initialStep = 1,
  onComplete,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  initialInputs: WizardInputs | null;
  /** Step iniziale all'apertura (default 1). Il flusso "setup condiviso" apre allo Scarico (3). */
  initialStep?: 1 | 2 | 3 | 4;
  onComplete: (setup: StoredSetup) => void;
}) {
  const { t } = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep);
  const [inputs, setInputs] = useState<WizardInputs>(() => initialInputs ?? defaultInputs());
  // Dataset costruito allo step "Scarico"; i consumi (step 4) lo aggiornano.
  const [built, setBuilt] = useState<StoredSetup | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d === null) return;
    if (open && !d.open) {
      // A ogni apertura riparti dallo step richiesto (1 di norma; 3=Scarico per il setup condiviso).
      setStep(initialStep);
      setInputs(initialInputs ?? defaultInputs());
      setBuilt(null);
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, initialInputs, initialStep]);

  const patch = (p: Partial<WizardInputs>): void => setInputs((prev) => ({ ...prev, ...p }));

  const validationError = validateWizardInputs(inputs);
  const canAdvance = validationError === null;

  /**
   * Chiusura del wizard da qualunque via («Fine», ✕, Esc, backdrop). Se un dataset è
   * stato costruito (step Scarico) è GIÀ salvato in IndexedDB (StepFetch/onApply):
   * va adottato dall'app anche senza «Fine», altrimenti stato app e storage divergono
   * fino al prossimo reload.
   */
  const finish = (): void => {
    if (built !== null) {
      onComplete(built);
      setBuilt(null);
    }
    setOpen(false);
  };

  return (
    <dialog
      ref={ref}
      className="menu-dialog"
      onClose={finish}
      onClick={(e) => {
        if (e.target === ref.current) finish(); // click sul backdrop
      }}
    >
      <div className="menu-head">
        <strong>{t("wizard.title")}</strong>
        <button className="menu-close" onClick={finish} aria-label={t("common.close")}>
          ✕
        </button>
      </div>

      <div className="wizard-steps">
        {STEP_KEYS.map((labelKey, i) => {
          const n = i + 1;
          const cls = n === step ? "wizard-step active" : n < step ? "wizard-step done" : "wizard-step";
          return (
            <div className={cls} key={labelKey}>
              {n}. {t(labelKey)}
            </div>
          );
        })}
      </div>

      {step === 1 && <StepLocation inputs={inputs} patch={patch} />}
      {step === 2 && <StepRoof inputs={inputs} patch={patch} />}
      {step === 3 && (
        <StepFetch
          inputs={inputs}
          onComplete={(setup) => {
            setBuilt(setup);
            setStep(4);
          }}
        />
      )}
      {step === 4 && (
        <StepConsumption
          setup={built}
          onApply={(next) => {
            void saveSetup(next);
            setBuilt(next);
          }}
        />
      )}

      {(step === 1 || step === 2) && !canAdvance && validationError !== null && (
        <p className="err wizard-error">{t(validationError)}</p>
      )}

      <div className="wizard-nav">
        {step > 1 ? (
          <button onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}>{t("wizard.back")}</button>
        ) : (
          <button onClick={() => setOpen(false)}>{t("common.cancel")}</button>
        )}
        {step === 1 && (
          <button className="wizard-next" disabled={!canAdvance} onClick={() => setStep(2)}>
            {t("wizard.next")}
          </button>
        )}
        {step === 2 && (
          <button className="wizard-next" disabled={!canAdvance} onClick={() => setStep(3)}>
            {t("wizard.next")}
          </button>
        )}
        {/* Step 3: il fetch parte dal bottone interno "Scarica dati PVGIS" e avanza allo step 4. */}
        {step === 4 && built !== null && (
          <button className="wizard-next" onClick={finish}>
            {t("wizard.finish")}
          </button>
        )}
      </div>
    </dialog>
  );
}
