/**
 * Trip Kitty — Google Sheet storage backend (multi-trip + settlement history)
 *
 * Each trip is stored on its OWN tab in this workbook, named after the trip.
 *
 *   GET  ?action=list                       -> { trips: [names...] }
 *   GET  ?action=load&trip=NAME             -> { trip, cur, people[], expenses[], payments[] }
 *   POST { trip, cur, people, expenses, payments }  -> saves that tab (creates it if new)
 *   POST { action:"delete", trip:NAME }             -> removes that tab
 *
 * TAB LAYOUT (per trip)
 *   A1 "Trip name"  B1 <name>
 *   A2 "Currency"   B2 <symbol>
 *   D1 "People",      D2:D...            one name per row
 *   F1:K1 Expenses    Description | Amount | Paid by | Shared by | Timestamp | Shares
 *   L1:P1 Payments    Date | Who pays | Pays to | Amount | Note
 *
 * UNEVEN SPLITS
 *   "Shared by" (column I) always lists every participant by name, so an older
 *   copy of the page still reads the right people and splits equally.
 *   "Shares" (column K) carries the weights — "Ana:3, Bo:2, Cy:1" — and is left
 *   BLANK whenever the split is equal, which is the common case. A blank cell
 *   means "one share each", so old tabs written before this column existed keep
 *   working untouched.
 *
 * SETUP / UPDATE
 *   1. Open your Google Sheet -> Extensions -> Apps Script.
 *   2. Replace everything with this file and Save.
 *   3. Deploy -> Manage deployments -> edit your Web app (pencil)
 *      -> Version: New version -> Deploy.  (Keeps the same URL.)
 *      First time: Deploy -> New deployment -> Web app -> Who has access: Anyone.
 *
 * Existing trip tabs keep working; the Shares and Payments columns are simply
 * empty until they are used.
 */

var MARKER = 'Trip name';
var EXP_HEADERS = ['Description', 'Amount', 'Paid by', 'Shared by', 'Timestamp', 'Shares'];
var PAY_HEADERS = ['Date', 'Who pays', 'Pays to', 'Amount', 'Note'];
var COL_PEOPLE = 4;   // D
var COL_EXP = 6;      // F..K  (6 columns)
var EXP_WIDTH = 6;
var COL_PAY = 12;     // L..P

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'list';
  if (action === 'load') return json_(readTrip_(e.parameter.trip));
  return json_({ trips: listTrips_() });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (body.action === 'delete') { deleteTrip_(body.trip); return json_({ trips: listTrips_() }); }
      writeTrip_(body);
      return json_(readTrip_(body.trip));
    } finally { lock.releaseLock(); }
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function listTrips_() {
  var out = [];
  ss_().getSheets().forEach(function (sh) {
    if (sh.getRange('A1').getValue() === MARKER) out.push(sh.getName());
  });
  return out;
}

function tripSheet_(name, create) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh && create) sh = ss.insertSheet(name);
  return sh;
}

/**
 * "Ana:3, Bo:2" -> { Ana:3, Bo:2 }
 * Splits each pair on its LAST colon, so a name containing a colon survives.
 * Returns null when the cell is blank or holds nothing usable.
 */
function parseShares_(cell, names) {
  var text = String(cell || '').trim();
  if (!text) return null;
  var out = {}, found = false;
  text.split(',').forEach(function (pair) {
    var s = pair.trim();
    if (!s) return;
    var cut = s.lastIndexOf(':');
    if (cut < 0) return;
    var who = s.slice(0, cut).trim();
    var w = Number(s.slice(cut + 1).trim());
    if (who && isFinite(w) && w > 0) { out[who] = w; found = true; }
  });
  if (!found) return null;
  // ignore weights for anyone no longer on the trip
  if (names && names.length) {
    var keep = {}, any = false;
    names.forEach(function (n) { if (out[n] > 0) { keep[n] = out[n]; any = true; } });
    return any ? keep : null;
  }
  return out;
}

