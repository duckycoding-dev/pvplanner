export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FetchOptions {
  retries?: number;
  baseDelayMs?: number;
  userAgent?: string;
}

const DEFAULT_UA = "analisi-fotovoltaico/0.1 (PVGIS downloader; personal use)";

function backoffMs(base: number, attempt: number): number {
  return base * 2 ** attempt;
}

/** GET a PVGIS JSON endpoint with retry on 429/5xx and network errors. */
export async function fetchJson(url: string, opts: FetchOptions = {}): Promise<unknown> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  const userAgent = opts.userAgent ?? DEFAULT_UA;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(backoffMs(baseDelayMs, attempt));
        continue;
      }
      throw err;
    }

    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs(baseDelayMs, attempt);
      await sleep(wait);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PVGIS HTTP ${res.status}: ${url}\n${body.slice(0, 500)}`);
    }

    return await res.json();
  }

  throw lastErr instanceof Error ? lastErr : new Error(`Failed to fetch ${url}`);
}
