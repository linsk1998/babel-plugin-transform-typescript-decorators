import { NodePath, PluginObj, template, types as t } from "@babel/core";
import { BabelAPI } from "@babel/helper-plugin-utils";

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

function decoratedClass(path: NodePath<any>, node: t.ClassDeclaration, classId: string, className: string, options: Record<string, any>)
	: (t.ExpressionStatement | t.VariableDeclaration | t.ExportNamedDeclaration)[] {
	const { metadata, loose } = options;

	const setFunctionName = addTsHelper(path, "__setFunctionName");
	const esDecorate = addTsHelper(path, "__esDecorate");

	const decorators = node.decorators || [];
	node.decorators = null;

	const r: (t.ExpressionStatement | t.VariableDeclaration | t.ExportNamedDeclaration)[] = [];

	let classNameId = path.scope.generateUid("className");
	r.push(t.variableDeclaration("let", [
		t.variableDeclarator(t.identifier(classNameId), t.stringLiteral(className))
	]));

	let classDecoratorsId: string;
	let classDescriptorId: string;
	let classExtraInitializersId: string;
	if(decorators) {
		classDecoratorsId = path.scope.generateUid("classDecorators");
		classDescriptorId = path.scope.generateUid("classDescriptor");
		classExtraInitializersId = path.scope.generateUid("classExtraInitializers");
		// classThisId = path.scope.generateUid("classThis");
		r.push(
			t.variableDeclaration("let", [
				t.variableDeclarator(t.identifier(classDecoratorsId), t.arrayExpression(decorators.map(dec => dec.expression)))
			]),
			t.variableDeclaration("let", [
				t.variableDeclarator(t.identifier(classDescriptorId))
			]),
			t.variableDeclaration("let", [
				t.variableDeclarator(t.identifier(classExtraInitializersId), t.arrayExpression())
			]),
			// t.variableDeclaration("let", [
			// 	t.variableDeclarator(t.identifier(classThisId))
			// ])
		);
	}
	r.push(t.expressionStatement(t.callExpression(t.identifier(setFunctionName), [t.identifier(classId), t.identifier(classNameId)])));
	let metadataId: string;
	if(metadata !== false) {
		metadataId = path.scope.generateUid("metadata");
	}
	if(metadata === true) {
		// const _metadata = Object.create(null);
		r.push(t.variableDeclaration("const", [
			t.variableDeclarator(t.identifier(metadataId), t.callExpression(
				t.memberExpression(t.identifier("Object"), t.identifier("create")),
				[t.nullLiteral()]
			))
		]));
	}
	if(decorators) {
		r.push(
			t.expressionStatement(t.callExpression(
				t.identifier(esDecorate),
				[
					t.nullLiteral(),
					t.assignmentExpression(
						"=",
						t.identifier(classDescriptorId),
						t.objectExpression([
							t.objectProperty(t.identifier("value"), t.identifier(classId))
						])
					),
					t.identifier(classDecoratorsId),
					t.assignmentExpression(
						"=",
						t.identifier(classDescriptorId),
						t.objectExpression([
							t.objectProperty(t.identifier("kind"), t.stringLiteral("class")),
							t.objectProperty(t.identifier("name"), t.identifier(classNameId)),
							...metadata !== false ?
								[t.objectProperty(t.identifier("metadata"), t.identifier(metadataId))] :
								[]
						])
					),
					t.nullLiteral(),
					t.identifier(classExtraInitializersId)
				]
			)),
			t.expressionStatement(t.assignmentExpression(
				"=",
				t.identifier(classNameId),
				t.memberExpression(t.identifier(classDescriptorId), t.identifier("value"))
			))
		);
		if(metadata) {
			r.push(
				loose ?
					t.expressionStatement(t.assignmentExpression(
						"=",
						t.memberExpression(t.identifier(classId), t.memberExpression(t.identifier("Symbol"), t.identifier("metadata")), true),
						t.identifier(metadataId)
					)) :
					t.expressionStatement(t.callExpression(
						t.memberExpression(t.identifier("Object"), t.identifier("defineProperty")),
						[
							t.identifier(classId),
							t.memberExpression(t.identifier("Symbol"), t.identifier("metadata")),
							t.objectExpression([
								t.objectProperty(t.identifier("enumerable"), t.booleanLiteral(true)),
								t.objectProperty(t.identifier("configurable"), t.booleanLiteral(true)),
								t.objectProperty(t.identifier("writable"), t.booleanLiteral(true)),
								t.objectProperty(t.identifier("value"), t.identifier(metadataId))
							])
						]
					))
			);
		}
		r.push(
			t.expressionStatement(t.callExpression(
				t.identifier("__runInitializers"),
				[
					t.identifier(classId),
					t.identifier(classExtraInitializersId)
				]
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

					let classId: string;
					let id = declaration.id;
					if(id) {
						classId = id.name;
					} else {
						classId = path.scope.generateUid("_classThis");
					}
					path.replaceWithMultiple([
						t.variableDeclaration("let",
							[t.variableDeclarator(
								t.identifier(classId),
								t.classExpression(
									id && t.identifier(classId),
									declaration.superClass,
									declaration.body
								)
							)]
						),
						...decoratedClass(path, declaration, classId, classId, options),
						t.exportNamedDeclaration(null, [t.exportSpecifier(t.identifier(classId), t.identifier(classId))])
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

					let classId = declaration.id.name;
					path.replaceWithMultiple([
						t.variableDeclaration("let",
							[t.variableDeclarator(
								t.identifier(classId),
								t.classExpression(
									t.identifier(classId),
									declaration.superClass,
									declaration.body
								)
							)]
						),
						...decoratedClass(path, declaration, classId, classId, options),
						t.exportNamedDeclaration(null, [t.exportSpecifier(t.identifier(classId), t.identifier(classId))])
					]);
				}
			},
			ClassDeclaration(path) {
				var { node, scope } = path;
				let r = hasDecorators(node);
				if(!r) {
					return;
				}

				let classId = node.id.name;
				path.replaceWithMultiple([
					node,
					...decoratedClass(path, node, classId, classId, options)
				]);
			}
		},
	};
};