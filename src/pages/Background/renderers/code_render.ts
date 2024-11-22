/*
 * @since 2024-09-29 15:22:47
 * @author junbao <junbao@moego.pet>
 */

import { Renderer } from '../types';
import prettier from 'prettier';
import estreePlugin from 'prettier/plugins/estree';
import babelPlugin from 'prettier/plugins/babel';
import postcssPlugin from 'prettier/plugins/postcss';
import htmlPlugin from 'prettier/plugins/html';
import yamlPlugin from 'prettier/plugins/yaml';
import markdownPlugin from 'prettier/plugins/markdown';
import graphqlPlugin from 'prettier/plugins/graphql';
import { detectUrlExt } from '../../../shared/utils';
import mime from 'mime';
import { colorize, enrichContent } from '../utils';

const plugins = [
  estreePlugin,
  babelPlugin,
  postcssPlugin,
  htmlPlugin,
  yamlPlugin,
  markdownPlugin,
  graphqlPlugin,
];

type ParserType =
  | 'babel'
  | 'babel-ts'
  | 'json'
  | 'json5'
  | 'css'
  | 'less'
  | 'scss'
  | 'html'
  | 'vue'
  | 'yaml'
  | 'markdown'
  | 'mdx'
  | 'graphql';

const parserMap: Record<ParserType, { ext?: string[]; mime?: string[]; denyMime?: string[] }> = {
  babel: { mime: ['application/javascript', 'text/javascript'], ext: [] },
  'babel-ts': {
    mime: [],
    ext: ['ts', 'tsx', 'mts', 'cts', 'mtsx', 'ctsx'],
    denyMime: ['video/mp2t'],
  },
  json: { mime: ['application/json'], ext: [] },
  json5: { mime: ['application/json5'], ext: [] },
  css: { mime: ['text/css'], ext: [] },
  less: { mime: ['text/less'], ext: [] },
  scss: { mime: ['text/x-scss'], ext: [] },
  html: { mime: ['text/html', 'application/xml'], ext: [] },
  vue: { mime: [], ext: ['vue'] },
  yaml: { mime: ['text/yaml'], ext: [] },
  markdown: { mime: ['text/markdown'], ext: [] },
  mdx: { mime: ['text/mdx'], ext: [] },
  graphql: { mime: [], ext: ['graphql'] },
};

const parsers = Object.keys(parserMap) as ParserType[];

function getPrettierParser(ext: string) {
  const m = mime.getType(ext);
  for (const p of parsers) {
    const c = parserMap[p];
    if (c.ext?.includes(ext) && (!m || !c.denyMime?.includes(m))) {
      return p;
    }
  }
  if (!m) {
    return '';
  }
  for (const p of parsers) {
    const c = parserMap[p];
    if (c.mime?.includes(m)) {
      return p;
    }
  }
  return '';
}

export function detectContentTypeExt(contentType: string) {
  const ext =
    mime.getExtension(contentType) ||
    mime.getExtension(contentType.replace(/\/(?:x-|vnd\..*?\+)/, '/'));
  return ext === 'bin' || ext === 'txt' ? '' : ext || '';
}

export const codeRender: Renderer = async ({ content, contentType, url }) => {
  const ext = detectContentTypeExt(contentType) || detectUrlExt(url);
  let parser = getPrettierParser(ext);
  let error = '';
  if (parser) {
    try {
      content = await prettier.format(content, {
        parser: parser,
        plugins,
        printWidth: 150,
        tabWidth: 4,
        proseWrap: 'always',
      });
    } catch (e: any) {
      error = (e?.stack || e) + '';
    }
  }
  content = await enrichContent(content, (content) => colorize(content, ext));
  return {
    style: '',
    content: content,
    error: error,
  };
};
