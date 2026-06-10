import { declare } from "@babel/helper-plugin-utils";
import experimentalPlugin = require("./experimental");
import esPlugin = require("./es");

interface Options {
	experimentalDecorators?: boolean;
}

export = declare((api, options: Options = {}) => {
	if(options.experimentalDecorators) {
		return experimentalPlugin(api, options);
	} else {
		return esPlugin(api, options);
	}
});
