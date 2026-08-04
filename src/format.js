// Builds Slack Block Kit messages from the normalized menu.
// Output is bilingual (Danish + English). Each builder returns { text, blocks }
// where `text` is the notification fallback and `blocks` is the rich layout.

import { dayLabel, isoWeekNumber, weekdayName } from "./dates.js";

// Match a station name case-insensitively and tolerant of trailing spaces.
function sameStation(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function stationMatches(item, names) {
  return names.some((n) => sameStation(item.station, n));
}

// Pretty display name for a station, falling back to its raw name.
function stationLabel(item, labels) {
  return (labels && labels[item.station.trim().toLowerCase()]) || item.station.trim();
}

// One dish rendered bilingually, e.g.
//   *Go Green*
//   🇩🇰 Pasta med pesto
//   🇬🇧 Pasta with pesto
function dishBlock(item, labels) {
  return `*${stationLabel(item, labels)}*\n🇩🇰 ${item.da.dish}\n🇬🇧 ${item.en.dish}`;
}

// ---- Daily post -----------------------------------------------------------

export function buildDayMessage(dateStr, items, { dailyStations, treatsStation, stationLabels }) {
  const daDate = `${weekdayName(dateStr, "da")} d. ${dayLabel(dateStr, "da")}`;
  const enDate = `${weekdayName(dateStr, "en")} ${dayLabel(dateStr, "en")}`;
  const headerText = "🍽️ Frokost i dag / Today's lunch";

  const blocks = [
    { type: "header", text: { type: "plain_text", text: headerText, emoji: true } },
    { type: "context", elements: [{ type: "mrkdwn", text: `*${daDate}*  ·  *${enDate}*` }] },
  ];

  // Selected stations, in config order — only the FIRST dish per station.
  // (Stations like the deli list several items — cold cuts, then a salad, then
  // bread — but only the first is the station's main offering.)
  const selected = [];
  for (const name of dailyStations) {
    const first = items.find((item) => stationMatches(item, [name]));
    if (first) selected.push(first);
  }

  if (!selected.length) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "Ingen menu fundet for i dag. / No menu found for today. 🤷" },
    });
  } else {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: selected.map((i) => dishBlock(i, stationLabels)).join("\n\n") },
    });
  }

  // Treats highlight — only if there's something on the treats station today.
  const treats = items.filter((i) => stationMatches(i, [treatsStation]));
  if (treats.length) {
    blocks.push({ type: "divider" });
    const treatText = treats
      .map((t) => `🇩🇰 ${t.da.dish}\n🇬🇧 ${t.en.dish}`)
      .join("\n\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `🍰 *Dagens søde / Today's treat*\n${treatText}` },
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: "The Food Place" }] });

  return { text: `${headerText} – ${daDate}`, blocks };
}

// ---- Weekly (Friday) post -------------------------------------------------
// The weekly post shows the FULL menu for every day (all stations), so nobody
// misses anything when planning the week.

export function buildWeekMessage(dates, byDate, { stationLabels } = {}) {
  const week = isoWeekNumber(dates[0]);
  const headerText = `📅 Ugens menu / Menu of the week – uge ${week} / week ${week}`;

  const blocks = [
    { type: "header", text: { type: "plain_text", text: headerText, emoji: true } },
  ];

  for (const dateStr of dates) {
    const items = byDate.get(dateStr) || [];
    if (!items.length) continue;
    const heading =
      `*${capitalize(weekdayName(dateStr, "da"))} d. ${dayLabel(dateStr, "da")}` +
      `  ·  ${capitalize(weekdayName(dateStr, "en"))} ${dayLabel(dateStr, "en")}*`;
    blocks.push({ type: "divider" });
    blocks.push({ type: "section", text: { type: "mrkdwn", text: heading } });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: items.map((i) => dishBlock(i, stationLabels)).join("\n\n") },
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: "The Food Place" }] });

  return { text: headerText, blocks };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
