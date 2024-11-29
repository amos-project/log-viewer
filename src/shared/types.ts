/*
 * @since 2024-09-29 15:18:18
 * @author junbao <junbao@moego.pet>
 */

export interface Configuration {
  enableAutoView: boolean;
  enableShortcuts: boolean;
}

export const defaultConfiguration: Configuration = {
  enableAutoView: true,
  enableShortcuts: true,
};

export const CONFIG_KEY = 'config';

export interface ContextEvent {
  action: 'json-view' | 'ansi-view' | 'html-view' | 'code-view';
}

export interface JsonViewAction {
  type: 'json' | 'ansi' | 'code';
  content: string;
  contentType: string;
  url: string;
}

export interface JsonViewReadyAction {
  type: 'json-view-ready';
}

export interface JsonViewReadyResponse {
  contentType: string;
}

export interface JsonViewResponse {
  content: string;
}
