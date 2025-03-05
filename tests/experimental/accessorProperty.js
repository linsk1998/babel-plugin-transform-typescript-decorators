import { __decorate } from "tslib";
class Cat {
  accessor prop;
  static accessor propStatic;
  accessor propInit = 1;
  static accessor propStaticInit = 1;
}
__decorate([PropDec], Cat.prototype, "prop", void 0);
__decorate([PropDec], Cat.prototype, "propInit", void 0);
__decorate([PropDec], Cat, "propStatic", void 0);
__decorate([PropDec], Cat, "propStaticInit", void 0);