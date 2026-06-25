import { expect, test } from "bun:test";
import { parsePvgisTimestamp, pvgisMonth } from "../src/core/time/pvgisTimestamp.ts";

test("parses to UTC hour, dropping the :10 minutes", () => {
  expect(parsePvgisTimestamp("20230101:0010")).toBe(Date.UTC(2023, 0, 1, 0));
  expect(parsePvgisTimestamp("20231231:2310")).toBe(Date.UTC(2023, 11, 31, 23));
  expect(parsePvgisTimestamp("20230615:1410")).toBe(Date.UTC(2023, 5, 15, 14));
});

test("pvgisMonth extracts the 1-based month", () => {
  expect(pvgisMonth("20230101:0010")).toBe(1);
  expect(pvgisMonth("20231231:2310")).toBe(12);
});

test("invalid timestamps throw", () => {
  expect(() => parsePvgisTimestamp("nope")).toThrow();
  expect(() => parsePvgisTimestamp("2023-01-01")).toThrow();
});
