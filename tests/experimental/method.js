import { __decorate, __param } from "tslib";
class Cat {
  method() {}
  static methodStatic() {}
  methodArg(aaa) {}
  static methodArgStatic(aaa) {}
}
__decorate([MethodDec], Cat.prototype, "method", null);
__decorate([MethodDec, __param(0, ArgDec)], Cat.prototype, "methodArg", null);
__decorate([MethodDec], Cat, "methodStatic", null);
__decorate([MethodDec, __param(0, ArgDec)], Cat, "methodArgStatic", null);