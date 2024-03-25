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


function decoratedClass(path: NodePath<any>, node: t.ClassDeclaration, classId: string, className: string, options: Record<string, any>)
	: (t.ExpressionStatement | t.VariableDeclaration | t.ExportNamedDeclaration)[] {
	const { metadata, loose } = options;

	const setFunctionName = addTsHelper(path, "__setFunctionName");
	const esDecorate = addTsHelper(path, "__esDecorate");

	const decorators = node.decorators || [];
	node.decorators = null;

	const before: (t.ExpressionStatement | t.VariableDeclaration | t.ExportNamedDeclaration)[] = [];
	const after: t.Statement[] = [];

	let classNameId = path.scope.generateUid("className");
	before.push(t.variableDeclaration("let", [
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
			if(!member.static) {
				if(member.computed) {
					member_decorators_id = path.scope.generateUid("member_decorators");
					member_initializers_id = path.scope.generateUid("member_initializers");
					member_extraInitializers_id = path.scope.generateUid("member_extraInitializers");
				} else if(t.isIdentifier(member.key)) {
					let key: t.Identifier = member.key;
					member_decorators_id = path.scope.generateUid(key.name + "_decorators");
					member_initializers_id = path.scope.generateUid(key.name + "_initializers");
					member_extraInitializers_id = path.scope.generateUid(key.name + "_extraInitializers");
				} else {
					console.error(member.key);
				}
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
				[t.nullLiteral()]
			))
		]));
	} node.body.body.forEach((member, index, array) => {
		let member_decorators_id: string = member_decorators_ids[index];
		let member_initializers_id: string = member_initializers_ids[index];
		let member_extraInitializers_id: string = member_extraInitializers_ids[index];
		if(t.isClassProperty(member)) {
			if(!member.static) {
				let key: t.Identifier;
				let keyAttr: t.StringLiteral;
				if(member.computed) {
					key = t.identifier("_a");
				} else if(t.isIdentifier(member.key)) {
					key = t.cloneNode(member.key);
					keyAttr = t.stringLiteral(member.key.name);
				} else {
					console.error(member.key);
				}
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
									member.computed ?
										t.objectExpression([
											t.objectProperty(
												t.identifier("has"),
												t.arrowFunctionExpression([t.identifier("obj")], t.binaryExpression("in", key, t.identifier("obj")))
											),
											t.objectProperty(
												t.identifier("get"),
												t.arrowFunctionExpression([t.identifier("obj")], t.memberExpression(t.identifier("obj"), key, true))
											),
											t.objectProperty(
												t.identifier("set"),
												t.arrowFunctionExpression([t.identifier("obj"), t.identifier("value")], t.blockStatement([
													t.expressionStatement(
														t.assignmentExpression("=", t.memberExpression(t.identifier("obj"), key, true), t.identifier("value"))
													)
												]))
											)
										]) :
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
	node.body.body.unshift(
		t.staticBlock(after)
	);
	return before;
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