// Shared "print it or post it" step, used by both entry points.

import { config } from "./config.js";
import { postMessage } from "./slack.js";

export function preview(label, message) {
  console.log(`\n===== ${label} =====`);
  console.log(message.text);
  console.log("---");
  console.log(JSON.stringify(message.blocks, null, 2));
}

export async function deliver(label, message, dryRun) {
  if (dryRun) {
    preview(label, message);
    return;
  }
  const ts = await postMessage(config.slackToken, config.channel, message);
  console.log(`Posted ${label} to ${config.channel} (ts=${ts})`);
}

// --dry-run prints the message instead of posting, and works without a token.
export function parseDryRun(argv) {
  return argv.slice(2).includes("--dry-run");
}
