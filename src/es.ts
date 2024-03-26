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

function assignment(define: boolean, left: t.LVal, right: t.Expression) {

}

function decoratedClass(path: NodePath<any>, node: t.ClassDeclaration, classId: string, className: string, options: Record<string, any>)
	: (t.ExpressionStatement | t.VariableDeclaration | t.ExportNamedDeclaration)[] {
	const { metadata, loose, useDefineForClassFields } = options;

	const setFunctionName = addTsHelper(path, "__setFunctionName");
	const esDecorate = addTsHelper(path, "__esDecorate");
	const runInitializers = addTsHelper(path, "__runInitializers");

	const decorators = node.decorators || [];
	node.decorators = null;

	const before: (t.ExpressionStatement | t.VariableDeclaration | t.ExportNamedDeclaration)[] = [];
	const after: t.Statement[] = [];

	let classNameId = path.scope.generateUid("className");
	before.push(t.variableDeclaration("let", [
		t.variableDeclarator(t.identifier(classNameId), t.stringLiteral(className))
	]));
	let superClassId: string;
	if(node.superClass) {
		superClassId = path.scope.generateUid("superClass");
		before.push(
			t.variableDeclaration("let", [
				t.variableDeclarator(t.identifier(superClassId), node.superClass)
			]),
		);
		node.superClass = t.identifier(superClassId);
	}

	let classDecoratorsId: string;
	let classDescriptorId: string;
	let classExtraInitializersId: string;
	if(decorators) {
		classDecoratorsId = path.scope.generateUid("classDecorators");
		classDescriptorId = path.scope.generateUid("classDescriptor");
		classExtraInitializersId = path.scope.generateUid("classExtraInitializers");
		// classThisId = path.scope.generateUid("classThis");
		before.push(
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
	let member_size = node.body.body.length;
	let member_decorators_ids: string[] = new Array(member_size);
	let member_initializers_ids: string[] = new Array(member_size);
	let member_extraInitializers_ids: string[] = new Array(member_size);
	node.body.body.forEach((member, index) => {
		let member_decorators_id: string;
		let member_initializers_id: string;
		let member_extraInitializers_id: string;
		if(t.isClassProperty(member)) {
			let decorators = member.decorators || [];
			if(decorators.length === 0) return;
			if(!member.static && !member.computed) {
				if(t.isIdentifier(member.key)) {
					let key: t.Identifier = member.key;
					member_decorators_id = path.scope.generateUid(key.name + "_decorators");
					member_initializers_id = path.scope.generateUid(key.name + "_initializers");
					member_extraInitializers_id = path.scope.generateUid(key.name + "_extraInitializers");
					before.push(
						t.variableDeclaration("let", [
							t.variableDeclarator(t.identifier(member_decorators_id))
						]),
						t.variableDeclaration("let", [
							t.variableDeclarator(t.identifier(member_initializers_id), t.arrayExpression())
						]),
						t.variableDeclaration("let", [
							t.variableDeclarator(t.identifier(member_extraInitializers_id), t.arrayExpression())
						]),
					);
					member_decorators_ids[index] = member_decorators_id;
					member_initializers_ids[index] = member_initializers_id;
					member_extraInitializers_ids[index] = member_extraInitializers_id;
				}
			}
		}
	});
	// after.push(t.expressionStatement(t.callExpression(t.identifier(setFunctionName), [t.identifier(classId), t.identifier(classNameId)])));
	let metadataId: string;
	if(metadata !== false) {
		metadataId = path.scope.generateUid("metadata");
	}
	if(metadata === true) {
		// const _metadata = Object.create(null);
		after.push(t.variableDeclaration("const", [
			t.variableDeclarator(t.identifier(metadataId), t.callExpression(
				t.memberExpression(t.identifier("Object"), t.identifier("create")),
				[node.superClass ?
					t.assignmentExpression(
						"||",
						t.memberExpression(t.identifier(superClassId), t.memberExpression(t.identifier("Symbol"), t.identifier("metadata")), true),
						t.nullLiteral()
					) :
					t.nullLiteral()
				]
			))
		]));
	}
	node.body.body.forEach((member, index, array) => {
		let member_decorators_id: string = member_decorators_ids[index];
		if(t.isClassProperty(member)) {
			let decorators = member.decorators || [];
			if(decorators.length === 0) return;
			if(!member.static && !member.computed) {
				if(t.isIdentifier(member.key)) {
					after.push(t.expressionStatement(
						t.assignmentExpression(
							"=",
							t.identifier(member_decorators_id),
							t.arrayExpression(decorators.map(dec => t.cloneNode(dec.expression)))
						)
					));
				}
			}
		}
	});
	node.body.body.forEach((member, index, array) => {
		let member_decorators_id: string = member_decorators_ids[index];
		let member_initializers_id: string = member_initializers_ids[index];
		let member_extraInitializers_id: string = member_extraInitializers_ids[index];
		if(t.isClassProperty(member)) {
			let decorators = member.decorators || [];
			if(decorators.length === 0) return;
			if(!member.static && !member.computed) {
				if(t.isIdentifier(member.key)) {
					let key = t.cloneNode(member.key);
					let keyAttr = t.stringLiteral(member.key.name);
					after.push(
						t.expressionStatement(t.callExpression(
							t.identifier(esDecorate),
							[
								t.nullLiteral(),
								t.nullLiteral(),
								t.identifier(member_decorators_id),
								t.objectExpression([
									t.objectProperty(t.identifier("kind"), t.stringLiteral("field")),
									t.objectProperty(t.identifier("name"), key),
									t.objectProperty(t.identifier("static"), t.booleanLiteral(false)),
									t.objectProperty(t.identifier("private"), t.booleanLiteral(false)),
									t.objectProperty(
										t.identifier("access"),
										t.objectExpression([
											t.objectProperty(
												t.identifier("has"),
												t.arrowFunctionExpression([t.identifier("obj")], t.binaryExpression("in", keyAttr, t.identifier("obj")))
											),
											t.objectProperty(
												t.identifier("get"),
												t.arrowFunctionExpression([t.identifier("obj")], t.memberExpression(t.identifier("obj"), key))
											),
											t.objectProperty(
												t.identifier("set"),
												t.arrowFunctionExpression([t.identifier("obj"), t.identifier("value")], t.blockStatement([
													t.expressionStatement(
														t.assignmentExpression("=", t.memberExpression(t.identifier("obj"), key), t.identifier("value"))
													)
												]))
											)
										])
									),
									...metadata !== false ?
										[t.objectProperty(t.identifier("metadata"), t.identifier(metadataId))] :
										[]
								]),
								t.identifier(member_initializers_id),
								t.identifier(member_extraInitializers_id)
							]
						))
					);
				}
			}
		}
	});
	if(decorators) {
		after.push(
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
					t.objectExpression([
						t.objectProperty(t.identifier("kind"), t.stringLiteral("class")),
						t.objectProperty(t.identifier("name"), t.identifier(classNameId)),
						...metadata !== false ?
							[t.objectProperty(t.identifier("metadata"), t.identifier(metadataId))] :
							[]
					]),
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
	}
	if(metadata) {
		after.push(
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
	if(decorators) {
		after.push(
			t.expressionStatement(t.callExpression(
				t.identifier("__runInitializers"),
				[
					t.identifier(classId),
					t.identifier(classExtraInitializersId)
				]
			))
		);
	}
	var initializers: t.Statement[] = [];
	node.body.body.forEach((member, index, array) => {
		let member_initializers_id: string = member_initializers_ids[index];
		let member_extraInitializers_id: string = member_extraInitializers_ids[index];
		if(t.isClassProperty(member)) {
			if(member.static) return;
			let decorators = member.decorators || [];
			member.decorators = null;
			if(decorators.length === 0) {
				return;
			}
			if(!member.computed) {
				if(t.isIdentifier(member.key)) {
					let key = member.key.name;
					let value = member.value;
					if(useDefineForClassFields) {
						initializers.push(
							t.expressionStatement(
								t.callExpression(
									t.memberExpression(t.identifier("Object"), t.identifier("defineProperty")),
									[
										t.thisExpression(),
										t.stringLiteral(key),
										t.objectExpression([
											t.objectProperty(t.identifier("enumerable"), t.booleanLiteral(true)),
											t.objectProperty(t.identifier("configurable"), t.booleanLiteral(true)),
											t.objectProperty(t.identifier("writable"), t.booleanLiteral(true)),
											t.objectProperty(t.identifier("value"), t.callExpression(t.identifier(runInitializers), [
												t.thisExpression(),
												t.identifier(member_initializers_id),
												value || t.unaryExpression("void", t.numericLiteral(0))
											]))
										])
									]
								)
							)
						);
					} else {
						initializers.push(
							t.expressionStatement(
								t.assignmentExpression(
									"=",
									t.memberExpression(t.thisExpression(), t.identifier(key)),
									t.callExpression(t.identifier(runInitializers), [
										t.thisExpression(),
										t.identifier(member_initializers_id),
										value || t.unaryExpression("void", t.numericLiteral(0))
									])
								)
							)
						);
					}
					initializers.push(
						t.expressionStatement(
							t.callExpression(t.identifier(runInitializers), [
								t.thisExpression(),
								t.identifier(member_extraInitializers_id)
							])
						)
					);
				}
			}
		}
	});
	if(initializers.length) {
		let constructor: t.ClassMethod;
		node.body.body.forEach((member) => {
			if(t.isClassMethod(member)) {
				if(member.kind === "constructor") {
					constructor = member;
				}
			}
		});
		let superIndex = 0;
		if(constructor) {
			superIndex = constructor.body.body.findIndex(statement => {
				if(t.isExpressionStatement(statement)) {
					let expression = statement.expression;
					if(t.isCallExpression(expression)) {
						let callee = expression.callee;
						if(t.isSuper(callee)) {
							return true;
						}
					}
				}
				return false;
			}) + 1;
		} else {
			if(node.superClass) {
				constructor = t.classMethod("constructor", t.identifier("constructor"), [], t.blockStatement([
					t.expressionStatement(t.callExpression(t.super(), [t.spreadElement(t.identifier("arguments"))]))
				]));
				superIndex = 1;
			} else {
				constructor = t.classMethod("constructor", t.identifier("constructor"), [], t.blockStatement([]));
			}
			node.body.body.unshift(constructor);
		}
		Array.prototype.splice.apply(constructor.body.body, [superIndex, 0, ...initializers]);
	}
	node.body.body.unshift(
		t.staticBlock(after)
	);
	node.body.body = node.body.body.filter(member => {
		if(t.isClassProperty(member)) {
			return false;
		}
		return true;
	});
	return before;
}

export = function(api: BabelAPI, options: Record<string, any>): PluginObj {
	api.assertVersion(7);
	options.decoratorsBeforeExport = true;
	options.legacy = false;
	options.version = "2023-05";

	return {
		name: "typescript-experimental-decorators",
		manipulateOptions({ generatorOpts }, parserOpts) {
			generatorOpts.decoratorsBeforeExport = true;
			generatorOpts.legacy = false;
			generatorOpts.version = "2023-05";
			parserOpts.plugins.push(
				["decorators", { allowCallParenthesized: false, decoratorsBeforeExport: true }],
				"decoratorAutoAccessors"
			);
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
						...decoratedClass(path, declaration, classId, classId, options),
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
						...decoratedClass(path, declaration, classId, classId, options),
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
				// node = t.cloneNode(node);
				path.replaceWithMultiple([
					...decoratedClass(path, node, classId, classId, options),
					node,
				]);
			}
		},
	};
};