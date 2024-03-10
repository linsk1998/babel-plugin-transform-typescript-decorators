const fs = require("fs");
const babel = require("@babel/core");

var before = fs.readFileSync("./test/before.js", "utf-8");
var result = babel.transformSync(before, {
	babelrc: true
});
var after = result.code;
fs.writeFileSync("./test/after.js", after,"utf-8")
console.log(after);