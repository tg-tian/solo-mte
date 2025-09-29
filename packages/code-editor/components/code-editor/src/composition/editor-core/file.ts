import { ICodeFile, ICodeEditor } from "./libs/interfaces/editor";
import { IClass, IMethod, IClassDeclaration, IMarker, CodeAnalysisResult, ChangeAnalysisResult } from "./libs/interfaces/declaration";
import { IPosition } from "./libs/interfaces/location";
import { EventEmitter } from "./libs/events";
import { Events, Languages } from "./libs/enum";
import { SimplifyClass } from "./libs/simplify";
import { UtilService } from './libs/utils';
import { DesignElementLocaleHandler } from "../utils/locale";
import { TSEditor } from "./ts/editor";


export abstract class CodeFile implements ICodeFile {

    /** 编辑器警告信息owner */
    protected markersOwner = "@editor";

    /** 编辑器实例 instance: monaco.editor.IStandaloneCodeEditor */
    instance: any | undefined;

    protected structures: IClassDeclaration[] = [];

    /** 事件订阅 */
    protected events: EventEmitter;

    /** 内容状态记录：编辑器内容是否修改（用来处理销毁前检查） */
    private _changed = false;

    private _rendered = false;

    /** 文件uri  */
    private fileType = '';

    /** model: monaco.editor.ITextModel */
    protected model?: Promise<any>;

    /** 内容是否改变 */
    get changed(): boolean {
        return this._changed;
    }

    /** model是否渲染到dom */
    get rendered(): boolean {
        return this._rendered;
    }

    /** 最后一次保存的文件内容 */
    get content(): string {
        return this._content || "";
    }

    /**
     * 获取编辑器内容
     * @returns 编辑器内容
     */
    async getValue(): Promise<string> {
        if (!this.model) {
            return "";
        }
        return (await this.model).getValue() || "";
    }

    async setValue(content: string, force = false, resetChangeFlag = false): Promise<void> {
        if (!this.model) {
            throw new Error(this.localeData.noeditor || `当前编辑器实例不存在`);
        }
        if (this.changed && !force) {
            throw new Error(this.localeData.unsave || `当前编辑器内容未保存，不能覆盖内容`);
        }
        if (resetChangeFlag === true) {
            this._changed = false;
            this._content = content;  // 重新设置内容后，将新内容设置为初始内容
        }
        (await this.model).setValue(content);
    }

    /**
     * 将方法描述转化未字符串
     * @param method 方法
     */
    protected async methodToString(method: IMethod): Promise<string> {
        return "";
    }

    /**
     * 增加方法
     * @param method 方法描述
     * @param _class 类名（同一个文件可能会定义多个类，不传则认为是第一个类）
     */
    async addMethod(method: IMethod, _class?: string): Promise<void> {
        const strMethod = await this.methodToString(method);
        if (!strMethod) {
            return;
        }
        const content = await this.getValue();
        // @todo 考虑structures是否是实时刷新的结构
        const structure = _class && this.structures.find(structure => structure.code.value === _class) || this.structures[0];
        if (!structure.location) {
            console.error(this.localeData.addFailed || `添加方法失败，找不到对应的类代码`);
            return;
        }
        const position = structure.location.end.index - 1;
        this.setValue(content.substring(0, position) + strMethod + content.substr(position), true);
    }

    /**
     * 根据内容转换类结构
     * @param content 内容
     * @param errorRecovery 是否忽略语法错误并继续解析
     */
    protected async getStructure(content: string, errorRecovery: boolean = false): Promise<CodeAnalysisResult> {
        return {
            hasFatalError: false,
            classes: []
        };
    }

    /**
     * 校验类图定义是否完整
     * @param structure 类结构描述模型
     */
    protected validate(structure: IClassDeclaration[]): IMarker[] {
        return [];
    }

    /**
     * 警告提示
     * @param markers 提示信息
     */
    async error(errors: IMarker[]): Promise<void> {
        if (!this.model) {
            return;
        }
        const _monaco = await this.editor.monacoPromise;
        const model = await this.model;
        // markers: monaco.editor.IMarkerData
        const markers: any[] = errors.map(item => {
            return {
                severity: _monaco.MarkerSeverity.Error,
                startLineNumber: item.start.line,
                startColumn: item.start.column,
                endLineNumber: item.end.line,
                endColumn: item.end.column,
                message: item.message
            };
        });
        _monaco.editor.setModelMarkers(model, this.markersOwner + "-error", markers);
    }

