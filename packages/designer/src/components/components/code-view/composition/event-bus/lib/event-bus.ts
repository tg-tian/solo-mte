import { EditorEventType } from '../../type/editor-event';
import { EventPipe } from './event-pipe';
import { IDisposable, IEventBus, SaveCallback, SaveCallbackInfo } from './types';
import { Observable, Subscriber } from 'rxjs';
/**
 * 外层通知事件
 * @remarks
 * 调用代码视图组件的外层组件/框架可以通过代码视图组件上的接口，向代码视图内部的指定标签页发出通知
 * 通知的响应方法由编辑页面自己实现
 * 该通知将被推入到事件总线的通知队列中，编辑页应该订阅通知队列更新事件
 */
export interface CommonEvent {

  /** 事件类型 */
  eventName: string;

  /** 事件负载 */
  eventPayload?: any;

  /** 自动生成的事件的唯一ID */
  __EVENT_ID__?: string;
}

export class EventBus implements IEventBus {

  /** 全局上下文键值对 */
  private context: { [key: string]: any } = {};

  /** 导航树节点上的附加信息 */
  private appendInfo: { [key: string]: any } = {};

  private eventMap = new Map<string, Array<EventPipe>>();

  /**
   * 外层框架通知队列
   * @remarks
   * 注意：该事件队列是为了让标签页和代码视图的外层框架交互而设立的
   * 外层框架指的是引用了代码视图组件的表单设计器或者BE设计器
   * 如果外层框架希望通知代码视图中的某一个标签页，则可以通过该事件队列对其进行通知
   * CommonEvent中的事件名与事件总线中事件的事件名相互独立，互不冲突
   * 注意：关闭标签页后必须清空其对应的通知队列
   */
  private notificationQueue = new Map<string, CommonEvent[]>();

  private notificationResultObsMap = new Map<string, Subscriber<any>[]>();

  /**
   * 标签页保存回调函数
   * @remarks 统一注册保存回调以便统一反馈提示信息
   */
  private saveCallbackMap = new Map<string, SaveCallbackInfo>();

  public subscribe(eventName: string, eventHandler: (value: any) => void, caller: object, token?: string): IDisposable {
    return this.getEventPipe(eventName, token || '').subscribe(eventHandler, caller);
  }

  public emit(eventName: string, value: any, token?: string): void {
    const eventPipeList = this.eventMap.get(eventName);
    if (!eventPipeList) {
      return;
    }
    for (const eventPipe of eventPipeList) {
      // token为null的事件管道会接受其类型的所有的事件
      // token不为null的事件管道仅接受满足其token的事件
      if (eventPipe.matchToken(token || '') || !eventPipe.getToken()) {
        eventPipe.post(value);
      }
    }
  }

  private getEventPipe(eventName: string, token: string): EventPipe {
    let eventPipeList = this.eventMap.get(eventName);
    if (!eventPipeList) {
      eventPipeList = new Array<EventPipe>();
      this.eventMap.set(eventName, eventPipeList);
    }
    let eventPipe = eventPipeList.find(item => item.matchToken(token));
    if (!eventPipe) {
      eventPipe = new EventPipe(token, eventPipeList);
    }
    return eventPipe;
  }

  public setGlobalContextParam(key: string, value: string): any {
    const last = this.context[key];
    this.context[key] = value;
    return last;
  }

  public getGlobalContextParam(key: string): any {
    return this.context[key];
  }

  public getUrlParam(global: Window, key: string): string {
    const params = new URLSearchParams(global.location.search);
    return decodeURI(params.get(key) || "");
  }

  public setAppendInfo(path: string, value: any): any {
    const last = this.appendInfo[path];
    this.appendInfo[path] = value;
    return last;
  }

  public getAppendInfo(path: string): any {
    return this.appendInfo[path];
  }

  public pushNotificationQueue(path: string, event: CommonEvent): Observable<any> {
    const eventID = Guid.newGuid();
    event.__EVENT_ID__ = eventID;
    this.notificationResultObsMap.set(eventID, []);
    const resultObs = new Observable<any>((subscriber) => {
      const subs = this.notificationResultObsMap.get(eventID);
      if (!subs) {
        subscriber.complete();
        return;
      }
      subs.push(subscriber);
    });
    // 首先将事件入队到对应的标签页
    let queue = this.notificationQueue.get(path);
    if (!queue) {
      queue = new Array<CommonEvent>();
    }
    queue.push(event);
    this.notificationQueue.set(path, queue);
    // 通知该标签页其通知队列已变更
    this.emit(EditorEventType.NotificationQueueUpdated, null, path);
    return resultObs;
  }

  public responseNotificationResult(event: CommonEvent, result: any, isFinalResult: boolean = true): void {
    const eventID = event && event.__EVENT_ID__;
    if (!eventID) {
      return;
    }
    const subscribers = this.notificationResultObsMap.get(eventID);
    if (!subscribers) {
      return;
    }
    for (const sub of subscribers) {
      sub.next(result);
      isFinalResult && sub.complete();
    }
    if (isFinalResult) {
      this.notificationResultObsMap.delete(eventID);
    }
  }

  public clearNotificationQueue(path: string): void {
    this.notificationQueue.delete(path);
  }

  public hasMoreNotification(path: string): boolean {
    const queue = this.notificationQueue.get(path);
    return !!queue && queue.length > 0;
  }

  public fetchNotification(path: string): CommonEvent | undefined {
    const queue = this.notificationQueue.get(path);
    if (!queue || queue.length === 0) {
      return undefined;
    }
    return queue.shift();
  }

  public registerSaveCallback(path: string, callback: SaveCallback, alwaysSave: boolean = true): void {
    if (!!path && !!callback && typeof callback === 'function') {
      this.saveCallbackMap.set(path, { callback, alwaysSave });
    }
  }

  public clearSaveCallback(path: string): void {
    this.saveCallbackMap.delete(path);
  }

  public getSaveCallback(path: string): SaveCallbackInfo {
    return this.saveCallbackMap.get(path);
  }

  public destroy(): void {
    this.context = undefined;
    this.appendInfo = undefined;
    this.eventMap = undefined;
    this.notificationQueue = undefined;
    this.saveCallbackMap = undefined;
  }

}

// @dynamic
export class Guid {

  static newGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      // tslint:disable-next-line:no-bitwise
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static shortId() {
    return Math.floor((Math.random() * 35 + 1) * 36 * 36 * 36).toString(36);
  }

}