/** { Ana:3, Bo:2 } -> "Ana:3, Bo:2"; blank when the split is equal. */
function formatShares_(weights, participants) {
  if (!weights) return '';
  var vals = [], list = participants || Object.keys(weights);
  for (var i = 0; i < list.length; i++) {
    var w = Number(weights[list[i]]);
    if (!(w > 0)) return '';            // incomplete — fall back to the name list
    vals.push(w);
  }
  if (!vals.length) return '';
  var equal = vals.every(function (v) { return v === vals[0]; });
  if (equal) return '';                 // the common case stays out of the sheet
  return list.map(function (n) { return n + ':' + Number(weights[n]); }).join(', ');
}

function readTrip_(name) {
  var sh = tripSheet_(name, false);
  if (!sh) {
    return { error: 'No such trip', trip: String(name || ''), cur: '₹', people: [], expenses: [], payments: [] };
  }
  var cur = sh.getRange('B2').getValue();
  var last = sh.getLastRow();
  var people = [], expenses = [], payments = [];

  if (last >= 2) {
    var rows = last - 1;

    sh.getRange(2, COL_PEOPLE, rows, 1).getValues().forEach(function (r) {
      if (r[0] !== '' && r[0] != null) people.push(String(r[0]));
    });

    sh.getRange(2, COL_EXP, rows, EXP_WIDTH).getValues().forEach(function (r) {
      if ((r[0] === '' || r[0] == null) && (r[1] === '' || r[1] == null)) return;
      var shares = String(r[3] || '').split(',').map(function (s) { return s.trim(); }).filter(String);
      var e = {
        desc: String(r[0] || ''),
        amount: Number(r[1] || 0),
        paidBy: String(r[2] || ''),
        shares: shares,
        ts: Number(r[4] || 0)
      };
      var w = parseShares_(r[5], shares);
      if (w) e.weights = w;             // absent means "equal", which the page assumes
      expenses.push(e);
    });

    sh.getRange(2, COL_PAY, rows, 5).getValues().forEach(function (r) {
      if ((r[1] === '' || r[1] == null) && (r[3] === '' || r[3] == null)) return;
      payments.push({
        date: dateStr_(r[0]),
        from: String(r[1] || ''),
        to: String(r[2] || ''),
        amount: Number(r[3] || 0),
        note: String(r[4] || '')
      });
    });
  }

  return { trip: sh.getName(), cur: String(cur || '₹'), people: people, expenses: expenses, payments: payments };
}

// Accepts a real Date from the sheet or a yyyy-mm-dd string; always returns yyyy-mm-dd.
function dateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v || '');
}

function writeTrip_(d) {
  var name = String(d.trip || '').trim();
  if (!name) throw new Error('Trip name required');
  var sh = tripSheet_(name, true);
  sh.clear();

  sh.getRange('A1').setValue(MARKER);     sh.getRange('B1').setValue(name);
  sh.getRange('A2').setValue('Currency'); sh.getRange('B2').setValue(d.cur || '₹');

  sh.getRange(1, COL_PEOPLE).setValue('People');
  var people = d.people || [];
  if (people.length) {
    sh.getRange(2, COL_PEOPLE, people.length, 1).setValues(people.map(function (n) { return [n]; }));
  }

  sh.getRange(1, COL_EXP, 1, EXP_WIDTH).setValues([EXP_HEADERS]);
  var exp = d.expenses || [];
  if (exp.length) {
    sh.getRange(2, COL_EXP, exp.length, EXP_WIDTH).setValues(exp.map(function (x) {
      var parts = x.shares || [];
      return [
        x.desc || '',
        Number(x.amount || 0),
        x.paidBy || '',
        parts.join(', '),
        x.ts || Date.now(),
        formatShares_(x.weights, parts)
      ];
    }));
  }

  sh.getRange(1, COL_PAY, 1, 5).setValues([PAY_HEADERS]);
  var pay = d.payments || [];
  if (pay.length) {
    sh.getRange(2, COL_PAY, pay.length, 5).setValues(pay.map(function (p) {
      return [p.date || '', p.from || '', p.to || '', Number(p.amount || 0), p.note || ''];
    }));
  }
}

function deleteTrip_(name) {
  var sh = tripSheet_(name, false);
  if (sh) ss_().deleteSheet(sh);
}
