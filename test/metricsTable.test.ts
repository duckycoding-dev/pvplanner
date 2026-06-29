import { expect, test } from "bun:test";
import { bestWorstClasses, deltaClass } from "../web/src/lib/metricsTable.ts";

test("bestWorstClasses marks best green / worst red by direction", () => {
  expect(bestWorstClasses([10, 20], "higher")).toEqual(["neg", "pos"]); // 20 best
  expect(bestWorstClasses([10, 20], "lower")).toEqual(["pos", "neg"]); // 10 best
  expect(bestWorstClasses([5, 5], "lower")).toEqual(["", ""]); // equal → neutral
  expect(bestWorstClasses([1, 2, 3], "higher")).toEqual(["neg", "", "pos"]);
  expect(bestWorstClasses([1, 2], "none")).toEqual(["", ""]);
});

test("deltaClass colours an improvement green", () => {
  expect(deltaClass(-5, "lower")).toBe("pos"); // cost went down → good
  expect(deltaClass(5, "lower")).toBe("neg");
  expect(deltaClass(5, "higher")).toBe("pos"); // production went up → good
  expect(deltaClass(0, "lower")).toBe("");
  expect(deltaClass(-5, "none")).toBe("");
});
