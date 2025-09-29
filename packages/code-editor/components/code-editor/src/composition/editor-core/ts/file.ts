import * as babelParser from '@babel/parser';
import { File } from '@babel/types';
import { IMarker, IClassDeclaration, IClass, IMethod, IParam, IMethodDeclaration, CodeAnalysisResult, ChangeAnalysisResult } from '../libs/interfaces/declaration';
import { SimplifyClass, SimplifyMethod } from '../libs/simplify';
import { Languages } from '../libs/enum';
import { ICodeFile, ICodeEditor } from '../libs/interfaces/editor';
import { CodeFile } from "../file";
import { ImportResources, StructureTree } from "./ast";
import { ValidateClass } from "./translate";
import { StringBuilder } from '@microsoft/tsdoc';

export class TSFile extends CodeFile implements ICodeFile {

    protected markersOwner = "@ts";

    /** 加载依赖资源 */
    private async loadResources(parseResult: babelParser.ParseResult<File>) {
        const resources = await ImportResources(parseResult);
        this.events.emit("loadResources", resources, this);
    }

    /** 编辑器文本转换成类结构描述 */
    protected async getStructure(content: string, errorRecovery: boolean = false): Promise<CodeAnalysisResult> {
        return await StructureTree(content, errorRecovery);
    }

    /** 检查类结构完整性 */
    protected validate(structure: IClassDeclaration[]): IMarker[] {
        return structure && structure.reduce((list, item) => [...list, ...ValidateClass(item)], <IMarker[]>[]) || [];
    }

    /**
     * ts changed事件 要广播内容，并且要解析当前加载的包，如果包在当前项目中不存在，由项目去注册
     */
    protected async analysis(): Promise<ChangeAnalysisResult> {
        const data = await super.analysis();
        this.loadResources(data.parseResult);
        return data;
    }

    private classComment(_class: IClass, classDeclaration?: IClassDeclaration) {
        const basicColumnIdx = classDeclaration && classDeclaration.location.start.column || 0;
        const builder = new StringBuilder();
        builder.append(' '.repeat(basicColumnIdx) + `/**\n`);
        builder.append(' '.repeat(basicColumnIdx) + ` * ${_class.name || ''}\n`);
        builder.append(' '.repeat(basicColumnIdx) + ` * @remarks ${_class.description || ''}\n`);
        builder.append(' '.repeat(basicColumnIdx) + ` */\n`);
        return builder.toString();
    }

    private methodComment(method: IMethod, methodDeclaration?: IMethodDeclaration, startColumn?: number) {
        let basicColumnIdx = methodDeclaration && methodDeclaration.location.start.column || 4;
        if (typeof startColumn === 'number') {
            basicColumnIdx = startColumn;
        }
        let paramComment = method.params.map((param: IParam) =>
            ' '.repeat(basicColumnIdx) + ` * @param ${param.code} ${param.description || ''}`
        ).join('\n');
        if (paramComment) {
            paramComment = '\n' + paramComment;
        }
        const builder = new StringBuilder();
        builder.append(' '.repeat(basicColumnIdx) + `/**\n`);
        builder.append(' '.repeat(basicColumnIdx) + ` * ${method.name || ''}\n`);
        builder.append(' '.repeat(basicColumnIdx) + ` * @remarks ${method.description || ''}${paramComment}\n`);
        if (method.type !== 'void') {
            builder.append(' '.repeat(basicColumnIdx) + ` * @returns ${method.returns || ''}\n`);
        }
        builder.append(' '.repeat(basicColumnIdx) + ` */\n`);
        return builder.toString();
    }

