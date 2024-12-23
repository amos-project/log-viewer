import { detectUrlExt } from '../../shared/utils';
import {
  ContextEvent,
  JsonViewAction,
  JsonViewReadyResponse,
  JsonViewResponse,
} from '../../shared/types';
import commonStyle from './index.css?raw';
import Port = chrome.runtime.Port;

export async function getTargetText(targetElement: HTMLElement | undefined | 'clipboard') {
  if (targetElement === 'clipboard') {
    return await navigator.clipboard.readText();
  }
  return document.getSelection()?.toString()?.trim() || targetElement?.innerText || '';
}

export async function getCode() {
  const r = await fetch('');
  const content = await r.text();
  const contentType = r.headers.get('content-type') || '';
  return [content, contentType] as const;
}

let styleElem: HTMLStyleElement;
let htmlElem: HTMLDivElement;
let port: Port | undefined;

const close = () => {
  if (htmlElem?.parentNode) {
    htmlElem.innerHTML = '';
    htmlElem.parentNode.removeChild(htmlElem);
  }
  if (styleElem?.parentNode) {
    styleElem.innerHTML = commonStyle;
    styleElem.parentNode.removeChild(styleElem);
  }
  port?.disconnect();
  port = void 0;
};

const open = (view?: string) => {
  if (!styleElem!.parentNode) {
    styleElem!.innerHTML = commonStyle;
    document.head.appendChild(styleElem!);
  }
  if (!htmlElem!.parentNode) {
    htmlElem!.innerHTML = '';
    document.body.appendChild(htmlElem!);
  }
  if (view) {
    htmlElem!.className = `${view}`;
  }
};

function excludeJsonView<T>(fn: () => T): T {
  if (styleElem?.parentNode && htmlElem?.parentNode) {
    close();
    const value = fn();
    open();
    return value;
  }
  return fn();
}

export function getHtml() {
  return excludeJsonView(() => document.documentElement.outerHTML);
}

export function getTextContent() {
  return excludeJsonView(() => document.body.textContent || '');
}

let taskId = 0;

async function render(action: ContextEvent['action'], src?: 'clipboard') {
  const id = prepareElem(action);

  htmlElem.innerHTML = `Loading (${id})...`;
  switch (action) {
    case 'json-view':
      await showJsonView('json', await getTargetText(src || targetElement));
      break;
    case 'ansi-view':
      await showJsonView('ansi', await getTargetText(src || targetElement));
      break;
    case 'html-view':
      await showJsonView('code', getHtml(), 'text/html');
      break;
    case 'code-view':
      const [content, contentType] = await getCode();
      const urlExt = detectUrlExt(location.href);
      const isJson = contentType.includes('json') || urlExt.includes('json');
      await showJsonView(isJson ? 'json' : 'code', content, contentType);
      break;
  }

  function prepareElem(view: string): number {
    if (htmlElem && styleElem) {
      open(view);
      return ++taskId;
    }
    htmlElem = document.createElement('div');
    styleElem = document.createElement('style');
    htmlElem.id = 'json-view-container';
    htmlElem.addEventListener('click', (e) => {
      if (e.target instanceof HTMLElement && e.target.classList.contains('line')) {
        const open = e.target.classList.contains('closed');
        const indent = (e.target.textContent || '').match(/^\s*/)![0].length;
        let el = e.target.nextElementSibling;
        let found = false;
        while (el) {
          const content = el.textContent || '';
          const nextIndent = content.match(/^\s*/)![0].length;
          if (indent < nextIndent || !content.trim()) {
            el.classList.remove('closed');
            open ? el.classList.remove('hidden') : el.classList.add('hidden');
            el = el.nextElementSibling;
            found ||= true;
          } else {
            break;
          }
        }
        if (found) {
          e.target.classList.toggle('closed');
        }
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        close();
      }
    });
    window.addEventListener('click', (e) => {
      if (e.target instanceof Node && !htmlElem!.contains(e.target)) {
        close();
      }
    });
    return prepareElem(view);
  }

  async function showJsonView(
    type: JsonViewAction['type'],
    content: string,
    contentType: string = '',
    url: string = location.href
  ) {
    if (taskId !== id) {
      return;
    }
    content = content.trim();
    if (!content) {
      htmlElem.innerHTML = '';
      return;
    }
    const action: JsonViewAction = { type, content, contentType, url };
    let size = content.length;
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIdx = 0;
    while (size > 1024) {
      size /= 1024;
      unitIdx++;
    }
    styleElem.innerHTML = commonStyle;
    htmlElem.innerHTML = '';
    port?.disconnect();
    port = chrome.runtime.connect();
    port.onDisconnect.addListener(() => {
      port = void 0;
    });
    const parts: string[] = [''];
    port.onMessage.addListener((res: JsonViewResponse) => {
      if (parts[parts.length - 1].length > 20 << 20) {
        parts.push('');
      }
      parts[parts.length - 1] += res.content;
      if (parts.length === 1) {
        const div = document.createElement('div');
        div.innerHTML = res.content;
        const inCode = div.querySelector(':scope > pre > code');
        const toCode = htmlElem.querySelector(':scope > pre > code');
        if (inCode && toCode) {
          toCode.append(...inCode.childNodes);
        } else {
          htmlElem.append(...div.childNodes);
        }
      }
    });
    port.postMessage(action);
  }
}

const accepts: Record<string, ContextEvent['action'] | 'full'> = {
  v: 'json-view',
  x: 'ansi-view',
  h: 'html-view',
  c: 'code-view',
  p: 'json-view',
  f: 'full',
};

const sources: Record<string, 'clipboard'> = {
  p: 'clipboard',
};

let targetElement: HTMLElement | undefined;

['contextmenu', 'mousemove'].forEach((e) =>
  document.addEventListener(e, (e) => {
    targetElement = void 0;
    if (e.target instanceof HTMLElement) {
      targetElement = e.target;
    }
  })
);

const shouldAuto = (type: string) => {
  return /css|yaml|yml|js|javascript|xml|json|markdown|patch|diff|jsx|mjs|tsx|typescript|sql/i.test(
    type
  );
};

const shouldNot = (type: string) => {
  return /html|image|video|audio/i.test(type);
};

chrome.runtime.onMessage.addListener((message) => render(message.action));

chrome.runtime.sendMessage({ type: 'json-view-ready' }).then((r: JsonViewReadyResponse) => {
  if (shouldNot(r.contentType)) {
    return;
  }
  if (shouldAuto(r.contentType) || shouldAuto(detectUrlExt(location.href))) {
    return render('code-view');
  }
});

let lastKey = '';
let lastTime = 0;

document.addEventListener('keydown', async (e) => {
  if (
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement ||
    (document.activeElement as HTMLElement | null)?.isContentEditable
  ) {
    return;
  }
  const oldKey = lastKey;
  const oldTime = lastTime;
  lastKey = e.key;
  lastTime = Date.now();
  if (!accepts[lastKey] || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
    lastKey = '';
    lastTime = 0;
    return;
  }
  if (lastKey !== oldKey) {
    return;
  }
  if (lastTime - oldTime < 300) {
    const action = accepts[e.key];
    if (action === 'full') {
      htmlElem?.classList.toggle('full');
      return;
    }
    await render(action, sources[e.key]);
  }
});
