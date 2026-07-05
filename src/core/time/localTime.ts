/** DST-correct local time from a UTC instant, for any IANA timezone. Pure (Intl only). */

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (f === undefined) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hour12: false, weekday: "short" });
    formatters.set(timeZone, f);
  }
  return f;
}

export interface LocalTime {
  hour: number; // 0..23
  weekday: number; // 0=Mon .. 6=Sun (local day)
}

/** Local hour and weekday at a UTC instant, DST-correct for the given IANA zone. */
export function localHourWeekday(tsUtc: number, timeZone: string): LocalTime {
  const parts = formatterFor(timeZone).formatToParts(new Date(tsUtc));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const weekday = WEEKDAY_INDEX[parts.find((p) => p.type === "weekday")?.value ?? "Mon"] ?? 0;
  return { hour, weekday };
}
