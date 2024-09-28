import React, { ComponentType, useEffect, useState } from 'react';
import { JsonView } from './JsonView';
import { XtermView } from './XtermView';
import { CodeView } from './CodeView';
import { JsonViewAction } from '../Content';

const views: Record<JsonViewAction['type'], ComponentType<JsonViewAction>> = {
  json: JsonView,
  xterm: XtermView,
  code: CodeView,
};

export const App = () => {
  const [action, setAction] = useState<JsonViewAction>();
  useEffect(() => {
    const send = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.parent?.postMessage(
          {
            action: 'close-json-view',
          },
          '*'
        );
      }
    };
    window.addEventListener('keydown', send);
    const receive = (e: MessageEvent) => {
      const action: JsonViewAction = e.data;
      if (views[action.type]) {
        setAction(action);
      }
    };
    window.addEventListener('message', receive);
    window.parent?.postMessage(
      {
        action: 'open-json-view',
      },
      '*'
    );
    return () => {
      window.removeEventListener('message', receive);
      window.removeEventListener('keydown', send);
    };
  }, []);
  const View = views[action?.type!];
  if (View) {
    return <View {...action!} />;
  }
  return null;
};
