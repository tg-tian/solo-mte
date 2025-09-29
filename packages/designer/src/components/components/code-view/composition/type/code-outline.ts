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

/**
 * 代码分析结果
 * @remarks 由代码编辑器分析得出，辅助设计器组件完成保存操作
 */
export interface CodeAnalysisResult {
  /** 代码文件内容 */
  content: string;
  /** 如果代码具有类结构，则给出类的描述信息 */
  classes?: IClass[];
}

/** 代码大纲信息 */
export interface CodeOutlineInfo {
  /** 代码文件路径 */
  path: string;
  /** 代码类结构信息，如果为空则表示不支持 */
  classes?: IClass[];
}

/**
 * 代码大纲定位信息
 * @remarks 用于向代码编辑页发送定位请求时
 */
export interface CodeLocationInfo {
  className?: string;
  methodName?: string;
}
