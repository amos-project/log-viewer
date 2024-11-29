/*
 * @since 2024-10-01 14:05:38
 * @author junbao <junbao@moego.pet>
 */

import { decode, encode } from 'html-entities';
import { bundledLanguages, codeToHtml } from 'shiki';

export async function colorize(content: string, ext: string) {
  if (ext in bundledLanguages) {
    return codeToHtml(content, { lang: ext, theme: 'vitesse-dark' });
  }
  return content;
}

export async function enrichContent(
  content: string,
  format: (content: string) => Promise<string> | string
) {
  const state: [boolean, string][] = [];
  const ph = (isHtml: boolean, v: string) => {
    state.push([isHtml, v]);
    return `:v-v:${state.length - 1}:v-v:`;
  };
  content = content
    .replace(/((?:href|src)=")([^"]+)(")/gi, (_, $1, $2, $3) => `${$1}${ph(true, $2)}${$3}`)
    .replace(/https?:\/\/[^'"`<>\s\r\n]+/gi, ($0) => ph(false, $0));
  content = await format(content);
  return content.replace(/:v-v:(\d+):v-v:/g, ($0, $1) => {
    try {
      const [isHtml, v] = state[+$1];
      const href = isHtml ? decode(v) : v;
      const text = encode(v);
      return `<a target="_blank" href="${href}">${text}</a>`;
    } catch {
      return $0;
    }
  });
}

export function errorContent(e: any) {
  const content = (e?.stack || e) + '';
  return `<div style="color:red; white-space: pre">${content}</div>`;
}

export function* splitCode(content: string) {
  let pos = 0;
  while (true) {
    let end = pos;
    while (end !== -1 && end - pos < 64 << 10) {
      end = content.indexOf('\n', end + 1);
    }
    yield content.substring(pos, end === -1 ? content.length : end + 1);
    pos = end;
    if (end === -1) {
      return;
    }
  }
}

export async function* splitEnrichCode(
  content: string,
  format: (content: string) => Promise<string> | string
) {
  for (const part of splitCode(content)) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    yield await enrichContent(part, format);
  }
}
