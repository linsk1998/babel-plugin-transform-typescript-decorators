import { __decorate } from "tslib";
class ClsDecl {}
ClsDecl = __decorate([ClsDec], ClsDecl);
console.log(ClsDecl);
let ExpCls = class ExpCls {};
ExpCls = __decorate([ClsDec], ExpCls);
export { ExpCls };
let _default = class {};
_default = __decorate([ClsDec], _default);
export default _default;