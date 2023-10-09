var adm_zip = require("adm-zip");
var fs = require("fs-extra");
var zip = new adm_zip();

zip.addLocalFolder("dist/icp-ext");

zip.writeZip("dist/icp-ext.zip");

// 将源文件夹复制到目标
fs.remove("dist/icp-ext", function (err) {
  if (err) {
    console.log("An error occured while remove the folder.");
    return console.error(err);
  } else {
    console.log("Zip completed!");
  }
});
