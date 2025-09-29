import { ICodeFile, ICodeEditor } from "./libs/interfaces/editor";
import { IClass, IMethod, IMarker } from "./libs/interfaces/declaration";
import { EventEmitter } from "./libs/events";
import { Events, Languages, HookKey, LanguageSuffixMap } from "./libs/enum";
import { FileConstructor } from "./libs/interfaces/editor";
import { DesignElementLocaleHandler } from "../utils/locale";

export interface Hooks {
    loadMonaco(): Promise<any>;
    [key: string]: any;
}

export abstract class CodeEditor implements ICodeEditor {

    protected _monacoPromise?: Promise<any>;

    get monacoPromise(): Promise<any> {
        return this._monacoPromise || (this._monacoPromise = this.hook(HookKey.LoadMonaco));
    }

    /** 事件订阅 */
    protected events: EventEmitter;

    /** 获取工程目录下的文件实例列表 */
    protected files: { [key: string]: ICodeFile } = {};

    /** 返回当前工程创建文件实例的构造函数 ts类型的工程返回ts创建文件的构造函数 */
    protected abstract fileConstructor(): FileConstructor;

    /**
     * 获取文件
     * @param path 文件路径 
     */
    protected getFile(path: string): ICodeFile | undefined {
        return this.files[path];
    }

    /** 获取已打开的文件 */
    public getExistFile(path: string): ICodeFile | undefined {
        return this.files[path];
    }

    /**
     * 实例化文件对象
     * @param path 文件路径
     * @param content 文件内容
     * @param language 语法高亮类型
     */
    protected async init(path: string, content?: string, language?: string): Promise<ICodeFile> {
        const model = this.getFile(path);
        if (model) {
            return model;
        }
        const _monaco = await this.monacoPromise;
        this.files[path] = new (this.fileConstructor())(this, _monaco.Uri.parse(path), content || "", language);
        // 订阅初始化完成事件向外广播，参数增加事件是哪个文件发出的
        this.files[path].on(Events.Initialized, (...args: any[]) => {
            this.events.emit(Events.Initialized, path, ...args);
        }, 0);
        // 订阅changed事件向外广播，参数增加changed是哪个文件发出的
        this.files[path].on(Events.Changed, (...args: any[]) => {
            this.events.emit(Events.Changed, path, ...args);
        }, 0);
        this.files[path].on(Events.OutlineChanged, (...args: any[]) => {
            this.events.emit(Events.OutlineChanged, path, ...args);
        }, 0);
        return this.files[path];
    }

    /**
     * 根据文件名后缀推断代码语言类型
     * @param path 代码文件路径
     * @returns 语言类型
     */
    private inferLanguageByPath(path: string): string {
        if (path.toLowerCase().endsWith(".ts")) {
            return Languages.Typescript;
        }
        if (path.toLowerCase().endsWith(".java")) {
            return Languages.Java;
        }
        const suffix = path.toLowerCase().substring(path.lastIndexOf("."));
        for (const language in LanguageSuffixMap) {
            const lanSuffixArr = LanguageSuffixMap[language];
            for (const lanSuffix of lanSuffixArr) {
                if (lanSuffix.toLowerCase() === suffix) {
                    return language;
                }
            }
        }
        // 当不指定语言类型时，monaco编辑器会根据文件后缀自行判断
        return '';
    }

    /**
     * 打开或创建文件
     * @param path 路径
     * @param content 内容
     * @param language 语法高亮类型
     */
    async open(path: string, content?: string, language?: string): Promise<ICodeFile> {
        if (!language) {
            language = this.inferLanguageByPath(path);
        }
        this.resetContentIfFileExist(path, content);
        const file = await this.init(path, content, language);
        this.show(path);
        if (!this.element.querySelector(`[ref='${path}']`)) {
            const element = document.createElement("div");
            element.setAttribute("ref", path);
            element.style.position = "absolute";
            element.style.top = "0";
            element.style.right = "0";
            element.style.bottom = "0";
            element.style.left = "0";
            this.element.appendChild(element);
            file.render(<HTMLElement>element);
        }
        return file;
    }

    resetContentIfFileExist(path: string, content?: string): void {
        const model = this.getFile(path);
        if (model && content !== undefined && content !== null) {
            model.setValue(content, true, true);
        }
    }

