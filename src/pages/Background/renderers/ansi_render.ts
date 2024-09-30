/*
 * @since 2024-09-29 15:22:47
 * @author junbao <junbao@moego.pet>
 */

import { Renderer } from '../types';
import ansiHTML from 'ansi-html';

export const ansiRender: Renderer = ({ content }) => {
  const data = ansiHTML(content);
  return {
    style: '',
    content: data,
    error: '',
  };
};
