/** 标签页保存结果 */
export interface SaveResult {

  /** 是否成功 */
  success: boolean;

  /** 成功或失败提示信息，为空则使用默认提示 */
  tip?: string;
}

/** 保存回调函数类型 */
export type SaveCallback = () => Promise<SaveResult>;

/**
 * 外层通知事件
 */
export interface CommonEvent {

  /** 事件类型 */
  eventName: string;

  /** 事件负载 */
  eventPayload?: any;
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

}

/** 获取url中的参数 */
function getParam(key: string): string {
  const params = new URLSearchParams(window.location.search);
  return decodeURI(params.get(key) || "");
}

/**
 * 获取本编辑页对应的代码视图的事件总线实例
 * @returns 事件总线实例
 */
export function getEventBusInstance(): IEventBus {
  const eventBusId = getParam('eventBusId');
  return window.top ? window.top[eventBusId] : window[eventBusId];
}
