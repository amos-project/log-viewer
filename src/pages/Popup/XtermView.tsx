/*
 * @since 2024-09-27 20:13:09
 * @author junbao <junbao@moego.pet>
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { JsonViewAction } from '../Content';
import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { ISearchDecorationOptions, SearchAddon } from '@xterm/addon-search';
import { FitAddon } from '@xterm/addon-fit';

export const XtermView = memo<JsonViewAction>(({ content }) => {
  const view = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [searchResult, setSearchResult] = useState('');
  const [[terminal, searchAddon, fitAddon]] = useState(() => {
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

    searchAddon.onDidChangeResults((e) => {
      if (!e) {
        setSearchResult('Too many results');
      } else {
        setSearchResult(`${Math.max(e.resultIndex, 0) + 1}/${e.resultCount}`);
      }
    });

    return [terminal, searchAddon, fitAddon] as const;
  });

  useEffect(() => {
    terminal.open(view.current!);

    const fn = (e: KeyboardEvent) => {
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    document.addEventListener('keydown', fn);
    return () => {
      document.removeEventListener('keydown', fn);
      terminal.dispose();
    };
  }, []);

  useEffect(() => {
    terminal.clear();
    terminal.write(content);
    fitAddon.fit();
    terminal.scrollToTop();
  }, [content]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    if (e.key === 'Enter') {
      const options: ISearchDecorationOptions = {
        activeMatchColorOverviewRuler: '',
        matchOverviewRuler: '',
        matchBackground: '#3b583f',
        activeMatchBackground: '#dec38a',
      };
      if (value) {
        if (e.shiftKey) {
          searchAddon.findPrevious(value, { decorations: options });
        } else {
          searchAddon.findNext(value, { decorations: options });
        }
      } else {
        searchAddon.clearDecorations();
        setSearchResult('');
      }
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ textAlign: 'right', padding: '20px' }}>
        <input ref={input} placeholder="Search..." onKeyDown={handleSearch} />
        {searchResult ? (
          <span style={{ marginLeft: '20px' }}>{searchResult}</span>
        ) : (
          void 0
        )}
      </div>
      <div ref={view} style={{ flex: 1 }} />
    </div>
  );
});
