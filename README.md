# foodplace-bot

Posts the canteen menu from [The Food Place](https://salling.thefoodplace.dk) to a
Slack channel on a schedule, **bilingually (Danish + English)**:

- **Every weekday morning** → today's menu for the selected stations
  (Go Green, the deli, Comfort Food by default), plus a highlighted "today's
  treat" whenever the Treats station has something, and a random gif at the end
  (see [Gifs](#gifs)).
- **Every Friday** → additionally, the full menu for the coming week (all stations).
- **Every weekday at 10:55** → a separate "⏰ 5 minutes until lunch" nudge with
  its own random gif (English only, no menu).

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
  gifs.js        loads a gif list and picks one at random
  slack.js       chat.postMessage wrapper
  deliver.js     print-or-post step shared by both entry points
  index.js       menu posts — entry point + mode selection
  reminder.js    "5 minutes until lunch" — entry point
gifs.txt              gif pool for the daily menu post
gifs-reminder.txt     gif pool for the lunch reminder
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
npm run remind:preview

# Actually post to Slack (reads .env):
npm run post:day
npm run post:week
npm run remind:local
```

## Deployment (GitHub Actions, driven by Google Cloud Scheduler)

Two workflows, both `workflow_dispatch`-only:

| Workflow | Runs | Posts |
| --- | --- | --- |
| `.github/workflows/canteen-menu.yml` | `npm run post` | morning menu (+ week ahead on Fridays) |
| `.github/workflows/lunch-reminder.yml` | `npm run remind` | "5 minutes until lunch" + gif |

Neither uses GitHub's own `schedule:` cron — GitHub's scheduled runs are
best-effort, get delayed at peak times and are occasionally dropped. Instead
Google Cloud Scheduler POSTs to the `workflow_dispatch` API on a real,
timezone-aware schedule (`Europe/Copenhagen`, so no daylight-saving drift):
the menu job in the morning, the reminder job at **10:55, Mon–Fri**.

Configure once:

1. Push this repo to GitHub.
2. **Settings → Secrets and variables → Actions**:
   - Secrets: `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`
   - (optional) Variables: `FOODPLACE_LOCATION_ID`, `TIMEZONE`
3. Point a Cloud Scheduler job at each workflow's dispatch endpoint:
   `POST https://api.github.com/repos/<owner>/<repo>/actions/workflows/<file>/dispatches`
   with body `{"ref":"main"}` and a token with `actions:write`.
4. Test either one by hand: **Actions → \<workflow\> → Run workflow**.

The weekday/Friday logic lives in the code, so a mis-set schedule can't produce
a weekend post — both entry points skip Saturdays and Sundays.

## Gifs

There are two independent gif pools, each a plain text file with one URL per
line (`#` comments and blank lines ignored):

| File | Used by |
| --- | --- |
| `gifs.txt` | the daily menu post — gif appended at the end |
| `gifs-reminder.txt` | the "5 minutes until lunch" post |

Add or remove lines to change a pool; no code change needed. One URL is picked
at random per run.

Use the **direct** image URL, not the Giphy page URL — Slack renders the gif
from the URL itself, so a page link shows up as a broken image:

```
good:  https://media.giphy.com/media/<id>/giphy.gif
bad:   https://giphy.com/gifs/some-slug-<id>
```

On giphy.com: open the gif → **Share** → **Copy GIF link**, or right-click →
*Copy Image Address*. The bot warns in the log if a line looks like a page link,
and skips lines that aren't URLs at all. If a file has no URLs, that post just
goes out without a gif.

The weekly (Friday) menu post has no gif.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `SLACK_BOT_TOKEN` | — (required) | Bot token, `xoxb-…`, needs `chat:write` |
| `SLACK_CHANNEL_ID` | — (required) | Target channel ID |
| `FOODPLACE_LOCATION_ID` | `1` | Trailing number in the menu URL |
| `TIMEZONE` | `Europe/Copenhagen` | Used to decide "today" / detect Fridays |
| `DAILY_STATIONS` | `Go Green,Meal 1,Comfort Food` | Stations in the daily post, in order |
| `TREATS_STATION` | `Treats` | Station highlighted as "today's treat" |
| `STATION_LABELS` | `Meal 1=The Deli` | Rename ugly station names for display |

The menu posts are always bilingual (Danish + English); the lunch reminder is
English only. The weekly post always shows all stations regardless of
`DAILY_STATIONS`.

## Modes

`node src/index.js --mode=<mode>`:

- `auto` (default): daily menu on weekdays; on Fridays also the coming week.
- `day`: today's menu only.
- `week`: the coming week only.

The lunch reminder is its own entry point with no modes: `node src/reminder.js`.

Add `--dry-run` to either script to print instead of posting.
