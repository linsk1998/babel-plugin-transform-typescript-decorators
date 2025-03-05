import { NodePath, PluginObj, types as t } from "@babel/core";
import { BabelAPI } from "@babel/helper-plugin-utils";

function hasDecorators(node: t.ClassDeclaration): 0 | 1 | 2 {
	var hasDec = false, hasParamDec = false;
	if(node.decorators && node.decorators.length) {
		hasDec = true;
	}
	var body = node.body.body;
	body.some(node => {
		if(t.isClassProperty(node) || t.isAccessor(node)) {
			if(!hasDec && node.decorators?.length) {
				hasDec = true;
			}
		} else if(t.isClassMethod(node)) {
			if(!hasDec && node.decorators?.length) {
				hasDec = true;
			}
			node.params.some(node => {
				if(!hasParamDec && node.decorators?.length) {
					hasDec = true;
					return hasParamDec = true;
				}
			});
		}
		return hasParamDec;
	});
	return hasParamDec ? 2 : (hasDec ? 1 : 0);
}

function decoratedProperty(node: t.ClassProperty | t.ClassAccessorProperty, className: string, decorateName: string) {
	let key = node.key;
	if(!t.isIdentifier(key)) return;

	let decorators = node.decorators || [];
	node.decorators = null;
	if(decorators.length === 0) return;

	return t.expressionStatement(
		t.callExpression(t.identifier(decorateName), [
			t.arrayExpression(
				decorators.map(dec => t.cloneNode(dec.expression)),
			),
			node.static ?
				t.identifier(className) :
				t.memberExpression(t.identifier(className), t.identifier("prototype")),
			t.stringLiteral(key.name),
			t.unaryExpression("void", t.numericLiteral(0))
		])
	);
}
function decoratedMethod(node: t.ClassMethod, className: string, decorateName: string, paramDecorateName: string) {
	let key = node.key;
	if(!t.isIdentifier(key)) return;

	let decorators = node.decorators || [];
	node.decorators = null;

	let exps: t.Expression[] = decorators.map(dec => t.cloneNode(dec.expression));
	node.params.forEach((param, index) => {
		let decorators = param.decorators || [];
		param.decorators = null;
		if(decorators.length) {
			decorators.forEach((dec) => {
				exps.push(
					t.callExpression(
						t.identifier(paramDecorateName),
						[t.numericLiteral(index), t.cloneNode(dec.expression)]
					)
				);
			});
		}
	});
	if(exps.length) {
		return t.expressionStatement(
			t.callExpression(t.identifier(decorateName), [
				t.arrayExpression(exps),
				node.static ?
					t.identifier(className) :
					t.memberExpression(t.identifier(className), t.identifier("prototype")),
				t.stringLiteral(key.name),
				t.nullLiteral()
			])
		);
	}
}

function decoratedClass(node: t.ClassDeclaration, className: string, decorateName: string, paramDecorateName: string): (t.ExpressionStatement | t.VariableDeclaration | t.ExportNamedDeclaration)[] {

	const decorators = node.decorators || [];
	node.decorators = null;

	var r: t.ExpressionStatement[] = [];

	node.body.body.forEach((member) => {
		if(t.isClassProperty(member) || t.isAccessor(member)) {
			if(!member.static && !member.computed) {
				let statement = decoratedProperty(member, className, decorateName);
				if(statement) {
					r.push(statement);
				}
			}
		} else if(t.isClassMethod(member)) {
			if(!member.static && !member.computed) {
				let statement = decoratedMethod(member, className, decorateName, paramDecorateName);
				if(statement) {
					r.push(statement);
				}
			}
		} else {

		}
	});
	node.body.body.forEach((member) => {
		if(t.isClassProperty(member) || t.isAccessor(member)) {
			if(member.static && !member.computed) {
				let statement = decoratedProperty(member, className, decorateName);
				if(statement) {
					r.push(statement);
				}
			}
		} else if(t.isClassMethod(member)) {
			if(member.static && !member.computed) {
				let statement = decoratedMethod(member, className, decorateName, paramDecorateName);
				if(statement) {
					r.push(statement);
				}
			}
		}
	});
	if(decorators && decorators.length) {
		r.push(
			t.expressionStatement(t.assignmentExpression(
				"=",
				t.identifier(className),
				t.callExpression(t.identifier(decorateName), [
					t.arrayExpression(decorators.map(dec => dec.expression)),
					t.identifier(className)
				])
			))
		);
	}
	return r;
}

