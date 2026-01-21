import * as babelParser from '@babel/parser';
import {
    ImportDeclaration, ClassDeclaration, ExportNamedDeclaration, ExportDefaultDeclaration, Decorator, File,
    ClassMethod, Node, CommentBlock, CommentLine, ExportSpecifier, ExportNamespaceSpecifier, ExportDefaultSpecifier
} from "@babel/types";
import { IClassDeclaration, IMethodDeclaration, IParamDeclaration, CodeAnalysisResult } from '../libs/interfaces/declaration';
import { IItemLocation, IPosition, ILocation } from '../libs/interfaces/location';
import { MethodComment, ClassComment } from './comment-parser';

const ImportDeclarationType = "ImportDeclaration";
const ClassDeclarationType = "ClassDeclaration";
const ClassMethodType = "ClassMethod";
const CommentBlockType = "CommentBlock";

function EmptyPosition(): IPosition {
    return { index: -1, line: -1, column: -1 };
}

function EmptyLocation(): ILocation {
    return { start: EmptyPosition(), end: EmptyPosition() };
}

/**
 * 解析ts字符串
 * @param source ts源码
 * @param errorRecovery 是否忽略错误（在获取大纲信息时需要置为true）
 */
function ASTParser(source: string, errorRecovery: boolean = false): babelParser.ParseResult<File> {
    const strictMode: boolean = !errorRecovery;
    return babelParser.parse(source, {
        sourceType: 'module',
        errorRecovery,
        strictMode,
        plugins: ['typescript', ['decorators', { decoratorsBeforeExport: true }], 'classProperties', 'classPrivateProperties']
    });
}

function NodeFindLocation(node: Node, content?: string): IItemLocation {
    const empty = EmptyPosition();
    return {
        value: content && node.start != null && node.end != null ? content.substring(node.start, node.end) : "",
        location: {
            start: { ...empty, index: node.start || -1, ...(node.loc && node.loc.start) },
            end: { ...empty, index: node.end || -1, ...(node.loc && node.loc.end) }
        }
    };
}

/**
 * 完善描述位置信息
 * @remarks 根据字符在文档中的索引号计算行号（从1开始）和列号（从1开始）
 * @param allContent 整篇内容
 */
function CompletePosition(item: IPosition, content: string): IPosition {
    if (item.index === -1) {
        return item;
    }
    const _content = content.substring(0, item.index + 1);
    const array = _content.split("\n");
    item.line = array.length;
    item.column = (array.pop() || "").length;
    return item;
}

/**
 * 二分查找最近的注释
 * @param index 目标坐标，是类或方法的开始坐标
 * @param comments 注释节点数组
 * @remarks 搜索距离目标最近的注释节点
 * @returns 注释节点在数组中的下标，找不到则返回-1
 */
function findNearestComment(index: number, comments: Array<CommentBlock | CommentLine>): number {
    let minIndex = 0;
    let maxIndex = comments.length - 1;
    let middleIndex = 0;
    let testItem: CommentBlock | CommentLine | null = null;
    while (minIndex <= maxIndex) {
        middleIndex = Math.floor((minIndex + maxIndex) / 2);
        testItem = comments[middleIndex];
        if (testItem && testItem.end !== undefined && testItem.end < index) {
            minIndex = middleIndex + 1;
        } else if (testItem && testItem.end !== undefined && testItem.end > index) {
            maxIndex = middleIndex - 1;
        } else {
            return middleIndex;
        }
    }
    if (testItem && testItem.end !== undefined && testItem.end < index) {
        return middleIndex;
    }
    return middleIndex - 1;
}
/**
 * 查找类或方法的注释
 * @remarks 该方法是性能优化的重点
 * @param index 类、方法的起始位置
 * @param comments 当前注释列表
 * @param content 整段内容
 */
function FindComment(index: number, comments: Array<CommentBlock | CommentLine>, content: string): CommentBlock | CommentLine | undefined {
    const COMMENT_ALREADY_USED = "COMMENT_ALREADY_USED";
    if (index === -1 || comments.length === 0) {
        return undefined;  // 类或方法的起始位置未知，无法进行注释查找
    }
    const nearestIndex = findNearestComment(index, comments);
    if (nearestIndex < 0) {
        return undefined;
    }
    const commentItem = comments[nearestIndex];
    if (commentItem[COMMENT_ALREADY_USED] === true) {
        return undefined;
    }
    if (commentItem.end === undefined) {
        return undefined;
    }
    const middleString = content.substring(commentItem.end, index);
    if (!middleString.trim()) {
        commentItem[COMMENT_ALREADY_USED] = true;
        return commentItem;
    }
    return undefined;
}


