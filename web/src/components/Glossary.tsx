import { GLOSSARY } from "../lib/glossary.ts";

export function Glossary() {
  return (
    <div className="glossary">
      <p className="muted">
        Cosa indicano le voci della dashboard. Le formule sono riferite alla singola ora (Δt = 1 h, energia in kWh).
      </p>
      {Object.values(GLOSSARY).map((e) => (
        <div className="gloss-item" key={e.term}>
          <h4>{e.term}</h4>
          <p>{e.desc}</p>
          {e.formula !== undefined && <code>{e.formula}</code>}
        </div>
      ))}
    </div>
  );
}
