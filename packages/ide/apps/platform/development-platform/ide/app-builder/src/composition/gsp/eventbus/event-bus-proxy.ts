import { IEmitable } from './types';

export class EventBusProxy {

  constructor(private eventBus: IEmitable, private hostType: any, private eventTokenValueProvider: () => any) {
  }

  post(eventName: string, data: any) {
    this.eventBus.post(this.hostType, this.eventTokenValueProvider(), eventName, data);
  }
}

