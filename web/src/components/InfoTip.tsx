import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type GlossaryEntry, GLOSSARY } from "../lib/glossary.ts";

/**
 * Small ⓘ that reveals a styled tooltip on hover/focus. The bubble is rendered in a
 * portal with position: fixed, so it floats above everything and is never clipped by
 * a scrolling/overflow container (e.g. the tables' overflow-x: auto).
 * La voce può venire dal glossario (`k`) o essere inline (`entry`) per termini che
 * esistono solo in un form e non meritano una voce di glossario globale.
 * Dentro un <dialog> aperto con showModal() il portal va nel dialog stesso: il dialog
 * vive nel top layer del browser e NESSUN z-index di un nodo esterno può superarlo.
 * Posizionamento: il bubble viene prima renderizzato invisibile, misurato, poi
 * ancorato sopra la ⓘ e CLAMPATO dentro la viewport su tutti i lati (se sopra non
 * c'è spazio, va sotto l'ancora).
 */
export function InfoTip({ k, entry: inline }: { k?: string; entry?: GlossaryEntry }) {
  const entry = inline ?? (k !== undefined ? GLOSSARY[k] : undefined);
  const ref = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  // null = bubble non ancora misurato (renderizzato invisibile per misurarlo).
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = ref.current;
    const bubble = bubbleRef.current;
    if (anchor === null || bubble === null) return;
    const M = 8; // margine minimo dalla viewport
    const r = anchor.getBoundingClientRect();
    const w = bubble.offsetWidth;
    const h = bubble.offsetHeight;
    let left = r.left + r.width / 2 - w / 2; // centrato sull'ancora
    left = Math.max(M, Math.min(left, window.innerWidth - w - M));
    let top = r.top - h - M; // preferito: sopra l'ancora
    if (top < M) top = r.bottom + M; // non ci sta sopra → sotto
    top = Math.max(M, Math.min(top, window.innerHeight - h - M));
    setPos({ left, top });
  }, [open]);

  if (entry === undefined) return null;

  const show = (): void => setOpen(true);
  const hide = (): void => {
    setOpen(false);
    setPos(null);
  };

  return (
    <span ref={ref} className="info" tabIndex={0} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      ⓘ
      {open &&
        createPortal(
          <span
            ref={bubbleRef}
            className="info-bubble info-bubble--fixed"
            role="tooltip"
            style={pos !== null ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
          >
            <strong>{entry.term}</strong>
            <span>{entry.desc}</span>
            {entry.formula !== undefined && <code>{entry.formula}</code>}
          </span>,
          ref.current?.closest("dialog") ?? document.body,
        )}
    </span>
  );
}
