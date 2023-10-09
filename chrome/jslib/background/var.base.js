const Runtime = chrome.runtime;

const Logger = (function () {
  return console;
})();

/**
 * @function sendMessageToBackground
 * @param {{select?:string;type?:any;[key:string]:any}} msg
 * @param {(e:any):void} cb
 */
function sendMessageToBackground(
  msg,
  cb = function (e) {
    Logger.log("sendMessageToBackground(callback)", e);
  }
) {
  Runtime.sendMessage(msg, cb);
}

/**
 * @function sendMessageToTab
 * @param {{select?:string;type?:any;[key:string]:any}} msg
 * @param {(e:any):void} cb
 */
function sendMessageToTab(
  tabsId,
  msg,
  cb = function (e) {
    // Logger.log("sendMessageToTab(callback)", e);
  }
) {
  chrome.tabs.sendMessage(tabsId, msg, cb);
}
