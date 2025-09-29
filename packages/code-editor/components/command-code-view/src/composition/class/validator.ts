import { DesignElementLocaleHandler } from "../utils/extend-locale";

export enum FormatErrorType {
  /** 字段禁止为空 */
  EmptyError = 'empty',

  /** 字段间禁止重复 */
  RepeatError = 'repeat',

  /** 字段格式方法，如：编号只能包含英文字母和数字，不能包含汉字 */
  FormatError = 'format'
}

/**
 * 元数据校验服务结果
 * @remarks 用于分类展示检验错误
 */
export class FormatError {
  /** 错误类型 */
  type: FormatErrorType;

  /** 验证信息标题，表示出错的是哪一个字段 */
  title: string;

  /** 具体的描述信息 */
  description?: string;
  localeData:any = {};

  constructor(type: FormatErrorType, title: string, description?: string) {
    this.type = type;
    this.title = title;
    this.description = description;
    this.localeData = DesignElementLocaleHandler.getValue('cmpDesigner').validator;
  }

  toString(): string {
    switch (this.type) {
      case FormatErrorType.EmptyError:
        return `${this.title + this.localeData.empty}`;
      case FormatErrorType.RepeatError:
        return `${this.title + this.localeData.repeat}`;
      case FormatErrorType.FormatError:
        return this.description ? `${this.title}${this.description}` : `${this.title + this.localeData.error}`;
      default:
        return "";
    }
  }
}

