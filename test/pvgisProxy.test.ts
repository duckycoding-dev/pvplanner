import { expect, test } from "bun:test";
import { proxyPvgis } from "../src/server/pvgisProxy.ts";

const PVGIS_BASE = "https://re.jrc.ec.europa.eu/api/v5_3";

/** Build a mock fetch that records the URL it was called with. */
function recordingFetch(response: Response) {
  const calls: string[] = [];
  const fn = ((input: Request | string | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    return Promise.resolve(response);
  }) as unknown as typeof fetch;
  return { fn, calls };
}

function get(query: string): Request {
  return new Request(`http://localhost/api/pvgis${query}`, { method: "GET" });
}

test("tool not allowed → 400", async () => {
  const { fn, calls } = recordingFetch(new Response("{}"));
  const res = await proxyPvgis(get("?tool=evil&lat=1&lon=2"), fn);
  expect(res.status).toBe(400);
  expect(calls.length).toBe(0);
});

test("tool missing → 400", async () => {
  const { fn, calls } = recordingFetch(new Response("{}"));
  const res = await proxyPvgis(get("?lat=1&lon=2"), fn);
  expect(res.status).toBe(400);
  expect(calls.length).toBe(0);
});

test("unknown param is dropped (never reaches upstream)", async () => {
  const { fn, calls } = recordingFetch(new Response("{}", { status: 200 }));
  await proxyPvgis(get("?tool=seriescalc&lat=1&lon=2&evil=1"), fn);
  expect(calls.length).toBe(1);
  expect(calls[0]).not.toContain("evil");
});

test("upstream URL = BASE/tool? + only whitelisted params (exact)", async () => {
  const { fn, calls } = recordingFetch(new Response("{}", { status: 200 }));
  await proxyPvgis(
    get("?tool=seriescalc&lat=41.9&lon=12.49&peakpower=1&loss=14&outputformat=json&evil=1"),
    fn,
  );
  expect(calls[0]).toBe(
    `${PVGIS_BASE}/seriescalc?lat=41.9&lon=12.49&peakpower=1&loss=14&outputformat=json`,
  );
});

test("tool param itself is not forwarded to upstream", async () => {
  const { fn, calls } = recordingFetch(new Response("{}", { status: 200 }));
  await proxyPvgis(get("?tool=PVcalc&lat=1&lon=2"), fn);
  expect(calls[0]).toBe(`${PVGIS_BASE}/PVcalc?lat=1&lon=2`);
});

test("POST → 405", async () => {
  const { fn, calls } = recordingFetch(new Response("{}"));
  const req = new Request("http://localhost/api/pvgis?tool=seriescalc", { method: "POST" });
  const res = await proxyPvgis(req, fn);
  expect(res.status).toBe(405);
  expect(calls.length).toBe(0);
});

test("network error/timeout → 502 with json error body", async () => {
  const throwing = (() => Promise.reject(new Error("boom"))) as unknown as typeof fetch;
  const res = await proxyPvgis(get("?tool=seriescalc&lat=1&lon=2"), throwing);
  expect(res.status).toBe(502);
  expect(res.headers.get("content-type")).toContain("application/json");
  expect(await res.json()).toEqual({ error: "PVGIS non raggiungibile" });
});

test("passthrough 200: same body + status + json content-type", async () => {
  const body = JSON.stringify({ outputs: { totals: { fixed: { E_y: 1234 } } } });
  const { fn } = recordingFetch(new Response(body, { status: 200 }));
  const res = await proxyPvgis(get("?tool=PVcalc&lat=1&lon=2"), fn);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("application/json");
  expect(await res.text()).toBe(body);
});

test("passthrough upstream 400 (PVGIS error) → status 400", async () => {
  const { fn } = recordingFetch(new Response("bad request", { status: 400 }));
  const res = await proxyPvgis(get("?tool=PVcalc&lat=1&lon=2"), fn);
  expect(res.status).toBe(400);
});
