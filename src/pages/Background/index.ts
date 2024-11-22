import {
  ContextEvent,
  JsonAction,
  JsonViewAction,
  JsonViewReadyResponse,
  JsonViewResponse,
} from '../../shared/types';
import { Renderer } from './types';
import { jsonRender } from './renderers/json_render';
import { codeRender } from './renderers/code_render';
import { ansiRender } from './renderers/ansi_render';
import { omitAsync } from '../../shared/utils';

chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: 'json-view',
    title: 'JSON view',
    type: 'normal',
    contexts: ['all'],
  });
  chrome.contextMenus.create({
    id: 'ansi-view',
    title: 'ANSI view',
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
});

const contentTypeMap = new Map<number, string>();

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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) {
    return;
  }
  chrome.tabs.sendMessage(tab?.id, {
    action: info.menuItemId as ContextEvent['action'],
  } satisfies ContextEvent);
});

const renderers: Record<JsonViewAction['type'], Renderer> = {
  json: jsonRender,
  code: codeRender,
  ansi: ansiRender,
};

chrome.runtime.onMessage.addListener(
  omitAsync(async (message: JsonAction, sender, sendResponse) => {
    switch (message.type) {
      case 'json-view-ready':
        if (!sender.tab?.id) {
          return;
        }
        const contentType = contentTypeMap.get(sender.tab.id) ?? 'text/html';
        contentTypeMap.delete(sender.tab.id);
        sendResponse({ contentType } satisfies JsonViewReadyResponse);
        break;
      default:
        let res: JsonViewResponse;
        try {
          res = await renderers[message.type](message);
        } catch (e: any) {
          res = { style: '', content: '', error: (e?.stack || e) + '' };
        }
        sendResponse(res);
        break;
    }
  }, true)
);
