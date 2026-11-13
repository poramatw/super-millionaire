export const SHARED_PACKAGE_NAME = '@super-millionaire/shared';

export interface ServerHealthPayload {
  status: 'ok';
  service: string;
}

export * from './types.js';
export * from './banknotes.js';
export * from './boardData.js';
export * from './bankerBot.js';
export * from './engine.js';
export * from './aiPlayer.js';
