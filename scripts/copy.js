// 引入fs-extra软件包
var fs = require("fs-extra");
var source = "icp-ext";
var destination = "dist/icp-ext";

// 将源文件夹复制到目标
fs.copy(source, destination, function (err) {
  if (err) {
    console.log("An error occured while copying the folder.");
    return console.error(err);
  }
  console.log("Copy completed!");
});
