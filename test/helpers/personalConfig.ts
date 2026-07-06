import { existsSync } from "node:fs";
import { fromRoot } from "../../src/paths.ts";

/**
 * True when the personal (git-ignored) config.json exists on disk.
 *
 * The golden tests calibrated on the personal dataset (falde est/ovest,
 * data/falde/) must run only where that config exists; on a fresh clone
 * loadConfig falls back to config.demo.json and those goldens would fail
 * for the wrong reason. The criterion is the FILE'S EXISTENCE — the same
 * check loadConfig uses to pick the fallback — not its content.
 */
export const hasPersonalConfig = existsSync(fromRoot("config.json"));
