# Context for Claude Code

## What this is

A Firefox extension that persists pinned tabs across sessions. Firefox loses
pinned tabs when you close a window; this saves their URLs and restores them on
startup and in new windows.

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
  removed.** Version 1.1 (current) drops it. 1.1 has not been submitted yet.

## Removed on purpose

A `content.js` provided Option+Arrow tab cycling. It was removed in 1.1 in
favour of Firefox's built-in Cmd+Option+Arrow. This also dropped the
`<all_urls>` content script permission, which was the broadest permission the
extension requested and the one most likely to attract reviewer scrutiny on a
tab-management add-on. Re-adding page-level shortcuts brings that permission
back — prefer the `commands` manifest key, which registers at browser level and
needs no host permissions, if shortcuts are ever wanted again.

## Known limitations

Pinned tabs are one flat global list in `storage.local`, shared across all
windows, rather than per-window sets.

## Packaging

```bash
zip -r pinned-tabs.xpi manifest.json background.js popup.html popup.js README.md
```

Bump `version` in `manifest.json` before each submission; Mozilla rejects
re-uploads of an existing version number.
