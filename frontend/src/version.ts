declare const __APP_VERSION__: string;
declare const __GIT_HASH__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

export const GIT_HASH: string =
  typeof __GIT_HASH__ !== 'undefined' ? __GIT_HASH__ : '';
