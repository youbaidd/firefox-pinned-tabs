const STORAGE_KEY = 'pinnedTabs';

async function getPinnedTabs() {
  const data = await browser.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

async function setPinnedTabs(urls) {
  await browser.storage.local.set({ [STORAGE_KEY]: urls });
}

function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).href;
  } catch {
    return null;
  }
}

async function render() {
  const pinnedTabs = await getPinnedTabs();
  const tabList = document.getElementById('tabList');
  tabList.innerHTML = '';

  if (pinnedTabs.length === 0) {
    tabList.innerHTML = '<div class="empty">No pinned tabs configured yet</div>';
    return;
  }

  pinnedTabs.forEach((url, index) => {
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
    downBtn.disabled = index === pinnedTabs.length - 1;
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

  const pinnedTabs = await getPinnedTabs();
  if (pinnedTabs.includes(normalized)) {
    errorMsg.textContent = 'That URL is already in the list';
    return;
  }

  pinnedTabs.push(normalized);
  await setPinnedTabs(pinnedTabs);
  input.value = '';
  render();
}

async function removeTab(index) {
  const pinnedTabs = await getPinnedTabs();
  pinnedTabs.splice(index, 1);
  await setPinnedTabs(pinnedTabs);
  render();
}

async function moveTab(from, to) {
  const pinnedTabs = await getPinnedTabs();
  if (to < 0 || to >= pinnedTabs.length) return;
  const [moved] = pinnedTabs.splice(from, 1);
  pinnedTabs.splice(to, 0, moved);
  await setPinnedTabs(pinnedTabs);
  render();
}

document.getElementById('addBtn').addEventListener('click', addTab);
document.getElementById('urlInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTab();
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) render();
});

render();
