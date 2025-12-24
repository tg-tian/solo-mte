import {IDisposable} from './types';

export class EventPipe implements IDisposable {

  // private eventSubject: any;
  private subscriptionMap: Map<object, any>;
  private onceSubscriptionMap: Map<object, any>;

  constructor(private name: string,
               private tokenValue: string,
               private emitter: string,
               private parentEventPipeList: Array<EventPipe>) {
    // this.eventSubject = new Subject<any>();
    this.subscriptionMap = new Map<object, any>();
    this.onceSubscriptionMap = new Map<object, any>();
    if (this.parentEventPipeList) {
      this.parentEventPipeList.push(this);
    }
  }

  post(data: any) {
    // this.eventSubject.next(data);
  }

  subscribe(eventHandler: (value: any) => void, caller: object): IDisposable {
    // const subscription = this.eventSubject.subscribe((value) => eventHandler.call(caller, value));
    // this.subscriptionMap.set(
    //   caller,
    //   subscription
    // );
    return this;
  }

  subscribeOnce(eventHandler: (value: any) => void, caller: object): IDisposable {
    // const subscription = this.eventSubject.subscribe((value) => eventHandler.call(caller, value));
    // this.onceSubscriptionMap.set(
    //   caller,
    //   subscription
    // );
    return this;
  }

  unSubscribe(subscriber: object) {
    let subscription = this.subscriptionMap.get(subscriber);
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
      this.subscriptionMap.delete(subscriber);
    } else {
      subscription = this.onceSubscriptionMap.get(subscriber);
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
        this.onceSubscriptionMap.delete(subscriber);
      }
    }
  }

  // 注销使用once方法注册的订阅。
  unSubscribeForOnce() {
    for (const subscriber of Array.from(this.onceSubscriptionMap.keys())) {
      this.unSubscribe(subscriber);
    }
  }

  matchEmitterToken(emitter: string, tokenValue: string): boolean {
    if (this.emitter && emitter && this.emitter !== emitter) {
      return false;
    }
    if (this.tokenValue && tokenValue && this.tokenValue !== tokenValue) {
      return false;
    }
    return true;
  }

  examByTargetToken(target: string, tokenValue: string): boolean {
    if (this.emitter !== target) {
      return false;
    }
    if (this.tokenValue !== tokenValue) {
      return false;
    }
    return true;
  }

  dispose(subscriber: object): void {
    this.unSubscribe(subscriber);
    if (this.subscriptionMap.size === 0 && this.parentEventPipeList) {
      const location = this.parentEventPipeList.findIndex(item => item === this);
      if (location !== -1) {
        this.parentEventPipeList.splice(location, 1);
      }
    }
  }
}
