const STORAGE_KEY = 'startupTabs';

async function loadStartupTabs() {
  const data = await browser.storage.local.get(STORAGE_KEY);
  const startupTabs = data[STORAGE_KEY] || [];

  const tabList = document.getElementById('tabList');
  tabList.innerHTML = '';
  document.getElementById('openBtn').disabled = startupTabs.length === 0;

  if (startupTabs.length === 0) {
    tabList.innerHTML = '<div class="empty">No startup tabs yet</div>';
    return;
  }

  startupTabs.forEach((url, index) => {
    const item = document.createElement('div');
    item.className = 'tab-item';

    const order = document.createElement('div');
    order.className = 'tab-order';
    order.textContent = `${index + 1}.`;

    const urlSpan = document.createElement('div');
    urlSpan.className = 'tab-url';
    urlSpan.textContent = url;
    urlSpan.title = url;

    item.appendChild(order);
    item.appendChild(urlSpan);
    tabList.appendChild(item);
  });
}

// The background script does the opening; the popup closes once a tab opens.
async function openStartupTabsNow() {
  const win = await browser.windows.getCurrent();
  await browser.runtime.sendMessage({ type: 'openStartupTabs', windowId: win.id });
  window.close();
}

document.getElementById('openBtn').addEventListener('click', openStartupTabsNow);
document.getElementById('settingsBtn').addEventListener('click', () => {
  browser.runtime.openOptionsPage();
  window.close();
});

loadStartupTabs();
