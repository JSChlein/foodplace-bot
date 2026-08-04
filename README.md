# foodplace-bot

Posts the canteen menu from [The Food Place](https://salling.thefoodplace.dk) to a
Slack channel on a schedule:

- **Every weekday morning** → today's menu.
- **Every Friday** → additionally, the full menu for the coming week.

It's a small Node script triggered by a scheduler (GitHub Actions by default).
There is **no always-on server and no slash command** — the bot posts proactively,
so it never needs a public URL or Socket Mode.

## How it works

`https://salling.thefoodplace.dk/banner/weekmenu/<locationId>` serves a
server-rendered page with the menu embedded as JSON in `window.__remixContext`.
The script fetches the page, extracts that JSON, formats a Slack message, and
posts it via `chat.postMessage`. The page returns two weeks at once, so the
Friday "week ahead" post needs no extra request.

```
src/
  config.js      env-var configuration
  foodplace.js   fetch + parse the menu
  dates.js       timezone-aware "today"/weekday/week helpers
  format.js      Slack Block Kit message builders
  slack.js       chat.postMessage wrapper
  index.js       entry point + mode selection
```

## Slack setup (one time)

1. Create an app at <https://api.slack.com/apps> → **From scratch**.
2. **OAuth & Permissions** → add the **`chat:write`** bot scope.
3. **Install to Workspace** and copy the **Bot User OAuth Token** (`xoxb-…`).
4. Invite the bot to the target channel: in the channel, type
   `/invite @your-bot-name`.
5. Get the **channel ID**: channel name → *View channel details* → ID at the
   bottom (e.g. `C0123456789`).

> You do **not** need the `/foodplace` slash command for this. If you already
> created one, you can leave it or remove it — it's unrelated to daily posting.

## Local development

Requires Node 20.6+.

```bash
npm install
cp .env.example .env      # fill in SLACK_BOT_TOKEN and SLACK_CHANNEL_ID

# Preview messages without posting (no token needed):
npm run preview -- --mode=day
npm run preview -- --mode=week

# Actually post to Slack (reads .env):
npm run post:day
npm run post:week
```

## Deployment (GitHub Actions — recommended)

The workflow in `.github/workflows/canteen-menu.yml` runs `npm run post` every
weekday at 06:00 UTC. Configure it once:

1. Push this repo to GitHub.
2. **Settings → Secrets and variables → Actions**:
   - Secrets: `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`
   - (optional) Variables: `FOODPLACE_LOCATION_ID`, `TIMEZONE`, `MENU_LANGUAGE`
3. Test it now: **Actions → Canteen menu → Run workflow**.

### Timing note

Cron in GitHub Actions is **UTC**. `0 6 * * 1-5` = 08:00 Copenhagen in summer
(CEST) / 07:00 in winter (CET). A fixed UTC cron drifts one hour across
daylight-saving changes; adjust the hour if that matters. GitHub's scheduler can
also be delayed a few minutes at peak times.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `SLACK_BOT_TOKEN` | — (required) | Bot token, `xoxb-…`, needs `chat:write` |
| `SLACK_CHANNEL_ID` | — (required) | Target channel ID |
| `FOODPLACE_LOCATION_ID` | `1` | Trailing number in the menu URL |
| `TIMEZONE` | `Europe/Copenhagen` | Used to decide "today" / detect Fridays |
| `MENU_LANGUAGE` | `da` | `da` or `en` |
| `SHOW_ALLERGENS` | `true` | Set `false` to hide allergen lines |

## Modes

`node src/index.js --mode=<mode>`:

- `auto` (default): daily menu on weekdays; on Fridays also the coming week.
- `day`: today's menu only.
- `week`: the coming week only.

Add `--dry-run` to print instead of posting.
