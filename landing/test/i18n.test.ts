import { describe, expect, test } from "bun:test";
import { it as itCopy } from "../src/i18n/it";
import { en as enCopy } from "../src/i18n/en";

function shape(o: unknown, prefix = ""): string[] {
  if (Array.isArray(o)) return o.flatMap((v, i) => shape(v, `${prefix}[${i}]`));
  if (o !== null && typeof o === "object")
    return Object.entries(o).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

describe("i18n parity", () => {
  test("it/en same structure (langHint escluso)", () => {
    const { langHint: _skip, ...itRest } = itCopy;
    expect(shape(itRest).sort()).toEqual(shape(enCopy).sort());
  });
  test("7 FAQ per lingua", () => {
    expect(itCopy.faq.items).toHaveLength(7);
    expect(enCopy.faq.items).toHaveLength(7);
  });
  test("H1 esatti dalla spec", () => {
    expect(itCopy.hero.h1).toBe("Il fotovoltaico ti conviene davvero? Scoprilo coi numeri veri.");
    expect(enCopy.hero.h1).toBe("Is rooftop solar actually worth it? Find out with real numbers.");
  });
});
