export interface ContextManager {
  getValue(key: string): any;
  setValue(key: string, value: any);
}
