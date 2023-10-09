var fs = require("fs");
var path = require("path");
var dir = path.resolve(__dirname).replace("scripts", "");

var version = process.argv[2]
  .split("-")[0]
  .replace("v", "")
  .replace("master", "");
var filePath = dir + "package.json";

console.log('版本:'+version);

fs.readFile(filePath, "utf8", function (err, files) {
  var result = files.replace(/22.22.22/g, version);
  fs.writeFile(filePath, result, "utf8", function (err) {
    if (err) return console.log(err);
  });
});

// 替换config
var configFilePath = dir + "icp-ext/jslib/config.js";
fs.readFile(configFilePath, "utf8", function (err, files) {
  var result = files.replace(/22.22.22/g, version);
  fs.writeFile(configFilePath, result, "utf8", function (err) {
    if (err) return console.log(err);
  });
});

// 替换manifest.json
var manifestFilePath = dir + "icp-ext/manifest.json";

fs.readFile(manifestFilePath, "utf8", function (err, files) {
  var result = files.replace(/22.22.22/g, version);
  fs.writeFile(manifestFilePath, result, "utf8", function (err) {
    if (err) return console.log(err);
  });
});
