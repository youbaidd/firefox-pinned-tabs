const STORAGE_KEY = 'pinnedTabs';

async function loadPinnedTabs() {
  const data = await browser.storage.local.get(STORAGE_KEY);
  const pinnedTabs = data[STORAGE_KEY] || [];
  
  const tabList = document.getElementById('tabList');
  tabList.innerHTML = '';
  
  if (pinnedTabs.length === 0) {
    tabList.innerHTML = '<div class="empty">No pinned tabs yet</div>';
    return;
  }
  
  pinnedTabs.forEach((url) => {
    const item = document.createElement('div');
    item.className = 'tab-item';
    
    const urlSpan = document.createElement('div');
    urlSpan.className = 'tab-url';
    urlSpan.textContent = url;
    urlSpan.title = url;
    
    const button = document.createElement('button');
    button.textContent = 'Remove';
    button.onclick = () => removePinnedTab(url);
    
    item.appendChild(urlSpan);
    item.appendChild(button);
    tabList.appendChild(item);
  });
}

async function removePinnedTab(url) {
  const data = await browser.storage.local.get(STORAGE_KEY);
  const pinnedTabs = data[STORAGE_KEY] || [];
  
  const filtered = pinnedTabs.filter(u => u !== url);
  await browser.storage.local.set({ [STORAGE_KEY]: filtered });
  
  loadPinnedTabs();
}

async function clearAllPinnedTabs() {
  if (confirm('Clear all pinned tabs?')) {
    await browser.storage.local.set({ [STORAGE_KEY]: [] });
    loadPinnedTabs();
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadPinnedTabs);
document.getElementById('clearBtn').addEventListener('click', clearAllPinnedTabs);

// Load on open
loadPinnedTabs();
