import { detectType } from '../../shared/utils';

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

let iframeContainer: HTMLDivElement;
let iframe: HTMLIFrameElement;
const iframeSrc = chrome.runtime.getURL('popup.html');

function excludeJsonView<T>(fn: () => T): T {
  if (iframeContainer?.parentNode) {
    iframeContainer.parentNode.removeChild(iframeContainer);
    const value = fn();
    document.body.appendChild(iframeContainer);
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

export function getIframe(): HTMLIFrameElement {
  if (iframe) {
    if (!iframeContainer.parentNode) {
      document.body.appendChild(iframeContainer);
    }
    return iframe;
  }
  iframeContainer = document.createElement('div');
  iframeContainer.style.cssText = `
position: fixed;
top: 0;
bottom: 0;
right: 0;
width: 100vw;
z-index: 99999;
overflow: hidden;
border: 1px solid #000000;
`;
  iframe = document.createElement('iframe');
  iframe.width = '100%';
  iframe.height = '100%';
  iframe.style.cssText = `border: none;`;

  const close = () => {
    iframeContainer.parentNode?.removeChild(iframeContainer);
    action = void 0;
  };
  const open = () => {
    if (action) {
      iframe.contentWindow?.postMessage(action, '*');
      action = void 0;
    }
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
    }
  });
  window.addEventListener('message', (e) => {
    switch (e.data.action) {
      case 'close-json-view':
        close();
        break;
      case 'open-json-view':
        open();
        break;
    }
  });
  iframe.src = iframeSrc;
  iframeContainer.appendChild(iframe);
  return getIframe();
}

let action: JsonViewAction | undefined;

export interface JsonViewAction {
  type: 'json' | 'xterm' | 'code';
  content: string;
  contentType: string;
  url: string;
}

const styles: Record<JsonViewAction['type'], Partial<CSSStyleDeclaration>> = {
  json: { width: '50vw', borderLeft: '1px solid #000' },
  xterm: { width: '100vw', borderLeft: 'none' },
  code: { width: '100vw', borderLeft: 'none' },
};

export async function showJsonView(
  type: JsonViewAction['type'],
  content: string,
  contentType: string = ''
) {
  content = content.trim();
  if (!content) {
    return;
  }
  const iframe = getIframe();
  Object.assign(iframeContainer.style, styles[type]);
  action = {
    type,
    content,
    contentType,
    url: location.href,
  };
  iframe.contentWindow?.postMessage(action, '*');
}

export interface ContextEvent {
  action: 'json-view' | 'xterm-view' | 'html-view' | 'code-view';
}

async function render(action: ContextEvent['action'], src?: 'clipboard') {
  switch (action) {
    case 'json-view':
      await showJsonView('json', await getTargetText(src || targetElement));
      break;
    case 'xterm-view':
      await showJsonView('xterm', getTextContent());
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
  x: 'xterm-view',
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

chrome.runtime
  .sendMessage({
    type: 'json-view-ready',
  })
  .then((r) => {
    if (shouldNot(r.contentType)) {
      return;
    }
    if (shouldAuto(r.contentType) || shouldAuto(detectType(location.href))) {
      return render('code-view');
    }
  });

let lastKey = '';
let lastTime = 0;

document.addEventListener('keydown', async (e) => {
  if (
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement
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
