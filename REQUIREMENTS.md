# Requirements: Startup Tab Set

Status: **draft for review**. Nothing has been built against this yet.

## 1. Goal

When Firefox launches, open a fixed set of tabs that the user defines, in the
order the user defines. It works like having several home pages.

Example set:

1. https://www.wsj.com
2. https://www.nytimes.com
3. https://www.bloomberg.com
4. https://www.linkedin.com
5. https://www.x.com

## 2. Why the current extension doesn't do this

The current code (v1.2) is built for a different job. It tries to remember
whatever tabs happen to be pinned. It does not open a set the user chose.
That causes these problems:

| # | Problem | Where |
| --- | --- | --- |
| P1 | **The list is written by observation, not by the user.** Each time the background script loads (every launch) and each time a tab is pinned, it merges *every currently pinned tab* into the stored list. Anything the user pins once, even by accident, gets added to the startup set for good. | `background.js` `savePinnedTabs`, the init block at the bottom, and the `tabs.onUpdated` listener |
| P2 | **Redirects make the list grow.** Sites redirect (for example `https://www.x.com` → `https://x.com/home`, and `wsj.com` → a URL with a path or query). The duplicate check compares exact URLs, so the redirected URL doesn't match the saved one. A second tab opens, gets pinned, and then gets saved as a new entry too. The list grows on every launch. | `restorePinnedTabs` exact-match `existingUrls.has(url)` |
| P3 | **It fights Firefox's own session restore.** If "Open previous windows and tabs" is on, Firefox already restores pinned tabs. They're often still `about:blank`, or still loading, when the extension checks 500 ms later. Because of that, the extension opens duplicates. | `onStartup` handler with `setTimeout(…, 500)` |
| P4 | **It opens the set in every window.** On a launch that restores 3 windows, the whole set opens 3 times. | `windows.forEach(… restorePinnedTabs …)` |
| P5 | **Unpinning deletes from the list, but closing a tab doesn't.** It's hard to predict what the list will contain. | `tabs.onUpdated` unpin branch |

Fix: the user-defined list becomes the only source of truth. The extension
no longer watches tabs to decide what goes in the list.

## 3. Functional requirements

### 3.1 The tab set

- **R1.** The extension stores one ordered list of URLs: the *startup set*.
- **R2.** Only the user changes the list, through the settings page (R10).
  Pinning, unpinning, opening or closing tabs in the browser never changes it.
- **R3.** Each entry is an absolute `http:` or `https:` URL. If the user types
  input with no scheme, such as `wsj.com`, it is saved as `https://wsj.com/`.
- **R4.** Each URL can appear only once (exact match after normalization).
- **R5.** No hard limit on list length.

### 3.2 Opening the set on launch

- **R6.** On browser launch (`runtime.onStartup`), open every URL in the set,
  in list order.
- **R7.** Open the set in **one window only**: the first normal (non-private,
  non-popup) window that exists after launch. If no such window exists yet,
  wait for the first one to be created. Do this once per launch.
- **R8.** **Don't open duplicates.** Before opening an entry, skip it if any
  tab in the target window already "matches" it. A match means same hostname
  with the leading `www.` ignored. So `https://www.x.com` matches an open
  `https://x.com/home`, and Firefox's session restore plus the extension
  don't double up. *(See open question Q3.)*
- **R9.** Set tabs go at the **left** of the window, in list order, before any
  other tabs. Whichever tab Firefox had active stays active.
- **R9a.** Don't open the set on: new windows (Cmd+N), private windows,
  extension install or update, or the extension being re-enabled. This keeps
  the earlier fix that removed the `windows.onCreated` restore.

### 3.3 Settings page

- **R10.** The settings page (`about:addons` → extension → Preferences, opens in
  a full tab) lets the user:
  - add a URL (text field + Add button, Enter key works)
  - remove a URL
  - reorder URLs (up/down buttons are enough; drag-to-reorder is optional)
  - see the list numbered in launch order
- **R11.** Invalid input shows an inline error and isn't saved. Adding a
  duplicate shows an inline error.
