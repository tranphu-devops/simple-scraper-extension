let highlightEl = null;
let selecting = false;

function enableSelection() {
  if (selecting) return;
  selecting = true;

  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick, true);
}

function disableSelection() {
  selecting = false;

  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick, true);

  if (highlightEl) {
    highlightEl.style.outline = '';
    highlightEl = null;
  }
}

function handleMouseOver(e) {
  if (!selecting) return;

  if (highlightEl) {
    highlightEl.style.outline = '';
  }
  highlightEl = e.target;
  highlightEl.style.outline = '2px solid red';
}

function handleMouseOut(e) {
  if (!selecting) return;
  if (e.target === highlightEl) {
    highlightEl.style.outline = '';
    highlightEl = null;
  }
}

function handleClick(e) {
  if (!selecting) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const el = e.target;
  const html = el.innerHTML;
  const text = el.innerText;

  disableSelection();

  chrome.runtime.sendMessage({
    type: 'ELEMENT_SELECTED',
    html,
    text,
    url: window.location.href,
    title: document.title
  });
}

// Lắng nghe message từ extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_SELECTION') {
    enableSelection();
    sendResponse && sendResponse({ ok: true });
    return;
  }

  if (message.type === 'AUTO_GRAB') {
    const selector = message.selector || 'article.meteredContent';
    const el = document.querySelector(selector);

    if (!el) {
      sendResponse && sendResponse({ ok: false, error: 'NOT_FOUND' });
      return;
    }

    const html = el.innerHTML;
    const text = el.innerText;

    chrome.runtime.sendMessage({
      type: 'ELEMENT_SELECTED',
      html,
      text,
      url: window.location.href,
      title: document.title
    });

    sendResponse && sendResponse({ ok: true });
    return;
  }
});
