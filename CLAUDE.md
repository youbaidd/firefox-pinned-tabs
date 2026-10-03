# Context for Claude Code

## What this is

A Firefox extension that opens a user-defined set of sites as pinned tabs, in
order, every time Firefox starts — like having several home pages. The full
spec, including the user's answers to its open questions, is in
`REQUIREMENTS.md`.

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
  fixed the `windows.onCreated` restore bug and was never submitted. Version
  2.0 (current) replaces the observe-pinned-tabs model with a user-defined
  set and has not been submitted yet.

## Removed on purpose

A `content.js` provided Option+Arrow tab cycling. It was removed in 1.1 in
favour of Firefox's built-in Cmd+Option+Arrow. This also dropped the
`<all_urls>` content script permission, which was the broadest permission the
extension requested and the one most likely to attract reviewer scrutiny on a
tab-management add-on. Re-adding page-level shortcuts brings that permission
back — prefer the `commands` manifest key, which registers at browser level and
needs no host permissions, if shortcuts are ever wanted again.

## Why 2.0 replaced the 1.x model

1.x built its list by *watching* which tabs were pinned and merging them into
storage on every launch and every pin. Anything pinned once stayed in the
list forever, and redirects (`www.x.com` → `x.com/home`) defeated its
exact-URL dedup, so each launch opened duplicates that were then saved as
new entries. Don't reintroduce observation: the settings page is the only
writer of the list (`storage.local` key `startupTabs`). The old key
`pinnedTabs` is deleted on upgrade from 1.x.

## Launch behavior

- Opens only on `browser.runtime.onStartup`, into **one** window: the first
  normal, non-private one. An earlier version also restored on
  `windows.onCreated`, which fires for every new window (Cmd+N), dumping the
  whole set into it. Do not reintroduce a `windows.onCreated` restore
  listener. (`getTargetWindow` listens to `windows.onCreated` only to wait for
  the first window during the startup handler, then removes itself.)
- Waits for the tab strip to settle (`SETTLE_QUIET_MS` / `SETTLE_MAX_MS`)
  before deduping, so Firefox's session restore finishes first. It must
  behave the same whether session restore is on or off.
- Dedup is by hostname with `www.` stripped (`siteKey`). Per the user, *any*
  open tab on the same site counts as already open. A pinned match is moved
  into its list slot. An unpinned match is left untouched.
- All set tabs open pinned, `active: false`, at the left in list order.
- The popup's "Open set now" sends a `openStartupTabs` message to the
  background, because the popup closes as soon as a tab opens.

## Settings page

`options.html`/`options.js` register via `options_ui` (`open_in_tab: true`).
Add/remove/reorder, plus "Add this window's pinned tabs" as the only explicit
bridge from browsing into the list. Input without a scheme gets `https://`.
Only http(s) is accepted.

## Known limitations

The set opens in one window only. Site matching is hostname-level.

## Packaging

```bash
zip -r pinned-tabs.xpi manifest.json background.js popup.html popup.js options.html options.js icons README.md
```

Bump `version` in `manifest.json` before each submission; Mozilla rejects
re-uploads of an existing version number.
