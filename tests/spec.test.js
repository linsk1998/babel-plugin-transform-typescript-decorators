const fs = require("fs");
const assert = require('assert');
const { transform } = require("@babel/core");
const plugin = require("../src/experimental");

function test(title, options) {
	it(title, function() {
		const file = 'tests/' + this.test.parent.title + '/' + this.test.title;
		// 使用 Fixture 作为输入
		const inputCode = fs.readFileSync(file + '.ts', 'utf8');
		// 调用插件转换
		const { code } = transform(inputCode, {
			plugins: [[plugin, options]]
		});
		// 验证输出
		const fileOut = file + '.js';
		if(fs.existsSync(fileOut)) {
			assert.strictEqual(code, fs.readFileSync(fileOut, 'utf8'));
		} else {
			fs.writeFileSync(fileOut, code, 'utf8');
		}
	});
}

describe('experimental', function() {
	const options = {
		"experimentalDecorators": true
	};
	test('class', options);
});