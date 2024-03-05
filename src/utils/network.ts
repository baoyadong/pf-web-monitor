import { parseUrlToObj } from './browser'
/**
 * 检测网址是否有效
 * 
 * @param url 网址
 */

export const checkHostStatus = (url) => {
  return new Promise((resolve) => {
    let link = document.createElement('link');
    const { origin } = parseUrlToObj(url)
    link.rel="stylesheet";
    link.type="text/css"
    link.href = origin;

    link.onload = function(){
      resolve(true);
      document.body.removeChild(link)
    }

    link.onerror = function(){
      resolve(false);
      document.body.removeChild(link)
    }

    document.body.appendChild(link);
  })
}

