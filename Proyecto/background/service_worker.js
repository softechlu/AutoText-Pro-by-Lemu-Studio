// AutoText Pro — Service Worker v3

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const examples = [
      { id: String(Date.now()),     shortcut: '.hola', text: '¡Hola! ¿Cómo estás? Espero que tengas un excelente día.' },
      { id: String(Date.now() + 1), shortcut: '*tel',  text: '3001234567' },
    ];
    chrome.storage.sync.set({ shortcuts: examples });
  }

  // Inject content script into all open tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['content/content.js'],
      });
    } catch (_) {}
  }
});

// Increment uses counter from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'INCREMENT_USES') return;
  chrome.storage.sync.get(['shortcuts'], (r) => {
    const shortcuts = Array.isArray(r.shortcuts) ? r.shortcuts : [];
    const sc = shortcuts.find(s => String(s.id) === String(msg.shortcutId));
    if (!sc) return;
    sc.uses = (sc.uses || 0) + 1;
    chrome.storage.sync.set({ shortcuts });
  });
});

// Open options page when toolbar icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Open options page with keyboard shortcut Alt+Shift+A
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-options') {
    chrome.runtime.openOptionsPage();
  }
});