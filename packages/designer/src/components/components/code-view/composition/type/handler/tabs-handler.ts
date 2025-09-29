import { EventEmitter } from "@angular/core";
import { Tab } from "../tab";

/**
 * 标签页组件接口
 */
export interface TabsHandler {

  /** 页签数据 */
  tabs: Tab[];

  /** 页签选中事件 */
  selected: EventEmitter<Tab>;

  /** 页签关闭事件 */
  beforeClose: EventEmitter<Tab>;

  /** 根据id设置当前选中页签 */
  selectById(tabId: string): void;

  /** 新增一个页签 */
  addTab(tab: Tab, active?: boolean): void;

  /** 删除一个页签 */
  removeTab(tabId: string): void;

  /** 通过id获取页签数据 */
  getTab(id: string): Tab;

  /** 仅需调用一次，执行css样式的动态加载 */
  globalInit(): void;

}
