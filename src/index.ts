import { NodePath, template, types as t } from "@babel/core";
import { declare } from "@babel/helper-plugin-utils";

/** 辅助函数：查找是否已经存在对应的import声明 */
function findImportDeclaration(path: NodePath<t.Program>, functionName: string, pkg: string): string {
	for(let statement of path.node.body) {
		if(t.isImportDeclaration(statement) && statement.source.value === pkg) {
			for(let specifier of statement.specifiers) {
				if(t.isImportSpecifier(specifier)) {
					let imported = specifier.imported;
					if(t.isIdentifier(imported) && imported.name === functionName) {
						return specifier.local.name;
					}
				}
			}
		}
	}
}

function addTsHelper(path: NodePath<any>, functionName: string): string {
	let root: NodePath<t.Program> = path as any;
	let parentPath = path;
	do {
		root = parentPath;
		parentPath = root.parentPath;
	} while(parentPath);
	let decorateName = findImportDeclaration(root, functionName, "tslib");
	if(!decorateName) {
		// 如果没有，则添加import声明
		decorateName = functionName;
		let binding = path.scope.getBinding(decorateName);
		if(binding) {
			decorateName = path.scope.generateUid(functionName);
		}
		const importSpecifier = t.importSpecifier(t.identifier(decorateName), t.identifier(functionName));
		const importDeclaration = t.importDeclaration([importSpecifier], t.stringLiteral("tslib"));
		root.node.body.unshift(importDeclaration);
	}
	return decorateName;
}

function hasDecorators(node: t.ClassDeclaration): 0 | 1 | 2 {
	var hasDec = false, hasParamDec = false;
	if(node.decorators && node.decorators.length) {
		hasDec = true;
	}
	var body = node.body.body;
	body.some(node => {
		if(t.isClassProperty(node)) {
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

function decoratedProperty(node: t.ClassProperty, className: string, decorateName: string) {
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
		if(t.isClassProperty(member)) {
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
			// what is t.ClassAccessorProperty? is it ClassMethod?
		}
	});
	node.body.body.forEach((member) => {
		if(t.isClassProperty(member)) {
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
	if(decorators) {
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

export = declare((api, options) => {
	api.assertVersion(7);
	options.decoratorsBeforeExport = true;
	options.legacy = true;
	options.version = "legacy";

	return {
		name: "typescript-experimental-decorators",
		manipulateOptions({ generatorOpts }, parserOpts) {
			generatorOpts.decoratorsBeforeExport = true;
			generatorOpts.legacy = true;
			generatorOpts.version = "legacy";
			parserOpts.plugins.push("decorators-legacy");
		},
		visitor: {
			ExportDefaultDeclaration(path) {
				var { node, scope } = path;
				var declaration = node.declaration;
				if(t.isClassDeclaration(declaration)) {
					let r = hasDecorators(declaration);
					if(!r) {
						return;
					}
					const decorateName = addTsHelper(path, "__decorate");
					const paramDecorateName = r === 2 ? addTsHelper(path, "__param") : null;

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
						t.exportNamedDeclaration(null, [t.exportSpecifier(t.identifier(className), t.identifier(className))])
					]);
				}
			},
			ExportNamedDeclaration(path) {
				var { node, scope } = path;
				var declaration = node.declaration;
				if(t.isClassDeclaration(declaration)) {
					let r = hasDecorators(declaration);
					if(!r) {
						return;
					}
					const decorateName = addTsHelper(path, "__decorate");
					const paramDecorateName = r === 2 ? addTsHelper(path, "__param") : null;

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
				var { node, scope } = path;
				let r = hasDecorators(node);
				if(!r) {
					return;
				}
				const decorateName = addTsHelper(path, "__decorate");
				const paramDecorateName = r === 2 ? addTsHelper(path, "__param") : null;

				path.replaceWithMultiple([
					node,
					...decoratedClass(node, node.id.name, decorateName, paramDecorateName)
				]);
			}
		},
	};
});