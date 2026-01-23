/**
 * 输入帮助设置
 */
export interface InputHelp {
    kind: string;
}

export const InputHelpKind = {
    enum: 'enum',
} as const;

/**
 * `下拉选项`输入帮助
 */
export interface EnumInputHelp extends InputHelp {
    kind: typeof InputHelpKind.enum;

    /** 可选的枚举值 */
    items: EnumItem[];
}

export interface EnumItem {
    key: string;
    value: string;

    [key: string]: any;
}
