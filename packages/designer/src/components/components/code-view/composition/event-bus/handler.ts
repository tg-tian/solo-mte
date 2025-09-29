import { IdService } from '../../../view-model-designer/method-manager/service/id.service';
import { EventBus } from './lib/event-bus';
import { EVENT_BUS_INSTANSE_TOKEN } from './lib/types';


export class EventBusHandler {

  /** 销毁后不可重新获取 */
  private destroyed: boolean = false;

  /** 每个代码视图页面上存在一个单例的事件总线 */
  get eventBus(): EventBus {
    if (this.destroyed) {
      throw new Error("代码视图已销毁，无法继续操作");
    }
    return this.getInstance();
  }

  /** 该事件总线被赋值到window.top上，子页面通过指定的标识获取对应的事件总线实例 */
  get eventBusId(): string {
    if (this.destroyed) {
      throw new Error("代码视图已销毁，无法继续操作");
    }
    if (!this._eventBusId) {
      this.getInstance();
    }
    return this._eventBusId;
  }

  private _eventBus: EventBus | null = null;
  private _eventBusId: string = '';
  private idService;
  constructor() {
    this.idService = new IdService();
  }

  /**
   * 获取事件总线实例
   * @remarks 并且将该事件总线实例赋到window.top上
   * @returns 事件总线实例
   */
  public getInstance(): EventBus {
    if (!this._eventBus) {
      // 如果尚未初始化事件总线，则在top上新增一个事件总线实例
      this._eventBusId = this.genEventBusId();
      this._eventBus = new EventBus();
      if (window.top) {
        window.top[this._eventBusId] = this._eventBus;
      }
    }
    return this._eventBus;
  }

  /** 生成一个事件总线实例标识 */
  private genEventBusId(): string {
    let newIdSuffix: string;
    while (true) {
      newIdSuffix = this.idService.uuid().replace("-", "");
      if (window.top && !window.top[EVENT_BUS_INSTANSE_TOKEN + newIdSuffix]) {
        return EVENT_BUS_INSTANSE_TOKEN + newIdSuffix;
      }
    }
  }

  /** 销毁本组件的事件总线 */
  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    try {
      this._eventBus && this._eventBus.destroy();
      if (this._eventBusId && window.top) {
        window.top[this._eventBusId] = null;
        delete window.top[this._eventBusId];
      }
    } finally {
      this.destroyed = true;
    }
  }

}
