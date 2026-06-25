import { expect, test } from "bun:test";
import { combineProduction } from "../src/core/production/combine.ts";

test("sums index-aligned series", () => {
  expect(combineProduction([[1, 2, 3], [4, 5, 6]])).toEqual([5, 7, 9]);
});

test("works with a single series", () => {
  expect(combineProduction([[1, 2]])).toEqual([1, 2]);
});

test("supports more than two falde", () => {
  expect(combineProduction([[1, 1], [2, 2], [3, 3]])).toEqual([6, 6]);
});

test("length mismatch throws", () => {
  expect(() => combineProduction([[1, 2], [1]])).toThrow();
});

test("no series throws", () => {
  expect(() => combineProduction([])).toThrow();
});
