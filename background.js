// The startup set: an ordered list of URLs the user defines in settings.
// Only the settings page writes it — browsing never changes it.
const STORAGE_KEY = 'startupTabs';

// Storage key used by 1.x, which recorded pinned tabs by observation.
// Discarded on upgrade because that list is unreliable.
const LEGACY_STORAGE_KEY = 'pinnedTabs';

// How long the tab strip must be quiet before we treat Firefox's own session
// restore as finished, and the most we will wait for that.
const SETTLE_QUIET_MS = 1000;
const SETTLE_MAX_MS = 10000;

async function getStartupTabs() {
  const data = await browser.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

// Two URLs are "the same site" when their hostnames match, ignoring a
// leading "www.". So https://www.x.com matches an open https://x.com/home.
function siteKey(url) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Open the startup set in one window: pinned, leftmost, in list order.
// Entries whose site is already open in the window are not opened again.
async function openStartupTabs(windowId) {
  const urls = await getStartupTabs();
  if (urls.length === 0) return;

  const existingTabs = await browser.tabs.query({ windowId });
  const claimed = new Set();
  let index = 0;

  for (const url of urls) {
    const key = siteKey(url);
    const candidates = existingTabs.filter(
      t => !claimed.has(t.id) && siteKey(t.url) === key
    );
    // Prefer an already-pinned tab, e.g. one Firefox's session restore brought back.
    const match = candidates.find(t => t.pinned) || candidates[0];

    try {
      if (match) {
        claimed.add(match.id);
        // A pinned match takes this entry's slot so the order holds.
        // An unpinned match is the user's own tab: leave it untouched.
        if (match.pinned) {
          if (match.index !== index) await browser.tabs.move(match.id, { index });
          index++;
        }
      } else {
        await browser.tabs.create({ windowId, url, pinned: true, index, active: false });
        index++;
      }
    } catch (error) {
      console.error('Error opening startup tab:', url, error);
    }
  }
}

// Resolve once no tab has been created or navigated for SETTLE_QUIET_MS,
// or after SETTLE_MAX_MS. This lets session restore finish first, so its
// tabs are visible to the duplicate check whether or not it is enabled.
function waitForTabsToSettle() {
  return new Promise(resolve => {
    const start = Date.now();
    let lastActivity = start;
    const onActivity = () => { lastActivity = Date.now(); };
    const onUpdated = (tabId, changeInfo) => { if (changeInfo.url) onActivity(); };

    browser.tabs.onCreated.addListener(onActivity);
    browser.tabs.onUpdated.addListener(onUpdated);

    const timer = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity >= SETTLE_QUIET_MS || now - start >= SETTLE_MAX_MS) {
        clearInterval(timer);
        browser.tabs.onCreated.removeListener(onActivity);
        browser.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }, 200);
  });
}

function isTargetWindow(win) {
  return win.type === 'normal' && !win.incognito;
}

// The first normal, non-private window — waiting for one if none exists yet.
async function getTargetWindow() {
  const windows = await browser.windows.getAll({ windowTypes: ['normal'] });
  const existing = windows.find(isTargetWindow);
  if (existing) return existing;

  return new Promise(resolve => {
    const onCreated = win => {
      if (!isTargetWindow(win)) return;
      browser.windows.onCreated.removeListener(onCreated);
      resolve(win);
    };
    browser.windows.onCreated.addListener(onCreated);
  });
}

// Browser launch only. New windows (Cmd+N), private windows, and extension
// install/update/enable do not open the set.
browser.runtime.onStartup.addListener(async () => {
  try {
    const win = await getTargetWindow();
    await waitForTabsToSettle();
    await openStartupTabs(win.id);
  } catch (error) {
    console.error('Error opening startup tabs:', error);
  }
});

// The popup's "Open set now" button. Handled here because the popup closes
// as soon as a tab opens, which would cut its own work short.
browser.runtime.onMessage.addListener(message => {
  if (message && message.type === 'openStartupTabs') {
    return openStartupTabs(message.windowId);
  }
});

// First install, or upgrade from 1.x: start with an empty set and open
// settings so the user can define it.
browser.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  const isUpgradeFromV1 = reason === 'update' && previousVersion && previousVersion.startsWith('1.');
  if (reason !== 'install' && !isUpgradeFromV1) return;

  await browser.storage.local.remove(LEGACY_STORAGE_KEY);
  browser.runtime.openOptionsPage();
});