export = function(api: BabelAPI, options: Record<string, any>): PluginObj {
	api.assertVersion(7);
	options.decoratorsBeforeExport = true;
	options.legacy = true;
	options.version = "legacy";

	const importCache = new Map<string, Map<string, string>>();

	function addTsHelper(path: NodePath, name: string): string {
		const fileKey = this.file.opts.filename;
		let map = importCache.get(fileKey);
		if(!map) {
			map = new Map();
			importCache.set(fileKey, map);
		}
		let uid = name;
		let binding = path.scope.getBinding(name);
		if(binding) {
			uid = path.scope.generateUid(name);
		}
		map.set(uid, name);
		return uid;
	}

	return {
		name: "typescript-experimental-decorators",
		manipulateOptions({ generatorOpts }, parserOpts) {
			generatorOpts.decoratorsBeforeExport = true;
			generatorOpts.legacy = true;
			generatorOpts.version = "legacy";
			parserOpts.plugins.push("decorators-legacy", "decoratorAutoAccessors");
		},
		visitor: {
			Program: {
				exit(path) {
					const fileKey = this.file.opts.filename;
					if(importCache.has(fileKey)) {
						let map = importCache.get(fileKey);
						importCache.delete(fileKey);
						const importNode = t.importDeclaration(
							Array.from(map).map(
								([uid, name]) => t.importSpecifier(t.identifier(uid), t.identifier(name))
							),
							t.stringLiteral("tslib")
						);

						path.unshiftContainer('body', importNode);
					}
				}
			},
			ExportDefaultDeclaration(path) {
				let { node } = path;
				let declaration = node.declaration;
				if(t.isClassDeclaration(declaration)) {
					let r = hasDecorators(declaration);
					if(!r) {
						return;
					}
					const decorateName = addTsHelper.call(this, path, "__decorate");
					const paramDecorateName = r === 2 ? addTsHelper.call(this, path, "__param") : null;

					let className: string;
					let id = declaration.id;
					if(id) {
						className = id.name;
					} else {
						className = path.scope.generateUid("_default");
					}
					path.replaceWithMultiple([
						t.variableDeclaration("let",
							[t.variableDeclarator(
								t.identifier(className),
								t.classExpression(
									id && t.identifier(className),
									declaration.superClass,
									declaration.body
								)
							)]
						),
						...decoratedClass(declaration, className, decorateName, paramDecorateName),
						t.exportDefaultDeclaration(t.identifier(className))
					]);
				}
			},
			ExportNamedDeclaration(path) {
				let { node } = path;
				let declaration = node.declaration;
				if(t.isClassDeclaration(declaration)) {
					let r = hasDecorators(declaration);
					if(!r) {
						return;
					}
					const decorateName = addTsHelper.call(this, path, "__decorate");
					const paramDecorateName = r === 2 ? addTsHelper.call(this, path, "__param") : null;

					let className = declaration.id.name;
					path.replaceWithMultiple([
						t.variableDeclaration("let",
							[t.variableDeclarator(
								t.identifier(className),
								t.classExpression(
									t.identifier(className),
									declaration.superClass,
									declaration.body
								)
							)]
						),
						...decoratedClass(declaration, className, decorateName, paramDecorateName),
						t.exportNamedDeclaration(null, [t.exportSpecifier(t.identifier(className), t.identifier(className))])
					]);
				}
			},
			ClassDeclaration(path) {
				let { node } = path;
				let r = hasDecorators(node);
				if(!r) {
					return;
				}
				const decorateName = addTsHelper.call(this, path, "__decorate");
				const paramDecorateName = r === 2 ? addTsHelper.call(this, path, "__param") : null;

				path.insertAfter(decoratedClass(node, node.id.name, decorateName, paramDecorateName));
			}
		},
	};
};
