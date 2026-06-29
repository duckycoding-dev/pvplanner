import { type DragEvent, useState } from "react";

/** Generic drag-and-drop import modal: parse a dropped/picked JSON file, validate, then import. */
export function ImportModal<T>({
  title,
  parse,
  validate,
  onImport,
  onClose,
}: {
  title: string;
  parse: (text: string) => T; // throws on malformed input
  validate: (value: T) => string | null; // null = ok, else error message
  onImport: (value: T) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const handleText = (text: string): void => {
    try {
      const value = parse(text);
      const err = validate(value);
      if (err !== null) {
        setError(err);
        return;
      }
      onImport(value);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore di import.");
    }
  };

  const handleFile = (file: File | undefined): void => {
    if (file === undefined) return;
    file
      .text()
      .then(handleText)
      .catch(() => setError("Impossibile leggere il file."));
  };

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div
          className={drag ? "dropzone drag" : "dropzone"}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          Trascina qui il file JSON, oppure{" "}
          <label className="file-pick">
            scegli file
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        </div>
        {error !== null && <p className="err">{error}</p>}
        <div className="editor-actions">
          <button onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}
