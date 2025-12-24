export interface IDisposable {
  dispose(subscriber: object): void;
}

export interface IEmitable {
  post(emitterType: any, tokenValue: string, eventName: string, eventArgs: any): void;

  on(target: string, tokenValue: string, eventName: string, handler: (value: any) => void, caller: object): IDisposable;

  once(target: string, tokenValue: string, eventName: string, handler: (value: any) => void, caller: object): IDisposable;
}

export interface IThenable {
  then(callback: () => void): IThenable;
  catch(callback: () => void): IThenable;
}
