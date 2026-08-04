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

  // Language for the dish text: "da" (Danish) or "en" (English).
  language: process.env.MENU_LANGUAGE || "da",

  // Whether to append allergen info under each dish.
  showAllergens: process.env.SHOW_ALLERGENS !== "false",
};

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