/**
 * 参数语法描述转参数模型描述
 * @param param 参数语法描述
 * @param content 文档内容
 */
function ParameterToIParamDeclaration(param: Node, content: string): IParamDeclaration {
    const item = NodeFindLocation(param);
    if ((param as any).name) {
        item.value = (param as any).name || item.value;
    }
    const { typeAnnotation } = param as any;
    const type = typeAnnotation && NodeFindLocation(typeAnnotation.typeAnnotation || typeAnnotation, content) || { value: "", location: EmptyLocation() };
    const model: IParamDeclaration = {
        code: { value: item.value, location: EmptyLocation() },  // param.name
        location: item.location,
        type: type.value,
    };
    // 直接通过tsdoc解析出来的参数注释字符串判断“参数是否缺少注释”，不获取注释的位置信息，避免使用正则表达式
    return model;
}

/**
 * 方法语法描述转方法模型
 * @param method 方法语法描述
 * @param comments 注释列表
 * @param content 文档内容（用来计算@param位置）
 */
function ClassMethodToIMethodDeclaration(method: ClassMethod, comments: Array<CommentBlock | CommentLine>, content: string): IMethodDeclaration {
    const returnType = method.returnType && NodeFindLocation(method.returnType, content) || { value: "", location: EmptyLocation() };
    returnType.value = returnType.value.replace(/\s*:\s*/g, "");
    const comment = FindComment(method.start || -1, comments, content);
    const context = MethodComment(comment && comment.value || "", true);
    const params = method.params.map(item => ParameterToIParamDeclaration(item, content));
    params.forEach(param => {
        const paramComment = (context.params || []).find(comment => param.code.value === comment.code);
        param.description = paramComment && paramComment.description || "";
    });
    return {
        code: {
            ...NodeFindLocation(<Node>method.key),
            value: (method as any).key.name,
        },
        name: context.name || '',
        description: context.description,
        returns: context.returns || "",
        comments: comment && comment.value || "",
        params,
        location: NodeFindLocation(method).location,
        type: returnType,
        kind: method.kind,
        accessibility: method.accessibility
    };
}

/**
 * 获取包含装饰符的类节点的起始位置
 * @param _class 类节点
 * @returns 类节点的起始位置
 */
function getClassIndex(_class: ClassDeclaration): number {
    if (!_class) {
        return -1;
    }
    if (!_class.decorators || _class.decorators.length === 0) {
        return _class.start ?? -1;
    }
    let minIdx = Number.MAX_SAFE_INTEGER;
    for (const decorator of _class.decorators) {
        if (decorator.start !== null && decorator.start !== undefined && decorator.start < minIdx) {
            minIdx = decorator.start;
        }
    }
    return minIdx === Number.MAX_SAFE_INTEGER ? (_class.start ?? -1) : minIdx;
}
/**
 * 类语法描述转方法模型
 * @param _class 类语法描述
 * @param comments 注释列表
 * @param content 文档内容（用来计算@param位置）
 * @param exportedNodeIds 包含了所有的被导出的类的标识符
 */
function ClassDeclarationToIClassDeclaration(
    _class: ClassDeclaration,
    comments: Array<CommentBlock | CommentLine>,
    content: string,
    exportedNodeIds: string[]
): IClassDeclaration {
    const classStartIdx = getClassIndex(_class);
    const comment = FindComment(classStartIdx, comments, content);
    const context = ClassComment(comment && comment.value || "", true);
    if (!_class.id) {
        throw new Error("Class declaration must have an id");
    }
    const code = {
        ...NodeFindLocation(_class.id),
        value: _class.id.name,
    };
    const id = _class.id.name;
    const exported = exportedNodeIds.includes(id);
    return {
        code,
        exported,
        name: context.name || '',
        description: context.description,
        methods: _class.body.body.filter(
            item => item.type === ClassMethodType
        ).map(
            method => ClassMethodToIMethodDeclaration(<ClassMethod>method, comments, content)
        ),
        location: NodeFindLocation(_class).location
    };
}


