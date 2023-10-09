// 此JS将被注入到白名单目标界面中 所以不需要在manifest.json中进行配置
var $j;

(function () {
  console.log('process inject success');
  try {
    if (jQuery) {
      $j = jQuery || $;
      $j("body").on("click", "#chrome_extensions_loading_close", function () {
        hideLoading();
      });
    } else {
      injectCustomJs("https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js").then(
        () => {
          $j = jQuery.noConflict();
          $j("body").on("click", "#chrome_extensions_loading_close", function () {
            hideLoading();
          });
        }
      );
    }
  } catch (e) {
  }
})();

function showShip() {
  const temp = document.createElement("div");
  temp.innerHTML = `<co-bar></co-bar><co-loading id="coLoading"></co-loading>`;
  document.body.appendChild(temp);
}

function showLoading() {
  const temp = document.createElement("div");
  temp.innerHTML = `
    <div id="chrome_extensions_loading">
      <div id="chrome_extensions_loading_tips">谷歌插件
        <span id="chrome_extensions_loading_close">X</span>
      </div>
      <div id="chrome_extensions_loading-lds-ring"><div></div><div></div><div></div><div></div></div>
      <div id="chrome_extensions_loading_text"><span id="chrome_extensions_loading_text_steps"></span>正在<span id="chrome_extensions_loading_text_msg">初始化</span>...</div>
      <div id="chrome_extensions_process">
        <span style="width: 0%"></span>
        <div id='chrome_extensions_process_tips'></div>
      </div>
    </div>
  `;
  document.body.appendChild(temp);
  setTimeout(() => {
    dragElement(document.getElementById("chrome_extensions_loading"));
  }, 1000);
}

function hideLoading() {
  $j("#chrome_extensions_loading").hide();
}

