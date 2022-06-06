let targetText = '';
document.addEventListener('contextmenu', (e) => {
  const selection = document.getSelection();
  targetText = '';

  if (selection !== null) {
    targetText = selection.toString().trim();
  }
  if (!targetText && e.target instanceof HTMLElement) {
    targetText = e.target.innerText;
  }
  console.log('targetText', targetText, selection, e.target);
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'json-view':
      jsonView(targetText);
      break;
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
`;

let id = 0;

document.addEventListener('click', (e) => {
  if (e.target === jsonElement) {
    return;
  }
  document.body.removeChild(jsonElement);
});

function prettyJson(value: any, map: Map<number, string>, depth: number) {
  const str = JSON.stringify(value, (key, value1) => {
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
  }, 2);
  const indent = '  '.repeat((depth + 1) * 2);
  return str.replace(/\$__(\d+)__\$/g, ($0, $1) => {
    const v = map.get(+$1) || '';
    return v.replace(/\n/g, indent);
  }).replace(/\\n/g, '\n' + indent + '  ')
    .replace(/\\t/g, '  ');
}

function jsonView(text: string) {
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
