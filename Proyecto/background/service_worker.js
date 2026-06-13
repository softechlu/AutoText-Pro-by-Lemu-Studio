// AutoText Pro — Service Worker v3

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const examples = [
      { id: 1, shortcut: '.hola', text: '¡Hola! ¿Cómo estás? Espero que tengas un excelente día.' },
      { id: 2, shortcut: '*tel',  text: '3001234567' },
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

// Open options page when toolbar icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
