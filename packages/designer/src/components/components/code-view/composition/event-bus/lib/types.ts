import { Observable } from 'rxjs';
import { CommonEvent } from '../../interface/event';

export const EVENT_BUS_INSTANSE_TOKEN = "IdeCodeViewEventBus";

/** 标签页保存回调函数 */
export type SaveCallback = () => Promise<SaveResult>;

/** 标签页保存结果 */
export interface SaveResult {

  /** 是否成功 */
  success: boolean;

  /** 成功或失败提示信息，为空则使用默认提示 */
  tip?: string;

  /** 保存文件路径（可能会在提示信息中展示） */
  curPath?: string;

  /** 保存文件的关联文件主路径 */
  mainPath?: string;

  /** 保存文件名称（可能会在提示信息中展示） */
  name?: string;
}

export interface SaveCallbackInfo {
  callback: SaveCallback;
  alwaysSave: boolean;
}

export interface IDisposable {

  /**
   * 取消订阅
   * @param subscriber 订阅者
   */
  unsubscribe(subscriber: object): void;

}

export interface IEventBus {

  /**
   * 订阅事件
   * @param eventName 事件名称，由大小写英文字母或数字组成
   * @param eventHandler 事件处理方法
   * @param caller 订阅者
   * @param token 订阅者标识，如果为空则共用同一个事件管道，如果非空，则新建一个事件管道
   */
  subscribe(eventName: string, eventHandler: (value: any) => void, caller: object, token?: string): IDisposable;

  /**
   * 发送事件
   * @param eventName 事件名称
   * @param value 事件数据
   * @param token 订阅者标识
   */
  emit(eventName: string, value: any, token?: string): void;

  /**
   * 设置全局上下文参数
   * @param key 键
   * @param value 值
   * @returns 该键的历史值
   */
  setGlobalContextParam(key: string, value: string): any;

  /**
   * 获取全局上下文参数
   * @param key 键
   */
  getGlobalContextParam(key: string): any;

  /**
   * 设置节点附加信息
   * @param path 文件路径
   * @param value 附加信息
   * @returns 该键的历史值
   */
  setAppendInfo(path: string, value: any): any;

  /**
   * 获取节点附加信息
   * @param path 文件路径（通过url上的id取得）
   * @remarks 获取导航树节点上的appendInfo字段
   */
  getAppendInfo(path: string): any;

  /**
   * 从url中获取查询参数
   * @remarks 获取当前页面对应的文件路径：getUrlParam(window, 'id')
   * @param global window对象
   * @param key 键值
   * @returns 参数值
   */
  getUrlParam(global: Window, key: string): string;

  /**
   * 发送外层通知事件
   * @remarks 由代码视图组件调用，不向标签页开放
   * @param path 标签页路径
   * @param event 通知事件
   */
  pushNotificationQueue(path: string, event: CommonEvent): Observable<any>;

  /**
   * 由标签页反馈通知结果
   * @param event         通知事件
   * @param result        通知事件的结果
   * @param isFinalResult 是否最终结果
   */
  responseNotificationResult(event: CommonEvent, result: any, isFinalResult: boolean): void;

  /**
   * 清空标签页的通知队列
   * @remarks 当关闭标签页时必须调用该方法（由代码视图组件调用，不向标签页开放）
   * @param path 标签页路径
   */
  clearNotificationQueue(path: string): void;

  /**
   * 是否还有新通知
   * @remarks 由标签页调用，用于判断是否还有新的通知尚未处理
   * @param path 标签页路径
   */
  hasMoreNotification(path: string): boolean;

  /**
   * 读取外层通知
   * @remarks 由标签页调用，从通知队列中读取一个外层通知
   * @param path 标签页路径
   */
  fetchNotification(path: string): CommonEvent;

  /**
   * 注册保存回调函数
   * @param path 标签页路径
   * @param callback 标签页保存回调函数
   * @param alwaysSave 是否总是执行保存，默认为false（如果该值为true，则只要标签页打开，不管其是否有变更都执行保存）
   * @remarks
   * 该方法由标签页在初始化完成后调用，注册自己的保存回调函数以便代码视图汇总保存结果并统一反馈提示信息
   * 当只保存当前页时，无论alwaysSave的值是多少，都会重新保存（alwaysSave只在保存全部时生效）
   */
  registerSaveCallback(path: string, callback: SaveCallback, alwaysSave?: boolean): void;

  /**
   * 在标签页关闭时清除其注册的保存回调函数
   * @remarks 该方法由代码视图组件调用，不对标签页开放
   * @param path 标签页路径
   */
  clearSaveCallback(path: string): void;

  /**
   * 获取标签页注册的保存回调
   * @remarks 由代码视图组件调用，不向标签页开放
   * @param path 标签页路径
   */
  getSaveCallback(path: string): SaveCallbackInfo;

}
