import { FormatError, FormatErrorType } from "../class/validator";

/**
 * 元数据合法性校验工具方法类
 */
export class ValidateUtil {

  /**
   * 进行重复性检测
   * @remarks 注意：本重复性检测不会统计非真值，属性名对应的值必须为字符串
   * @param targetArr - 目标数组
   * @param propName - 待检测的属性名
   * @returns 存在重复的属性值的数组，如果不存在重复则返回null
   */
  public static doDuplicateDetection(targetArr: any[], propName: string): string[] {
    const countMap: { [key: string]: number } = {};
    for (const target of targetArr) {
      const propValue = target && target[propName];
      if (!propValue || typeof propValue !== 'string') {
        continue;
      }
      countMap[propValue] =countMap[propValue]? countMap[propValue] + 1:1;
    }
    const result = [] as any;
    for (const key in countMap) {
      if (countMap[key] > 1) {
        result.push(key);
      }
    }
    return result.length === 0 ? [] : result;
  }

  /**
   * 编号是否合法
   * @remarks 编号应由大小写英文字母、数字、下划线、$符号构成，不能由数字开头
   * @param code - 编号
   * @returns 错误提示
   */
  public static checkCode(code: string): string {
    /** 不能轻易增强限制，以免引起不必要的麻烦 */
    // const errorTip = "应由大小写英文字母、数字、下划线、$符号构成，不能由数字开头";
    // const regExp = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    // return regExp.test(code) ? null : errorTip;
    return !code ? "禁止为空" : '';
  }

  /**
   * 名称是否合法
   * @param name - 名称
   * @returns 错误提示
   */
  public static checkName(name: string): string {
    /** 不能轻易增强限制，以免引起不必要的麻烦 */
    // const errorTip = "不能包含空字符";
    // const regExp = /^[\S]+$/;
    // return regExp.test(name) ? null : errorTip;
    return !name ? "禁止为空" : '';
  }

  /**
   * 检查对象中的编号字段
   * @remarks 如果发现错误则将之添加到错误集合中
   * @param title - 错误标题
   * @param errors - 错误集合
   * @param target - 待检查对象
   * @param propName - 编号的属性名
   */
  public static checkCodeAndCollectError(title: string, errors: FormatError[], target: any, propName: string = 'Code'): void {
    if (target[propName]) {
      const errorTip = ValidateUtil.checkCode(target[propName]);
      errorTip && errors.push(new FormatError(FormatErrorType.FormatError, `${title}[${target[propName]}]`, errorTip));
    } else {
      errors.push(new FormatError(FormatErrorType.EmptyError, title));
    }
  }

  public static checkNameAndCollectError(title: string, errors: FormatError[], target: any, propName: string = 'Name'): void {
    if (target[propName]) {
      const errorTip = ValidateUtil.checkName(target[propName]);
      errorTip && errors.push(new FormatError(FormatErrorType.FormatError, `${title}[${target[propName]}]`, errorTip));
    } else {
      errors.push(new FormatError(FormatErrorType.EmptyError, title));
    }
  }

  public static doDuplicateDetectionAndCollectError(title: string, errors: FormatError[], targetArr: any[], propName: string = 'Code'): void {
    const repeatValArr = this.doDuplicateDetection(targetArr, propName);
    if (repeatValArr) {
      for (const value of repeatValArr) {
        errors.push(new FormatError(FormatErrorType.RepeatError, `${title}[${value}]`));
      }
    }
  }

}