    async show(path: string): Promise<void> {
        [].forEach.call(this.element.childNodes, (item: ChildNode) => {
            if (item instanceof HTMLElement) {
                item.style.display = "none";
            }
        });
        const element = this.element.querySelector(`[ref='${path}']`);
        if (element) {
            (<HTMLElement>element).style.display = "block";
        }
    }

    /**
     * 关闭文件（取消渲染）
     * @param path 文件路径
     * @param force 是否强制关闭
     */
    async close(path: string, force?: boolean): Promise<void> {
        const model = this.getFile(path);
        if (!model) {
            return;  // 当找不到文件时静默失败
        }
        await model.dispose(force);
        const element = this.element.querySelector(`[ref='${path}']`);
        if (element) {
            element.parentElement && element.parentElement.removeChild(element);
        }
        delete this.files[path];
    }

    /**
     * 类新增方法
     * @param file 文件路径
     * @param method 方法结构描述
     * @param _class 类名
     */
    async addMethod(file: string, method: IMethod, _class?: string): Promise<void> {
        const model = this.getFile(file);
        if (!model) {
            const msg = this.localeData.unexist ? this.localeData.unexist.replace('{param}', file) : '';
            throw new Error(msg || `当前文件"${file}"在系统中未创建`);
        }
        await model.addMethod(method, _class);
    }

    /**
     * 定位到某个类或者类的某个方法
     * @param file 文件路径
     * @param className 类名
     * @param methodName 方法名
     */
    position(file: string, className: string, methodName?: string): void {
        const model = this.getFile(file);
        if (!model) {
            const msg = this.localeData.unexist ? this.localeData.unexist.replace('{param}', file) : '';
            throw new Error(msg || `当前文件"${file}"在系统中未创建`);
        }
        model.position(className, methodName);
    }

    async format(path: string): Promise<void> {
        const model = this.files[path];
        if (!model) {
            const msg = this.localeData.unexist ? this.localeData.unexist.replace('{param}', path) : '';
            throw new Error(msg || `当前文件"${path}"在系统中未创建`);
        }
        model.format();
    }

    /** 重新布局 */
    layout() {
        Object.values(this.files).forEach(item => {
            // 未渲染的不需要重新布局
            if (!item.rendered) {
                return;
            }
            item.instance && item.instance.layout();
        });
    }

    /**
     * 事件订阅
     * @param event 事件名称
     * @param fn 订阅方法
     */
    on(event: string, fn: (...args: any[]) => void) {
        return this.events.on(event, fn);
    }

    /**
     * 取消事件订阅
     * @param event 事件名称
     */
    off(event: string,) {
        return this.events.off(event);
    }

    /**
     * 钩子调用
     * @param command 钩子名称
     * @param args 参数
     */
    protected async hook<T>(command: HookKey, ...args: any[]): Promise<T> {
        if (!this.hooks[command]) {
            const msg = this.localeData.nohook ? this.localeData.nohook.replace('{command}', command).replace('{command2}', command) : '';
            throw new Error(msg || `未注入"${command}"钩子，不能执行${command}`);
        }
        return this.hooks[command](...args);
    }

    async save(path: string, triggerChangedEvent: boolean): Promise<void> {
        const model = this.getFile(path);
        if (!model) {
            return;
        }
        return await model.save(triggerChangedEvent);
    }

    async resolve(path: string, errorRecovery: boolean = false): Promise<{ content: string; hasFatalError: boolean; classes?: IClass[]; }> {
        const model = this.getFile(path);
        if (!model) {
            return new Promise((resolve, reject) => {
                resolve({ content: '', hasFatalError: true });
            });
        }
        return await model.resolve(errorRecovery);
    }

    async setDark(isDark = true) {
        const _monaco = await this.monacoPromise;
        _monaco.editor.setTheme(isDark ? "vs-dark" : "vs");
    }

    async error(file: string, markers: IMarker[]): Promise<void> {
        const model = this.getFile(file);
        if (!model) {
            const msg = this.localeData.unexist ? this.localeData.unexist.replace('{param}', file) : '';
            throw new Error(msg || `当前文件"${file}"在系统中未创建`);
        }
        model.error(markers);
    }

    localeData: any = {};

    /**
     * 代码编辑器
     * @param _language 编程语言
     * @param _project  项目名称
     */
    constructor(private element: HTMLElement, private hooks: Hooks) {
        this.events = new EventEmitter();
        this.element.style.position = "relative";
        this.localeData = DesignElementLocaleHandler.getValue('codeEditor');
    }

}
