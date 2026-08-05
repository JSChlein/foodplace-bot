// Entry point for the "5 minutes until lunch" reminder: a title and a random
// gif from gifs-reminder.txt. No menu — that went out in the morning post.
//
// The timing lives entirely in the scheduler (Google Cloud Scheduler triggers
// the lunch-reminder workflow at 10:55 Europe/Copenhagen), so there is nothing
// clock-related here. As a safety net we skip weekends, in case the schedule is
// ever widened by accident.
//
// Flags:
//   --dry-run   Print the message to stdout instead of posting to Slack.
//               Works without a Slack token — useful for previewing.

import { config, assertPostConfig } from "./config.js";
import { todayInTimezone, isWeekend } from "./dates.js";
import { buildReminderMessage } from "./format.js";
import { loadGifs, pickGif } from "./gifs.js";
import { deliver, parseDryRun } from "./deliver.js";

async function main() {
  const dryRun = parseDryRun(process.argv);
  if (!dryRun) assertPostConfig();

  const today = todayInTimezone(config.timezone);
  if (!dryRun && isWeekend(today)) {
    console.log(`Today (${today}) is a weekend — no lunch reminder.`);
    return;
  }

  const gifUrl = pickGif(loadGifs("gifs-reminder.txt"));
  await deliver("lunch reminder", buildReminderMessage({ gifUrl }), dryRun);
}

main().catch((err) => {
  console.error("foodplace-bot reminder failed:", err.message);
  process.exit(1);
});
