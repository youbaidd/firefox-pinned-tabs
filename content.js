// Cycle through tabs with Option + Left / Option + Right.

// Option + Arrow moves by word in text fields, so leave editable
// targets alone rather than hijacking the keystroke.
function isEditable(element) {
  if (!element) return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

document.addEventListener('keydown', (event) => {
  if (!event.altKey) return;
  if (event.metaKey || event.ctrlKey) return;

  const isPrev = event.key === 'ArrowLeft';
  const isNext = event.key === 'ArrowRight';
  if (!isPrev && !isNext) return;

  if (isEditable(event.target)) return;

  event.preventDefault();

  browser.runtime.sendMessage({
    action: 'switchTab',
    direction: isPrev ? 'prev' : 'next'
  });
}, true); // Capture phase, so page handlers don't swallow it first.
