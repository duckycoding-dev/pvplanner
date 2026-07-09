import { describe, expect, test } from "bun:test";
import { distHtml } from "./build";

describe("SEO head", () => {
  test("hreflang triple su entrambe le pagine", async () => {
    for (const p of ["index.html", "en/index.html"]) {
      const html = await distHtml(p);
      expect(html).toContain('hreflang="it"');
      expect(html).toContain('hreflang="en"');
      expect(html).toContain('hreflang="x-default"');
    }
  });
  test("canonical corretti", async () => {
    expect(await distHtml("index.html")).toContain(
      'rel="canonical" href="https://pvverdict-landing.pages.dev/"',
    );
    expect(await distHtml("en/index.html")).toContain(
      'rel="canonical" href="https://pvverdict-landing.pages.dev/en/"',
    );
  });
  test("html lang", async () => {
    expect(await distHtml("index.html")).toContain('<html lang="it"');
    expect(await distHtml("en/index.html")).toContain('<html lang="en"');
  });
});

describe("Hero", () => {
  test("un solo h1 per pagina, testo esatto, CTA presente", async () => {
    const it = await distHtml("index.html");
    const en = await distHtml("en/index.html");
    expect(it.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(en.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(it).toContain("Il fotovoltaico ti conviene davvero?");
    expect(en).toContain("Is rooftop solar actually worth it?");
    expect(it).toContain("Prova il tool ora");
    expect(en).toContain("Try the tool now");
  });
});

describe("Sezioni", () => {
  test("problem e how presenti con h2", async () => {
    const it = await distHtml("index.html");
    expect(it).toContain("Perché un calcolatore fotovoltaico a medie mensili");
    expect(it).toContain('id="how"');
    expect(it).toContain("Tre passi dal tetto al verdetto");
    expect(await distHtml("en/index.html")).toContain("Three steps from your roof to the verdict");
  });
  test("features/notModeled/privacy/finalCta presenti", async () => {
    const it = await distHtml("index.html");
    for (const s of [
      'id="features"',
      'id="not-modeled"',
      'id="privacy"',
      "Cosa vedi davvero, numeri alla mano",
      "Cosa non modelliamo",
      "I tuoi dati restano tuoi",
      "Pronto per i numeri veri?",
    ])
      expect(it).toContain(s);
  });
  test("FAQPage JSON-LD valido con 7 domande", async () => {
    for (const p of ["index.html", "en/index.html"]) {
      const html = await distHtml(p);
      const m = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      expect(m).not.toBeNull();
      const ld = JSON.parse(m![1]);
      expect(ld["@type"]).toBe("FAQPage");
      expect(ld.mainEntity).toHaveLength(7);
    }
  });
});
