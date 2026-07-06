import { useEffect, useRef, useState } from "react";
import { type StoredSetup, type WizardInputs, validateWizardInputs } from "../../lib/setupTypes.ts";
import { ALLOWED_YEARS } from "../../../../src/core/pvgis/allowedYears.ts";
import { StepLocation } from "./StepLocation.tsx";
import { StepRoof } from "./StepRoof.tsx";
import { StepConsumption } from "./StepConsumption.tsx";
import { StepFetch } from "./StepFetch.tsx";

const STEP_LABELS = ["Località", "Tetto", "Consumi", "Scarico"] as const;

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
 * Quattro step; al termine (fetch riuscito) `onComplete` riceve lo StoredSetup già salvato.
 * `initialInputs` prefilla i campi da un setup esistente (null → default).
 */
export function SetupWizard({
  open,
  setOpen,
  initialInputs,
  onComplete,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  initialInputs: WizardInputs | null;
  onComplete: (setup: StoredSetup) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [inputs, setInputs] = useState<WizardInputs>(() => initialInputs ?? defaultInputs());

  useEffect(() => {
    const d = ref.current;
    if (d === null) return;
    if (open && !d.open) {
      // Riparti sempre dallo step 1 con i valori più recenti a ogni apertura.
      setStep(1);
      setInputs(initialInputs ?? defaultInputs());
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, initialInputs]);

  const patch = (p: Partial<WizardInputs>): void => setInputs((prev) => ({ ...prev, ...p }));

  const validationError = validateWizardInputs(inputs);
  const canAdvance = validationError === null;

  const complete = (setup: StoredSetup): void => {
    onComplete(setup);
    setOpen(false);
  };

  return (
    <dialog
      ref={ref}
      className="menu-dialog"
      onClose={() => setOpen(false)}
      onClick={(e) => {
        if (e.target === ref.current) setOpen(false); // click sul backdrop
      }}
    >
      <div className="menu-head">
        <strong>Setup dati PVGIS</strong>
        <button className="menu-close" onClick={() => setOpen(false)} aria-label="Chiudi">
          ✕
        </button>
      </div>

      <div className="wizard-steps">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const cls = n === step ? "wizard-step active" : n < step ? "wizard-step done" : "wizard-step";
          return (
            <div className={cls} key={label}>
              {n}. {label}
            </div>
          );
        })}
      </div>

      {step === 1 && <StepLocation inputs={inputs} patch={patch} />}
      {step === 2 && <StepRoof inputs={inputs} patch={patch} />}
      {step === 3 && <StepConsumption />}
      {step === 4 && <StepFetch inputs={inputs} onComplete={complete} />}

      {(step === 1 || step === 2) && !canAdvance && <p className="err wizard-error">{validationError}</p>}

      <div className="wizard-nav">
        {step > 1 ? (
          <button onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}>← Indietro</button>
        ) : (
          <button onClick={() => setOpen(false)}>Annulla</button>
        )}
        {step === 1 && (
          <button className="wizard-next" disabled={!canAdvance} onClick={() => setStep(2)}>
            Avanti →
          </button>
        )}
        {step === 2 && (
          <button className="wizard-next" disabled={!canAdvance} onClick={() => setStep(3)}>
            Avanti →
          </button>
        )}
        {step === 3 && (
          <button className="wizard-next" onClick={() => setStep(4)}>
            Continua →
          </button>
        )}
        {/* Step 4: il fetch parte dal bottone interno "Scarica dati PVGIS". */}
      </div>
    </dialog>
  );
}
