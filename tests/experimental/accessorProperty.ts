class Cat {
	@PropDec
	accessor prop;

	@PropDec
	static accessor propStatic;

	@PropDec
	accessor propInit = 1;

	@PropDec
	static accessor propStaticInit = 1;
}