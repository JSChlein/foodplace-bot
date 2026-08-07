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

// Selected stations, in config order — only the FIRST dish per station.
// (Stations like the deli list several items — cold cuts, then a salad, then
// bread — but only the first is the station's main offering.)
function selectDailyItems(items, dailyStations) {
  const selected = [];
  for (const name of dailyStations) {
    const first = items.find((item) => stationMatches(item, [name]));
    if (first) selected.push(first);
  }
  return selected;
}

// ---- Daily post -----------------------------------------------------------
// On Fridays the daily post also gets a short "next week" overview appended
// (pass `weekAhead`), filtered to the same stations as the daily post itself.

export function buildDayMessage(
  dateStr,
  items,
  { dailyStations, treatsStation, stationLabels, gifUrl, weekAhead }
) {
  const daDate = `${weekdayName(dateStr, "da")} d. ${dayLabel(dateStr, "da")}`;
  const enDate = `${weekdayName(dateStr, "en")} ${dayLabel(dateStr, "en")}`;
  const headerText = "🍽️ Frokost i dag / Today's lunch";

  const blocks = [
    { type: "header", text: { type: "plain_text", text: headerText, emoji: true } },
    { type: "context", elements: [{ type: "mrkdwn", text: `*${daDate}*  ·  *${enDate}*` }] },
  ];

  const selected = selectDailyItems(items, dailyStations);

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

  // Week ahead (Fridays) — one compact line per dish, same stations as above.
  if (weekAhead) {
    blocks.push(
      ...weekAheadBlocks(weekAhead, { dailyStations, treatsStation, stationLabels })
    );
  }

  blocks.push({ type: "divider" });
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: "The Food Place" }] });

  // Gif of the day — last, so it closes the message.
  if (gifUrl) {
    blocks.push({
      type: "image",
      image_url: gifUrl,
      alt_text: "Dagens gif / Gif of the day",
    });
  }

  return { text: `${headerText} – ${daDate}`, blocks };
}

// Compact "next week" overview appended to the Friday daily post. Same station
// selection as the daily post, but one line per dish to keep it short.
function weekAheadBlocks({ dates, byDate }, { dailyStations, treatsStation, stationLabels }) {
  const week = isoWeekNumber(dates[0]);
  const blocks = [
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: `📅 *Næste uge / Next week – uge ${week} / week ${week}*` },
    },
  ];

  for (const day of dates) {
    const items = byDate.get(day) || [];
    const selected = selectDailyItems(items, dailyStations);
    const treats = items.filter((i) => stationMatches(i, [treatsStation]));
    if (!selected.length && !treats.length) continue;

    const heading =
      `*${capitalize(weekdayName(day, "da"))} d. ${dayLabel(day, "da")}` +
      `  ·  ${capitalize(weekdayName(day, "en"))} ${dayLabel(day, "en")}*`;
    const lines = selected.map(
      (i) => `• *${stationLabel(i, stationLabels)}:* 🇩🇰 ${i.da.dish}  ·  🇬🇧 ${i.en.dish}`
    );
    for (const t of treats) {
      lines.push(`• 🍰 🇩🇰 ${t.da.dish}  ·  🇬🇧 ${t.en.dish}`);
    }
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `${heading}\n${lines.join("\n")}` },
    });
  }

  return blocks;
}

// ---- Weekly (full-menu) post ----------------------------------------------
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

// ---- Lunch reminder -------------------------------------------------------
// Posted shortly before lunch opens. Just a title and a gif — the menu itself
// went out in the morning post. English only, unlike the menu posts.

export function buildReminderMessage({ gifUrl } = {}) {
  const headerText = "⏰ 5 minutes until lunch";

  const blocks = [
    { type: "header", text: { type: "plain_text", text: headerText, emoji: true } },
  ];

  if (gifUrl) {
    blocks.push({
      type: "image",
      image_url: gifUrl,
      alt_text: "5 minutes until lunch",
    });
  }

  return { text: headerText, blocks };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
