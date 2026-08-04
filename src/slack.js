// Thin wrapper around the Slack Web API for posting a message.

import { WebClient } from "@slack/web-api";

export async function postMessage(token, channel, message) {
  const client = new WebClient(token);
  const res = await client.chat.postMessage({
    channel,
    text: message.text, // fallback / notification text
    blocks: message.blocks,
    unfurl_links: false,
    unfurl_media: false,
  });
  return res.ts; // message timestamp, handy for logging
}
