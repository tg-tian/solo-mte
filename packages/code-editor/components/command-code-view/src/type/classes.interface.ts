
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

