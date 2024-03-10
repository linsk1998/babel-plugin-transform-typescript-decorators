Babel legacy decorators is diffrent from typescript experimental decorators.

This plugin transform decorators to typescript style.

## Before

```javascript
@ClassDe
@ClassDe2
export class A {

}
```

## After

```javascript
import { __decorate } from "tslib";

let A = class A {
};

A = __decorate([ClassDe, ClassDe2], A);
export { A };
```


## Before

```javascript
class A {
	@PropDe
	propa;
	@PropDe
	propinit = 1;
	@PropDe
	static staticprop = 1;
}
```

## After

```javascript
import { __decorate } from "tslib";

class A {
	propa;
	propinit = 1;
	static staticprop = 1;
};

__decorate([PropDe], A.prototype, "propa", void 0);
__decorate([PropDe], A.prototype, "propinit", void 0);
__decorate([PropDe], A, "staticprop", void 0);
```


## Before

```javascript
class A {
	@AccDe
	get acc() { return 1; }
	set acc(val) { }
}
```

## After

```javascript
import { __decorate } from "tslib";

class A {
	@AccDe
	get acc() { return 1; }
	set acc(val) { }
};

__decorate([AccDe], A.prototype, "acc", null);
```


## Before

```javascript
class A {
	@MethodDe
	me() { }
	@MethodDe
	static staticme() { }
}
```

## After

```javascript
import { __decorate } from "tslib";

class A {
	me() {}
	static staticme() {}
};

__decorate([MethodDe], A.prototype, "me", null);
__decorate([MethodDe], A, "staticme", null);
```

## Before

```javascript
class A {
	@MethodDe
	me2(@ParamDe a1) { }
}
```

## After

```javascript
import { __decorate, __param } from "tslib";

class A {
	me2(a1) {}
};

__decorate([MethodDe, __param(0, ParamDe)], A.prototype, "me2", null);
```