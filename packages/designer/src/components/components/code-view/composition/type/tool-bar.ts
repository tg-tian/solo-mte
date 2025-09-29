/**
 * 工具栏条目
 * @remarks 导航面板标题栏右侧的图标按钮组
 */
export interface TabToolbarItem {

  /** 工具栏按钮的唯一标识 */
  id: string;

  /** 点击按钮后要执行的命令*/
  command: string;

  /** 文本提示信息 */
  tooltip?: string;

  /** 显示的css图标类 */
  icon?: string;

  /** 通过innerHTML加载svg图标，本字符串是svg图标串 */
  svgIcon?: string;
  /** 当svgIcon不为空时，使用svgClass而不是icon */
  svgClass?: string;

}
