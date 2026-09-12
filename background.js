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

// Restore pinned tabs when a new window is created
browser.windows.onCreated.addListener((window) => {
  console.log('New window created, restoring pinned tabs');
  // Use a small delay to ensure the window is fully ready
  setTimeout(() => restorePinnedTabs(window.id), 500);
});

// Restore pinned tabs on browser startup
browser.windows.getAll().then((windows) => {
  if (windows.length > 0) {
    console.log('Browser startup detected, restoring pinned tabs');
    windows.forEach(window => {
      setTimeout(() => restorePinnedTabs(window.id), 500);
    });
  }
});

// Initialize: save any existing pinned tabs on install/update
browser.windows.getAll().then((windows) => {
  windows.forEach(window => {
    savePinnedTabs(window.id);
  });
});

// Handle tab switching via keyboard shortcut
browser.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'switchTab') {
    switchTab(sender.tab.windowId, request.direction);
  }
});

// Switch to next or previous tab
async function switchTab(windowId, direction) {
  try {
    // Get all tabs in the current window
    const tabs = await browser.tabs.query({ windowId });
    
    if (tabs.length <= 1) return; // No point switching if only one tab
    
    // Find the currently active tab
    const activeTab = tabs.find(tab => tab.active);
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab.id);
    
    let newIndex;
    if (direction === 'next') {
      // Move to next tab, wrap around to first
      newIndex = (currentIndex + 1) % tabs.length;
    } else {
      // Move to previous tab, wrap around to last
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    
    const targetTab = tabs[newIndex];
    await browser.tabs.update(targetTab.id, { active: true });
  } catch (error) {
    console.error('Error switching tabs:', error);
  }
}
