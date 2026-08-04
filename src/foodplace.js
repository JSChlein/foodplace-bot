// Fetches and parses the menu from The Food Place.
//
// The URL (https://salling.thefoodplace.dk/banner/weekmenu/<locationId>) serves a
// server-rendered Remix page, not a JSON API. The menu data is embedded in the
// HTML as a `window.__remixContext = {...};` assignment, which we extract and
// parse. The page conveniently returns TWO weeks of data at once (the current
// week and the next one), so the Friday "week ahead" post needs no extra call.

const ROUTE_KEY = "routes/banner/weekmenu/$location/index";

export function menuUrl(locationId) {
  return `https://salling.thefoodplace.dk/banner/weekmenu/${locationId}`;
}

// Pull the JSON object that follows `window.__remixContext = ` out of the HTML.
// A naive regex breaks on the braces inside the JSON, so we do brace matching
// that is aware of string literals and escapes.
function extractRemixContext(html) {
  const marker = "window.__remixContext = ";
  const start = html.indexOf(marker);
  if (start === -1) {
    throw new Error(
      "Could not find window.__remixContext in the page. The Food Place may " +
        "have changed its markup."
    );
  }
  const from = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = from; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) {
    throw new Error("Malformed window.__remixContext block (unbalanced braces).");
  }
  return JSON.parse(html.slice(from, end));
}

// Normalize the raw entries into a simple shape grouped by date. Both languages
// are kept on every item so the caller can render bilingual output.
function normalize(routeData) {
  const entries = routeData?.data?.data;
  if (!Array.isArray(entries)) {
    throw new Error("Menu payload did not contain the expected data array.");
  }

  const byDate = new Map();
  for (const entry of entries) {
    const station = entry.station_name || {};
    const recipe = entry.recipe_id || {};
    const da = (recipe.menu_info || "").trim();
    const en = (recipe.menu_info_1 || "").trim();
    if (!da && !en) continue;

    const item = {
      date: entry.date,
      station: (station.station_name || "").trim(),
      stationSequence: station.sequence ?? 999,
      da: { dish: da || en },
      en: { dish: en || da },
    };

    if (!byDate.has(item.date)) byDate.set(item.date, []);
    byDate.get(item.date).push(item);
  }

  // Sort each day's dishes by the station's own display order.
  for (const items of byDate.values()) {
    items.sort((a, b) => a.stationSequence - b.stationSequence);
  }

  return {
    weekOne: routeData.weekOne || null, // Monday of the current week (YYYY-MM-DD)
    weekTwo: routeData.weekSecond || null, // Monday of next week
    byDate,
  };
}

export async function fetchMenu(locationId) {
  const url = menuUrl(locationId);
  const res = await fetch(url, {
    headers: {
      // Some CDNs behave better with a browser-like UA.
      "User-Agent": "foodplace-bot (+https://github.com/)",
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch menu (${res.status} ${res.statusText}) from ${url}`);
  }
  const html = await res.text();
  const ctx = extractRemixContext(html);
  const routeData = ctx.routeData?.[ROUTE_KEY];
  if (!routeData) {
    throw new Error(
      `Route data "${ROUTE_KEY}" not found. The Food Place may have changed its routes.`
    );
  }
  return normalize(routeData);
}
