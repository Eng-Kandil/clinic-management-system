// ---------------------------------------------------------------------------
// Clinic time handling
//
// The clinic operates in a single timezone (Turkish Lira → Europe/Istanbul by
// default; override with NEXT_PUBLIC_CLINIC_TIMEZONE). Doctor availability and
// appointment slots are authored as clinic-local wall-clock times ("09:00") and
// stored on a Date whose UTC fields hold that wall-clock (e.g. 09:00 → ...T09:00Z).
//
// Two needs follow from that convention:
//  1. DISPLAY — render the stored wall-clock back exactly as authored. Because
//     the value is wall-clock-encoded at UTC, formatting in UTC reproduces the
//     clinic-local time on every device regardless of the viewer's timezone.
//  2. "IS IT IN THE PAST?" — compare against the real instant. A clinic
//     wall-clock time maps to a true UTC instant via the clinic's offset.
// ---------------------------------------------------------------------------

export const CLINIC_TIME_ZONE =
  process.env.NEXT_PUBLIC_CLINIC_TIMEZONE || "Europe/Istanbul";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Offset (ms) of `tz` relative to UTC at the given instant (positive = ahead). */
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const m: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") m[p.type] = p.value;
  }
  const asUTC = Date.UTC(
    Number(m.year),
    Number(m.month) - 1,
    Number(m.day),
    Number(m.hour),
    Number(m.minute),
    Number(m.second)
  );
  return asUTC - date.getTime();
}

/**
 * Convert a clinic-local wall-clock time to the true UTC instant it represents.
 * @param dateStr "YYYY-MM-DD"
 * @param timeStr "HH:mm"
 */
export function clinicWallTimeToInstant(
  dateStr: string,
  timeStr: string,
  tz: string = CLINIC_TIME_ZONE
): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y!, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, 0);
  // One correction pass resolves DST boundaries.
  const off1 = tzOffsetMs(new Date(guess), tz);
  const off2 = tzOffsetMs(new Date(guess - off1), tz);
  return new Date(guess - off2);
}

/**
 * Reinterpret a Date whose UTC fields hold a clinic wall-clock (the storage
 * convention) as the true UTC instant in the clinic timezone.
 */
export function wallClockToInstant(d: Date, tz: string = CLINIC_TIME_ZONE): Date {
  const dateStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )}`;
  const timeStr = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return clinicWallTimeToInstant(dateStr, timeStr, tz);
}

/**
 * Format a stored clinic time for display. The value encodes clinic wall-clock
 * at UTC, so we format in UTC to reproduce the authored local time everywhere.
 */
export function formatClinicTime(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
  locale = "en-US"
): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...opts }).format(
    new Date(date)
  );
}
