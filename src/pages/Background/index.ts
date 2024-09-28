chrome.runtime.onInstalled.addListener(() => {
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
  chrome.contextMenus.create({
    id: 'code-view',
    title: 'Code view',
    type: 'normal',
    contexts: ['all'],
  });
  chrome.contextMenus.create({
    id: 'html-view',
    title: 'HTML view',
    type: 'normal',
    contexts: ['all'],
  });

  chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
      const contentType = details.responseHeaders?.find(
        (p) => p.name.toLowerCase() === 'content-type'
      );
      contentTypeMap.set(details.tabId, contentType?.value ?? '');
    },
    {
      types: ['main_frame'],
      urls: ['<all_urls>'],
    },
    ['responseHeaders']
  );
});

const contentTypeMap = new Map<number, string>();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) {
    return;
  }
  chrome.tabs.sendMessage(tab?.id, {
    action: info.menuItemId,
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'json-view-ready':
      if (!sender.tab?.id) {
        return;
      }
      const contentType = contentTypeMap.get(sender.tab.id);
      contentTypeMap.delete(sender.tab.id);
      sendResponse({ contentType: contentType });
      break;
  }
});
