function getContentMessage(action, tabId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      try {
        // 保证唯一性执行
        if (action === request.action && sender.tab.id === tabId) {
          sendResponse();
          resolve(request);
        }
      } catch (e) {
        reject(e);
      }
    });
  });
}

function getTabID(context) {
  return new Promise((resolve, reject) => {
    if (context?.tabId) {
      resolve(context.tabId);
    } else {
      chrome.tabs.query(
        {
          active: true,
        },
        function (tabs) {
          const MY_TAB = tabs.find((e) =>
            whiteUrl.find((m) => m.url == e.url || e.pendingUrl)
          );
          resolve(MY_TAB.id);
        }
      );
    }
  });
}

var Translator = (function () {
  /**
   * @constructor
   * @param {string} name
   * @param {string} desc
   * @param {Args} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} [translate]
   * @param {any} [error_steps]
   */
  function IActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps,
    translate
  ) {
    this.name = name;
    this.desc = desc;
    this.args = args;
    this.branches = branches;
    this.action = action;
    this.translate = translate;
    this.error_steps = error_steps;
  }

  /**
   * @constructor
   * @param {{[key: string]: IActionTranslator}} actionTranslators
   * @param {Translate} [translate]
   */
  function SpiderConfigTranslator(actionTranslators, translate) {
    this.actionTranslators = actionTranslators;
    this.translate = translate;
  }

  /**
   * @constructor ComplexActionTranslator
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function ComplexActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        goTabs(context);
      }
    );
  }

  /**
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function OpenUrlActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          if (args.type === "element") {
            sendMessageToTab(context.tabId, {
              action: "getUrlInElement",
              desc,
              args,
              context: context,
            });

            getContentMessage("getUrlInElement", context.tabId)
              .then((res) => {
                if (res.backContent) {
                  chrome.tabs.create({ url: res.backContent }, function (e) {
                    const oldTabId = context.tabId;
                    context.tabId = e.id;
                    const interval = setInterval(() => {
                      sendMessageToTab(oldTabId, {
                        action: "opened",
                        desc,
                        args,
                        context: context,
                      });
                    }, 1000);

                    getContentMessage("opened", oldTabId)
                      .then((e) => {
                        clearInterval(interval);
                        resolve(context);
                      })
                      .catch((e) => {
                        clearInterval(interval);
                        reject({ error: e });
                      });
                  });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          } else {
            chrome.tabs.query({}, function (tabs) {
              const openedTabs = tabs?.find((e) => e.url.includes(args.url));
              if (openedTabs && !openedTabs.url.includes("wanhai")) {
                chrome.tabs.highlight(
                  {
                    tabs: openedTabs.index,
                    windowId: openedTabs.windowId,
                  },
                  function () {
                    context.tabId = openedTabs.id;
                    resolve(context);
                  }
                );
              } else {
                chrome.tabs.create({ url: args.url }, function (e) {
                  context.tabId = e.id;
                  const interval = setInterval(() => {
                    sendMessageToTab(context.tabId, {
                      action: "opened",
                      desc,
                      args,
                      context: context,
                    });
                  }, 1000);

                  getContentMessage("opened", context.tabId)
                    .then((e) => {
                      clearInterval(interval);
                      resolve(context);
                    })
                    .catch((e) => {
                      clearInterval(interval);
                      reject({ error: e });
                    });
                });
              }
            });
          }
        });
      }
    );
  }

  /**
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function BackUrlActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          chrome.tabs.highlight({ tabs: 0 });
          resolve(context);
        });
      }
    );
  }

  /**
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function GetDataItemsActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        // GetDataItemsActionTranslator
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e && e.backContent) {
                  context[args.key] = e.backContent.elementJSON;
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function SetDataItemsActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        // SetDataItemsActionTranslator
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function SetValueActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        // SetValueActionTranslator
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * @constructor
   * @implements {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function GetValueActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e?.backContent) {
                  resolve(e);
                } else {
                  reject({ action: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * @constructor
   * @implements {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function ClickActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * @constructor
   * @implements {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
   function CitiBankActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  // 发送数据到后台
                  if (e.backContent && e.backContent.length) {
                    // Ajax
                    $.ajax({
                      url: `${api_url}Fam/BankTransaction/ImportFromBank`,
                      type: "POST",
                      headers: {
                        Accept: "application/json; charset=utf-8",
                        ".aspnetcore.culture": "zh-Hans",
                        "accept-language": "zh-Hans",
                        authorization: "Bearer " + decodeURI(context.token).replace(/"/g, ""),
                      },
                      contentType: "application/json; charset=utf-8",
                      dataType: "json",
                      data: JSON.stringify({
                        data: e.backContent,
                        isReference: args.isReference ? true : false
                      }),
                      success: function (res) {
                        chrome.tabs.sendMessage(
                          context.tabId,
                          { type: "co_loading_custom", html: `数据已经上传完成，共上传【${res.result.totalRowCount}】条数据` },
                          function (res) {}
                        );
                        resolve(res);
                      },
                      error: function (res) {
                        chrome.tabs.sendMessage(
                          context.tabId,
                          { type: "co_loading_custom", html: "数据上传失败" },
                          function (res) {}
                        );
                        resolve(res);
                      },
                    });
                    resolve(e);
                  } else {
                    resolve(e);
                  }
                  
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * @constructor
   * @implements {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function GetHtmlActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * @constructor
   * @implements {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function HttpApiActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        // HttpApiActionTranslator
        // TODO: Ajax
        // Tabs.sendMessage({action: CoAction.GetHtml, select: context.htmlSelect})
      }
    );
  }

  /**
   * @constructor
   * @implements {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function WaitActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            // 等待界面注入JS
            let interval = setInterval(() => {
              sendMessageToTab(e, {
                action: action,
                args,
                desc,
                context: context,
              });
            }, 1000);

            if (args.timeout && args.elementSelector) {
              setTimeout(() => {
                if (interval) {
                  clearInterval(interval);
                  reject({ error: action });
                }
              }, args.timeout);
            }

            getContentMessage(action, context.tabId)
              .then((e) => {
                clearInterval(interval);
                interval = false;
                if (e.backContent) {
                  setTimeout(() => {
                    resolve(e);
                  }, 1000);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                clearInterval(interval);
                interval = false;
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * 在新的浏览器标签，执行特定流程
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function SwitchTabActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          let count = 3;
          const inval = setInterval(() => {
            chrome.tabs.query(args.tabQuery, (tabs) => {
              const openedTabs = tabs[0];
              if (!openedTabs) {
                if (!count) {
                  reject("暂未找到标签", args.tabQuery);
                }
                count--;
                return;
              }
              clearInterval(inval);
              chrome.tabs.highlight(
                {
                  tabs: openedTabs.index,
                  windowId: openedTabs.windowId,
                },
                function () {
                  context.tabId = openedTabs.id;
                  resolve(context);
                }
              );
            });
          }, 1000);
        });
      }
    );
  }

  /**
   * 查找表格列元素
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function SetTablesActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * 获取表格列元素
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function GetTablesActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * 查找指定节点
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function QueryEleActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            setTimeout(() => {
              sendMessageToTab(e, {
                action: action,
                args,
                desc,
                context: context,
              });
            }, 300);
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * Kendo框架
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function KendoActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * React框架
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function ReactActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   * 等待一段时间
   * @constructor
   * @implements  {IActionTranslator}
   * @param {string} name
   * @param {string} desc
   * @param {{[key:string]: any}} args
   * @param {Array<Branch>} branches
   * @param {ActionName} action
   * @param {Translate} translate
   */
  function WaitTimeActionTranslator(
    name,
    desc,
    args,
    branches,
    action,
    error_steps
  ) {
    IActionTranslator.call(
      this,
      name,
      desc,
      args,
      branches,
      action,
      error_steps,
      function (context) {
        return new Promise((resolve, reject) => {
          // FIXME: can wait in the background.
          getTabID(context).then((e) => {
            sendMessageToTab(e, {
              action: action,
              args,
              desc,
              context: context,
            });
            getContentMessage(action, context.tabId)
              .then((e) => {
                if (e) {
                  resolve(e);
                } else {
                  reject({ error: action });
                }
              })
              .catch((e) => {
                reject({ error: e });
              });
          });
        });
      }
    );
  }

  /**
   *
   * @param {Step} step
   * @returns {IActionTranslator | null}
   */
  function LoadActionByStep(step) {
    switch (step.action) {
      case "openUrl":
        return new OpenUrlActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "backUrl":
        return new BackUrlActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "setValue":
        return new SetValueActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "getDataItems":
        return new GetDataItemsActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "setDataItems":
        return new SetDataItemsActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "getValue":
        return new GetValueActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "click":
        return new ClickActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "citibank":
        return new CitiBankActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "complex":
        return new ComplexActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "httpApi":
        return new HttpApiActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "wait":
        return new WaitActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      case "switch": {
        return new SwitchTabActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      }
      case "setTables": {
        return new SetTablesActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      }
      case "getTables": {
        return new GetTablesActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      }
      case "queryEle": {
        return new QueryEleActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      }
      case "kendo": {
        return new KendoActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      }
      case "waitTime": {
        return new WaitTimeActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      }
      case "react": {
        return new ReactActionTranslator(
          step.name,
          step.desc,
          step.args,
          step.branches,
          step.action,
          step.error_steps
        );
      }
      default:
        return null;
    }
  }

  /**
   *
   * @param {Config} conf
   */
  function LoadFromJSON(conf) {
    /**
     * @type {Step}
     */
    const { name, desc, steps } = conf;
    const actions = steps
      .map((step) => {
        if (step.steps) {
          return LoadFromJSON(step);
        }
        // 错误任务流程
        if (step.error_steps) {
          error_steps = [];
          step.error_steps.forEach((e) => {
            error_steps.push(LoadActionByStep(e));
          });
          step.error_steps = error_steps;
        }
        // 重试任务流程
        if (step.retry_steps) {
          retry_steps = [];
          step.retry_steps.forEach((e) => {
            retry_steps.push(LoadActionByStep(e));
          });
          step.retry_steps = retry_steps;
        }
        return LoadActionByStep(step);
      })
      .filter((vv) => !!vv);

    return actions;
  }

  return {
    SpiderConfigTranslator,
    ComplexActionTranslator,
    OpenUrlActionTranslator,
    BackUrlActionTranslator,
    SetValueActionTranslator,
    GetDataItemsActionTranslator,
    SetDataItemsActionTranslator,
    GetValueActionTranslator,
    ClickActionTranslator,
    GetHtmlActionTranslator,
    HttpApiActionTranslator,
    LoadFromJSON,
  };
})();
