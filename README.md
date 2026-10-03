# Pinned Startup Tabs

A Firefox extension that opens a fixed set of sites as pinned tabs, in your chosen order, every time Firefox starts. It works like having several home pages.

## Features

- Define the set on the settings page: add, remove, reorder. Typing `wsj.com` is enough.
- On browser launch the set opens as pinned tabs at the left of one window, in order
- Sites that are already open are not opened again. This includes tabs Firefox's own session restore brought back, even after a redirect (for example `www.x.com` → `x.com/home`).
- New windows and private windows are left alone
- The toolbar popup shows the set and has **Open set now**, which opens any missing tabs in the current window without restarting
- **Add this window's pinned tabs** on the settings page copies tabs you've pinned by hand into the set

## Installation

### Signed build

The extension is distributed as an unlisted add-on signed by Mozilla. Download the signed `.xpi`, then either drag it onto a Firefox window or open `about:addons` → gear icon → **Install Add-on From File**. Signed builds persist across restarts.

An unsigned `.xpi` built straight from this source will be rejected by release Firefox with a "corrupt" error. That is expected — signing is what makes it installable.

### Temporary load (development)

1. Open `about:debugging`
2. Click **This Firefox**
3. Click **Load Temporary Add-on**
4. Select `manifest.json`

Temporary add-ons are removed when Firefox closes. Use this while iterating on the code.

## How it works

The set is one ordered list of URLs in `storage.local`, written only by the settings page. Pinning, unpinning or closing tabs never changes it.

On `runtime.onStartup` (browser launch only), `background.js` picks the first normal, non-private window. It waits for the tab strip to go quiet (1 s with no tab created or navigated, 10 s at most) so Firefox's session restore can finish. Then it walks the list in order. For each entry it looks for an open tab on the same site (hostname, ignoring `www.`):

- **No match:** open the URL as a pinned tab in the next slot from the left
- **Pinned match:** move that tab into the slot instead of opening a duplicate
- **Unpinned match:** leave the user's tab where it is and skip the entry

The popup's **Open set now** runs the same routine on the current window.

Upgrading from 1.x discards the old automatically recorded `pinnedTabs` list and opens the settings page.

## Known limitations

- The set opens in one window only, not in every window restored at launch.
- Site matching is by hostname. Any open tab on a site (say a LinkedIn profile) counts as that site already being open.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension configuration, permissions, add-on ID |
| `background.js` | Opens the set on launch and on request from the popup |
| `popup.html` | Popup markup and styles |
| `popup.js` | Popup interaction logic |
| `options.html` | Settings page markup and styles |
| `options.js` | Settings page interaction logic (add, remove, reorder, import pinned tabs) |

## Permissions

- `tabs` — read tab URLs, pin tabs, create tabs
- `storage` — persist the URL list locally

The extension collects and transmits no data. This is declared in the manifest via `browser_specific_settings.gecko.data_collection_permissions` with `required: ["none"]`, which Firefox surfaces on the install prompt.

## Building

No build step. The source files are the shipped files. To produce an `.xpi`:

```bash
zip -r pinned-tabs.xpi manifest.json background.js popup.html popup.js options.html options.js README.md
```

## Possible improvements

- Sync the set across devices with `storage.sync`
- Export and import the set as JSON
- Drag-to-reorder in the settings page instead of up/down buttons
