
function ClassDe(Clazz) {
	return Clazz;
}
function ClassDe2(Clazz) {
	return Clazz;
}
function PropDe(target, prop) {
}
function PropDe2(target, prop) {
}
function AccDe(target, prop) {
}
function MethodDe(target, prop) {
}
function ParamDe(target, prop, index) {
}

@ClassDe
@ClassDe2
export class A {
	@PropDe
	@PropDe2
	propa;
	@PropDe
	propinit = 1;
	@PropDe
	static staticprop = 1;

	@AccDe
	get acc() { return 1; }
	set acc(val) { }

	@MethodDe
	me() { }
	@MethodDe
	me2(@ParamDe a1) { }

	@MethodDe
	static staticme() { }

}

@ClassDe
export class B {

}
@ClassDe
export default class {

}