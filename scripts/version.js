// 引入fs-extra软件包
var fs = require("fs-extra");
fs.copy("icp-ext/manifest.json", "dist/version.json", function (err) {
  if (err) {
    console.log("An error occured while copying the folder.");
    return console.error(err);
  }
  console.log("Copy Version completed!");
  //   zip.addLocalFolder("dist/icp-ext");
  //   zip.writeZip("dist/icp-ext");
});
