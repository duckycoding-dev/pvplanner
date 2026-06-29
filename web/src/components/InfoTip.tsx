import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY } from "../lib/glossary.ts";

/**
 * Small ⓘ that reveals a styled tooltip on hover/focus. The bubble is rendered in a
 * portal on document.body with position: fixed, so it floats above everything and is
 * never clipped by a scrolling/overflow container (e.g. the tables' overflow-x: auto).
 */
export function InfoTip({ k }: { k: string }) {
  const entry = GLOSSARY[k];
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  if (entry === undefined) return null;

  const show = (): void => {
    const el = ref.current;
    if (el !== null) {
      const r = el.getBoundingClientRect();
      setPos({ left: r.left + r.width / 2, top: r.top });
    }
    setOpen(true);
  };
  const hide = (): void => setOpen(false);

  return (
    <span
      ref={ref}
      className="info"
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      ⓘ
      {open &&
        createPortal(
          <span className="info-bubble info-bubble--fixed" role="tooltip" style={{ left: pos.left, top: pos.top }}>
            <strong>{entry.term}</strong>
            <span>{entry.desc}</span>
            {entry.formula !== undefined && <code>{entry.formula}</code>}
          </span>,
          document.body,
        )}
    </span>
  );
}
