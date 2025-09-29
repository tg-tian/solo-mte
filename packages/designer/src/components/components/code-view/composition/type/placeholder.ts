/**
 * 代码视图快捷键描述
 * @remarks 用于展示在空状态的快捷键列表中
 */
export interface ShortcutKeyDesc {
  /** 快捷键的名称 */
  name: string;
  /** 快捷键的组成 */
  keys: string[];
  /** 快捷键的额外描述，用于设置title属性 */
  title?: string;
}