    /**
     * 警告提示
     * @param warning 提示信息
     */
    private async warning(warning: IMarker[]): Promise<void> {
        if (!this.model) {
            return;
        }
        const _monaco = await this.editor.monacoPromise;
        // markers: monaco.editor.IMarkerData
        const markers: any[] = warning.filter(item => item.start.index >= 0 && item.end.index >= 0).map(item => {
            return {
                severity: _monaco.MarkerSeverity.Warning,
                startLineNumber: item.start.line,
                startColumn: item.start.column + 1,
                endLineNumber: item.end.line,
                endColumn: item.end.column + 1,
                message: item.message
            };
        });
        _monaco.editor.setModelMarkers((await this.model), this.markersOwner + "-warning", markers);
    }

    async save(triggerChangedEvent: boolean): Promise<void> {
        const model = this.instance && this.instance.getModel();
        const content = model && model.getValue() || "";
        this._content = content;
        this._changed = false;
        if (triggerChangedEvent === true) {
            this.handleDidChangeContent && this.handleDidChangeContent();
        }
    }

    async resolve(errorRecovery: boolean = false): Promise<{ content: string; hasFatalError: boolean; classes?: IClass[]; }> {
        const model = this.instance && this.instance.getModel();
        const content = model && model.getValue() || "";
        const analysisResult = await this.getStructure(content, errorRecovery);
        this.structures = analysisResult.classes;
        return {
            content,
            hasFatalError: analysisResult.hasFatalError,
            classes: this.structures.map(_class => SimplifyClass(_class))
        };
    }

    /**
     * 渲染到element
     * @param element html元素
     */
    async render(element: HTMLElement): Promise<void> {
        if (!this.model) {
            throw new Error(this.localeData.showFailed || `当前文件不存在，无法渲染`);
        }
        const _monaco = await this.editor.monacoPromise;
        const model = await this.model;
        this.instance = _monaco.editor.create(element, { model });
        this._rendered = true;
        this.addActions();
        // 初始化后加载文件依赖的包
        this.analysis().then(data => {
            this.events.emit(Events.Initialized, data);
        });
    }

    async dispose(force?: boolean) {
        if (this.changed && !force) {
            throw new Error(this.localeData.modifyNosave || `当前文件已修改尚未保存`);
        }
        if (this.rendered && this.instance) {
            this.instance.dispose();
        }
        this.instance = undefined;
        this._rendered = false;
        this._changed = false;
    }

    /**
     * 格式化当前代码
     */
    async format(): Promise<void> {
        if (!this.instance) {
            throw new Error(this.localeData.noshow || `当前文件未渲染，无法进行格式化`);
        }
        const action = this.instance.getAction('editor.action.formatDocument');
        action && action.run();
    }


    /**
     * 定位到某个类或者类的某个方法
     * @param className 类名
     * @param methodName 方法名
     */
    async position(className: string, methodName?: string): Promise<void> {
        if (!this.instance) {
            throw new Error(this.localeData.noshow2 || `当前编辑器没有渲染，无法定位到具体位置`);
        }
        const _class = this.structures.find(_class => _class.code.value === className);
        let position: IPosition | undefined = _class && _class.code.location.start;
        if (methodName && _class) {
            const method = _class.methods.find(method => method.code.value === methodName);
            position = method && method.code.location.start;
        }
        if (!position) {
            return;
        }
        this.instance.revealLineNearTop(position.line);
        this.instance.setPosition({ lineNumber: position.line, column: position.column });
    }

    /** 内容修改触发 */
    protected async analysis(): Promise<ChangeAnalysisResult> {
        const model = this.instance && this.instance.getModel();
        const content = model && model.getValue() || "";
        this._changed = content !== this.content;
        return this.getStructure(content, true).then(analysisResult => {
            const structures = analysisResult.classes;
            const {hasFatalError} = analysisResult;
            if (!hasFatalError) {  // 如果代码中含有致命错误导致解析结果为空，则暂留过去的结构信息
                this.structures = structures;
            }
            const warnings = this.validate(structures);  // 如果代码中含有致命错误导致解析结果为空，则不显示警告信息
            this.warning(warnings);
            return {
                changed: this.changed,
                content,
                hasFatalError,
                classes: this.structures.map(_class => SimplifyClass(_class)),
                parseResult: analysisResult.parseResult
            };
        });
    }

    /**
     * 内容修改触发
     * @remarks
     * 本方法是analysis方法的简化版，不会分析代码类结构，只查看代码是否变更
     * analysis方法由防抖函数限制已防止出现性能问题，而simpleAnalysis方法立即执行，立刻反应代码变更情况
     */
    protected simpleAnalysis(): { changed: boolean; content: string; } {
        const model = this.instance && this.instance.getModel();
        const content = model && model.getValue() || "";
        this._changed = content !== this.content;
        return {
            changed: this.changed,
            content
        };
    }

