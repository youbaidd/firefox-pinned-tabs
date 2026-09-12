// Storage key for pinned tabs
const STORAGE_KEY = 'pinnedTabs';

// Save pinned tabs from a window to storage
async function savePinnedTabs(windowId) {
  try {
    const tabs = await browser.tabs.query({ windowId, pinned: true });
    const pinnedUrls = tabs.map(tab => tab.url).filter(url => url);
    
    const data = await browser.storage.local.get(STORAGE_KEY);
    const allPinned = data[STORAGE_KEY] || [];
    
    // Merge new pinned tabs, avoiding duplicates
    const merged = Array.from(new Set([...allPinned, ...pinnedUrls]));
    
    await browser.storage.local.set({ [STORAGE_KEY]: merged });
    console.log('Saved pinned tabs:', merged);
  } catch (error) {
    console.error('Error saving pinned tabs:', error);
  }
}

// Remove a URL from storage
async function removePinnedTab(url) {
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const allPinned = data[STORAGE_KEY] || [];
    
    const filtered = allPinned.filter(u => u !== url);
    
    await browser.storage.local.set({ [STORAGE_KEY]: filtered });
    console.log('Removed pinned tab:', url);
  } catch (error) {
    console.error('Error removing pinned tab:', error);
  }
}

// Restore pinned tabs in a window
async function restorePinnedTabs(windowId) {
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const pinnedUrls = data[STORAGE_KEY] || [];
    
    if (pinnedUrls.length === 0) {
      console.log('No pinned tabs to restore');
      return;
    }
    
    // Get existing tabs in the window
    const existingTabs = await browser.tabs.query({ windowId });
    const existingUrls = new Set(existingTabs.map(tab => tab.url));
    
    // Open each pinned tab URL if not already open
    for (const url of pinnedUrls) {
      if (!existingUrls.has(url)) {
        try {
          await browser.tabs.create({ windowId, url, pinned: true });
          console.log('Restored pinned tab:', url);
        } catch (error) {
          console.error('Error creating pinned tab:', error);
        }
      } else {
        // Tab already exists, just pin it
        const tab = existingTabs.find(t => t.url === url);
        if (tab && !tab.pinned) {
          await browser.tabs.update(tab.id, { pinned: true });
          console.log('Pinned existing tab:', url);
        }
      }
    }
  } catch (error) {
    console.error('Error restoring pinned tabs:', error);
  }
}

// Listen for tab changes (pinned/unpinned)
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.hasOwnProperty('pinned')) {
    if (changeInfo.pinned) {
      // Tab was pinned, save it
      console.log('Tab pinned:', tab.url);
      savePinnedTabs(tab.windowId);
    } else {
      // Tab was unpinned, remove it from storage
      console.log('Tab unpinned:', tab.url);
      removePinnedTab(tab.url);
    }
  }
});

// Restore pinned tabs on browser startup only, not on every new window
browser.runtime.onStartup.addListener(() => {
  browser.windows.getAll().then((windows) => {
    console.log('Browser startup detected, restoring pinned tabs');
    windows.forEach(window => {
      setTimeout(() => restorePinnedTabs(window.id), 500);
    });
  });
});

// Initialize: save any existing pinned tabs on install/update
browser.windows.getAll().then((windows) => {
  windows.forEach(window => {
    savePinnedTabs(window.id);
  });
});
