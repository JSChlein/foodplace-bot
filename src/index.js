// Entry point. Fetches the menu and posts to Slack.
//
// Modes (choose with --mode, default "auto"):
//   day    Post today's menu.
//   week   Post the full coming week's menu.
//   auto   Post today's menu on weekdays; on Fridays ALSO post the coming week.
//
// Flags:
//   --dry-run   Print the message(s) to stdout instead of posting to Slack.
//               Works without a Slack token — useful for previewing.

import { config, assertPostConfig } from "./config.js";
import { fetchMenu } from "./foodplace.js";
import {
  todayInTimezone,
  isFriday,
  isWeekend,
  workweekDates,
} from "./dates.js";
import { buildDayMessage, buildWeekMessage } from "./format.js";
import { loadGifs, pickGif } from "./gifs.js";
import { deliver } from "./deliver.js";

function parseArgs(argv) {
  const args = { mode: "auto", dryRun: false };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--mode=")) args.mode = arg.slice("--mode=".length);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.dryRun) assertPostConfig();

  const dayOpts = {
    dailyStations: config.dailyStations,
    treatsStation: config.treatsStation,
    stationLabels: config.stationLabels,
    // One random gif per run, appended to the daily post. Null when gifs.txt
    // has no URLs yet — the post then goes out without a gif.
    gifUrl: pickGif(loadGifs("gifs.txt")),
  };
  const menu = await fetchMenu(config.locationId);
  const today = todayInTimezone(config.timezone);

  const wantDay = args.mode === "day" || args.mode === "auto";
  const wantWeek =
    args.mode === "week" || (args.mode === "auto" && isFriday(today));

  if (args.mode === "auto" && isWeekend(today)) {
    console.log(`Today (${today}) is a weekend — nothing to post.`);
    return;
  }

  if (wantDay) {
    const items = menu.byDate.get(today) || [];
    if (!items.length && args.mode === "auto") {
      console.log(`No menu for ${today} — skipping daily post.`);
    } else {
      await deliver("daily menu", buildDayMessage(today, items, dayOpts), args.dryRun);
    }
  }

  if (wantWeek) {
    // "Coming week": on Friday we want next week (menu.weekTwo). For a manual
    // --mode=week run outside Friday, fall back to whichever week isn't over.
    const mondayOfComingWeek =
      isFriday(today) && menu.weekTwo ? menu.weekTwo : menu.weekOne;
    if (!mondayOfComingWeek) {
      throw new Error("Could not determine which week to post.");
    }
    const dates = workweekDates(mondayOfComingWeek);
    await deliver(
      "week ahead",
      buildWeekMessage(dates, menu.byDate, { stationLabels: config.stationLabels }),
      args.dryRun
    );
  }
}

main().catch((err) => {
  console.error("foodplace-bot failed:", err.message);
  process.exit(1);
});
