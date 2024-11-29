/*
 * @since 2024-11-28 21:40:02
 * @author junbao <junbao@moego.pet>
 */

import init, { type BiomePath, type RuleCategories, Workspace } from '@biomejs/wasm-web';

let lazy: Promise<any> | undefined = void 0;

export const biomeFormat = async (content: string, ext: string): Promise<string> => {
  if (!lazy) {
    lazy = init();
  }
  await lazy;
  const ws = new Workspace();
  ws.registerProjectFolder({ setAsCurrentWorkspace: true });
  ws.updateSettings({
    configuration: {
      files: { maxSize: 100 << 20 },
    },
    gitignore_matches: [],
  });
  const filePath: BiomePath = { kind: ['Handleable'], was_written: false, path: 'main.' + ext };
  ws.openFile({
    path: filePath,
    version: 0,
    content: content,
  });
  const printed = ws.formatFile({ path: filePath });
  return printed.code;
};