- **R12.** "Add all open tabs from this window" button: a convenience that adds
  every http(s) tab in the current window to the end of the list, skipping
  duplicates. It's the only shortcut from what's open in the browser into the
  list, and the user has to choose it explicitly.
- **R13.** Changes save immediately. There's no Save button.

### 3.4 Toolbar popup

- **R14.** Clicking the toolbar icon shows the set (read-only list).
- **R15.** "Open set now" button: opens the set in the current window using
  the same rules as R8/R9. This lets the user test without restarting
  Firefox, or get the tabs back after closing them.
- **R16.** "Edit…" button opens the settings page.
- **R17.** Remove "Clear all" from the popup. It's too easy to hit by mistake
  in a small panel. (Removing items stays available in settings.)

### 3.5 First run and migration

- **R18.** On first install with no stored data, the set starts **empty** and
  the settings page opens so the user can fill it in.
- **R19.** On upgrade from 1.x, the old `pinnedTabs` list is **discarded**,
  because it was collected by observation and is probably polluted (P1, P2).
  The settings page opens after upgrade so the user can enter the set.
  *(See open question Q5.)*

## 4. Non-functional requirements

- **N1. Permissions stay minimal:** `tabs` and `storage` only. No host
  permissions and no content scripts. (See the CLAUDE.md note about
  `<all_urls>`.)
- **N2. No data collection.** Keep
  `data_collection_permissions.required: ["none"]`. Everything stays in
  `storage.local`.
- **N3. Keep the Mozilla validation fixes:** `background.scripts` (not
  `service_worker`), `browser_specific_settings.gecko.id` unchanged
  (`pinned-tabs@ubaiddhiyan.com`) so the installed copy updates in place.
- **N4. No build step, no dependencies.** Packaging stays a plain `zip`.
- **N5. Version** goes to `2.0` because the behavior has changed. The display
  name and description get updated to match (for example "Startup Tabs:
  open a fixed set of tabs when Firefox starts"). The add-on ID does not
  change.
- **N6. Startup speed:** opening tabs must not block Firefox from becoming
  usable. Tabs are created one after another (to keep the order), with no
  artificial delays beyond what's needed to find the window.

## 5. Out of scope

- Different sets per window, per profile, or per day of the week.
- Syncing the set across devices (`storage.sync`). This could be added later.
- Import/export of the set.
- Keyboard shortcuts.
- Closing or replacing Firefox's own home page / new-tab page. The set opens
  *alongside* whatever Firefox shows. (See open question Q4.)

## 6. Open questions for the user

- **Q1. Pinned or normal tabs?** The repo is called *pinned-tabs*, but
  "like multiple home pages" sounds like normal tabs. Options: (a) always
  pinned, (b) always normal, (c) a per-entry "pin" checkbox. Draft
  assumption: **(c), default pinned.**
- **Q2. Session restore.** Is Firefox's "Open previous windows and tabs"
  setting on? If yes, R8's dedup decides whether you get duplicates. If no,
  every launch starts clean and dedup rarely matters.
- **Q3. Dedup strictness.** Matching on hostname (R8) means any open LinkedIn
  tab, for example a profile page, counts as "already open" and blocks the
  LinkedIn entry. Is that what you want, or should the set entry always open
  its own tab unless one of *its own* tabs is still open from last session?
- **Q4. Default home tab.** Should the extension close the blank/home tab
  Firefox opens on launch, so you only see your set? Draft assumption:
  **no**, to avoid closing something the user meant to have open.
- **Q5. Migration.** Discard the old saved list (R19), or carry it over into
  the new set for you to clean up?

## 7. Acceptance checks (manual)

No test suite exists, so these are checked by hand in Firefox:

1. Fresh install → settings page opens, list is empty.
2. Add the 5 example URLs → restart Firefox → exactly those 5 tabs appear,
   leftmost, in order, in one window.
3. Restart again (with session restore on) → still exactly 5, no duplicates.
4. Press Cmd+N → new window has no set tabs.
5. Pin some unrelated tab, restart → it's not added to the list.
6. Reorder in settings, restart → new order is used.
7. Popup "Open set now" after closing two set tabs → only those two reopen.
8. Open a private window on launch → nothing is opened in it.