/**
 * 返回ts文件结构树
 * @param tsContent ts文件内容
 */
export async function StructureTree(tsContent: string, errorRecovery: boolean = false): Promise<CodeAnalysisResult> {
    // 包含了所有被导出的类的标识
    const exportedNodeIds: string[] = [];
    let ast: babelParser.ParseResult<File> | null = null;
    try {
        ast = ASTParser(tsContent, errorRecovery);

        const classes = ast.program.body.reduce((list, item) => {

            // 遍历所有导出声明节点对应的导出节点的标识信息，用于接下来判断某一个类是否被导出
            if (item.type === "ExportNamedDeclaration" || item.type === "ExportDefaultDeclaration") {
                const exportNode = item as ExportNamedDeclaration | ExportDefaultDeclaration;
                // 仅考虑类声明
                if (exportNode.declaration && exportNode.declaration.type === ClassDeclarationType) {
                    const classNode = exportNode.declaration as ClassDeclaration;
                    if (classNode.id && classNode.id.name) {
                        exportedNodeIds.push(classNode.id.name);
                    }
                }
            }
            if (item.type === "ExportNamedDeclaration") {
                const exportNode = item as ExportNamedDeclaration;
                for (const spec of exportNode.specifiers) {
                    let id: string | null = null;
                    if (spec.type === "ExportSpecifier") {
                        id = (spec as ExportSpecifier).local.name;
                    } else if (spec.type === "ExportDefaultSpecifier") {
                        id = (spec as ExportDefaultSpecifier).exported.name;
                    } else if (spec.type === "ExportNamespaceSpecifier") {
                        id = (spec as ExportNamespaceSpecifier).exported.name;
                    }
                    if (id) {
                        exportedNodeIds.push(id);
                    }
                }
            }

            // 收集所有类声明节点
            let newClass: ClassDeclaration | null = null;
            if (item.type === ClassDeclarationType) {
                newClass = item as ClassDeclaration;
            }
            else if ((<any>item).declaration && (<any>item).declaration.type === ClassDeclarationType) {
                const _class = <ClassDeclaration>((<any>item).declaration);
                // 把export的起始位置信息设置给class，方便插入注释
                _class.start = item.start;
                _class.loc && item.loc && (_class.loc.start = item.loc.start);
                newClass = _class as ClassDeclaration;
            }
            if (newClass) {
                // 如果该类存在装饰器，则应该将装饰器的起始位置作为整个类的起始位置，方便插入注释
                if (newClass.decorators && newClass.decorators.length > 0) {
                    let firstDecorator: Decorator | null = null;
                    for (const decorator of newClass.decorators) {
                        if (!firstDecorator) {
                            firstDecorator = decorator;
                            continue;
                        }
                        if (decorator.start !== null && decorator.start !== undefined &&
                            firstDecorator.start !== null && firstDecorator.start !== undefined &&
                            decorator.start < firstDecorator.start) {
                            firstDecorator = decorator;
                        }
                    }
                    if (firstDecorator) {
                        newClass.start = firstDecorator.start ?? newClass.start;
                        newClass.loc && firstDecorator.loc && (newClass.loc.start = firstDecorator.loc.start);
                    }
                }
                list.push(newClass);
            }
            return list;
        }, <ClassDeclaration[]>[]);

        const blockComments = (ast.comments || []).filter(item => item.type === CommentBlockType);
        const structure = classes.map(_class => {
            return ClassDeclarationToIClassDeclaration(_class, blockComments, tsContent, exportedNodeIds);
        });
        return {
            hasFatalError: false,
            classes: structure,
            parseResult: ast
        };
    }
    catch (e) {
        return {
            hasFatalError: true,
            classes: [],
            parseResult: ast || undefined
        };
    }
}

/**
 * 返回ts文件import的资源列表
 */
export async function ImportResources(parseResult: babelParser.ParseResult<File>): Promise<string[]> {
    try {
        return parseResult.program.body.filter(item => item.type === ImportDeclarationType).map(item => (<ImportDeclaration>item).source.value);
    }
    catch {
        return [];
    }
}
