
export interface FieldOption {
    /** 字段编号 */
    code: string;
  
    /** 字段名称 */
    name: string;
  
    /** 是否必填 */
    required?: boolean | ((data: any) => boolean);
  
    /** 是否隐藏 */
    hide?: boolean | ((data: any) => boolean);
  
    /** 提示信息 */
    placeholder?: string;
  
    /** 校验字段合法性，返回错误信息 */
    validate?: (value: any) => string;
  }
