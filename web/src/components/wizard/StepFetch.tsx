import { type DragEvent, useState } from "react";
import { buildDataset } from "../../lib/buildDataset.ts";
import { saveSetup } from "../../lib/datasetStore.ts";
import type { StoredSetup, WizardInputs } from "../../lib/setupTypes.ts";

type FaldaState = "idle" | "running" | "ok" | "error";

interface DroppedFile {
  name: string;
  content: unknown;
  faldaId: string; // falda a cui il file è assegnato
}

const STATE_LABEL: Record<FaldaState, string> = {
  idle: "in attesa",
  running: "in corso…",
  ok: "ok",
  error: "errore",
};

/**
 * Step 4 — fetch: scarica i dati PVGIS falda per falda (guidato da buildDataset +
 * onProgress) e costruisce/salva lo StoredSetup. Il fetch parte su azione esplicita.
 *
 * Retry: buildDataset ri-scarica sempre tutte le falde (non espone i JSON già presi),
 * quindi "Riprova" ri-esegue l'intera pipeline da capo — accettabile per la Fase 1.
 * File-drop: i JSON seriescalc trascinati a mano vengono passati in `files` (mappa
 * per id falda), così buildDataset salta il fetch delle falde coperte.
 */
export function StepFetch({
  inputs,
  onComplete,
}: {
  inputs: WizardInputs;
  onComplete: (setup: StoredSetup) => void;
}) {
  const faldaIds = inputs.falde.map((f) => f.id);
  const [states, setStates] = useState<Record<string, FaldaState>>(() =>
    Object.fromEntries(faldaIds.map((id) => [id, "idle"])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [drag, setDrag] = useState(false);

  const setState = (id: string, s: FaldaState): void => setStates((prev) => ({ ...prev, [id]: s }));

  const run = async (): Promise<void> => {
    setRunning(true);
    setGlobalError(null);
    setErrors({});
    setStates(Object.fromEntries(faldaIds.map((id) => [id, "idle"])));

    // Mappa file→falda dai JSON droppati (l'ultima assegnazione a una falda vince).
    const fileMap = new Map<string, unknown>();
    for (const f of files) fileMap.set(f.faldaId, f.content);

    let currentId = "";
    try {
      const { viz, hourlyT2m } = await buildDataset(
        inputs,
        (p) => {
          if (p.kind === "falda-start") {
            currentId = p.id;
            setState(p.id, "running");
          } else if (p.kind === "falda-done") {
            setState(p.id, "ok");
          }
        },
        fetch,
        fileMap.size > 0 ? fileMap : undefined,
      );
      const setup: StoredSetup = { version: 1, savedAt: Date.now(), inputs, viz, hourlyT2m };
      await saveSetup(setup);
      onComplete(setup);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (currentId !== "") {
        setState(currentId, "error");
        setErrors((prev) => ({ ...prev, [currentId]: msg }));
      }
      setGlobalError(msg);
    } finally {
      setRunning(false);
    }
  };

  const addFiles = (list: FileList | null): void => {
    if (list === null) return;
    const arr = Array.from(list);
    void Promise.all(
      arr.map(async (file, i) => {
        const text = await file.text();
        const content = JSON.parse(text) as unknown;
        // Default: assegnazione per ordine di drop.
        const faldaId = faldaIds[files.length + i] ?? faldaIds[0] ?? "";
        return { name: file.name, content, faldaId };
      }),
    )
      .then((parsed) => setFiles((prev) => [...prev, ...parsed]))
      .catch(() => setGlobalError("Impossibile leggere uno dei file (JSON non valido)."));
  };

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setDrag(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="wizard-body">
      <h4>Scarico dati PVGIS</h4>

      {inputs.falde.map((f) => {
        const st = states[f.id] ?? "idle";
        return (
          <div className="wizard-fetch-item" key={f.id}>
            <span className="wizard-fetch-id">{f.id}</span>
            {st === "error" && errors[f.id] !== undefined && <span className="err">{errors[f.id]}</span>}
            <span className={`wizard-fetch-state ${st}`}>{STATE_LABEL[st]}</span>
            {st === "error" && !running && (
              <button className="wizard-retry" onClick={() => void run()}>
                Riprova
              </button>
            )}
          </div>
        );
      })}

      <button className="wizard-primary" onClick={() => void run()} disabled={running}>
        {running ? "Scarico…" : "Scarica dati PVGIS"}
      </button>

      {globalError !== null && <p className="err">{globalError}</p>}

      <div
        className={drag ? "dropzone drag" : "dropzone"}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        oppure trascina qui i JSON <code>seriescalc</code> scaricati a mano dal sito PVGIS (uno per falda), oppure{" "}
        <label className="file-pick">
          scegli file
          <input
            type="file"
            accept="application/json,.json"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
      </div>

      {files.map((file, i) => (
        <div className="wizard-file" key={`${file.name}-${i}`}>
          <span className="wizard-file-name">{file.name}</span>
          <span className="note">→</span>
          <select
            value={file.faldaId}
            onChange={(e) =>
              setFiles((prev) => prev.map((f, j) => (j === i ? { ...f, faldaId: e.target.value } : f)))
            }
          >
            {faldaIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <button
            className="wizard-falda-del"
            onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
            aria-label="Rimuovi file"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
