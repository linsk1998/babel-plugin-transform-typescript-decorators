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

let _propb_decorators;

let _propb_initializers = [];
let _propb_extraInitializers = [];

class Cat {
  static {
    const _metadata = Object.create(null);

    _propb_decorators = [PropDe];

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
    this.propb = __runInitializers(this, _propb_initializers, void 0);

    __runInitializers(this, _propb_extraInitializers);
  }

}