    /**
     * 事件订阅
     * @param event 事件名称
     * @param fn 订阅方法
     */
    on(event: string, fn: (...args: any[]) => void, debounce?: number): EventEmitter {
        return this.events.on(event, fn, debounce);
    }

    /**
     * 取消事件订阅
     * @param event 事件名称
     */
    off(event: string): EventEmitter {
        return this.events.off(event);
    }

    localeData: any = {};


    addActions() {
        // const topWindow:any = top.window
        // let config =  topWindow.IGIX.service.chatSer.getLockConfig(this.fileType)
        // if( config && config.explain) {
        //     this.instance.addAction({
        //         id: 'explainCode',
        //         label: this.localeData.chatExplainLabel || '解释代码',
        //         // 指定操作应显示在上下文菜单的哪个组中 navigation表示默认组
        //         contextMenuGroupId: 'outlining',
        //         // 操作在菜单中的显示顺序
        //         contextMenuOrder: 10,

        //         // 操作执行的方法
        //         // @param editor ed.getPosition() 获取焦点坐标
        //          run: () => this.sendSmartChatMsg(this.localeData.chatExplainText || '解释这段代码')
        //     });
        // }
        // if(config && config.comment) {
        //     this.instance.addAction({
        //         id: 'generateComments',
        //         label: this.localeData.chatCommentLabel || '生成代码注释',
        //         contextMenuGroupId: 'outlining',
        //         contextMenuOrder: 11,
        //          run: () => this.sendSmartChatMsg(this.localeData.chatCommentText || '生成这段代码的注释')
        //     });
        // }
        // if(config && config.test) {
        //     this.instance.addAction({
        //         id: 'generateTest',
        //         label: this.localeData.chatTestLabel || '生成单元测试',
        //         contextMenuGroupId: 'outlining',
        //         contextMenuOrder: 12,
        //          run: () => this.sendSmartChatMsg(this.localeData.chatTestText || '生成这段代码的单元测试')
        //     });
        // }
    }
    sendSmartChatMsg(param) {
        // const topWindow:any = top.window
        // if(topWindow.IGIX && topWindow.IGIX.service.chatSer) {
        //     const selectedRange = this.instance.getSelection();
        //     const selectedText = this.instance.getModel().getValueInRange(selectedRange)
        //     const sendMsg = selectedText + '\n' +param
        //     const pathParam = window.location.search
        //     topWindow.IGIX.service.chatSer.message$.next({path:'smartchat'+pathParam, msg: sendMsg})
        // }

    };

    /**
     * 创建编辑器文件
     * @param editor 编辑器
     * @param language 语法类型
     * @param uri 文件uri uri: monaco.Uri
     * @param _content 文件内容
     */
    constructor(protected editor: ICodeEditor, language: Languages, uri: any, private _content?: string) {
        this.fileType = editor instanceof TSEditor ? 'front' : 'end';
        this.localeData = DesignElementLocaleHandler.getValue('codeEditor');
        // 使用代码结构分析函数的防抖版本
        const analysisChange = () => {
            this.analysis().then(data => {
                this.events.emit(Events.OutlineChanged, data);
            });
        };
        const analysisChangeDebounceVer = UtilService.debounce(analysisChange, 600);
        this.model = new Promise((success) => {
            this.editor.monacoPromise.then(_monaco => {
                // models: monaco.editor.ITextModel
                const models: any[] = _monaco.editor.getModels();
                // 如果当前文件在编辑器项目中存在的话，返回当前编辑器系统的model渲染到当前Element，没有则创建新的model
                const model = models.find(model => model.uri.path === uri.path);
                if (model) {
                    return success(model);
                }
                // newModel: monaco.editor.ITextModel
                const newModel: any = _monaco.editor.createModel(_content || "", language, uri);
                // event: monaco.editor.IModelContentChangedEvent
                this.handleDidChangeContent = (event?: any) => {
                    if (event) {
                        this.events.emit("onDidChangeContent", event);
                    }
                    const changeInfo = this.simpleAnalysis();
                    this.events.emit(Events.Changed, changeInfo);
                    analysisChangeDebounceVer();  // 类结构及警告信息的分析需要进行防抖处理
                };
                newModel.onDidChangeContent(this.handleDidChangeContent);
                success(newModel);
            });
        });
        this.events = new EventEmitter();
    }

    /** 处理文件内容变化事件 event: monaco.editor.IModelContentChangedEvent */
    private handleDidChangeContent: (event?: any) => void = () => { };

}
