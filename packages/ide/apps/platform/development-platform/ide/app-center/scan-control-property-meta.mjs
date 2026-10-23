/**
 * 扫描 `@farris/ui-vue` 组件源码，导出「控件类型 → 属性清单」静态 JSON。
 *
 * 用途：app-center「自定义组件」页签的属性可见性配置需要「控件类型 → 属性清单」作为可选项来源。
 * 运行时拿不到（属性配置类依赖 designerHostService），因此改为**离线静态扫描**：
 *   - 逐组件读取 `src/property-config/<组件>.property-config.{ts,tsx,json}`（json 直接读，ts 走 AST）
 *   - 沿 `extends` 链合并基类（property-panel/src/composition/entity/*）里的公共分类与属性
 *   - 属性路径按设计器运行时同一套规则生成：
 *       `分类.parentPropertyID + 属性.parentPropertyID + 属性ID`
 *     （「外观」分类下未显式声明 parentPropertyID 的 class/style 补 `appearance.`）
 *     规则出处：packages/designer/src/components/composition/designer-context/use-pc-rtc-designer-context.ts
 *
 * 产出的 JSON 结构与页面 `PropertyMetaControl` 一致（`{ generatedAt, source, stats, controls }`），
 * 可直接被 app-center 解析（`importPropertyMeta` 读取 `controls`）。
 *
 * ⚠️ 静态扫描得到的是**超集**：源码里按条件显隐的属性（`visible: propertyData.xxxx===...`）也会被列出，
 *    对「黑名单」语义无害（隐藏一个本来不出现的属性没有副作用），但会包含少量实际不出现的条目。
 *
 * 用法：
 *   node apps/platform/development-platform/ide/app-center/scan-control-property-meta.mjs
 *   node .../scan-control-property-meta.mjs --ui-vue <ui-vue/components 目录> --toolbox <pc-toolbox.json> --out <输出文件>
 *   node .../scan-control-property-meta.mjs --debug input-group     # 只看某个类型的扫描结果
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** 仓库根：app-center → ide → development-platform → platform → apps → ide → packages → 仓库根 */
const REPO_ROOT = path.resolve(HERE, '../../../../../../..');

/** 默认路径：ui-vue 组件源码在另一个仓库，放在系统里的固定位置；可用 --ui-vue 覆盖 */
const DEFAULT_UI_VUE = 'E:/codes/GSPCloud/rtc-farris-vue/farris-vue/packages/ui-vue/components';
/** 工具箱清单：决定要扫描哪些控件类型 */
const DEFAULT_TOOLBOX = path.join(REPO_ROOT, 'packages/designer/src/components/types/toolbox/pc-toolbox.json');
/** 产物默认落在 IDE 应用目录（部署后即 /apps/platform/development-platform/ide/，同源可直接 fetch） */
const DEFAULT_OUT = path.resolve(HERE, '../control-property-meta.json');

/** 工具箱类型与属性配置文件名的差异（文件名基名 → 实际文件名基名） */
const TYPE_ALIAS = {
    'check-box': 'checkbox',
    'check-group': 'checkbox-group'
};

/** 额外的独立属性面板类型（不是工具箱条目，但黑名单 key 支持） */
const EXTRA_TYPES = [{ type: 'data-grid-column', name: '表格列' }];

/**
 * 解析深度上限。属性配置常见「分类 → 方法 → 方法内 const → 属性对象 → 属性值」的多层间接，
 * 层级很容易到 8 层，这里给足余量（仅作防御，AST 本身有限）。
 */
const MAX_DEPTH = 24;

function parseArgs(argv) {
    const args = { uiVue: DEFAULT_UI_VUE, toolbox: DEFAULT_TOOLBOX, out: DEFAULT_OUT, debug: '' };
    for (let i = 2; i < argv.length; i++) {
        const key = argv[i];
        const value = argv[i + 1];
        if (key === '--ui-vue') args.uiVue = value, i++;
        else if (key === '--toolbox') args.toolbox = value, i++;
        else if (key === '--out') args.out = value, i++;
        else if (key === '--debug') args.debug = value, i++;
        else if (key === '--help' || key === '-h') args.help = true;
    }
    return args;
}

/* ------------------------------------------------------------------ *
 * 文件工具
 * ------------------------------------------------------------------ */

