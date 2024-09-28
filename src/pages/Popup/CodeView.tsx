/*
 * @since 2024-09-27 20:13:09
 * @author junbao <junbao@moego.pet>
 */

import React, { memo, useEffect, useRef } from 'react';
import { JsonViewAction } from '../Content';
import { editor } from 'monaco-editor';
import { detectType } from '../../shared/utils';
import IStandaloneCodeEditor = editor.IStandaloneCodeEditor;

export const CodeView = memo<JsonViewAction>(
  ({ content, contentType, url }) => {
    const view = useRef<HTMLDivElement>(null);
    const editorRef = useRef<IStandaloneCodeEditor>();
    useEffect(() => {
      editorRef.current = editor.create(view.current!, {
        readOnly: false,
        theme: 'vs-dark',
        automaticLayout: true,
      });
      return () => {
        editorRef.current!.dispose();
        editorRef.current = void 0;
      };
    }, []);
    useEffect(() => {
      (async () => {
        let mime = contentType.split(';')[0] || detectType(url);
        let parser = getPrettierParser(mime);
        if (parser) {
          try {
            const [prettier, ...parsers] = await loadPrettier();
            content = await prettier.default.format(content, {
              parser,
              plugins: parsers.map((p) => p.default),
            });
          } catch (e) {
            console.error(e);
            parser = '';
          }
        }
        if (!editorRef.current) {
          return;
        }
        editorRef.current.setValue(content);
        editor.setModelLanguage(editorRef.current.getModel()!, mime);
        editorRef.current.setScrollPosition(
          {
            scrollTop: 0,
            scrollLeft: 0,
          },
          1
        );
        if (!parser) {
          setTimeout(() => {
            editorRef.current?.getAction('editor.action.formatDocument')?.run();
          }, 100);
        }
      })();
    }, [content, contentType, url]);
    return <div ref={view} style={{ height: '100vh' }} />;
  }
);

async function loadPrettier() {
  return Promise.all([
    import('prettier'),
    import('prettier/plugins/estree'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/postcss'),
    import('prettier/plugins/html'),
    import('prettier/plugins/yaml'),
    import('prettier/plugins/markdown'),
    import('prettier/plugins/graphql'),
  ]);
}

function getPrettierParser(mime: string) {
  const mapping = Object.entries({
    json: 'json',
    javascript: 'babel',
    js: 'babel',
    css: 'css',
    html: 'html',
    xml: 'html',
    yaml: 'yaml',
    yml: 'yaml',
    markdown: 'markdown',
    md: 'markdown',
    markdownx: 'mdx',
    mdx: 'mdx',
    typescript: 'babel-ts',
    ts: 'babel-ts',
  }).sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]));
  const lm = mime.toLowerCase();
  for (const [k, v] of mapping) {
    if (lm.includes(k)) {
      return v;
    }
  }
  return '';
}
