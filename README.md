# Pinned Tab Persistence

A Firefox extension that saves your pinned tabs and reopens them automatically, so closing a window no longer loses them.

## Features

- Pinned tab URLs are saved to local browser storage as soon as you pin them
- Saved tabs are restored, in order, on browser startup only
- Existing tabs are re-pinned rather than duplicated
- A toolbar popup lets you review saved tabs, remove individual entries, or clear all
- A settings page lets you add URLs directly and reorder the list, without needing to open and pin each tab manually first

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

`background.js` listens for `tabs.onUpdated` and watches the `pinned` flag. Pinning a tab appends its URL to an ordered list in `storage.local`; unpinning removes it. The settings page (`options.html`/`options.js`) reads and writes that same list, letting you add URLs directly and reorder them without pinning anything by hand. On `runtime.onStartup` — browser launch only, not every new window — the list is replayed into each open window in order, one tab at a time, skipping URLs already open and pinning them in place instead.

## Known limitations

**Tabs are stored as a flat global list.** All windows share one set of pinned tabs rather than each window keeping its own.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension configuration, permissions, add-on ID |
| `background.js` | Persistence logic |
| `popup.html` | Popup markup and styles |
| `popup.js` | Popup interaction logic |
| `options.html` | Settings page markup and styles |
| `options.js` | Settings page interaction logic (add, remove, reorder) |

## Permissions

- `tabs` — read tab URLs, pin tabs, create tabs
- `storage` — persist the pinned URL list locally

The extension collects and transmits no data. This is declared in the manifest via `browser_specific_settings.gecko.data_collection_permissions` with `required: ["none"]`, which Firefox surfaces on the install prompt.

## Building

No build step. The source files are the shipped files. To produce an `.xpi`:

```bash
zip -r pinned-tabs.xpi manifest.json background.js popup.html popup.js options.html options.js README.md
```

## Possible improvements

- Per-window pinned tab sets
- Export and import the saved list as JSON
- Drag-to-reorder in the settings page instead of up/down buttons
