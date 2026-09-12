# Pinned Tab Persistence

A Firefox extension that saves your pinned tabs and reopens them automatically, so closing a window no longer loses them.

## Features

- Pinned tab URLs are saved to local browser storage as soon as you pin them
- Saved tabs are restored on browser startup and in every newly opened window
- Existing tabs are re-pinned rather than duplicated
- A toolbar popup lets you review saved tabs, remove individual entries, or clear all
- `Option + Left` / `Option + Right` cycle through tabs in the current window

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

`background.js` listens for `tabs.onUpdated` and watches the `pinned` flag. Pinning a tab appends its URL to a list in `storage.local`; unpinning removes it. On `windows.onCreated` and at startup, the saved list is replayed into the window, skipping URLs already open and pinning them in place instead.

`content.js` is injected into pages and listens for `Option + Arrow` keydowns, messaging the background script to change the active tab. Indexes wrap, so the last tab advances to the first. Keystrokes inside inputs, textareas, and contenteditable regions are ignored so word-by-word cursor movement still works.

## Known limitations

**The shortcut does not work everywhere.** Content scripts are not injected into `about:` pages, `addons.mozilla.org`, the built-in PDF viewer, or blank new tabs, so the shortcut silently does nothing there. The alternative is the `commands` manifest key, which registers shortcuts at the browser level and covers every page.

**Platform differences.** On macOS, `Option + Arrow` is word-wise cursor movement, which the editable-target guard preserves. On Windows and Linux, `Alt + Arrow` is Back and Forward, so the shortcut overrides history navigation there.

**Tabs are stored as a flat global list.** All windows share one set of pinned tabs rather than each window keeping its own.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension configuration, permissions, add-on ID |
| `background.js` | Persistence logic and tab switching |
| `content.js` | Keyboard shortcut listener |
| `popup.html` | Popup markup and styles |
| `popup.js` | Popup interaction logic |

## Permissions

- `tabs` — read tab URLs, pin tabs, create tabs, change the active tab
- `storage` — persist the pinned URL list locally
- `<all_urls>` (content script) — required to capture the keyboard shortcut on any page

The extension collects and transmits no data. This is declared in the manifest via `browser_specific_settings.gecko.data_collection_permissions` with `required: ["none"]`, which Firefox surfaces on the install prompt.

## Building

No build step. The source files are the shipped files. To produce an `.xpi`:

```bash
zip -r pinned-tabs.xpi manifest.json background.js content.js popup.html popup.js README.md
```

## Possible improvements

- Move the shortcut to the `commands` API to drop the `<all_urls>` content script
- Per-window pinned tab sets
- Export and import the saved list as JSON
