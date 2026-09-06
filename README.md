# Trip Kitty

A small web page for splitting group-trip expenses. Log who paid for what, tick
who shared each cost, and it works out each person's balance and the fewest
payments needed to settle up. Data is stored in your own Google Sheet.

Works on Android, iPhone, Mac and Windows — it's a single static HTML file.

## Publish it (GitHub Pages)

1. Create a new **public** repository.
2. Upload `index.html` (and this README) to it.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**,
   pick the **main** branch and the **/ (root)** folder, then **Save**.
5. Wait ~1 minute, then open `https://<your-username>.github.io/<repo-name>/`.

That URL is your app. Share it with the group.

## Connect it to your Google Sheet

The page needs a tiny script on your Sheet to store data.

1. Make (or open) a Google Sheet. Go to **Extensions → Apps Script**.
2. Delete the sample code, paste in `Code.gs`, and **Save**.
3. **Deploy → New deployment → Web app**. Set **Who has access** to **Anyone**,
   then **Deploy** and approve the permission prompt.
4. Copy the **Web app URL** (it ends in `/exec`).
5. Open your published page, paste the URL into the **Google Sheet storage** box,
   and tap **Connect**.

The Sheet gets three tabs — Trip, People, Expenses — created automatically.

Optional: to skip the paste step, open `index.html` and set
`var SHEET_API = "https://script.google.com/macros/s/.../exec";` near the top of
the script, then commit that change.

## Good to know

- Anyone with the page URL **and** the Web app URL can read and edit the trip;
  there's no login. Treat the `/exec` URL like a shared key. If it leaks, create a
  new deployment and use the new URL.
- The page keeps a local copy in the browser, so it still opens offline; changes
  sync back to the Sheet when you're online.
- Saving is last-write-wins with a refresh when you return to the tab — fine for a
  group casually logging expenses.
# trip-exp