import { EventEmitter } from '../events';
import { IClass, IMethod } from './declaration';
import { IMarker } from "./declaration";

export interface ICodeFile {

    /** monaco编辑器实例 instance: monaco.editor.IStandaloneCodeEditor */
    instance: any | undefined;

    /** 内容是否改变 */
    changed: boolean;

    /** 文件内容 */
    content: string;

    /** 是否渲染 */
    rendered: boolean;

    /** 销毁 */
    dispose(force?: boolean): Promise<void>;

    /**
     * 渲染
     * @param element 渲染位置
     */
    render(element: HTMLElement): Promise<void>;

    /** 格式化代码 */
    format(): Promise<void>;

    /**
     * 获取编辑器内容
     * @returns 编辑器内容
     */
    getValue(): Promise<string>;

    /**
     * 设置编辑器内容
     * @param content 要设置的编辑器内容
     * @param force 是否强制覆盖
     * @param resetChangeFlag 是否重置变更标识，默认为false，如果设置为true则将新内容作为初始内容
     */
    setValue(content: string, force?: boolean, resetChangeFlag?: boolean): Promise<void>;

    /**
     * 增加方法
     * @param method 方法描述
     * @param _class 类名（同一个文件可能会定义多个类，不传则认为是第一个类）
     */
    addMethod(method: IMethod, _class?: string): Promise<void>;

    /** 代码定位到某个类或类的方法 */
    position(className: string, methodName?: string): Promise<void>;

    /**
     * 保存内容
     * @remarks 设置编辑器最后保存内容并设置修改标识为false
     * @param triggerChangedEvent 是否触发内容变化事件
     */
    save(triggerChangedEvent: boolean): Promise<void>;

    /**
     * 解析当前文件内容
     * @param errorRecovery 是否忽略语法错误并继续解析
     * @returns 文件内容及解析结果
     */
    resolve(errorRecovery?: boolean): Promise<{ content: string; hasFatalError: boolean; classes?: IClass[]; }>;

    /**
     * 事件订阅
     * @param event 事件名
     * @param fn 
     */
    on(event: string, fn: (...args: any[]) => void, debounce?: number): EventEmitter;

    /**
     * 取消事件订阅
     * @param event 事件名
     */
    off(event: string): EventEmitter;

    error(markers: IMarker[]): Promise<void>
}
export interface ICodeEditor {
    monacoPromise: Promise<any>;
    /**
     * 打开文件（渲染到dom）
     * @param path 文件路径
     * @param content 文件内容
     */
    open(path: string, content: string): Promise<ICodeFile>;

    /**
     * 打开文件（渲染到dom）
     * @param path 文件路径
     */
    show(path: string): Promise<void>;

    /**
     * 关闭文件（取消渲染）
     * @param path 文件路径
     * @param force 强制关闭
     */
    close(path: string, force?: boolean): Promise<void>;

    /**
     * 类新增方法
     * @param path 文件路径
     * @param method 方法描述
     * @param _class 类名
     */
    addMethod(path: string, method: IMethod, _class: string): Promise<void>;

    /**
     * 定位到某个类或者类的某个方法
     * @param path 文件路径
     * @param className 类名
     * @param methodName 方法名
     */
    position(path: string, className: string, methodName: string): void;

    /**
     * 格式化代码
     * @param path 路径
     */
    format(path: string): Promise<void>;

    /** 重新布局 */
    layout(): void;

    /**
     * 事件订阅
     * @param event 事件名称
     * @param fn 订阅方法
     */
    on(event: string, fn: (...args: any[]) => void): void;

    /**
     * 取消事件订阅
     * @param event 事件名称
     */
    off(event: string): void;

    /**
     * 保存文件
     * @param path 文件路径
     * @param triggerChangedEvent 是否触发内容变化事件
     */
    save(path: string, triggerChangedEvent: boolean): Promise<void>;

    /**
     * 解析当前文件内容
     * @param path 文件路径
     * @param errorRecovery 是否忽略语法错误并继续解析
     */
    resolve(path: string, errorRecovery?: boolean): Promise<{ content: string; hasFatalError: boolean; classes?: IClass[]; }>;

    /**
     * 设置主题
     * @param isDark 是否深色主题
     */
    setDark(isDark: boolean): void;

    /**
     * 获取已打开的文件
     * @param path 文件路径
     */
    getExistFile(path: string): ICodeFile | undefined;

}

/** 创建文件的构造函数 */
export interface FileConstructor{
    uri?:string;
    new(editor: ICodeEditor, uri: any, content: string, language?: string):ICodeFile;
}
