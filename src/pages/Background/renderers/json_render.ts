/*
 * @since 2024-09-29 15:22:47
 * @author junbao <junbao@moego.pet>
 */

import { Renderer } from '../types';
import { codeToHtml } from 'shiki';

let id = 0;

function prettyJson(value: any, map: Map<number, string>, depth: number) {
  const str = JSON.stringify(
    value,
    (key, value1) => {
      if (typeof value1 !== "string" || !/^[[{]/.test(value1)) {
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
    2
  );
  const indent = "  ".repeat((depth + 1) * 2);
  return str
    .replace(/\$__(\d+)__\$/g, ($0, $1) => {
      const v = map.get(+$1) || "";
      return v.replace(/\n/g, "\n  " + indent);
    })
    .split("\n")
    .map((v) => {
      const prefix = v.match(/^\s*/)![0];
      return v.replace(/\\n/g, "\n  " + prefix);
    })
    .join("\n")
    .replace(/\\t/g, "  ");
}

function prettyString(text: string) {
  if(/^.*?\{.*\}\s*$/.test(text)) {
    return text.replace(/(^.*?{)(.*)(}\s*$)/, ($0, $1, $2, $3) => {
      return $1 + "\n  " + $2.replace(/\s*,\s*/g, ',\n  ') + '\n' + $3;
    })
  }
  return text;
}

export const jsonRender: Renderer = async ({ content }) => {
  let error = '';
  const tempMap = new Map<number, string>();
  try {
    content = prettyJson(JSON.parse(content), tempMap, 0);
  } catch (e: any) {
    error = (e?.stack || e) + '';
    content = content.replace(/-(?=[,}\]])/g, "-0");
    try {
      content = prettyJson(JSON.parse(content), tempMap, 0);
    } catch (e: any) {
      error = (e?.stack || e) + '';
      content = prettyString(content);
    }
  }
  content = await codeToHtml(content, {
    lang: 'json',
    theme: 'vitesse-dark',
  });
  return {
    error: error,
    content: content,
    style: '',
  };
};
