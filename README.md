# Solar PV Analysis

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

A browser tool to estimate the **production, self-consumption, bill savings and payback time**
of a rooftop solar PV system, with or without a battery, starting from **PVGIS** climate data
for your location. Everything runs in your browser — no account, no server-side data storage.

> **Disclaimer:** Estimates for informational purposes only — not technical or financial advice.

## What it does

- Downloads hourly solar data (production, irradiance, air temperature) from PVGIS for your site.
- Builds a typical meteorological year and simulates a PV system across multiple roof faces.
- Models your electricity consumption three ways: a real load curve from a CSV export
  (including e-distribuzione format), monthly templates, or a parametric estimate.
- Simulates battery storage and time-of-use tariffs, then compares two system scenarios
  (e.g. with vs. without battery) on production, self-consumption, savings and payback.
- Bilingual UI (Italian / English), shareable setup via URL, export/import of the configuration.

All models are **deterministic** — no AI at runtime.

## Quick start

### Online demo

Live instance: **[AZIONE DAVIDE — link to the deployed Cloudflare Pages URL]**

### Local development

Requires [Bun](https://bun.sh) (≥ 1.1).

```sh
bun install
bun run web        # dev server with PVGIS proxy at http://localhost:2345
bun test           # run the test suite
bun run build      # production bundle into dist/
```

The dev server (`web/serve.ts`) exposes a same-origin `/api/pvgis` proxy so the browser can
fetch PVGIS data without hitting CORS. In production the same proxy is a Cloudflare Pages
Function (`functions/api/pvgis.ts`); the proxy does not log coordinates.

See [`docs/09-deploy.md`](docs/09-deploy.md) for the full Cloudflare Pages deploy checklist.

## Architecture

- **Core** (`src/core/`): pure, framework-free calculation modules (production, battery,
  consumption parsing/alignment, economics) — the domain logic, fully unit-tested.
- **Web** (`web/`): a React SPA (Bun HTML bundler, Recharts) driven by a setup wizard that
  fetches PVGIS data, stores the dataset in IndexedDB, and renders the dashboards.
- **i18n** (`web/src/i18n/`): flat IT/EN dictionaries + a `useT` hook, no i18n library.
- **Proxy** (`functions/api/pvgis.ts` / `src/server/pvgisProxy.ts`): same-origin PVGIS relay.
- **Docs** (`docs/`): every calculation area is documented with standard frontmatter.

## Privacy

All data stays in your browser (IndexedDB / localStorage). No account, no profiling cookies.
The PVGIS proxy does not log coordinates. Analytics use Cloudflare Web Analytics (cookieless).

## Attributions

- Solar data: **PVGIS © European Union**
- Geocoding **© OpenStreetMap contributors**

## License

Licensed under the **GNU Affero General Public License v3.0** (AGPL-3.0). See [`LICENSE`](LICENSE).
