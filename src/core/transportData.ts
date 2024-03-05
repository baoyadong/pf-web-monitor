import {
  _support,
  validateOption,
  isBrowserEnv,
  Queue,
  isEmpty,
  getLocationHref,
  generateUUID,
  getYMDHMS,
  checkHostStatus
} from '../utils';
import { SDK_NAME, SDK_VERSION, EVENTTYPES } from '../common';
import { breadcrumb } from './breadcrumb';
import { options } from './options';

/**
 * 用来上报数据，包含图片打点上报、xhr请求
 */

export class TransportData {
  queue: Queue;
  apikey: string;
  errorDsn: string;
  userId: string;
  uuid: string;
  beforeDataReport: any;
  getUserId: any;
  useImgUpload: boolean;
  hostIsOnLine: boolean
  constructor() {
    this.queue = new Queue();
    this.apikey = ''; // 每个项目对应的唯一标识
    this.errorDsn = ''; // 监控上报接口的地址
    this.userId = ''; // 用户id
    this.uuid = generateUUID(); // 每次页面加载的唯一标识
    this.beforeDataReport = null; // 上报数据前的hook
    this.getUserId = null; // 上报数据前的获取用的userId
    this.useImgUpload = false;
    this.hostIsOnLine = false;
  }

  imgRequest(data, url) {
    const requestFun = () => {
      const img = new Image();
      const spliceStr = url.indexOf('?') === -1 ? '?' : '&';
      img.src = `${url}${spliceStr}data=${encodeURIComponent(JSON.stringify(data))}`;
    };
    this.queue.addFn(requestFun);
  }

  async beforePost(data) {
    let transportData = this.getTransportData(data);
    // 配置了beforeDataReport
    if (typeof this.beforeDataReport === 'function') {
      transportData = this.beforeDataReport(transportData);
      if (!transportData) return false;
    }
    return transportData;
  }

  async xhrPost(data, url) {
    const requestFun = () => {
      fetch(`${url}`, {
        method: 'post',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(response => response.json());
      // .then((res) => console.log(res));
    };

    this.queue.addFn(requestFun);
  }
  // 获取用户信息
  getAuthInfo() {
    const userId = this.userId || this.getTrackerId() || '';
    const result: any = {
      userId: String(userId),
      sdkVersion: SDK_VERSION,
      sdkName: SDK_NAME,
    };
    // 每个项目对应一个apikey
    this.apikey && (result.apikey = this.apikey);
    return result;
  }

  getApikey() {
    return this.apikey;
  }

  getTrackerId() {
    if (typeof this.getUserId === 'function') {
      const id = this.getUserId();
      const typeofId = typeof id
      if (typeofId === 'string' ||  typeofId === 'number') {
        return id;
      } else {
        console.error(`web-monitor userId: ${id} 期望 string 或 number 类型，但是传入 ${typeofId}`);
      }
    }
    return '';
  }

  // 添加公共信息
  // 这里不要添加时间戳，比如接口报错，发生的时间和上报时间不一致
  getTransportData(data) {
    const info = {
      ...data,
      ...this.getAuthInfo(), // 获取用户信息
      date: getYMDHMS(),
      uuid: this.uuid,
      page_url: getLocationHref(),
      deviceInfo: _support.deviceInfo, // 获取设备信息
    };

    // 性能数据和录屏不需要附带用户行为
    if (data.type != EVENTTYPES.PERFORMANCE && data.type != EVENTTYPES.RECORDSCREEN) {
      info.breadcrumb = breadcrumb.getStack(); // 获取用户行为栈
    }
    return info;
  }

  isSdkTransportUrl(targetUrl) {
    let isSdkDsn = false;
    if (this.errorDsn && targetUrl.indexOf(this.errorDsn) !== -1) {
      isSdkDsn = true;
    }
    return isSdkDsn;
  }

  bindOptions(options: any = {}) {
    const { host, apikey, beforeDataReport, userId, getUserId, useImgUpload } = options;
    validateOption(apikey, 'apikey', 'string') && (this.apikey = apikey);
    validateOption(host, 'host', 'string') && (this.errorDsn = host);
    validateOption(userId, 'userId', 'string') && (this.userId = userId);
    validateOption(useImgUpload, 'useImgUpload', 'boolean') && (this.useImgUpload = useImgUpload);
    validateOption(beforeDataReport, 'beforeDataReport', 'function') &&
      (this.beforeDataReport = beforeDataReport);
    validateOption(getUserId, 'getUserId', 'function') && (this.getUserId = getUserId);
  }

  async hostIsOnLineHandler(host) {
    const hostStatus = await checkHostStatus(host) // 检测接口是否能通
    if(!hostStatus) { 
      console.error('web-monitor: host无法正常访问，请检查host');
      return false
    }
    return true
  }

  // 上报数据
  async send(data) {
    const host = this.errorDsn;
    if (isEmpty(host)) {
      console.error('web-monitor: host为空，没有传入监控错误上报的host地址，请在init中传入');
      return;
    }
    // 开启录屏
    if (_support.options.silentRecordScreen) {
      if (options.recordScreenTypeList.includes(data.type)) {
        // 修改hasError
        _support.hasError = true;
        data.recordScreenId = _support.recordScreenId;
      }
    }

    this.hostIsOnLine = this.hostIsOnLine || (await this.hostIsOnLineHandler(host))
    if(!this.hostIsOnLine) { return }
    const result = await this.beforePost(data);
    if (isBrowserEnv) {
      // 支持图片打点上报和fetch上报
      return this.useImgUpload ? this.imgRequest(result, host) : this.xhrPost(result, host);
    }
  }
}
const transportData = _support.transportData || (_support.transportData = new TransportData());
export { transportData };
