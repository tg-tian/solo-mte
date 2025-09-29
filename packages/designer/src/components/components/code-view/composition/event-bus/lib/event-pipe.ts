import { Subject, Subscription } from "rxjs";
import { IDisposable } from "./types";

export class EventPipe implements IDisposable {

  private eventSubject: Subject<any>;

  private subscriptionMap: Map<object, Subscription>;

  private token: string;

  private parentEventPipeList: Array<EventPipe>;

  constructor(token: string, parentEventPipeList: Array<EventPipe>) {
    this.eventSubject = new Subject<any>();
    this.subscriptionMap = new Map<object, Subscription>();
    this.token = token;
    this.parentEventPipeList = parentEventPipeList;
    if (this.parentEventPipeList) {
      this.parentEventPipeList.push(this);
    }
  }

  public unsubscribe(subscriber: object): void {
    let subscription = this.subscriptionMap.get(subscriber);
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
      this.subscriptionMap.delete(subscriber);
    } else {
      return;
    }
    if (this.subscriptionMap.size === 0 && this.parentEventPipeList) {
      const index = this.parentEventPipeList.findIndex(item => item === this);
      if (index >= 0) {
        this.parentEventPipeList.splice(index, 1);
      }
    }
  }

  public post(value: any) {
    this.eventSubject.next(value);
  }

  public subscribe(eventHandler: (value: any) => void, caller: object): IDisposable {
    const subscription = this.eventSubject.subscribe((value) => eventHandler.call(caller, value));
    this.subscriptionMap.set( caller, subscription );
    return this;
  }

  /**
   * 判断是否匹配
   * @param token 订阅者标识
   * @returns 是否匹配
   */
  public matchToken(token: string): boolean {
    if (!!token !== !!this.token) {
      return false;
    }
    if (!!token && !!this.token && this.token !== token) {
      return false;
    }
    return true;
  }

  public getToken(): string {
    return this.token;
  }

}
