import { IItemLocation, ILocation, IPosition } from "./location";
import * as babelParser from '@babel/parser';
import { File } from '@babel/types';

export interface IParam {

    /** 参数名 */
    code: string;

    /** 参数类型 */
    type?: string;

    /** 参数描述 */
    description?: string;
}
export interface IMethod {

    /** 方法名 */
    code: string;

    /** 访问权限 */
    accessibility?: "public" | "private" | "protected" | null;

    /** 方法类型，ts独有属性 */
    kind?: "get" | "set" | "method" | "constructor";

    /** 方法概述 */
    name?: string;

    /** 方法返回值类型 */
    type?: string;

    /** 方法返回值描述 */
    returns?: string;

    /** 方法描述 */
    description?: string;

    /** 方法形参列表 */
    params?: IParam[];
}
/** 提示信息 */
export interface IMarker {
    start: IPosition;               // 警告所在行号
    end: IPosition;                 // 警告所在行号
    message: string;                // 警告内容
}
interface IDeclaration {
    code: IItemLocation;            // 名称
    description?: string;           // 描述
    location: ILocation;            // 代码位置信息
}

export interface IParamDeclaration extends IDeclaration {
    type: string;                   // 参数类型
}
export interface IMethodDeclaration extends IDeclaration {
    name: string;
    accessibility?: "public" | "private" | "protected" | null;
    kind?: "get" | "set" | "method" | "constructor";
    params: IParamDeclaration[];
    type: IItemLocation;
    returns: string;
    comments?: string;
}
export interface IClassDeclaration extends IDeclaration {
    name: string;                   // 从注释中解析得到的类的中文名
    methods: IMethodDeclaration[];  // 方法列表
    exported?: boolean;
}
// 对外输出的文件描述
export interface IClass {

    /** 类名 */
    code: string;

    /** 是否导出，ts独有属性 */
    exported?: boolean;

    /** 类概述 */
    name?: string;

    /** 类描述 */
    description?: string;

    /** 类的方法列表 */
    methods?: IMethod[];
}

/** 文件内容变更事件 */
export interface ChangeInfo {
    changed: boolean;
    content: string;
    hasFatalError?: boolean;
    classes?: IClass[];
}

/** 代码结构解析结果 */
export interface CodeAnalysisResult {

    /**
     * 代码中是否包含解析器不能容忍的错误
     * @remarks
     * 不能容忍的错误将导致解析器抛出异常，类结构解析结果为空
     * 如果包含此类错误则不应该再抛出代码大纲变化事件，防止类视图“闪烁”
     */
    hasFatalError: boolean;

    /** 类结构解析结果 */
    classes: IClassDeclaration[];

    /** babel-parser的解析结果，ts专有 */
    parseResult?: babelParser.ParseResult<File>;
     /** 代码文件内容 */
    content?: string;
}

/** 代码变动解析结果 */
export interface ChangeAnalysisResult {

    /** 是否修改 */
    changed: boolean;

    /** 代码内容 */
    content: string;

    /** 是否包含不可容忍的语法错误 */
    hasFatalError: boolean;

    /** 类结构解析结果 */
    classes: IClass[];

    /** babel-parser的解析结果，ts专有 */
    parseResult?: babelParser.ParseResult<File>;
}
