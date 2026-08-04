// Builds Slack Block Kit messages from the normalized menu.
// Each builder returns { text, blocks } — `text` is the notification fallback,
// `blocks` is the rich layout.

import { dayLabel, isoWeekNumber, weekdayName } from "./dates.js";

const STRINGS = {
  da: {
    todayHeader: (weekday, label) => `🍽️ Kantinen i dag – ${weekday} d. ${label}`,
    weekHeader: (week) => `📅 Ugens menu – uge ${week}`,
    noMenu: "Ingen menu fundet for i dag. 🤷",
    allergens: "Allergener",
    poweredBy: "The Food Place",
  },
  en: {
    todayHeader: (weekday, label) => `🍽️ Today in the canteen – ${weekday} ${label}`,
    weekHeader: (week) => `📅 Menu of the week – week ${week}`,
    noMenu: "No menu found for today. 🤷",
    allergens: "Allergens",
    poweredBy: "The Food Place",
  },
};

function dishLines(items, language, showAllergens) {
  return items
    .map((item) => {
      let line = `*${item.station}*\n${item.dish}`;
      if (showAllergens && item.allergens.length) {
        line += `\n_${STRINGS[language].allergens}: ${item.allergens.join(", ")}_`;
      }
      return line;
    })
    .join("\n\n");
}

// Message for a single day (the daily post).
export function buildDayMessage(dateStr, items, { language, showAllergens }) {
  const s = STRINGS[language] || STRINGS.da;
  const header = s.todayHeader(weekdayName(dateStr, language), dayLabel(dateStr, language));

  if (!items || !items.length) {
    return {
      text: header,
      blocks: [
        { type: "header", text: { type: "plain_text", text: header, emoji: true } },
        { type: "section", text: { type: "mrkdwn", text: s.noMenu } },
      ],
    };
  }

  return {
    text: header,
    blocks: [
      { type: "header", text: { type: "plain_text", text: header, emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: dishLines(items, language, showAllergens) } },
      { type: "divider" },
      { type: "context", elements: [{ type: "mrkdwn", text: s.poweredBy }] },
    ],
  };
}

// Message for a whole work week (the Friday "week ahead" post).
export function buildWeekMessage(dates, byDate, { language, showAllergens }) {
  const s = STRINGS[language] || STRINGS.da;
  const firstDay = dates[0];
  const header = s.weekHeader(isoWeekNumber(firstDay));

  const blocks = [
    { type: "header", text: { type: "plain_text", text: header, emoji: true } },
  ];

  for (const dateStr of dates) {
    const items = byDate.get(dateStr) || [];
    if (!items.length) continue;
    const dayHeading = `*${capitalize(weekdayName(dateStr, language))} d. ${dayLabel(dateStr, language)}*`;
    blocks.push({ type: "divider" });
    blocks.push({ type: "section", text: { type: "mrkdwn", text: dayHeading } });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: dishLines(items, language, showAllergens) },
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: s.poweredBy }] });

  return { text: header, blocks };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
