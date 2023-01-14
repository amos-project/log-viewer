import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { ISearchDecorationOptions, SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

let targetElement: HTMLElement | undefined;

['contextmenu', 'mousemove'].forEach((e) =>
  document.addEventListener(e, (e) => {
    targetElement = void 0;
    if (e.target instanceof HTMLElement) {
      targetElement = e.target;
    }
  }),
);

function getTargetText() {
  return (
    document.getSelection()?.toString()?.trim() ||
    targetElement?.innerText ||
    ''
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'json-view':
      jsonView();
      break;
    case 'xterm-view':
      xtermView();
      break;
  }
});

let lastTime = 0;
document.addEventListener('keypress', (e) => {
  if (e.key === 'v') {
    const now = Date.now();
    if (now - lastTime < 300) {
      jsonView();
    }
    lastTime = now;
  }
});

let jsonElement = document.createElement('div');
jsonElement.style.cssText = `
position: absolute;
top: 0;
right: 0;
width: auto;
max-width: 60vw;
max-height: 100vh;
overflow: auto;
border: 1px solid #000;
background: #fff;
white-space: pre;
z-index: 10000;
padding: 20px;
font-family: monospace;
line-height: 1.5em;
background: #2e353b;
color: #f9d45c;
`;

let id = 0;

document.addEventListener('click', (e) => {
  if (e.target === jsonElement) {
    return;
  }
  if (jsonElement.parentNode) {
    document.body.removeChild(jsonElement);
  }
});

function prettyJson(value: any, map: Map<number, string>, depth: number) {
  const str = JSON.stringify(
    value,
    (key, value1) => {
      if (typeof value !== 'string' || !/^[\[{]/.test(value)) {
        return value1;
      }
      try {
        const json = JSON.parse(value1);
        const uid = ++id;
        map.set(uid, prettyJson(json, map, depth + 1));
        return `$__${uid}__$`;
      } catch {
        return value1;
      }
    },
    2,
  );
  const indent = '  '.repeat((depth + 1) * 2);
  return str
    .replace(/\$__(\d+)__\$/g, ($0, $1) => {
      const v = map.get(+$1) || '';
      return v.replace(/\n/g, indent);
    })
    .replace(/\\n/g, '\n' + indent + '  ')
    .replace(/\\t/g, '  ');
}

function jsonView() {
  const text = getTargetText();
  if (!text) {
    return;
  }
  let data = text;
  const tempMap = new Map<number, string>();
  try {
    data = prettyJson(JSON.parse(text), tempMap, 0);
  } catch {
    data = data.replace(/-(?=[,}\]])/g, '-0');
    try {
      data = prettyJson(JSON.parse(text), tempMap, 0);
    } catch {
    }
  }
  jsonElement.innerText = data;
  document.body.appendChild(jsonElement);
}

let xtermInited = false;

async function xtermView() {
  if (xtermInited) {
    return;
  }
  xtermInited = true;
  const terminal = new Terminal({
    convertEol: true,
    scrollback: 1000000,
    allowProposedApi: true,
    theme: {
      selectionBackground: 'rgba(222, 195, 138, 0.8)',
    },
  });
  terminal.loadAddon(new WebLinksAddon());
  const searchAddon = new SearchAddon();
  terminal.loadAddon(searchAddon);
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  const content = document.body.textContent || '';
  document.body.innerHTML = '';
  const container = document.createElement('div');
  container.style.cssText = 'height: calc(100vh - 80px)';
  document.body.appendChild(container);
  terminal.open(container);
  terminal.write(content);
  fitAddon.fit();
  terminal.scrollToTop();

  const input = document.createElement('input');
  input.placeholder = 'Search...';
  input.style.cssText = 'margin: 20px;';
  const inputContainer = document.createElement('div');
  inputContainer.appendChild(input);
  inputContainer.style.cssText = 'text-align: right; font-family: monospace;';
  const searchResultSpan = document.createElement('span');
  inputContainer.appendChild(searchResultSpan);
  document.body.insertBefore(inputContainer, container);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const options: ISearchDecorationOptions = {
        activeMatchColorOverviewRuler: '',
        matchOverviewRuler: '',
        matchBackground: 'rgb(59, 88, 63)',
        activeMatchBackground: 'rgb(222, 195, 138)',
      };
      if (input.value) {
        if (e.shiftKey) {
          searchAddon.findPrevious(input.value, { decorations: options });
        } else {
          searchAddon.findNext(input.value, { decorations: options });
        }
      } else {
        searchAddon.clearDecorations();
        searchResultSpan.innerHTML = '';
      }
    }
  });
  searchAddon.onDidChangeResults((e) => {
    if (!e) {
      searchResultSpan.innerHTML = `Too many results`;
    } else {
      searchResultSpan.innerHTML = `${Math.max(e.resultIndex, 0) + 1}/${e.resultCount}`;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}
