const steps = {
  "name": "测试流程",
  "code": "测试流程",
  "desc": "百度搜索测试流程",
  "steps": [
    {
      "name": "openUrl",
      "desc": "打开官网",
      "action": "openUrl",
      "args": {
        "url": "https://www.baidu.com"
      }
    },
    {
      "name": "waitUrl",
      "desc": "判断界面打开",
      "action": "getValue",
      "args": {
        "elementSelector": "#su",
      },
    },
    {
      "name": "setInputName",
      "desc": "设置搜索值",
      "action": "setValue",
      "args": {
        "elementSelector": "#kw",
        "value": "哈哈哈"
      }
    },
    {
      "name": "search",
      "desc": "点击进行搜索",
      "action": "click",
      "args": {
        "elementSelector": "#su"
      }
    },
  ]
};


builder(steps, {});







// 邮件和 采集监听
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  sendResponse();
});

// 初始化构建
function builder(json, context) {
  return new Promise((resolve, reject) => {
    translateValues = Translator.LoadFromJSON(json);
    context.steps = translateValues;
    nextStep(context)
      .then((_context) => {
        resolve(_context);
      })
      .catch(() => {
        reject();
      });
  });
}

// 步骤执行方法
function nextStep(context) {
  return new Promise((resolve, reject) => {
    const nextStepData = context.steps.find((e) => !e.passed);
    context.currentStep = context.steps.findIndex((e) => !e.passed);
    if (context.steps.every((e) => e.passed === true)) {
      console.log("执行完成", context);
      resolve(context);
    } else {
      console.log("执行：", nextStepData);
      nextStepData
        .translate(context)
        .then((e) => {
          nextStepData.passed = true;
          nextStep(context).then(() => {
            resolve(context);
          });
        })
        .catch((e) => {
          if (nextStepData.error_steps) {
            nextChildStep(nextStepData.error_steps, context)
              .then(() => {
                nextStepData.passed = true;
                nextStep(context).then(() => {
                  resolve(context);
                });
              })
              .catch((e) => {
                stopMession(null, context);
                reject();
              });
            return;
          } else if (nextStepData.retry_steps) {
            nextChildStep(nextStepData.retry_steps, context)
              .then(() => {
                // delay 300ms
                setTimeout(() => {
                  nextStep(context).then(() => {
                    resolve(context);
                  });
                }, 300);
              })
              .catch((e) => {
                stopMession(null, context);
                reject();
              });
          } else {
            stopMession(null, context);
            reject();
          }
        });
    }
  });
}

function nextChildStep(error_steps, context) {
  return new Promise((res, rej) => {
    const nextChildStepData = error_steps.find((e) => !e.passed);
    if (error_steps.every((e) => e.passed === true)) {
      res(context);
    } else {
      console.log("执行：", nextChildStepData);
      nextChildStepData
        .translate(context)
        .then(() => {
          const step = error_steps.find(
            (z) =>
              z.name === nextChildStepData.name &&
              z.action === nextChildStepData.action
          );
          step.passed = true;
          nextChildStep(error_steps, context).then(() => {
            res(context);
          });
        })
        .catch((e) => {
          console.error(e);
          rej(e);
        });
    }
  });
}

function stopMession(nextStepData, context) {
  if (nextStepData?.goto) {
    index = context.steps.every((e) => (e.passed = false));
    for (var i = 0; i < context.steps; i++) {
      if (context.steps[i].name !== nextStepData.goto) {
        context.steps[i].passed = true;
      } else {
        nextStep(context);
        break;
      }
    }
  }
  console.error("终止任务");
}
