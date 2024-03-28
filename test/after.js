import { __runInitializers } from "tslib";
import { __esDecorate } from "tslib";
import { __setFunctionName } from "tslib";
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
let propa = "propa";
let _className = "Cat";
let _classDecorators = [ClassDe];
let _classDescriptor;
let _classExtraInitializers = [];
let _instanceExtraInitializers = [];
let _propb_decorators;
let _propb_initializers = [];
let _propb_extraInitializers = [];
let _method_mob_decorators;
let _get_aaa_decorators;
let _set_aaa_decorators;
class Cat {
  static {
    const _metadata = Object.create(null);
    _propb_decorators = [PropDe];
    __esDecorate(null, null, _method_mob_decorators, {
      kind: "method",
      name: mob,
      static: false,
      private: false,
      access: {
        has: obj => "mob" in obj,
        get: obj => obj.mob,
        set: (obj, value) => {
          obj.mob = value;
        }
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(null, null, _get_aaa_decorators, {
      kind: "getter",
      name: aaa,
      static: false,
      private: false,
      access: {
        has: obj => "aaa" in obj,
        get: obj => obj.aaa,
        set: (obj, value) => {
          obj.aaa = value;
        }
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(null, null, _set_aaa_decorators, {
      kind: "setter",
      name: aaa,
      static: false,
      private: false,
      access: {
        has: obj => "aaa" in obj,
        get: obj => obj.aaa,
        set: (obj, value) => {
          obj.aaa = value;
        }
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(null, null, _propb_decorators, {
      kind: "field",
      name: propb,
      static: false,
      private: false,
      access: {
        has: obj => "propb" in obj,
        get: obj => obj.propb,
        set: (obj, value) => {
          obj.propb = value;
        }
      },
      metadata: _metadata
    }, _propb_initializers, _propb_extraInitializers);
    __esDecorate(null, _classDescriptor = {
      value: Cat
    }, _classDecorators, {
      kind: "class",
      name: _className,
      metadata: _metadata
    }, null, _classExtraInitializers);
    _className = _classDescriptor.value;
    Cat[Symbol.metadata] = _metadata;
    __runInitializers(Cat, _classExtraInitializers);
  }
  constructor() {
    __runInitializers(this, _instanceExtraInitializers);
    Object.defineProperty(this, "propa", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: 1
    });
    Object.defineProperty(this, "propb", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: __runInitializers(this, _propb_initializers, void 0)
    });
    __runInitializers(this, _propb_extraInitializers);
    Object.defineProperty(this, "propc", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
  }
  mob() {}
  get aaa() {
    return 1;
  }
  set aaa(v) {}
}