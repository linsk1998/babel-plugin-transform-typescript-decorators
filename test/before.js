
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
let propa = "propa";

@ClassDe
class Cat {
	propa = 1;
	@PropDe
	propb;
	propc;
	@MethodDe
	mob() { }
	@AccDe
	get aaa() { return 1; }
	@AccDe
	set aaa(v) { }
}