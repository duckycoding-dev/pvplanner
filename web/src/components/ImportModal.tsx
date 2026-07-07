import { type DragEvent, useState } from "react";
import { useT } from "../i18n/useT.tsx";

/**
 * Generic drag-and-drop import modal: parse a dropped/picked JSON file, validate, then import.
 * `parse` (throw) e `validate` restituiscono CHIAVI i18n: l'errore è tradotto qui con `t()`.
 */
export function ImportModal<T>({
  title,
  parse,
  validate,
  onImport,
  onClose,
}: {
  title: string; // già tradotto dal chiamante
  parse: (text: string) => T; // throws on malformed input (message = chiave i18n)
  validate: (value: T) => string | null; // null = ok, altrimenti chiave i18n
  onImport: (value: T) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  // `error` è una CHIAVE i18n (tradotta al render).
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
      setError(e instanceof Error ? e.message : "import.errorGeneric");
    }
  };

  const handleFile = (file: File | undefined): void => {
    if (file === undefined) return;
    file
      .text()
      .then(handleText)
      .catch(() => setError("import.fileUnreadable"));
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
          {t("import.dropPrompt")}{" "}
          <label className="file-pick">
            {t("common.chooseFile")}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        </div>
        {error !== null && <p className="err">{t(error)}</p>}
        <div className="editor-actions">
          <button onClick={onClose}>{t("common.close")}</button>
        </div>
      </div>
    </div>
  );
}
