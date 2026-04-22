const NATIVE_UA_TOKEN = 'SchriftInzichtApp';

export const isNativeWebView: boolean =
  typeof navigator !== 'undefined' &&
  typeof navigator.userAgent === 'string' &&
  navigator.userAgent.includes(NATIVE_UA_TOKEN);

export const isWebBrowser: boolean = !isNativeWebView;
