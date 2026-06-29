import { expect, test } from "bun:test";
import { deltaClass, moneyClass } from "../web/src/lib/metricsTable.ts";

test("moneyClass colours a value cell by sign and money nature", () => {
  expect(moneyClass(10, "pay")).toBe("neg"); // expense → red
  expect(moneyClass(0, "pay")).toBe("");
  expect(moneyClass(10, "earn")).toBe("pos"); // income → green
  expect(moneyClass(5, "net")).toBe("neg"); // pay → red
  expect(moneyClass(-5, "net")).toBe("pos"); // credit → green
  expect(moneyClass(0, "net")).toBe("");
  expect(moneyClass(10, undefined)).toBe(""); // non-money rows not coloured
});

test("deltaClass colours an improvement green", () => {
  expect(deltaClass(-5, "lower")).toBe("pos"); // cost/import went down → good
  expect(deltaClass(5, "lower")).toBe("neg");
  expect(deltaClass(5, "higher")).toBe("pos"); // production went up → good
  expect(deltaClass(0, "lower")).toBe("");
  expect(deltaClass(-5, "none")).toBe("");
});