function dragElement(elmnt) {
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  console.log(elmnt.id);
  if (document.getElementById("header_data")) {
    // if present, the header is where you move the DIV from:
    document.getElementById("header_data").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

window.addEventListener(
  "message",
  function (e) {
    if (e.data.type === "chrome_action") {
      if (e.data.message.action === "close_process") {
        if ($j("#chrome_extensions_loading")) {
          $j("#chrome_extensions_loading").hide();
          return;
        }
      }

      let msg_div = $j("#chrome_extensions_loading_text_msg");
      if (msg_div && e.data.message.context.currentStep) {
        $j("#chrome_extensions_loading").show();
        const step_now = (
          ((Number(e.data.message.context.currentStep) + 1) /
            e.data.message.context.steps.length) *
          100
        ).toFixed(2);
        $j("#chrome_extensions_loading_text_steps").html(
          Number(e.data.message.context.currentStep) +
          1 +
          "/" +
          e.data.message.context.steps.length
        );
        $j("#chrome_extensions_process_tips").html(step_now + "%");
        $j("#chrome_extensions_process span").width(step_now + "%");
        $j(msg_div).html(e.data.message.desc);
        if (
          (Number(e.data.message.context.currentStep) + 1) /
          e.data.message.context.steps.length ===
          1
        ) {
          $j("#chrome_extensions_loading_text").html(
            "自动步骤执行完成,您可继续手动操作～"
          );
        }
      }

      console.log("收到消息action任务", e?.data?.message);
      const action = CoActionMap[e.data.message.action];
      if (!action) {
        console.error("Action Listen: action is not register;", e);
        return;
      }

      const sendMsg = (body) => {
        sendActionMessage({
          senderId: e.data.message.senderId,
          context: e.data.message.context,
          action: e.data.message.action,
          backContent: body,
        });
      };
      const val = action(e.data.message.args);

      if (val instanceof Promise) {
        val.then((data) => {
          sendMsg(data);
        });
        return;
      } else {
        sendMsg(val);
      }
    } else if (e.data.type === "chrome_loading_custom") {
      $j("#chrome_extensions_loading_text").html(e.data.message.html);
    }
  },
  false
);

/**
 *
 * @param {Args} args
 * @returns
 */

let waiting = false;
// elementJSON = [{name:xxx,key:xxx,value:xxx，type:}]
function getDataItems(args) {
  return new Promise(function (resolve, reject) {
    try {
      const eleMap = args.elementJSON;
      if (eleMap) {
        if (Array.isArray(eleMap)) {
          eleMap.forEach((e) => {
            if (e.name && e.elementSelector) {
              e.value = getValue({
                elementSelector: e.elementSelector,
                elementType: args.elementType,
                elementValue: args.elementValue,
              });
            }
          });
        } else {
          const result = Object.keys(eleMap).reduce((a, key) => {
            a[key] = eleMap[key]
              ? getValue({
                elementSelector: eleMap[key],
                elementType: args.elementType,
                elementValue: args.elementValue,
              })
              : "";
            return a;
          }, {});
          args.elementJSON = result;
        }

        resolve(args);
      }
    } catch (e) {
      reject(e);
    }
  });
}

function setDataItems(args) {
  return new Promise(function (resolve, reject) {
    try {
      if (args && args.datas.length > 0) {
        if (args.type === "vue" && args.elementSelector) {
          let $vm;
          if (
            args.elementSelector[0] == "#" &&
            !args.elementSelector.includes(" ")
          ) {
            $vm = document.getElementById(args.elementSelector);
          } else {
            $vm = $j(args.elementSelector)[0];
          }

          if (args.path.length > 0 && $vm) {
            args.path.forEach((e) => {
              $vm = $vm[e];
            });

            setArgsDatas(args.datas, $vm).then(() => {
              resolve(true);
            });
          } else {
            reject();
          }
        } else {
          args.datas.forEach((e) => {
            setValue({
              elementSelector: e.name,
              value: e.value,
            });
          });
          resolve(true);
        }
      } else {
        reject();
      }
    } catch (e) {
      // 继续执行
      resolve(true);
    }
  });
}

function getValue(args) {
  if (args.elementType === "iframe") {
    const text = $j(args.elementValue)
      .contents()
      .find(args.elementSelector)
      .text();

    if (text) {
      return text;
    }
  }

  if (args.elementSelector[0] == "#" && !args.elementSelector.includes(" ")) {
    const a = args.elementSelector;
    if (!a) return false;
    const ad = document.getElementById(a.substring(1));
    return ad?.value || ad?.innerText;
  }

  const a = $j(args.elementSelector);
  return a.val() || a.text();
}
/**
 *
 * @param {Args} args
 * @returns
 */
function setValue(args) {
  if (args.type == "many" && typeof args.value == "object") {
    const valObj = args.value;
    Object.keys(valObj).forEach((key) => {
      setValue({
        elementSelector: key,
        value: valObj[key],
        valType: args.valType,
        valueType: args.valueType,
      });
    });
    return;
  }

  if (args.valType === "react") {
    const ele = $j(args.elementSelector)[0];
    if (ele) {
      const __reactProps$ = Object.keys(ele).find((key) =>
        key.startsWith("__reactProps$")
      );
      ele[__reactProps$].onChange({ target: { value: args.value } });
    }
  }

  if (args.elementSelector[0] == "#" && !args.elementSelector.includes(" ")) {
    const ele = document.getElementById(args.elementSelector.substring(1));
    if (ele) {
      ele.value = args.value;
    }
    try {
      ele.dispatchEvent(new Event("input"));
      setTimeout(() => {
        ele.dispatchEvent(new Event("change"));
        ele.dispatchEvent(new Event("onchange"));
      }, 0);
    } catch (e) { }
    return true;
  }

  $j(args.elementSelector).val(args.value).trigger("change");
  if (args.dispatch && document.querySelector(args.elementSelector)) {
    document.querySelector(args.elementSelector)[args.dispatch]();
  }
  try {
    $j(args.elementSelector)[0].dispatchEvent(new Event("input"));
    document
      .getElementsByClassName(args.elementSelector.substring(1))[0]
      .dispatchEvent(new Event("input"));
  } catch (e) { }
  return true;
}

/**
 *
 * @param {Args} args
 * @returns
 */
function clickEle(args) {
  try {
    if (
      args.elementSelector[0] == "#" &&
      !args.elementSelector.includes(" ") &&
      !args.elementSelector.includes(">")
    ) {
      const a = args.elementSelector;
      document.getElementById(a.substring(1)).click();
      return true;
    }
    $j(args.elementSelector)[0].click();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 *
 * @param {Args} args
 * @returns
 */
function getHtml(args) {
  if (args.elementType === "iframe") {
    let data = $j(args.elementValue).contents().find(args.elementSelector);
    if (data && data.html()) {
      return data.html();
    }
  }

  if (
    args.elementSelector[0] == "#" &&
    !args.elementSelector.includes(" ") &&
    !args.elementSelector.includes(">")
  ) {
    const a = args.elementSelector;
    return document.getElementById(a.substring(1));
  }
  if (args.path) {
    return getUrlInElement(args);
  } else {
    return $j(args.elementSelector).html() || $j(args.elementSelector);
  }
}

function opened(args) {
  return true;
}

/**
 *
 * @param {Args} args
 * @returns
 */
function openUrl(args) {
  if (!args.url.includes(window.location.host)) {
    window.open(args.url);
  }
  return true;
}

function setArgsDatas(arr, $vm) {
  return new Promise((resolve, reject) => {
    if (arr.every((e) => e.passed === true)) {
      resolve(true);
    } else {
      let e = arr.find((e) => e.passed === false || !e.passed);
      if (e.valType && e.valType === "array" && !Array.isArray(e.value)) {
        e.value = e.value.split(",");
      }

      if (e.type === "function") {
        if (e.valueType === "json" && e.value && Array.isArray(e.value)) {
          if (e.timeout) {
            setTimeout(() => {
              const value = getDescendantProp($vm, e.value);
              if (value) {
                $vm[e.name](value);
              }

              e.passed = true;
              setArgsDatas(arr, $vm).then(() => {
                resolve(true);
              });
            }, e.timeout);
          } else {
            const value = getDescendantProp($vm, e.value);
            if (value) {
              $vm[e.name](value);
            }
            e.passed = true;
            setArgsDatas(arr, $vm).then(() => {
              resolve(true);
            });
          }
        } else {
          $vm[e.name](e.value ? e.value : null);
          e.passed = true;
          setArgsDatas(arr, $vm).then(() => {
            resolve(true);
          });
        }
      } else {
        if (e.value && Array.isArray(e.value)) {
          e.value.forEach((g) => {
            $vm[e.name].push(g);
          });
        } else {
          $vm[e.name] = e.value;
        }
        e.passed = true;
        setArgsDatas(arr, $vm).then(() => {
          resolve(true);
        });
      }
    }
  });
}

function waitTime(args) {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, args.time || 1000);
  });
}

function getWaitDom(args) {
  return new Promise(function (resolve, reject) {
    if (waiting === false) {
      waiting = true;
      const num = args.timeout / 1000;
      let intNum = 0;
      let pass = false;

      if (args.elementSelector) {
        const interval = setInterval(() => {
          const html = getHtml(args);
          if (
            (!html || html === "" || html.length === 0) &&
            args.errorElementSelector
          ) {
            let errHtml = getHtml({
              elementSelector: args.errorElementSelector,
            });
            if (errHtml === "" || !errHtml || errHtml?.length === 0) {
            } else {
              clearInterval(interval);
              waiting = false;
              resolve(false);
            }
          }
          pass = html === "" || !html || html?.length === 0 ? false : true;
          intNum++;

          if (pass || intNum >= num) {
            clearInterval(interval);
            waiting = false;
            if (pass) {
              resolve(true);
            } else {
              resolve(false);
            }
          }
        }, 1000);
      }

      if (args.timeout && !args.elementSelector) {
        setTimeout(() => {
          waiting = false;
          resolve(true);
        }, args.timeout);
      }
    }
  });
}

/**
 * @function
 * @param {string | {text:string; heading?:string}} text
 * @param {'info'|'error'|'warning'|'success'} type
 */
function $toast(text, type = "info") {
  $.toast({
    heading: text.heading || type,
    text: text,
    showHideTransition: "slide",
    icon: type,
    position: "top-right",
  });
}

/**
 * @function
 * @param {string | {text:string; heading?:string}} text
 * @param {'info'|'error'|'warning'|'success'} type
 */
function $toast(text, type = "info") {
  $.toast({
    heading: text.heading || type,
    text: text,
    showHideTransition: "slide",
    icon: type,
    position: "top-right",
  });
}

// 字符串的相似度
function similarity2(s, t) {
  var l = s.length > t.length ? s.length : t.length;
  var d = strSimilarity2Number(s, t);
  return (1 - d / l).toFixed(4);
}

function strSimilarity2Number(s, t) {
  var n = s.length,
    m = t.length,
    d = [];
  var i, j, s_i, t_j, cost;
  if (n == 0) return m;
  if (m == 0) return n;
  for (i = 0; i <= n; i++) {
    d[i] = [];
    d[i][0] = i;
  }
  for (j = 0; j <= m; j++) {
    d[0][j] = j;
  }
  for (i = 1; i <= n; i++) {
    s_i = s.charAt(i - 1);
    for (j = 1; j <= m; j++) {
      t_j = t.charAt(j - 1);
      if (s_i == t_j) {
        cost = 0;
      } else {
        cost = 1;
      }
      d[i][j] = Minimum(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[n][m];
}

function Minimum(a, b, c) {
  return a < b ? (a < c ? a : c) : b < c ? b : c;
}

function queryEle(argsIn) {
  return new Promise((res, rej) => {
    const args = argsIn.query;
    const target = args.target;
    let maxEle,
      MaxSimilar = 0;
    $j(args.rangeDom).each(function () {
      const text = $j(this)
        .text()
        .replace(/[\s\n\t]+/g, "");
      if (!text) return;
      const maxSimilar = similarity2(text, target);
      if (maxSimilar > MaxSimilar) {
        maxEle = this;
        MaxSimilar = maxSimilar;
      }
    });

    if (!maxEle) {
      rej("未找到指定元素", args);
      return;
    }

    if (args.click) $j(maxEle).find(args.click).trigger("click");

    res(true);
  });
}


function getDescendantProp(obj, arr) {
  while (arr.length && (obj = obj[arr.shift()]));
  return obj;
}

function getUrlInElement(args) {
  let element = document.querySelector(args.elementSelector);
  if (args.path && element) {
    args.path.forEach((e) => {
      element = element[e];
    });
  }
  return element;
}

function getTables(args) {
  let tableData = {
    thead: [],
    tbody: [],
  };

  return new Promise((res, rej) => {
    if (args.elementSelector) {
      $(args.elementSelector)
        .find("thead tr:first th")
        .each(function () {
          tableData.thead.push($j(this).text());
        });

      $(args.elementSelector)
        .find("thead tr th")
        .each(function () {
          let th_data = [];
          $j(this)
            .find(td)
            .each(function () {
              th_data.push($j(this).text());
            });
          tableData.tbody.push({
            tr: th_data,
          });
        });

      res();
    } else {
      rej();
    }
  });
}

function setTables(args) {
  return new Promise((res, rej) => {
    try {
      let $vm = $j(args.elementSelectorItems);
      if ($vm.length > 0 && args.values?.length > 0) {
        let pass = true;
        let selectedVm;
        if (!args.num) {
          args.num = 0;
        }
        for (let i = 0; i < $vm.length; i++) {
          if (!$vm[i].chrome_passed || $vm[i].chrome_passed === false) {
            selectedVm = $vm[i];
            selectedVm.chrome_passed = true;
            if (
              $j(selectedVm).find(args.values[0].elementSelector).length > 0
            ) {
              args.num += 1;
              pass = false;
              break;
            }
          }
        }
        if (pass) {
          res();
        } else {
          args.values.forEach((e) => {
            if (e.type === "array" && e.value && !Array.isArray(e.value)) {
              e.value = e.value.split(",");
            }

            if (e.steps?.length > 0) {
              e.steps.forEach((g) => {
                if (e.type === "array" && !Array.isArray(g.value) && g.value) {
                  g.value = g.value.split(",");
                }
              });
            }
          });

          setTablesChildren(args, selectedVm).then(() => {
            args.values.forEach((e) => {
              e.passed = false;
              if (e.steps?.length > 0) {
                e.steps.forEach((g) => {
                  g.passed = false;
                });
              }
            });
            setTables(args).then(() => res());
          });
        }
      } else {
        rej();
      }
    } catch (e) {
      console.error("设置table报错", e);
    }
  });
}

function setTablesChildren(args, selectedVm) {
  return new Promise((res, rej) => {
    // 检查元素存在并且是否跳过
    if (args.values && args.values[0].elementSelector) {
      if (args.values.every((e) => e.passed === true)) {
        res();
      } else {
        let e = args.values.find((e) => !e.passed || e.passed === false);
        e.passed = true;
        let $selected = $j(selectedVm).find(e.elementSelector);

        if ($selected?.length > 0) {
          if (e.path) {
            $selected = $selected[0];
            e.path.forEach((g) => {
              $selected = $selected[g];
            });
          }

          if (e.value && e.name) {
            if (e.type === "array" && !Array.isArray(e.value)) {
              e.value = e.value.split(",");
            }

            if (Array.isArray(e.value)) {
              $selected[e.name] = e.value[args.num - 1];
            } else if (e.value && e.name) {
              $selected[e.name] = e.value;
            }
          } else if (!e.name && e.value) {
            if (e.type === "array" && !Array.isArray(e.value)) {
              e.value = e.value.split(",");
            }

            if (Array.isArray(e.value)) {
              $selected.val(e.value[args.num - 1]);
            } else if (e.value && e.name) {
              $selected.val(e.value);
            }
          }

          if (e.steps?.length > 0) {
            setTablesChildrenSteps(e, $selected, args.num).then(() => {
              setTablesChildren(args, selectedVm).then(() => res());
            });
          } else {
            setTablesChildren(args, selectedVm).then(() => res());
          }
        } else {
          setTablesChildren(args, selectedVm).then(() => res());
        }
      }
    } else {
      res();
    }
  });
}

function setTablesChildrenSteps(e, $selected, num) {
  return new Promise((res, rej) => {
    if (e.steps.every((z) => z.passed === true)) {
      res();
    } else {
      let t = e.steps.find((z) => !z.passed || z.passed === false);
      t.passed = true;

      if (t.type === "function" && $selected[t.name]) {
        setTablesChildrenStepsFunction(t, $selected, num).then(() => {
          setTablesChildrenSteps(e, $selected, num).then(() => res());
        });
      } else {
        setTablesChildrenSteps(e, $selected, num).then(() => res());
      }
    }
  });
}

function setTablesChildrenStepsFunction(t, $selected, num) {
  return new Promise((res, rej) => {
    setTimeout(() => {
      if (t.valType === "path") {
        let dataValue = JSON.parse(JSON.stringify(t.value));
        let zValue = getDescendantProp($selected, dataValue);
        if (zValue) {
          $selected[t.name](zValue);
        }
      } else if (t.valType === "select") {
        if (t.value[num - 1]) {
          $selected[t.name]($selected[t.path][t.value[num - 1]]);
        }
      } else {
        if (Array.isArray(t.value)) {
          if (t.value[num - 1]) {
            $selected[t.name](t.value[num - 1]);
          }
        } else {
          $selected[t.name](t.value || null);
        }
      }
      res();
    }, t.timeout || 200);
  });
}

// 此方法用于发送到chrome_content.js
function sendActionMessage(data) {
  window.postMessage(
    {
      type: "process",
      message: data,
    },
    "*"
  );
}

const CoActionMap = /** @type {{[key: ActionName]: Function}} CoActionMap */ {
  setValue: setValue,
  getValue: getValue,
  click: clickEle,
  opened: opened,
  getHtml: getHtml,
  openUrl: openUrl,
  toast: $toast,
  wait: getWaitDom,
  getDataItems: getDataItems,
  setDataItems: setDataItems,
  getUrlInElement: getUrlInElement,
  queryEle,
  setTables,
  getTables,
  waitTime
};
