import { __decorate } from "tslib";
function ClsDec(Class) {}
class ClsDecl {}
ClsDecl = __decorate([ClsDec], ClsDecl);
console.log(ClsDecl);
let ExpCls = class ExpCls {};
ExpCls = __decorate([ClsDec], ExpCls);
export { ExpCls };
let _default = class {};
_default = __decorate([ClsDec], _default);
export { _default };