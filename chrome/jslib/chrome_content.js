// 此界面用于和目标界面交互传递

window.addEventListener(
  "message",
  function (e) {
    // 接收来自process.js的消息
    if (e.data.type === "process") {
      chrome.runtime.sendMessage(
        e.data.message.senderId,
        {
          desc: e.data.message.desc,
          context: e.data.message.context,
          action: e.data.message.action,
          backContent: e.data.message.backContent,
        },
        function (res) { }
      );
    }
  },
  false
);

// 接收background.js的信息
chrome.runtime.onMessage.addListener(
  /** @param {action?: number} message */ function (
  message,
  sender,
  sendResponse
) {
    sendResponse();

    debugger;

    if (!message.action) return;
    message.senderId = sender.id;
    sendProcessMessage(message);
  }
);

function sendProcessMessage(data) {
  window.postMessage(
    {
      type: "chrome_action",
      message: {
        action: "close_process",
      },
    },
    "*"
  );
  window.postMessage({ type: "chrome_action", message: data }, "*");
}

(function () {
  injectCustomJs("process.js");
})();

// 向页面注入JS
function injectCustomJs(jsPath, type = "text/javascript") {
  return new Promise(function (resolve, reject) {
    var temp = document.createElement("script");
    if (type) temp.setAttribute("type", type);
    if (!jsPath.includes("http")) {
      jsPath = "jslib/" + jsPath;
      temp.src = chrome.extension.getURL(jsPath);
    } else {
      temp.src = jsPath;
    }
    temp.onload = () => resolve(true);
    temp.onerror = () => reject();
    document.getElementsByTagName("head")[0].appendChild(temp);
  });
}


