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

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'json-view',
    title: 'JSON view',
    type: 'normal',
    contexts: ['all'],
  });
  chrome.contextMenus.create({
    id: 'ansi-view',
    title: 'Ansi view',
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
        const contentType = contentTypeMap.get(sender.tab.id) || '';
        contentTypeMap.delete(sender.tab.id);
        sendResponse({ contentType } satisfies JsonViewReadyResponse);
        break;
      default:
        const renderer = renderers[message.type];
        if (renderer) {
          try {
            const res = await renderer(message);
            sendResponse(res);
          } catch (e: any) {
            sendResponse({
              style: '',
              content: '',
              error: (e?.stack || e) + '',
            } satisfies JsonViewResponse);
          }
        } else {
          console.log('unknown action', message);
        }
        break;
    }
  }, true)
);
