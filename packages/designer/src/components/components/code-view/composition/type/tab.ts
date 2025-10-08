import { FileItem } from "./file-item";

/**
 * 标签页
 * @remarks 标签页数据由控制器实例化后提供给标签页组件
 */
export class CodeTab {

  /** 标签标识，一般为路径 */
  id: string;

  /** 标签标题 */
  title: string;

  /** 标签图标类 */
  icon: string;

  /** 是否为当前tab */
  active: boolean | undefined;

  /** 是否启用关闭功能 */
  removable = true;

  /** 变更是否未保存 */
  isDirty = false;

  constructor(id: string, title: string, icon = "", removable = true) {
    this.id = id;
    this.title = title;
    this.icon = icon;
    this.removable = removable;
  }
  /**
   * 更新标题和图标
   * @param title 标题
   * @param icon 图标
   */
  public updateTitle(title: string, icon?: string): void {
    this.title = title;
    this.icon = icon || this.icon;
  }

}
