# Context for Claude Code

## What this is

A Firefox extension that persists pinned tabs across sessions. Firefox loses
pinned tabs when you close a window; this saves their URLs and restores them,
in order, on browser startup.

No build step, no dependencies, no test suite. The source files are the shipped
files. Packaging is a plain `zip`.

## Distribution

Distributed as an **unlisted** add-on signed by Mozilla — not listed publicly on
addons.mozilla.org. The workflow is: upload the `.xpi` to the Developer Hub,
wait for validation and signing, then download the *signed* `.xpi` and install
it via `about:addons` → gear → Install Add-on From File.

An unsigned build will fail to install on release Firefox with a misleading
"appears corrupt" error. That is signing, not a real corruption.

## Validation errors already resolved

These were hit in sequence during submission. Do not undo these fixes:

- **`background.service_worker` is disabled in Firefox.** Must use
  `background.scripts` instead. Listing both also fails validation — Firefox
  wants `scripts` alone, despite this being a Manifest V3 extension.
- **Add-on ID required in MV3.** Set at
  `browser_specific_settings.gecko.id`.
- **`data_collection_permissions` required.** Mozilla began requiring this for
  new extensions on 2025-11-03. Set to `required: ["none"]` because the
  extension stores URLs only in `storage.local` and transmits nothing. Once the
  key is present it must stay present in all future versions.

## Open items

- **Add-on ID contains a personal domain** (`pinned-tabs@ubaiddhiyan.com`). It
  is an identifier string, not a working address, but it is visible in a public
  repo. Changing it means Mozilla treats it as a different add-on: new
  submission, new signature, and the installed copy will not update to it.
- **Version 1.0 was signed with a tab-cycling shortcut that has since been
  removed.** Version 1.1 dropped it and was submitted to Mozilla. Version 1.2
  (current) fixes the `windows.onCreated` restore bug described below and has
  not been submitted yet.

## Removed on purpose

A `content.js` provided Option+Arrow tab cycling. It was removed in 1.1 in
favour of Firefox's built-in Cmd+Option+Arrow. This also dropped the
`<all_urls>` content script permission, which was the broadest permission the
extension requested and the one most likely to attract reviewer scrutiny on a
tab-management add-on. Re-adding page-level shortcuts brings that permission
back — prefer the `commands` manifest key, which registers at browser level and
needs no host permissions, if shortcuts are ever wanted again.

## Restore trigger

Pinned tabs are replayed only on `browser.runtime.onStartup` — true browser
launch, fired once. An earlier version also restored on `windows.onCreated`,
which fires for *every* new window (Cmd+N, "New Window" from the menu, etc.),
so opening a plain new window kept dumping the whole pinned-tab list into it.
Removed for that reason. Do not reintroduce a `windows.onCreated` restore
listener; if per-window behavior is ever wanted, gate it on some "already
restored this session" flag rather than firing unconditionally.

## Settings page

`options.html`/`options.js` register via `options_ui` (`open_in_tab: true`,
so it opens full-tab from `about:addons` → Preferences rather than a small
popup panel). It reads and writes the same `storage.local` array the popup
and `background.js` use — there is one ordered list, not a separate
"configured" list layered on top of the "observed" one. Manually pinning a
tab still appends to the end of that array via the existing `tabs.onUpdated`
listener; the settings page just gives another way to add/remove/reorder the
same data. `restorePinnedTabs` in `background.js` already iterated the array
sequentially with `await` inside the loop, so listed order was preserved
before this feature existed — reordering in settings is enough to control
launch order, no change to the restore logic was needed.

## Known limitations

Pinned tabs are one flat global list in `storage.local`, shared across all
windows, rather than per-window sets.

## Packaging

```bash
zip -r pinned-tabs.xpi manifest.json background.js popup.html popup.js options.html options.js README.md
```

Bump `version` in `manifest.json` before each submission; Mozilla rejects
re-uploads of an existing version number.
