import { useCallback, useState } from "react";

/** Click-to-toggle series visibility on a Recharts <Legend>. */
export function useLegendToggle() {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const onClick = useCallback((entry: { dataKey?: unknown }) => {
    const key = typeof entry?.dataKey === "string" ? entry.dataKey : undefined;
    if (key === undefined) return;
    setHidden((h) => ({ ...h, [key]: !h[key] }));
  }, []);

  const isHidden = useCallback((key: string): boolean => hidden[key] === true, [hidden]);

  return { onClick, isHidden };
}
