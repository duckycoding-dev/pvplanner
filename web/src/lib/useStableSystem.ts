import { useRef } from "react";
import { keepIfEquivalent, type SystemConfigB } from "./systemConfig.ts";

/**
 * Versione a riferimento stabile di un SystemConfigB: il riferimento cambia solo
 * quando cambia un campo computazionale (la label è ignorata). Da usare come
 * dipendenza dei memo costosi (deriveMonoViz, runSystem): digitare il nome non
 * deve rilanciare la simulazione. La label va letta dall'oggetto originale.
 */
export function useStableSystem(system: SystemConfigB): SystemConfigB {
  const ref = useRef(system);
  ref.current = keepIfEquivalent(ref.current, system);
  return ref.current;
}
