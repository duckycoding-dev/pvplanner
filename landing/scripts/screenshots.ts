/**
 * Genera gli screenshot della landing dal tool in esecuzione locale.
 * Prerequisito: `bun run web` dalla root del repo (porta 2345) e Google Chrome installato.
 * Uso: bun scripts/screenshots.ts   (da landing/; richiede `bun add -d playwright-core` una tantum)
 *
 * Non copre tariff.png e wizard-1..3.png (interazioni non deterministiche): vedi piano, scatti manuali.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = new URL("../public/shots/", import.meta.url).pathname;
const APP = "http://localhost:2345/";

const LABELS = {
  it: {
    daily: "Giorno per giorno",
    compare: "Confronto",
    hourly: "Potenza oraria",
    annual: "Panoramica annuale",
    runSetup: "Esegui il setup per la tua località",
    menuOpen: "Apri configurazione",
    consumption: "Consumi",
    tariff: "Tariffa",
  },
  en: {
    daily: "Day by day",
    compare: "Compare",
    hourly: "Hourly power",
    annual: "Annual overview",
    runSetup: "Run the setup for your location",
    menuOpen: "Open settings",
    consumption: "Consumption",
    tariff: "Tariff",
  },
} as const;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const lang of ["it", "en"] as const) {
  mkdirSync(`${OUT}${lang}`, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((l) => localStorage.setItem("lang", l), lang);
  const page = await ctx.newPage();
  await page.goto(APP, { waitUntil: "networkidle" });
  const tabs = LABELS[lang];

  // daily (hero + feature "ora per ora"): solo la card del grafico "Potenza oraria"
  await page.getByRole("button", { name: tabs.daily, exact: true }).first().click();
  await page.waitForTimeout(1200);
  const hourlyCard = page.locator(".chart-card", { hasText: tabs.hourly }).first();
  await hourlyCard.scrollIntoViewIfNeeded();
  await hourlyCard.screenshot({ path: `${OUT}${lang}/daily.png` });

  // compare (feature batteria sì/no): viewport in cima al tab Confronto
  await page.getByRole("button", { name: tabs.compare, exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}${lang}/compare.png` });

  // cashflow (feature andamento economico): parte alta della card (titolo + grafico), senza la tabella lunga
  const title = lang === "it" ? "Andamento economico" : "Economic trend";
  const card = page.locator(".chart-card", { hasText: title }).first();
  await card.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(400);
  const box = await card.boundingBox();
  if (box) {
    const vh = page.viewportSize()?.height ?? 800;
    const height = Math.min(box.height, vh - box.y - 8, 640);
    await page.screenshot({
      path: `${OUT}${lang}/cashflow.png`,
      clip: { x: box.x, y: box.y, width: box.width, height },
    });
  } else {
    console.error(`[${lang}] chart-card cashflow non trovata`);
  }

  // wizard-3 (il verdetto): panoramica annuale, viewport
  await page.getByRole("button", { name: tabs.annual, exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}${lang}/wizard-3.png` });

  // helper: clip da viewport sul bounding box di un elemento fisso (evita gli hang di element.screenshot su dialog)
  const shotBox = async (sel: string, path: string, maxHeight = Infinity) => {
    const el = page.locator(`${sel} >> visible=true`).last();
    const box = await el.boundingBox();
    if (!box) {
      console.error(`[${lang}] elemento non visibile per ${path}`);
      return;
    }
    const vw = page.viewportSize()!;
    await page.screenshot({
      path,
      clip: {
        x: Math.max(box.x, 0),
        y: Math.max(box.y, 0),
        width: Math.min(box.width, vw.width - Math.max(box.x, 0)),
        height: Math.min(box.height, vw.height - Math.max(box.y, 0), maxHeight),
      },
    });
  };

  // wizard-1 (la posizione): dialog del wizard aperto dal banner demo, step Località
  await page.getByRole("button", { name: new RegExp(tabs.runSetup) }).first().click();
  await page.waitForTimeout(600);
  await shotBox(".menu-dialog", `${OUT}${lang}/wizard-1.png`, 540);
  await page.locator(".menu-dialog >> visible=true").last().locator(".menu-close").click();
  await page.waitForTimeout(400);

  // wizard-2 (i consumi) + tariff: drawer di configurazione
  await page.getByRole("button", { name: tabs.menuOpen }).first().click();
  await page.waitForTimeout(600);
  const drawer = page.locator(".menu-dialog >> visible=true").last();
  const consBtn = drawer.getByRole("button", { name: new RegExp(tabs.consumption) }).first();
  if (await consBtn.count()) {
    await consBtn.click();
    await page.waitForTimeout(400);
  }
  await shotBox(".menu-dialog", `${OUT}${lang}/wizard-2.png`);

  // tariff: porta la sezione Tariffa in vista dentro il drawer e riscatta
  const tariffBtn = drawer.getByRole("button", { name: new RegExp(tabs.tariff) }).first();
  if (await tariffBtn.count()) {
    await tariffBtn.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(300);
  }
  await shotBox(".menu-dialog", `${OUT}${lang}/tariff.png`);

  await ctx.close();
  console.log(`[${lang}] daily/compare/cashflow/wizard-1..3/tariff ok`);
}

await browser.close();
