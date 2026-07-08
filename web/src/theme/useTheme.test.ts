import { expect, test } from "bun:test";
import { resolveInitialTheme } from "./useTheme.tsx";

test("localStorage valido ha priorità sulla preferenza di sistema", () => {
  expect(resolveInitialTheme("dark", false)).toBe("dark");
  expect(resolveInitialTheme("light", true)).toBe("light");
});

test("senza scelta salvata segue la preferenza di sistema", () => {
  expect(resolveInitialTheme(null, true)).toBe("dark");
  expect(resolveInitialTheme(null, false)).toBe("light");
});

test("valore salvato non valido viene ignorato, fallback al sistema", () => {
  expect(resolveInitialTheme("banana", true)).toBe("dark");
  expect(resolveInitialTheme("", false)).toBe("light");
});