function walkFiles(dir, matcher, files = []) {
    if (!fs.existsSync(dir)) {
        return files;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== 'dist') {
                walkFiles(full, matcher, files);
            }
        } else if (matcher(full)) {
            files.push(full);
        }
    }
    return files;
}

const isPropertyConfigFile = (file) => /\.property-config\.(ts|tsx|json)$/.test(file);
const isSourceFile = (file) => /\.(ts|tsx)$/.test(file);

const sourceCache = new Map();
function getSourceFile(file) {
    if (!sourceCache.has(file)) {
        const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
        sourceCache.set(file, ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, kind));
    }
    return sourceCache.get(file);
}

/* ------------------------------------------------------------------ *
 * AST 取值：把表达式解析成普通 JS 值（只认字面量、同文件常量、this.<方法> 的返回）
 * ------------------------------------------------------------------ */

/** 类索引：类名 → { file, node, extendsName } */
const classIndex = new Map();

/** 函数索引：hook 工厂名（useXxx）→ { file, node } */
const functionIndex = new Map();

function buildFunctionIndex(sourceFile, file) {
    const register = (name, node) => {
        if (name && !functionIndex.has(name)) {
            functionIndex.set(name, { file, node });
        }
    };
    const visit = (node) => {
        if (ts.isFunctionDeclaration(node) && node.name) {
            register(node.name.text, node);
        }
        if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (
                    ts.isIdentifier(declaration.name) &&
                    declaration.initializer &&
                    (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
                ) {
                    register(declaration.name.text, declaration.initializer);
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
}

function buildClassIndex(sourceFile, file) {
    const visit = (node) => {
        if (ts.isClassDeclaration(node) && node.name) {
            const heritage = node.heritageClauses?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword);
            classIndex.set(node.name.text, {
                file,
                node,
                extendsName: heritage?.types?.[0]?.expression?.getText()
            });
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
}

/** 在类（含基类链，子类在前）里找方法 */
function findMethods(className, methodName) {
    const found = [];
    let current = classIndex.get(className);
    let guard = 0;
    while (current && guard++ < 10) {
        for (const member of current.node.members) {
            if (ts.isMethodDeclaration(member) && member.name?.getText() === methodName) {
                found.push({ method: member, file: current.file });
            }
        }
        current = current.extendsName ? classIndex.get(current.extendsName) : undefined;
    }
    return found;
}

/** 从当前类的上一级基类开始找方法（super.xxx 调用） */
function findMethodsFromBase(ctx, methodName) {
    const chain = classChain(ctx.rootClass || ctx.className);
    const currentIndex = chain.findIndex((item) => item.name === ctx.className);
    const start = currentIndex >= 0 ? currentIndex + 1 : 1;
    const found = [];
    for (let index = start; index < chain.length; index++) {
        for (const member of chain[index].node.members) {
            if (ts.isMethodDeclaration(member) && member.name?.getText() === methodName) {
                found.push({ method: member, file: chain[index].file });
            }
        }
    }
    return found;
}

/** 类链（子类在前） */
function classChain(className) {
    const chain = [];
    let current = classIndex.get(className);
    let guard = 0;
    while (current && guard++ < 10) {
        chain.push({ name: className, ...current });
        className = current.extendsName;
        current = className ? classIndex.get(className) : undefined;
    }
    return chain;
}

/**
 * 标识符取值：先在所在函数/方法体里找同名 const/let（如 `const basicProperties = {...}`），
 * 再退回文件级 const。
 */
function resolveIdentifier(identifier, ctx, depth) {
    const name = identifier.text;

    // 所在函数/方法体内查找
    let scope = identifier.parent;
    while (scope && !ts.isSourceFile(scope)) {
        if (ts.isMethodDeclaration(scope) || ts.isFunctionDeclaration(scope) || ts.isFunctionExpression(scope) || ts.isArrowFunction(scope)) {
            const found = findVariableInSubtree(scope, name);
            if (found) {
                return found;
            }
            break;
        }
        scope = scope.parent;
    }

    // 文件级 const
    const topLevel = findVariableInSubtree(ctx.sourceFile, name, true);
    if (topLevel) {
        return topLevel;
    }
    return null;
}

/** 所在的「作用域」节点：最近的函数/方法/箭头函数，找不到则退回 SourceFile */
function findScopeNode(node) {
    let scope = node.parent;
    while (scope && !ts.isSourceFile(scope)) {
        if (
            ts.isMethodDeclaration(scope) ||
            ts.isFunctionDeclaration(scope) ||
            ts.isFunctionExpression(scope) ||
            ts.isArrowFunction(scope)
        ) {
            return scope;
        }
        scope = scope.parent;
    }
    return scope;
}

/**
 * 解构绑定取值：`const { dataSourceEditor, idFieldEditor: alias } = getXxx(editorOptions)`。
 * 先在作用域里把初始化的对象解析出来，再取被绑定属性的值；取不到返回 null。
 * 这类写法在 ui-vue 的属性配置里很常见（编辑器属性大多来自同目录的 helper 函数）。
 */
function resolveDestructuredBinding(identifier, ctx, depth) {
    const scope = findScopeNode(identifier);
    if (!scope) {
        return null;
    }
    let result = null;
    const visit = (node) => {
        if (result || !ts.isVariableDeclaration(node) || !node.initializer || !ts.isObjectBindingPattern(node.name)) {
            if (!result) {
                ts.forEachChild(node, visit);
            }
            return;
        }
        for (const element of node.name.elements) {
            const localName = ts.isIdentifier(element.name) ? element.name.text : '';
            if (localName !== identifier.text) {
                continue;
            }
            const propName = element.propertyName
                ? element.propertyName.getText(ctx.sourceFile).replace(/^["']|["']$/g, '')
                : localName;
            const source = resolveValue(node.initializer, ctx, depth + 1);
            if (source && typeof source === 'object' && Object.prototype.hasOwnProperty.call(source, propName)) {
                result = source[propName];
            }
            return;
        }
        ts.forEachChild(node, visit);
    };
    visit(scope);
    return result;
}

/** 在节点子树里找同名且有初始值的变量声明 */
function findVariableInSubtree(root, name, topLevelOnly = false) {
    let found = null;
    const visit = (node) => {
        if (found) {
            return;
        }
        if (ts.isVariableDeclaration(node) && node.name?.getText() === name && node.initializer) {
            found = node.initializer;
            return;
        }
        ts.forEachChild(node, visit);
    };
    if (topLevelOnly) {
        for (const statement of root.statements || []) {
            if (ts.isVariableStatement(statement)) {
                visit(statement);
            }
        }
    } else {
        visit(root);
    }
    return found;
}

/**
 * 解析表达式 → 普通 JS 值。
 * 支持：对象字面量（含展开）、标识符（同文件常量）、this.<方法>()、Object.assign(a, b)。
 * 解析不出来的节点返回 null，由调用方按“缺失”处理。
 */
function resolveValue(expr, ctx, depth = 0) {
    if (!expr || depth > MAX_DEPTH) {
        return null;
    }
    if (ts.isParenthesizedExpression(expr)) {
        return resolveValue(expr.expression, ctx, depth + 1);
    }
    // 标量字面量：title / parentPropertyID 等都靠它
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
        return expr.text;
    }
    if (ts.isNumericLiteral(expr)) {
        return Number(expr.text);
    }
    if (expr.kind === ts.SyntaxKind.TrueKeyword) {
        return true;
    }
    if (expr.kind === ts.SyntaxKind.FalseKeyword) {
        return false;
    }
    if (ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr) || ts.isNonNullExpression(expr)) {
        return resolveValue(expr.expression, ctx, depth + 1);
    }
    if (ts.isObjectLiteralExpression(expr)) {
        return resolveObjectLiteral(expr, ctx, depth + 1);
    }
    if (ts.isIdentifier(expr)) {
        const initializer = resolveIdentifier(expr, ctx, depth);
        if (initializer) {
            return resolveValue(initializer, ctx, depth + 1);
        }
        // 解构绑定：`const { dataSourceEditor, idFieldEditor: alias } = getXxx(...)`
        return resolveDestructuredBinding(expr, ctx, depth);
    }
    // 属性访问（如 basicConfig.properties、super 调用结果的字段取值）
    if (ts.isPropertyAccessExpression(expr)) {
        const objectValue = resolveValue(expr.expression, ctx, depth + 1);
        if (objectValue && typeof objectValue === 'object') {
            const key = expr.name.getText(ctx.sourceFile);
            return Object.prototype.hasOwnProperty.call(objectValue, key) ? objectValue[key] : null;
        }
        return null;
    }
    if (ts.isCallExpression(expr)) {
        const callee = expr.expression.getText(ctx.sourceFile);
        if (callee === 'Object.assign') {
            const merged = {};
            for (const arg of expr.arguments) {
                const value = resolveValue(arg, ctx, depth + 1);
                if (value && typeof value === 'object') {
                    Object.assign(merged, value);
                }
            }
            return merged;
        }
        // 直接调用已索引的普通函数（模块级 function / const 箭头函数）：
        // 如 lookup 的 `getPageConfig(editorOptions) { return getLookupPaginationProperties(editorOptions); }`
        if (ts.isIdentifier(expr.expression)) {
            const fn = functionIndex.get(expr.expression.text);
            if (fn) {
                const fnCtx = { ...ctx, sourceFile: getSourceFile(fn.file), file: fn.file };
                const resolved = resolveFunctionLike(fn.node, fnCtx, depth + 1);
                if (resolved) {
                    return resolved;
                }
            }
        }
        // 支持 this.xxx(...)、this['xxx'](...) 以及 `const self = this; self.xxx()` 三种写法
        const methodName = resolveThisMethodName(expr, ctx);
        // useXxx().getYyy(...)：从 hook 工厂里取方法
        if (ts.isPropertyAccessExpression(expr.expression) && ts.isCallExpression(expr.expression.expression)) {
            const factoryCall = expr.expression.expression;
            const factoryName = factoryCall.expression.getText(ctx.sourceFile);
            const factory = functionIndex.get(factoryName);
            if (factory) {
                const factoryCtx = { ...ctx, sourceFile: getSourceFile(factory.file), file: factory.file };
                const resolved = resolveFactoryMethod(
                    factory.node,
                    expr.expression.name.getText(ctx.sourceFile),
                    factoryCtx,
                    depth + 1
                );
                if (resolved) {
                    return resolved;
                }
            }
        }
        if (methodName) {
            const isSuper = methodName.startsWith('super:');
            const realName = isSuper ? methodName.slice(6) : methodName;
            // 注意：赋值语句可能写在基类里（如 categories['editor'] = this.getEditorProperties(...)），
            // 但方法调用要按**实际控件类型**就近覆盖解析，否则会取到基类实现而漏掉子类传参；
            // super.xxx 则要从当前类的上一级基类开始找。
            const methods = isSuper ? findMethodsFromBase(ctx, realName) : findMethods(ctx.rootClass || ctx.className, realName);
            if (methods.length) {
                // 就近覆盖：同名方法只取最派生的一处实现（findMethods 已按子类在前排序）
                const { method, file } = methods[0];
                const merged =
                    resolveMethodReturn(method, { ...ctx, sourceFile: getSourceFile(file), file }, depth + 1) || {};
                // getComponentConfig(propertyData, info, properties) 的入参约定：
                // 第 2 个是分类元信息（type 等），第 3 个是「组件自有的编辑器属性」，
                // 运行时会把第 3 个合并进「编辑器」分类，这里同样合并进来。
                if (methodName === 'getComponentConfig' && expr.arguments.length >= 3) {
                    const extraProperties = resolveValue(expr.arguments[2], ctx, depth + 1);
                    if (extraProperties && typeof extraProperties === 'object') {
                        merged.properties = { ...(merged.properties || {}), ...extraProperties };
                    }
                }
                return merged;
            }
        }
    }
    return null;
}

/** 取 this 方法调用的方法名（支持 this.x / this['x'] / `const self = this` 的 self.x / super.x） */
function resolveThisMethodName(expr, ctx) {
    const callee = expr.expression;
    // super.xxx：从当前类的上一级基类开始找
    if (ts.isPropertyAccessExpression(callee) && callee.expression.kind === ts.SyntaxKind.SuperKeyword) {
        return `super:${callee.name.getText(ctx.sourceFile)}`;
    }
    const isThisLike = (node) => ts.isThis(node) || (ts.isIdentifier(node) && isThisAlias(node, ctx));
    if (ts.isPropertyAccessExpression(callee)) {
        return isThisLike(callee.expression) ? callee.name.getText(ctx.sourceFile) : '';
    }
    if (ts.isElementAccessExpression(callee)) {
        const argument = callee.argumentExpression;
        if (isThisLike(callee.expression) && argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
            return argument.text;
        }
    }
    return '';
}

/** 判断标识符是不是 `const self = this` 这类 this 别名 */
function isThisAlias(identifier, ctx) {
    let scope = identifier.parent;
    while (scope && !ts.isSourceFile(scope)) {
        if (ts.isMethodDeclaration(scope) || ts.isFunctionDeclaration(scope) || ts.isArrowFunction(scope) || ts.isFunctionExpression(scope)) {
            const initializer = findVariableInSubtree(scope, identifier.text);
            return initializer ? initializer.kind === ts.SyntaxKind.ThisKeyword : false;
        }
        scope = scope.parent;
    }
    return false;
}

/** 解析方法体里的 return 表达式（多个 return 合并） */
function resolveMethodReturn(method, ctx, depth) {
    if (!method.body || depth > MAX_DEPTH) {
        return null;
    }
    return resolveReturnsIn(method.body, ctx, depth);
}

/** 遍历节点里的 return 表达式并合并结果 */
function resolveReturnsIn(root, ctx, depth) {
    const merged = {};
    let found = false;
    const visit = (node) => {
        if (ts.isReturnStatement(node) && node.expression) {
            const value = resolveValue(node.expression, ctx, depth + 1);
            if (value && typeof value === 'object') {
                found = true;
                Object.assign(merged, value);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(root);
    return found ? merged : null;
}

/** 解析箭头函数 / 函数表达式 */
function resolveFunctionLike(fnNode, ctx, depth) {
    if (ts.isArrowFunction(fnNode) && !ts.isBlock(fnNode.body)) {
        return resolveValue(fnNode.body, ctx, depth + 1);
    }
    const body = fnNode.body;
    return body ? resolveReturnsIn(body, ctx, depth + 1) : null;
}

/**
 * 解析 `useXxx().getYyy(...)` 这类 hook 工厂里的方法。
 * 这些工厂（如 data-view/designer/property-config/use-column-option.ts）返回一个对象，
 * 对象上挂着构建属性配置的方法，这里按名字定位该方法并解析它的返回。
 */
function resolveFactoryMethod(factoryNode, methodName, ctx, depth) {
    let result = null;
    const visit = (node) => {
        if (result) {
            return;
        }
        // 工厂内声明的嵌套函数（`function getXxx() {...}` + `return { getXxx }` 的简写）
        if (ts.isFunctionDeclaration(node) && node.name && node.name.getText(ctx.sourceFile) === methodName) {
            result = resolveMethodReturn(node, ctx, depth + 1);
            return;
        }
        // 返回对象里直接写成属性（`getXxx: () => {...}`）
        if (ts.isPropertyAssignment(node) && node.name && node.name.getText(ctx.sourceFile) === methodName) {
            const initializer = node.initializer;
            result =
                ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)
                    ? resolveFunctionLike(initializer, ctx, depth + 1)
                    : resolveValue(initializer, ctx, depth + 1);
        }
        ts.forEachChild(node, visit);
    };
    visit(factoryNode);
    return result;
}

/** 对象字面量 → 普通对象（展开语法会合并进来） */
function resolveObjectLiteral(node, ctx, depth) {
    const result = {};
    for (const property of node.properties) {
        if (ts.isSpreadAssignment(property)) {
            const spread = resolveValue(property.expression, ctx, depth + 1);
            if (spread && typeof spread === 'object') {
                Object.assign(result, spread);
            }
            continue;
        }
        const key = property.name ? property.name.getText(ctx.sourceFile).replace(/^["']|["']$/g, '') : '';
        if (!key) {
            continue;
        }
        if (ts.isShorthandPropertyAssignment(property)) {
            // 形如 `categories = { basic, appearance }`：按标识符继续解析
            result[key] = resolveValue(property.name, ctx, depth + 1);
            continue;
        }
        const value = property.initializer ? resolveValue(property.initializer, ctx, depth + 1) : null;
        if (key === 'properties' && value && typeof value === 'object') {
            result.properties = { ...(result.properties || {}), ...value };
        } else {
            result[key] = value;
        }
    }
    return result;
}

/** 字符串字面量取值 */
function stringValue(value) {
    return typeof value === 'string' ? value : '';
}

/* ------------------------------------------------------------------ *
 * 分类与属性提取
 * ------------------------------------------------------------------ */

/**
 * 收集一个控件类型的分类配置。
 * 沿类链「基类在前」收集 `this.propertyConfig.categories['x'] = <expr>`，子类同名覆盖。
 */
function collectCategories(className) {
    const categories = new Map();
    const warnings = [];
    const chain = classChain(className).reverse(); // 基类在前

    for (const { name, node, file } of chain) {
        // rootClass：实际扫描的控件类型，方法就近覆盖以它为准
        const ctx = { className: name, rootClass: className, sourceFile: getSourceFile(file), file };
        for (const member of node.members) {
            if (!ts.isMethodDeclaration(member) || !member.body) {
                continue;
            }
            const visit = (current) => {
                // this.propertyConfig.categories['<key>'] = <expr>
                if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                    const left = current.left;
                    const key = readCategoriesIndexKey(left, ctx);
                    if (key) {
                        const resolved = resolveValue(current.right, ctx);
                        if (resolved && typeof resolved === 'object') {
                            categories.set(key, { id: key, config: resolved, from: `${name}.${member.name?.getText()}` });
                        } else {
                            warnings.push(`${className}: categories['${key}'] 解析不出字面量（${name}.${member.name?.getText()}）`);
                        }
                    }
                    // this.propertyConfig.categories = { ... }
                    if (isCategoriesSelfAssignment(left, ctx)) {
                        const resolved = resolveValue(current.right, ctx);
                        if (resolved && typeof resolved === 'object') {
                            Object.entries(resolved).forEach(([childKey, childConfig]) => {
                                if (childConfig && typeof childConfig === 'object') {
                                    categories.set(childKey, { id: childKey, config: childConfig, from: `${name}.${member.name?.getText()}` });
                                }
                            });
                        }
                    }
                }
                ts.forEachChild(current, visit);
            };
            visit(member.body);

            // 新版写法：方法直接 `return { type, categories: {...} }`（如 LookupPropertyConfig.getPropertyConfig），
            // 不再走 `this.propertyConfig.categories['x'] = ...` 的赋值式；两种都收集，按 key 合并（子类覆盖基类）。
            const returned = resolveMethodReturn(member, ctx);
            const returnedCategories =
                returned && returned.categories && typeof returned.categories === 'object' ? returned.categories : null;
            if (returnedCategories) {
                // 方法「返回的分类对象」就是运行时属性面板真正的分类表，因此以它为准：
                // 先清掉基类赋值式收集到的 key，避免同一个控件出现两套分类（如 lookup 的 editor / lookup 重复）。
                // 说明：子类重写了 getPropertyConfig，基类那份赋值式代码在运行时根本不会执行，
                // 所以这里连同之前收集到的告警一起丢弃，避免误报。
                categories.clear();
                warnings.length = 0;
                for (const [childKey, childConfig] of Object.entries(returnedCategories)) {
                    if (childConfig && typeof childConfig === 'object') {
                        categories.set(childKey, {
                            id: childKey,
                            config: childConfig,
                            from: `${name}.${member.name?.getText()} → return.categories`
                        });
                    }
                }
            }
        }
    }

    return { categories, warnings };
}

/** 判断左值是不是 this.propertyConfig.categories['key']，是则返回 key */
function readCategoriesIndexKey(left, ctx) {
    if (!ts.isElementAccessExpression(left)) {
        return '';
    }
    const text = left.expression.getText(ctx.sourceFile);
    if (!/categories$/.test(text)) {
        return '';
    }
    const arg = left.argumentExpression;
    if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
        return arg.text;
    }
    return '';
}

/** 判断左值是不是 this.propertyConfig.categories（整体赋值） */
function isCategoriesSelfAssignment(left, ctx) {
    return ts.isPropertyAccessExpression(left) && left.getText(ctx.sourceFile).endsWith('propertyConfig.categories');
}

/**
 * 属性树展平：按运行时路径规则生成 path。
 * - 分类：分类.parentPropertyID 作为前缀
 * - 属性：属性.parentPropertyID 作为前缀；「外观」分类下未声明父级的 class/style 补 appearance.
 * - 级联子属性：以父属性路径为前缀展开
 */
function flattenProperties(categoryConfig, categoryId) {
    const list = [];
    const categoryParent = stringValue(categoryConfig.parentPropertyID);
    const properties = categoryConfig.properties;

    const walk = (source, parentPath, pathPrefix) => {
        if (!source || typeof source !== 'object') {
            return;
        }
        for (const [id, rawConfig] of Object.entries(source)) {
            const config = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
            // 源码里显式 `visible: false` 的属性（如 check-box 的 placeholder/disabled）在真实面板里不出现，跳过
            if (config.visible === false) {
                continue;
            }
            let propertyPrefix = stringValue(config.parentPropertyID) ? `${config.parentPropertyID}.` : '';
            if (
                ['class', 'style'].includes(id) &&
                !stringValue(config.parentPropertyID) &&
                String(categoryId).toLowerCase() === 'appearance'
            ) {
                propertyPrefix = 'appearance.';
            }
            const currentPath = `${pathPrefix}${propertyPrefix}${id}`;
            list.push({ id, title: stringValue(config.title), path: currentPath });
            if (config.properties && typeof config.properties === 'object') {
                // 级联子属性：以父属性路径为前缀继续展开
                walk(config.properties, currentPath, `${parentPath}${currentPath}.`);
            }
        }
    };

    walk(properties, '', categoryParent ? `${categoryParent}.` : '');
    return list;
}

/* ------------------------------------------------------------------ *
 * 单个控件类型
 * ------------------------------------------------------------------ */

function readControlFromJson(file) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const categories = [];
    const categoryMap = raw.categories && typeof raw.categories === 'object' ? raw.categories : {};
    for (const [categoryId, categoryConfig] of Object.entries(categoryMap)) {
        const config = categoryConfig && typeof categoryConfig === 'object' ? categoryConfig : {};
        categories.push({
            id: categoryId,
            name: stringValue(config.title),
            properties: flattenProperties(config, categoryId)
        });
    }
    return { categories, warnings: [] };
}

function readControlFromSource(file) {
    // 取该文件里「组件自己的属性配置类」：
    // 优先带 getPropertyConfig 的，其次带 getEditorProperties 的，再次名字以 Property 结尾的最后一个类。
    const classesInFile = [];
    for (const [className, info] of classIndex) {
        if (path.resolve(info.file) === path.resolve(file)) {
            classesInFile.push({ className, ...info });
        }
    }
    const hasMethod = (info, name) =>
        info.node.members.some((member) => ts.isMethodDeclaration(member) && member.name?.getText() === name);
    const target =
        classesInFile.find((info) => hasMethod(info, 'getPropertyConfig'))?.className ||
        classesInFile.find((info) => hasMethod(info, 'getEditorProperties'))?.className ||
        classesInFile.filter((info) => /Property$/.test(info.className)).pop()?.className ||
        classesInFile.pop()?.className;
    if (!target) {
        return { categories: [], warnings: [`${path.basename(file)}: 未找到属性配置类`] };
    }
    const sourceFile = getSourceFile(file);

    const { categories, warnings } = collectCategories(target);
    const result = [];
    for (const { id, config } of categories.values()) {
        const properties = flattenProperties(config, id);
        if (!properties.length) {
            continue;
        }
        result.push({ id, name: stringValue(config.title) || id, properties, raw: config });
    }
    // 同一分类可能被多处赋值（如 Grid 上下文与普通上下文），只要最终有内容就不必再报未解析
    const resolvedIds = new Set(result.map((category) => category.id));
    return {
        categories: result,
        warnings: warnings.filter((message) => {
            const matched = /categories\['([^']+)'\]/.exec(message);
            return !(matched && resolvedIds.has(matched[1]));
        })
    };
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        console.log('用法：node scan-control-property-meta.mjs [--ui-vue <目录>] [--toolbox <文件>] [--out <文件>] [--debug <类型>]');
        return;
    }
    if (!fs.existsSync(args.uiVue)) {
        console.error(`✗ 找不到 ui-vue 组件源码目录：${args.uiVue}\n  用 --ui-vue 指定（应指向 @farris/ui-vue/components）`);
        process.exit(1);
    }

    // 1. 索引源码：属性配置文件 + 类定义（含 property-panel 的基类）
    const propertyConfigFiles = walkFiles(args.uiVue, isPropertyConfigFile);
    const byBasename = new Map();
    for (const file of propertyConfigFiles) {
        const base = path.basename(file).replace(/\.property-config\.(ts|tsx|json)$/, '');
        if (!byBasename.has(base)) {
            byBasename.set(base, file);
        }
    }
    const classSourceFiles = propertyConfigFiles.filter(isSourceFile);
    const entityDir = path.join(args.uiVue, 'property-panel/src/composition/entity');
    const entityFiles = walkFiles(entityDir, isSourceFile);
    for (const file of [...classSourceFiles, ...entityFiles]) {
        buildClassIndex(getSourceFile(file), file);
    }
    // hook 工厂（useColumnOption / useSummary 之类）散在 property-config 目录下的普通 ts 文件里
    const hookFiles = walkFiles(args.uiVue, (file) => isSourceFile(file) && /[\\/]property-config[\\/]/.test(file));
    for (const file of hookFiles) {
        const sourceFile = getSourceFile(file);
        buildClassIndex(sourceFile, file);
        buildFunctionIndex(sourceFile, file);
    }

    // 2. 工具箱类型
    const toolbox = JSON.parse(fs.readFileSync(args.toolbox, 'utf8'));
    const types = [];
    const nameByType = new Map();
    for (const group of toolbox) {
        for (const item of group.items || []) {
            if (!nameByType.has(item.type)) {
                nameByType.set(item.type, item.name);
                types.push(item.type);
            }
        }
    }
    for (const extra of EXTRA_TYPES) {
        if (!nameByType.has(extra.type)) {
            nameByType.set(extra.type, extra.name);
            types.push(extra.type);
        }
    }

    // 3. 逐个扫描
    const controls = [];
    const warnings = [];
    const unresolved = [];
    for (const type of types) {
        // 先按类型名找同名文件，再按别名兜底（如 check-box → checkbox）
        const file = byBasename.get(type) || byBasename.get(TYPE_ALIAS[type]);
        if (!file) {
            unresolved.push(type);
            continue;
        }
        const { categories, warnings: controlWarnings } = file.endsWith('.json')
            ? readControlFromJson(file)
            : readControlFromSource(file);
        warnings.push(...controlWarnings.map((message) => `[${type}] ${message}`));

        if (args.debug && args.debug === type) {
            console.log(`\n=== ${type}（${file}）===`);
            for (const category of categories) {
                console.log(`  [${category.id}] ${category.name}  共 ${category.properties.length} 个属性`);
                for (const property of category.properties) {
                    console.log(`      ${property.path}  |  ${property.title}`);
                }
                if (category.raw) {
                    console.log(`      raw: ${JSON.stringify(category.raw).slice(0, 600)}`);
                }
            }
        }

        if (!categories.length) {
            unresolved.push(type);
            continue;
        }
        controls.push({
            type,
            name: nameByType.get(type) || type,
            // raw 只用于 --debug 观察，不落盘
            categories: categories
                .sort((left, right) => left.id.localeCompare(right.id))
                .map(({ id, name: categoryName, properties }) => ({ id, name: categoryName, properties }))
        });
    }

    const propertyCount = controls.reduce(
        (sum, control) => sum + control.categories.reduce((inner, category) => inner + category.properties.length, 0),
        0
    );

    // 4. 落盘
    const result = {
        generatedAt: new Date().toISOString(),
        source: {
            uiVue: args.uiVue,
            toolbox: args.toolbox,
            scanner: 'app-center/scan-control-property-meta.mjs',
            note: '静态扫描产物，是运行时属性面板的「超集」；属性路径与设计器过滤规则一致'
        },
        stats: {
            toolboxTypes: types.length,
            resolvedTypes: controls.length,
            unresolvedTypes: unresolved,
            propertyCount,
            warnings
        },
        controls
    };
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

    if (!args.debug) {
        console.log(`✓ 已扫描 ${types.length} 个控件类型，成功 ${controls.length} 个，属性合计 ${propertyCount} 条`);
        if (unresolved.length) {
            console.log(`  未解析：${unresolved.join(', ')}`);
        }
        const shown = warnings.slice(0, 8);
        shown.forEach((message) => console.log(`  ⚠ ${message}`));
        if (warnings.length > shown.length) {
            console.log(`  ⚠ 其余 ${warnings.length - shown.length} 条告警见产物 stats.warnings`);
        }
        console.log(`  产物：${args.out}`);
    } else {
        console.log(`\n产物：${args.out}`);
    }
}

main();
