import { declare } from "@babel/helper-plugin-utils";
import experimentalPlugin = require("./experimental");
import esPlugin = require("./es");

export = declare((api, options) => {
	if(options.experimentalDecorators) {
		return experimentalPlugin(api, options);
	} else {
		return esPlugin(api, options);
	}
});
