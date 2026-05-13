/**
 * 根据传递过来已有的类对象和自定义类名，构造新的样式对象
 * @param classObject
 * @param customClass
 * @returns
 */
export declare function getCustomClass(classObject: Record<string, any>, customClass?: string | string[] | Record<string, boolean>): Record<string, any>;
/**
 * 根据传递过来已有的style对象和自定义style，构造新的style对象
 * @param styleObject
 * @param customStyle
 * @returns
 */
export declare function getCustomStyle(styleObject: Record<string, any>, customStyle?: string | Record<string, any>): Record<string, any>;
