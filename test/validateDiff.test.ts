import { expect, test } from "bun:test";
import { numericDeepDiff } from "../src/fetch/validateDownload.ts";

test("identical structures produce no diffs", () => {
  expect(numericDeepDiff({ a: 1, b: "x", c: [1, 2], d: true, e: null }, { a: 1, b: "x", c: [1, 2], d: true, e: null })).toEqual([]);
});

test("numbers within relative tolerance are equal", () => {
  // tol(1000) = 1e-6 + 1e-4*1000 = 0.1000001
  expect(numericDeepDiff({ p: 1000.05 }, { p: 1000 }).length).toBe(0);
});

test("numbers beyond tolerance diff", () => {
  const d = numericDeepDiff({ p: 1100 }, { p: 1000 });
  expect(d.length).toBe(1);
  expect(d[0]!.path).toBe("p");
});

test("string mismatch diffs", () => {
  expect(numericDeepDiff({ t: "a" }, { t: "b" }).length).toBe(1);
});

test("array length mismatch is reported", () => {
  const d = numericDeepDiff({ a: [1, 2] }, { a: [1, 2, 3] });
  expect(d.some((x) => x.path.endsWith(".length"))).toBe(true);
});

test("nested path is captured", () => {
  const d = numericDeepDiff({ outputs: { hourly: [{ P: 5 }] } }, { outputs: { hourly: [{ P: 99 }] } });
  expect(d[0]!.path).toBe("outputs.hourly[0].P");
});
