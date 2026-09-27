# Trip Kitty

A small web page for splitting group-trip expenses. Log who paid for what, tick
who shared each cost, and it works out each person's balance and the fewest
payments needed to settle up. Splits can be equal or weighted, payments you have
already made are tracked, and everything is stored in your own Google Sheet.

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

Each trip gets its own tab, created automatically, holding four blocks: the trip
name and currency (A-B), People (D), Expenses (F-L) and Payments (M-Q).

Optional: to skip the paste step, open `index.html` and set
`var SHEET_API = "https://script.google.com/macros/s/.../exec";` near the top of
the script, then commit that change.

## Uneven splits

By default a cost is divided equally between everyone you tick. Switch **Split
between** to **By share** to give people different weights — 3 / 2 / 1 splits a
bill in half, a third and a sixth. Set someone to 0 to leave them out.

Weights live in the **Shares** column (K) of the trip tab, written as
`Ana:3, Bo:2, Cy:1`. That cell is left blank whenever a split is equal, so the
sheet stays readable and tabs written before this column existed keep working —
a blank cell just means one share each.

If you are updating from an older `Code.gs`, redeploy it (**Deploy → Manage
deployments →** pencil **→ Version: New version**) or uneven splits will be
saved as equal ones. The page checks after every save and tells you if that
happens rather than quietly changing your numbers.

## Contribution (money pooled up front)

If everyone chips in before the trip, open the **Contribution** tab, pick who
**collected** the money, enter the amount and tap **Add for everyone** (or add
people one at a time). The tab shows how much was **collected**, how much was
**spent** and how much is **left**.

When the person holding that money logs an expense, **Paid from contribution**
is ticked for them. Untick it when they paid out of their own pocket instead:
the cost is still split and shows up in everyone's balance, but it isn't taken
from what was collected. Ticking it while someone else is under **Who paid**
switches the payer to the collector.

Contributions are saved as payments with the note `collection`. The tick is
saved in the expense's **From contribution** column (L) as `Yes` or `No`.
Expenses logged before that column existed are left blank and count as paid
from the contribution when the collector paid them, as before.

**Updating from an older `Code.gs`:** paste in the new one and redeploy
(**Deploy → Manage deployments →** pencil **→ Version: New version**). Older
trip tabs are read as they are and moved to the new column layout the next
time they save. Until you redeploy, an unticked box can't be stored, and the
page says so in the status bar.

## On a computer

On a wide screen (Windows, Mac) the trip opens with a sidebar for Expenses,
Balances, Contribution and Settle, and each section is laid out in two columns.
Keyboard shortcuts: **N** new expense, **1–4** switch section, **Ctrl+S** save
to the sheet. Hover or tab onto a balance bar for its breakdown. Windows High
Contrast mode is supported.

## Good to know

- Anyone with the page URL **and** the Web app URL can read and edit the trip;
  there's no login. Treat the `/exec` URL like a shared key. If it leaks, create a
  new deployment and use the new URL.
- The page keeps a local copy in the browser, so it still opens offline; changes
  sync back to the Sheet when you're online.
- Saving is last-write-wins with a refresh when you return to the tab — fine for a
  group casually logging expenses.
- Names can't contain a comma, because the sheet stores each expense's
  participants in a single comma-separated cell.
# trip-exp