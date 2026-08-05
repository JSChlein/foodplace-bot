// Reads a gif list and picks one at random. Each post type has its own list in
// the repo root (gifs.txt for the daily menu, gifs-reminder.txt for the "5
// minutes until lunch" reminder), so the pools stay independent.
//
// File format: plain text, one URL per line, "#" comments and blank lines
// ignored.

import { readFileSync } from "node:fs";

// fileName is resolved relative to the repo root, so cwd doesn't matter.
export function loadGifs(fileName) {
  const file = new URL(`../${fileName}`, import.meta.url);

  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return []; // no gif file — the post just goes out without a gif
  }

  const urls = [];
  for (const line of raw.split("\n")) {
    const url = line.trim();
    if (!url || url.startsWith("#")) continue;
    if (!/^https?:\/\//i.test(url)) {
      console.warn(`Ignoring line in ${fileName} (not a URL): ${url}`);
      continue;
    }
    // Slack renders an image block from the URL itself, so a Giphy *page* link
    // would show as a broken image. Warn, but still post it — better than
    // silently dropping a URL form we didn't anticipate.
    if (/^https?:\/\/(www\.)?giphy\.com\//i.test(url)) {
      console.warn(
        `Warning: ${url} in ${fileName} looks like a Giphy page link, not a ` +
          `direct gif URL (https://media.giphy.com/media/<id>/giphy.gif). ` +
          `It may not render.`
      );
    }
    urls.push(url);
  }
  return urls;
}

export function pickGif(urls) {
  if (!urls.length) return null;
  return urls[Math.floor(Math.random() * urls.length)];
}
