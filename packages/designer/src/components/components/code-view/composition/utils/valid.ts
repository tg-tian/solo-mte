/**
 * 去除标识串中作为id的非法字符，仅保留大小写英文字母、数字、中划线、下划线
 * @param id 标识串
 */
export function getValidId(id: string): string {
    return id.split('').filter((char) => {
        const regExp = /^[0-9a-zA-Z-_]{1}$/g;
        return regExp.test(char);
    }).join('');
}
/**
  * 编号是否合法
  * @remarks 编号应由大小写英文字母、数字、下划线、$符号构成，不能由数字开头
  * @param code 编号
  * @returns 错误提示
  */
export function checkCode(code: string): string {
    const errorTip = "应由大小写英文字母、数字、下划线、$符号构成，不能由数字、下划线开头，且不能以_结尾";
    const regExp = /^[A-Za-z$][A-Za-z0-9_$]*(?<!_)$/;
    return regExp.test(code) ? '' : errorTip;
}

/**
 * 名称是否合法
 * @param name 名称
 * @returns 错误提示
 */
export function checkName(name: string): string {
    const errorTip = "不能包含空字符";
    const regExp = /^[\S]+$/;
    return regExp.test(name) ? '' : errorTip;
}
