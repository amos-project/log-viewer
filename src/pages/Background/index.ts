chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.create({
    id: 'json-view',
    title: 'JSON view',
    type: 'normal',
    contexts: ['all'],
  });
  chrome.contextMenus.create({
    id: 'xterm-view',
    title: 'Xterm view',
    type: 'normal',
    contexts: ['all'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) {
    return;
  }
  chrome.tabs.sendMessage(tab?.id, {
    action: info.menuItemId,
  });
});
