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

let A = class A {};
let _className = "A";
let _classDecorators = [ClassDe, ClassDe2];

let _classDescriptor;

let _classExtraInitializers = [];

__setFunctionName(A, _className);

const _metadata = Object.create(null);

__esDecorate(null, _classDescriptor = {
  value: A
}, _classDecorators, _classDescriptor = {
  kind: "class",
  name: _className,
  metadata: _metadata
}, null, _classExtraInitializers);

_className = _classDescriptor.value;
A[Symbol.metadata] = _metadata;

__runInitializers(A, _classExtraInitializers);

export { A };