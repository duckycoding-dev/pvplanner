import { resolve } from "node:path";

/** Project root = parent of this `src/` directory. */
export const PROJECT_ROOT = resolve(import.meta.dir, "..");

/** Resolve a path relative to the project root. */
export function fromRoot(...segments: string[]): string {
  return resolve(PROJECT_ROOT, ...segments);
}

export const DATA_DIR = fromRoot("data");
export const FALDE_DIR = fromRoot("data", "falde");
