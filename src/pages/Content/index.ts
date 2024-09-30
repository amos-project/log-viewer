import { detectUrlExt } from '../../shared/utils';
import {
  ContextEvent,
  JsonViewAction,
  JsonViewResponse,
} from '../../shared/types';

export async function getTargetText(
  targetElement: HTMLElement | undefined | 'clipboard'
) {
  if (targetElement === 'clipboard') {
    return await navigator.clipboard.readText();
  }
  return (
    document.getSelection()?.toString()?.trim() ||
    targetElement?.innerText ||
    ''
  );
}

export async function getCode() {
  const r = await fetch('');
  const content = await r.text();
  const contentType = r.headers.get('content-type') || '';
  return [content, contentType] as const;
}

let styleElem: HTMLStyleElement | undefined;
let htmlElem: HTMLDivElement | undefined;

const close = () => {
  if (htmlElem?.parentNode) {
    htmlElem.parentNode.removeChild(htmlElem);
  }
  if (styleElem?.parentNode) {
    styleElem.parentNode.removeChild(styleElem);
  }
};

const open = () => {
  if (!styleElem!.parentNode) {
    document.head.appendChild(styleElem!);
  }
  if (!htmlElem!.parentNode) {
    document.body.appendChild(htmlElem!);
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

export function prepareElem(): readonly [HTMLDivElement, HTMLStyleElement] {
  if (htmlElem && styleElem) {
    open();
    return [htmlElem, styleElem] as const;
  }
  htmlElem = document.createElement('div');
  styleElem = document.createElement('style');
  htmlElem.classList.add('json-view-container');
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
  return prepareElem();
}

const baseStyle = `
`;

export async function showJsonView(
  type: JsonViewAction['type'],
  content: string,
  contentType: string = '',
  url: string = location.href
) {
  content = content.trim();
  if (!content) {
    return;
  }
  const [htmlElem, styleElem] = prepareElem();
  const action: JsonViewAction = { type, content, contentType, url };
  const res: JsonViewResponse = await chrome.runtime.sendMessage(action);
  htmlElem.innerHTML = (res.error ? res.error + '\n\n' : '') + res.content;
  styleElem.innerHTML = res.style;
}

async function render(action: ContextEvent['action'], src?: 'clipboard') {
  switch (action) {
    case 'json-view':
      await showJsonView('json', await getTargetText(src || targetElement));
      break;
    case 'ansi-view':
      await showJsonView('ansi', getTextContent());
      break;
    case 'html-view':
      await showJsonView('code', getHtml(), 'text/html');
      break;
    case 'code-view':
      const [content, contentType] = await getCode();
      await showJsonView('code', content, contentType);
      break;
  }
}

const accepts: Record<string, ContextEvent['action']> = {
  v: 'json-view',
  x: 'ansi-view',
  h: 'html-view',
  c: 'code-view',
  p: 'json-view',
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

chrome.runtime.sendMessage({ type: 'json-view-ready' }).then((r) => {
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
    await render(accepts[e.key], sources[e.key]);
  }
});
