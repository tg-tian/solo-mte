/**
 * 提供ide运行所需的方法，供插件使用
 */

export class Ide {
  private frameId: string;
  private events: Map<string, any[]>;
  private commandData: Map<string, any>;
  private get isTop(): boolean {
    return window.top === window;
  }
  private get parentInstance() {
    let instance = this;
    const top = window.top;
    if (top && top['gsp']) {
      instance = top['gsp'].ide;
    }
    return instance;
  }



  constructor(parent?: Ide) {
    this.events = new Map<string, any[]>();
    this.frameId = this.getParam('frameID');
    if (this.isTop) {
      this.commandData = new Map<string, any>();
    }
  }

  /* #region  frame util */
  getParam(key: string) {
    const params = new URLSearchParams(window.location.search);
    return unescape(params.get(key));
  }

  getInitCommandData(frameId?: string): any {
    if (!this.isTop) {
      frameId = frameId || this.frameId;
      return this.parentInstance.getInitCommandData(frameId);
    } else {
      return this.commandData.get(frameId);
    }
  }

  setInitCommandData(frameId: string, data: any) {
    if (!this.isTop) {
      this.parentInstance.setInitCommandData(frameId, data);
    } else {
      this.commandData.set(frameId, data);
    }
  }

  /* #endregion */

  /* #region  event */
  onPanelAdded(cb: (options: any, location?: string) => any) {
    this.on('panel-added', cb);
  }

  onPanelRemoved(cb: (id: string, lacation: string) => any) {
    this.on('panel-removed', cb);
  }

  onPanelShown(cb: (id: string) => any) {
    this.on('panel-shown', cb);
  }

  onPanelHidden(cb: (id: string) => any) {
    this.on('panel-hidden', cb);
  }

  onModalConfirming(cb: (id: string) => boolean) {
    if (this.parentInstance !== this) {
      this.parentInstance.onModalConfirming(cb);
    } else {
      this.on('confirm-modal', cb);
    }
  }

  onModalCancelling(cb: (id: string) => boolean) {
    this.on('cancel-modal', cb);
  }

  onLeftActivated(cb: (id: string) => any) {
    if (this.isTop) {
      this.on('activate-left', cb);
    } else {
      this.parentInstance.onLeftActivated(cb);
    }
  }

  onNotifyShown(cb: (level: 'error' | 'warning' | 'info', content: string) => any) {
    this.on('show-notify', cb);
  }

  onLoadingShown(cb: (message?: string) => any) {
    this.on('show-loading', cb);
  }

  onLoadingHidden(cb: () => any) {
    this.on('hide-loading', cb);
  }

  onDesignerStatusSet(cb: (args) => any) {
    this.on('set-designer-status', cb);
  }

  // onBeforeClose(id: string, cb: () => boolean) {
  //   this.on('on-before-close', ({metadataId}) => {
  //     if (id === metadataId) {
  //       return cb();
  //     }
  //     return true;
  //   });
  // }

  onCloseTab(id: string, cb: () => boolean) {
    if (!this.isTop) {
      return this.parentInstance.onCloseTab(id, cb);
    }
    this.on('close-tab', tabId => {
      if (id === tabId) {
        return cb();
      }
      return true;
    });
  }
  /* #endregion */


  /* #region  panel */
  addPanel(options: any) {
    this.emit('panel-added', options);
  }
  /* #endregion */

  /* #region  modal */
  addModal(options: any) {
    this.emit('panel-added', options, 'modal');
  }

  closeModal(id?: string) {
    if (this.parentInstance !== this) {
      this.parentInstance.closeModal(id);
    }
    this.emit('panel-removed', id, 'modal');
  }

  confirmModal(id: string): boolean {
    let result = true;
    // if (this.parentInstance !== this) {
    //   result = this.parentInstance.confirmModal(id);
    // }
    result = result && this.emit('confirm-modal', id) as boolean;
    return result;
  }

  cancelModal(id: string): boolean {
    let result = true;
    if (this.parentInstance !== this) {
      result = this.parentInstance.cancelModal(id);
    }
    result = result && this.emit('cancel-modal', id) as boolean;
    return result;
  }

  // addLeft    registryOpener....
  /* #endregion */

  /* #region  left rigion */

  activateLeft(frameId?: string) {
    frameId = frameId || this.frameId;
    if (this.isTop) {
      this.emit('activate-left', frameId);
    } else {
      this.parentInstance.activateLeft(frameId);
    }
  }
  /* #endregion */

  notify(level: 'error' | 'warning' | 'info', content: string) {
    if (this.isTop) {
      this.emit('show-notify', level, content);
    } else {
      this.parentInstance.notify(level, content);
    }
  }

  loading(message?: string): void {
    if (this.isTop) {
      this.emit('show-loading', message);
    } else {
      this.parentInstance.loading(message);
    }
  }

  loaded(): void {
    if (this.isTop) {
      this.emit('hide-loading');
    } else {
      this.parentInstance.loaded();
    }
  }

  setDesignerStatus(metadataId: string, isDirty: boolean) {
    if (this.isTop) {
      this.emit('set-designer-status', { id: metadataId, isDirty });
    } else {
      this.parentInstance.setDesignerStatus(metadataId, isDirty);
    }
  }

  // closeDesigner(metadataId: string) {
  //   if (this.isTop) {
  //     this.emit('close-designer', {id: metadataId});
  //   } else {
  //     this.parentInstance.closeDesigner(metadataId);
  //   }
  // }

  registerIDE(workspace: any) {
    // 用来把ide view实例与gsp对象绑定。
    // TODO： view实例监听gsp对象的操作放在这里。

    if (typeof workspace.onCloseDesigner === 'function') {
      this.on('close-designer', workspace.onCloseDesigner.bind(workspace));
    }
  }

  /* #region  private method */
  private on(name: string, cb: any) {
    let callbacks = this.events.get(name);
    if (!callbacks) {
      callbacks = [cb];
      this.events.set(name, callbacks);
    } else {
      callbacks.push(cb);
    }
  }

  private emit(name: string, ...params: any[]): boolean {
    const callbacks = this.events.get(name);

    if (!callbacks || !callbacks.length) { return true; }

    let result = true;
    const observableResult = new Array<boolean>(); // 同时支持返回boolean和Observable
    for (const cb of callbacks) {
      const cbResult = cb(...params);
      if (cbResult == null) {
        continue;
      }
      if (typeof cbResult === 'boolean') {
        result = result && cbResult;
      }
    }
    return result;
  }
  /* #endregion */
}

