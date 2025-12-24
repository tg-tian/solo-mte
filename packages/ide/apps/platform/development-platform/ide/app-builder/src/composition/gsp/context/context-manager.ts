import { ContextManager } from './context';

export class ContextManagerImplement implements ContextManager {
  private context = new Map<string, any>();

  constructor() {
    this.getValueFromUrl();
  }

  getValue(key: string) {
    let result = this.context.get(key);
    return result;
  }

  setValue(key: string, value: any) {
    this.context.set(key, value);
  }

  private getValueFromUrl() {
    if (!location.search) { return; }

    const pairs = location.search.slice(1).split('&');

    pairs.forEach((item) => {
      if (item && item.indexOf('=') !== -1) {
        const pair = item.split('=');
        this.context.set(pair[0], decodeURIComponent(pair[1] || ''));
      }
    });
  }
}
