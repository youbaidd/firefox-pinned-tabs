const STORAGE_KEY = 'startupTabs';

async function getStartupTabs() {
  const data = await browser.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

async function setStartupTabs(urls) {
  await browser.storage.local.set({ [STORAGE_KEY]: urls });
}

// Accepts "wsj.com" as well as full URLs. Only http(s) is allowed.
function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    return url.href;
  } catch {
    return null;
  }
}

async function render() {
  const startupTabs = await getStartupTabs();
  const tabList = document.getElementById('tabList');
  tabList.innerHTML = '';

  if (startupTabs.length === 0) {
    tabList.innerHTML = '<div class="empty">No startup tabs yet — add one above</div>';
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

    const controls = document.createElement('div');
    controls.className = 'controls';

    const upBtn = document.createElement('button');
    upBtn.className = 'move-btn';
    upBtn.textContent = '↑';
    upBtn.disabled = index === 0;
    upBtn.onclick = () => moveTab(index, index - 1);

    const downBtn = document.createElement('button');
    downBtn.className = 'move-btn';
    downBtn.textContent = '↓';
    downBtn.disabled = index === startupTabs.length - 1;
    downBtn.onclick = () => moveTab(index, index + 1);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => removeTab(index);

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(removeBtn);

    item.appendChild(order);
    item.appendChild(urlSpan);
    item.appendChild(controls);
    tabList.appendChild(item);
  });
}

async function addTab() {
  const input = document.getElementById('urlInput');
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.textContent = '';

  const normalized = normalizeUrl(input.value);
  if (!normalized) {
    errorMsg.textContent = 'Enter a valid URL, e.g. https://example.com';
    return;
  }

  const startupTabs = await getStartupTabs();
  if (startupTabs.includes(normalized)) {
    errorMsg.textContent = 'That URL is already in the list';
    return;
  }

  startupTabs.push(normalized);
  await setStartupTabs(startupTabs);
  input.value = '';
  render();
}

async function removeTab(index) {
  const startupTabs = await getStartupTabs();
  startupTabs.splice(index, 1);
  await setStartupTabs(startupTabs);
  render();
}

async function moveTab(from, to) {
  const startupTabs = await getStartupTabs();
  if (to < 0 || to >= startupTabs.length) return;
  const [moved] = startupTabs.splice(from, 1);
  startupTabs.splice(to, 0, moved);
  await setStartupTabs(startupTabs);
  render();
}

// Append this window's pinned tabs to the end of the list, skipping duplicates.
async function addPinnedFromWindow() {
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.textContent = '';

  const tabs = await browser.tabs.query({ currentWindow: true, pinned: true });
  const startupTabs = await getStartupTabs();
  let added = 0;
  for (const tab of tabs) {
    const normalized = normalizeUrl(tab.url || '');
    if (normalized && !startupTabs.includes(normalized)) {
      startupTabs.push(normalized);
      added++;
    }
  }

  if (added === 0) {
    errorMsg.textContent = 'No new pinned tabs in this window to add';
    return;
  }
  await setStartupTabs(startupTabs);
  render();
}

document.getElementById('importBtn').addEventListener('click', addPinnedFromWindow);
document.getElementById('addBtn').addEventListener('click', addTab);
document.getElementById('urlInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTab();
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) render();
});

render();
