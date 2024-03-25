
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
	@PropDe
	propb;
	@PropDe
	[propa];
}