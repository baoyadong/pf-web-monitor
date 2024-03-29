import { setupReplace } from './load';
import { initOptions, log } from './core';
import { _global, getFlag, setFlag } from './utils';
import { SDK_VERSION, SDK_NAME, EVENTTYPES } from './common';
import { HandleEvents } from './handleEvents';

interface IInitializationOption {
  host: string;
  apikey: string;
  userId?: string;
  disabled?: boolean;
  useImgUpload?: boolean;
  throttleDelayTime?: number;
  overTime?: number;
  maxBreadcrumbs?: number;
  recordScreentime?: number;
  silentXhr?: boolean;
  silentFetch?: boolean;
  silentClick?: boolean;
  silentHistory?: boolean;
  silentError?: boolean;
  silentUnhandledrejection?: boolean;
  silentHashchange?: boolean;
  silentPerformance?: boolean;
  silentRecordScreen?: boolean;
  silentWhiteScreen?: boolean;
  skeletonProject?: boolean;
  whiteBoxElements?: string[];
  filterXhrUrlRegExp?: RegExp;
  beforePushBreadcrumb?: () => void;
  beforeDataReport?: () => void;
}

function init(options: IInitializationOption) {
  if (!options.host || !options.apikey) {
    return console.error(`web-monitor 缺少必须配置项：${!options.host ? 'host' : 'apikey'} `);
  }
  if (!('fetch' in _global) || options.disabled) return;
  // 初始化配置
  initOptions(options);
  setupReplace();
}

const install = function (Vue, options: IInitializationOption) {
  if (getFlag(EVENTTYPES.VUE)) return;
  setFlag(EVENTTYPES.VUE, true);
  const handler = Vue.config.errorHandler;
  // vue项目在Vue.config.errorHandler中上报错误
  Vue.config.errorHandler = function (err, vm, info) {
    HandleEvents.handleError(err);
    if (handler) handler.apply(null, [err, vm, info]);
  };
  init(options);
};

// react项目在ErrorBoundary中上报错误
function errorBoundary(err) {
  if (getFlag(EVENTTYPES.REACT)) return;
  setFlag(EVENTTYPES.REACT, true);
  HandleEvents.handleError(err);
}

export default {
  SDK_VERSION,
  SDK_NAME,
  init,
  install,
  errorBoundary,
  log,
};
