/*
 * @since 2024-09-29 15:22:47
 * @author junbao <junbao@moego.pet>
 */

import { Renderer } from '../types';
import ansiHTML from 'ansi-html';
import { encode } from 'html-entities';
import { enrichContent } from '../utils';

export const ansiRender: Renderer = async function* ({ content }) {
  content = await enrichContent(content, encode);
  content = ansiHTML(content);
  yield content;
};
