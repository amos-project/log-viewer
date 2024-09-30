import React, { useEffect, useState } from 'react';
import {
  CONFIG_KEY,
  Configuration,
  defaultConfiguration,
} from '../../shared/types';

export const App = () => {
  const [config, setConfig] = useState<Configuration>(defaultConfiguration);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const listener: Parameters<
      chrome.storage.StorageAreaChangedEvent['addListener']
    >[0] = (changes) => {
      if (changes[CONFIG_KEY]) {
        setConfig(changes[CONFIG_KEY].newValue);
      }
    };
    chrome.storage.sync.onChanged.addListener(listener);
    chrome.storage.sync.get(CONFIG_KEY).then((r) => {
      setConfig(r[CONFIG_KEY] || defaultConfiguration);
      setLoading(false);
    });
    return () => {
      chrome.storage.sync.onChanged.removeListener(listener);
    };
  }, []);
  const handleUpdate = (key: keyof Configuration) => {
    return () => {
      const newConfig = { ...config, [key]: !config[key] };
      setLoading(true);
      chrome.storage.sync.set({ [CONFIG_KEY]: newConfig }).then(() => {
        setLoading(false);
      });
    };
  };
  return (
    <div>
      <div>
        <span>Enable auto view</span>
        <input
          type="checkbox"
          checked={config.enableAutoView}
          onChange={handleUpdate('enableAutoView')}
          disabled={loading}
        />
      </div>
      <div>
        <span>Enable shortcuts</span>
        <input
          type="checkbox"
          checked={config.enableShortcuts}
          disabled={loading}
        />
      </div>
    </div>
  );
};
