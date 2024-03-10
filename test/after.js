import { __param } from "tslib";
import { __decorate } from "tslib";

function ClassDe(Clazz) {
  return Clazz;
}

function ClassDe2(Clazz) {
  return Clazz;
}

function PropDe(target, prop) {}

function PropDe2(target, prop) {}

function AccDe(target, prop) {}

function MethodDe(target, prop) {}

function ParamDe(target, prop, index) {}

let A = class A {
  propa;
  propinit = 1;
  static staticprop = 1;

  get acc() {
    return 1;
  }

  set acc(val) {}

  me() {}

  me2(a1) {}

  static staticme() {}

};

__decorate([PropDe, PropDe2], A.prototype, "propa", void 0);

__decorate([PropDe], A.prototype, "propinit", void 0);

__decorate([AccDe], A.prototype, "acc", null);

__decorate([MethodDe], A.prototype, "me", null);

__decorate([MethodDe, __param(0, ParamDe)], A.prototype, "me2", null);

__decorate([PropDe], A, "staticprop", void 0);

__decorate([MethodDe], A, "staticme", null);

A = __decorate([ClassDe, ClassDe2], A);
export { A };
let B = class B {};
B = __decorate([ClassDe], B);
export { B };

let _default = class {};

_default = __decorate([ClassDe], _default);
export { _default };