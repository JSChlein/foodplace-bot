// Small date helpers. We work with plain "YYYY-MM-DD" strings (matching the API)
// and only touch timezones to answer "what is today / which weekday is it" in
// the canteen's local time, independent of where the scheduler runs (CI is UTC).

const DA_WEEKDAYS = [
  "søndag",
  "mandag",
  "tirsdag",
  "onsdag",
  "torsdag",
  "fredag",
  "lørdag",
];
const EN_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// "YYYY-MM-DD" for the current moment in the given timezone.
export function todayInTimezone(timezone) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Day of week index (0=Sun..6=Sat) for a "YYYY-MM-DD" string, timezone-agnostic.
export function weekdayIndex(dateStr) {
  // Anchor at noon UTC so the calendar date can't shift under any timezone.
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

export function isFriday(dateStr) {
  return weekdayIndex(dateStr) === 5;
}

export function isWeekend(dateStr) {
  const d = weekdayIndex(dateStr);
  return d === 0 || d === 6;
}

export function weekdayName(dateStr, language) {
  const table = language === "en" ? EN_WEEKDAYS : DA_WEEKDAYS;
  return table[weekdayIndex(dateStr)];
}

// ISO 8601 week number for a "YYYY-MM-DD" string.
export function isoWeekNumber(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - day + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  return 1 + Math.round((d - firstThursday) / (7 * 24 * 3600 * 1000));
}

// The five weekday date strings (Mon–Fri) starting from a Monday "YYYY-MM-DD".
export function workweekDates(mondayStr) {
  const monday = new Date(`${mondayStr}T12:00:00Z`);
  const out = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// "3. august" style day label.
export function dayLabel(dateStr, language) {
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "da-DK", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${dateStr}T12:00:00Z`));
}