    /**
     * 增加方法
     * @param method 方法描述
     */
    protected async methodToString(method: IMethod): Promise<string> {
        const model = await this.model;
        if (!model) {
            return null;
        }
        const basicColumnIdx = model.getOptions && model.getOptions().indentSize || 4;
        const builder = new StringBuilder();
        const prefix = (method.type || "").indexOf("Promise<") === 0 ? "async " : "";
        const params = (method.params || []).map((param: IParam) => {
            return `${param.code}: ${param.type}`;
        }).join(",");
        builder.append(`${this.methodComment(method, null, basicColumnIdx)}`);
        builder.append(' '.repeat(basicColumnIdx) + `${prefix}${method.code}(${params}): ${method.type || "void"} {\n`);
        builder.append(' '.repeat(basicColumnIdx) + `${' '.repeat(basicColumnIdx)}\n`);
        builder.append(' '.repeat(basicColumnIdx) + `}\n`);
        return '\n' + builder.toString();
    }

    // range: monaco.IRange
    private async commentClassByRange(range: any, addedRows = 2) {
        const model = await this.model;
        if (!model) {
            return;
        }
        const content = model.getValue() || "";
        const analysisResult = await this.getStructure(content);
        this.structures = analysisResult.classes;
        const contents = model.getLinesContent();
        return this.structures.some(_class => {
            if (_class.location.end.line < range.startLineNumber) {
                // 类结尾在内容改变前，不是要查找的类
                return;
            }
            if (_class.location.start.line < range.startLineNumber) {
                // 类开始在内容改变前，说明在内部插入
                this.commentMethodByRange(_class.methods, range, 2);
                return true;
            }
            // 当前编辑行 + 增加的行数 - 1（行号变索引号）+ 1(下一行) 说明是为类增加注释
            if (!contents.slice(range.startLineNumber - 1 + addedRows + 1, _class.location.start.line - 1).join("").trim()) {
                model.pushEditOperations(
                    null,
                    [{
                        range: {
                            startLineNumber: range.startLineNumber,
                            startColumn: 0,
                            endLineNumber: range.startLineNumber + addedRows + 1,
                            endColumn: 0
                        },
                        text: this.classComment(SimplifyClass(_class), _class)
                    }],
                    (_: any) => null
                );
                return true;
            }
        });
    }

    // range: monaco.IRange
    private async commentMethodByRange(methods: IMethodDeclaration[], range: any, addedRows = 2) {
        const model = await this.model;
        if (!model) {
            return;
        }
        const contents = model.getLinesContent();
        const method = methods.find(method => {
            if (method.location.end.line < range.startLineNumber) {
                // 类结尾在内容改变前，不是要查找的方法
                return;
            }
            // 当前编辑行 + 增加的行数 - 1（行号变索引号）+ 1(下一行) 说明是为类增加注释
            if (!contents.slice(range.startLineNumber - 1 + addedRows + 1, method.location.start.line - 1).join("").trim()) {
                return true;
            }
        });
        if (!method) {
            return;
        }
        if (method.kind === "constructor" || method.kind === "get" || method.kind === "set") {
            return;
        }
        model.pushEditOperations(
            null,
            [{
                range: {
                    startLineNumber: range.startLineNumber,
                    startColumn: 0,
                    endLineNumber: range.startLineNumber + addedRows + 1,
                    endColumn: 0
                },
                text: this.methodComment(SimplifyMethod(method), method)
            }],
            (_: any) => null
        );
    }

    // event: monaco.editor.IModelContentChangedEvent
    private async onDidChangeContent(event: any) {
        const { text = "", range = null } = event.changes[0] || {};
        if (!text.match(/^\r?\n\s+\*\s+\r?\n\s*$/)) {
            return;
        }
        if (!range) {
            return;
        }
        // 插入注释后，行数加2
        const addedRows = text.split("\n").length - 1;
        await this.commentClassByRange(range, addedRows);
    }

    // uri: monaco.Uri
    constructor(editor: ICodeEditor, uri: any, content?: string) {
        super(editor, Languages.Typescript, uri, content);
        // event: monaco.editor.IModelContentChangedEvent
        this.events.on("onDidChangeContent", async (event: any) => {
            await this.onDidChangeContent(event);
        });
    }

}
