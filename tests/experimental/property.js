import { __decorate } from "tslib";
class Cat {
  prop;
  static propStatic;
  propInit = 1;
  static propStaticInit = 1;
}
__decorate([PropDec], Cat.prototype, "prop", void 0);
__decorate([PropDec], Cat.prototype, "propInit", void 0);
__decorate([PropDec], Cat, "propStatic", void 0);
__decorate([PropDec], Cat, "propStaticInit", void 0);