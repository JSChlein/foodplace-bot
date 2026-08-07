// Central configuration, read from environment variables.
// In local dev these come from a .env file (see .env.example); in CI they come
// from GitHub Actions secrets. Nothing here is secret except the bot token.

export const config = {
  // Slack bot token, starts with "xoxb-". Needs the chat:write scope.
  slackToken: process.env.SLACK_BOT_TOKEN,

  // Channel to post into. Use the channel ID (e.g. "C0123456789"), which is
  // stable even if the channel is renamed. The bot must be a member of it.
  channel: process.env.SLACK_CHANNEL_ID,

  // The Food Place location id — the trailing number in the menu URL.
  // https://salling.thefoodplace.dk/banner/weekmenu/<locationId>
  locationId: process.env.FOODPLACE_LOCATION_ID || "1",

  // Timezone used to decide "today" and "which weekday it is".
  timezone: process.env.TIMEZONE || "Europe/Copenhagen",

  // Which stations to include in the DAILY post (and the Friday "next week"
  // overview), in display order. Names must match the station names from The
  // Food Place exactly (case-insensitive). Comma-separated. A manual
  // --mode=week post still shows the full menu.
  dailyStations: (process.env.DAILY_STATIONS || "Go Green,Meal 1,Comfort Food")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // The "treats" station is highlighted separately in the daily post whenever
  // there's something on it that day.
  treatsStation: process.env.TREATS_STATION || "Treats",

  // Pretty display names for stations whose raw name is unhelpful. Format:
  // "Meal 1=The Deli,Meal 2=Salads". Applied to both daily and weekly posts.
  stationLabels: parseLabels(process.env.STATION_LABELS || "Meal 1=The Deli"),
};

// Parse "Raw A=Nice A,Raw B=Nice B" into a lowercase-keyed lookup.
function parseLabels(spec) {
  const map = {};
  for (const pair of spec.split(",")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const from = pair.slice(0, idx).trim();
    const to = pair.slice(idx + 1).trim();
    if (from && to) map[from.toLowerCase()] = to;
  }
  return map;
}

export function assertPostConfig() {
  const missing = [];
  if (!config.slackToken) missing.push("SLACK_BOT_TOKEN");
  if (!config.channel) missing.push("SLACK_CHANNEL_ID");
  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `See .env.example.`
    );
  }
}
