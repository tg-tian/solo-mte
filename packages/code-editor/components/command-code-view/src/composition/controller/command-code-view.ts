import { Ref, ref } from "vue";
import { CodeAnalysisResult, OpenWithConfig } from "../../type/open-with";
import { FNotifyService } from "@farris/ui-vue";
import { OpenWithService } from "./open-with";
import { throttle } from "lodash-es";
import { IDisposable, IEventBus, SaveResult, getEventBusInstance } from "../../../../code-editor/src/composition/types/types";
import { ChangeInfo } from "../../../../code-editor/src/composition/editor-core/libs/interfaces/declaration";

declare const System: any;

const DEFAULT_SAVE_SUCCESS_TIP = "保存成功";
const DEFAULT_SAVE_FAILED_TIP = "保存失败";
const OPT_TOO_FREQUENT_TIP = "操作过于频繁，请稍后重试";

/**
 * 代码大纲定位信息
 * @remarks 用于向代码编辑页发送定位请求时
 */
export interface CodeLocationInfo {
    className?: string;
    methodName?: string;
}

/**
 * 编辑面板控制器
 * @remarks 控制编辑面板页面的初始化，处理保存、切换设计器/代码编辑器、切换导航等事件
 */
export class CommandCodeViewController {

    /**
     * 是否是通过代码视图打开的
     * @remarks
     * 如果是通过ide框架直接打开的标签页，则需要显示自己的“保存”按钮
     * 如果是通过代码视图打开的标签页，则需要向代码视图的事件总线注册保存回调方法
     */
    get fromCodeView(): boolean {
        return this._fromCodeView;
    }

    /** 编辑面板组件实例 */
    get editorPanel(): any {
        return this._editorPanel;
    }

    /** 文件路径 */
    get path(): string {
        return this._path;
    }

    /** 文件打开方式 */
    get openWithConfig(): OpenWithConfig | null {
        return this._openWithConfig;
    }

    /** 是否启用代码编辑器 */
    get hasCodeEditor(): boolean {
        return !!this._openWithConfig && !!this._openWithConfig.needCodeEditor;
    }

    /** 是否启用动态设计器 */
    get hasDesignerComponent(): boolean {
        return !!this._openWithConfig && !!this._openWithConfig.designerComponentUrl && !!this._designerComponent;
    }

    /** 动态设计器组件引用 */
    get designerComponent(): Ref<any> | null {
        return this._designerComponent;
    }

    /** 直接保存，并反馈结果（节流版本） */
    public throttledDirectlySave = () => { };

    private eventBus: IEventBus | null = null;

    private _path: string = "";
    private _openWithConfig: OpenWithConfig | null = null;
    private _designerComponent: Ref<any> | null = null;
    private _editorPanel: any;
    private _fromCodeView: boolean = false;
    /** 默认打开的关联文件路径 */
    private defaultOpen: string = '';

    private eventSubscription: IDisposable[] = [];
    private notifyService;
    private openWithService: OpenWithService;
    constructor() {
        this.openWithService = new OpenWithService();
        this.notifyService = new FNotifyService();
        // 首先，必须判断本页面是否是通过代码视图打开的
        this._fromCodeView = this.openWithService.getParam("fromCodeView") === "true";
        if (this.fromCodeView) {
            this.eventBus = getEventBusInstance();
        }
    }

    private subscribeOuterEvent(): void {
        if (!this.eventBus) {
            return;
        }
        // 订阅关联文件切换事件
        const switchFileSubscription = this.eventBus.subscribe('SwitchRelevantFile', (path: string) => {
            if (!!path && !!this.openWithConfig?.switchRelevantFile && this._designerComponent?.value) {
                this.openWithConfig.switchRelevantFile(path, this._designerComponent, this);
            }
        }, this, this.path);
        this.eventSubscription.push(switchFileSubscription);
        // 订阅标签页关闭事件
        const closeFileSubscription = this.eventBus.subscribe('CloseFile', () => {
            this.destroy();
        }, this, this.path);
        this.eventSubscription.push(closeFileSubscription);
        // 订阅类导航代码定位事件
        const codeLocateSubscription = this.eventBus.subscribe('CodeOutlineLocateRequest', (location: CodeLocationInfo) => {
            this.handleCodeLocateRequest(location);
        }, this, this.path);
        this.eventSubscription.push(codeLocateSubscription);
        // 订阅外层通知队列更新事件
        const notifyQueueSubscription = this.eventBus.subscribe('NotificationQueueUpdated', () => {
            this.handleNotification();
        }, this, this.path);
        this.eventSubscription.push(notifyQueueSubscription);
    }

    /**
     * 一一读取并处理外层框架通知
     * @remarks
     * 该方法需要在页面初始化完成后直接调用一次，以将初始化过程中未处理的通知处理干净
     * 如果遇到未约定的通知类型则直接跳过
     */
    private async handleNotification(): Promise<void> {
        if (!this.eventBus) {
            return;
        }
        const { eventBus } = this;
        while (eventBus.hasMoreNotification(this.path)) {
            const notification = eventBus.fetchNotification(this.path);
            const handlers = this.openWithConfig?.outerNotificationHandlers || {};
            const handler = handlers[notification.eventName];
            if (!!handler && typeof handler === 'function') {
                try {
                    const result = await handler(this, notification.eventPayload);
                    (this.eventBus as any).responseNotificationResult(notification, result, true);
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }

    /**
     * 初始化编辑面板控制器
     * @param editorPanel 编辑面板组件实例
     */
    public init(loading: Ref<boolean>, codeEditorDesigner: Ref<any>, processEdit: Ref<any>): void {
        // 设置组件实例
        // 在其他位置用到codeEditor这个固定属性
        this._editorPanel = { loading: loading, codeEditor: codeEditorDesigner };
        // 设置当前文件路径
        this._path = this.openWithService.getParam("id") || "";
        // 获取文件打开方式
        this._openWithConfig = this.openWithService.getOpenWithConfig(this.path);

        if (this._openWithConfig.correctPath && typeof this._openWithConfig.correctPath === 'function') {
            try {
                this.defaultOpen = this._path;
                this._path = this._openWithConfig.correctPath(this._path);
            } catch (err) { console.error("修正文件路径时出错", err); }
        }
        this.setupCustomGlobalCssStyle();
        // 初始化编辑面板组件
        setTimeout(async () => {
            this._editorPanel.loading.value = true;
            try {
                this._openWithConfig?.beforeInit && await this._openWithConfig.beforeInit(this);
                await this.initEditorPanel(processEdit);
                this._openWithConfig?.afterInit && await this._openWithConfig.afterInit(this);
                this.fromCodeView && this.registerSaveCallback();
                this.fromCodeView && this.subscribeOuterEvent();
                this.fromCodeView && this.handleNotification();
                // 初始化“直接保存”按钮回调方法
                this.throttledDirectlySave = throttle(() => {
                    this.directlySave();
                }, 600);
                // 如果在代码视图之外打开则还需要单独监听快捷键
                // if (!this.fromCodeView) {
                //   fromEvent(document, 'keydown').subscribe((event: KeyboardEvent) => {
                //     // 监听保存快捷键 ctrl+s
                //     if (event.key === "s" && event.ctrlKey) {
                //       event.preventDefault();
                //       this.throttledDirectlySave && this.throttledDirectlySave();
                //     }
                //   });
                // }
            } finally {
                this._editorPanel.loading.value = false;
            }
        });
    }

    /** 设置自定义的全局CSS样式 */
    private setupCustomGlobalCssStyle(): void {
        if (this.openWithConfig && this.openWithConfig.customGlobalCssStyle) {
            const style = document.createElement("style") as HTMLStyleElement;
            try {
                style.appendChild(document.createTextNode(this.openWithConfig.customGlobalCssStyle));
                const head = document.getElementsByTagName("head")[0];
                head.appendChild(style);
            } catch (err) { console.error(err); }
        }
    }

    /** 销毁编辑面板页面 */
    public destroy(): void {
        // 释放订阅事件资源
        if (this.eventSubscription && this.eventSubscription.length > 0) {
            for (const subscription of this.eventSubscription) {
                subscription.unsubscribe(this);
            }
        }
    }

    /** 切换到代码编辑器并定位光标 */
    private handleCodeLocateRequest(location: CodeLocationInfo): void {
        if (this.hasCodeEditor && !!location) {
            this.switchMode(true);
            setTimeout(() => {
                this._editorPanel.codeEditor.value.position(this.path, location.className, location.methodName);
            }, 15);
        }
    }

    private handleCodeChanged(): void {
        if (!this.eventBus) {
            return;
        }
        this._editorPanel.codeEditor.value.onChanged((path: string, changeInfo: ChangeInfo) => {
            if (path !== this.path) {
                return;
            }
            this.eventBus?.emit('FileChanged', { path, changed: changeInfo.changed });
        });
        this._editorPanel.codeEditor.value.onOutlineChanged((path: string, changeInfo: ChangeInfo) => {
            if (path !== this.path) {
                return;
            }
            if (!changeInfo.hasFatalError) {
                this.eventBus?.emit('CodeOutlineChanged', { path, classes: changeInfo.classes });
            }
        });
    }

    /** 初始化代码大纲信息 */
    private async initCodeOutline(): Promise<void> {
        if (!this.eventBus) {
            return;
        }
        if (this.hasCodeEditor) {
            const codeInfo = await this._editorPanel.codeEditor.value.resolve(this.path, true);
            if (!!codeInfo && codeInfo.classes) {
                this.eventBus.emit('CodeOutlineChanged', { path: this.path, classes: codeInfo.classes });
            }
        }
    }

    /**
     * 通知代码视图本页面关联的设计器的文件变更状态
     * @remarks 在初始化时向设计器组件绑定该回调函数
     * @param changed 是否变更
     */
    public emitDesignerChanged = (changed: boolean): void => {
        this.eventBus && this.eventBus.emit('DesignerFileChanged', { path: this.path, changed });
    };

    /** 初始化编辑面板组件 */
    private async initEditorPanel(processEdit: Ref<any>): Promise<void> {
        // 初始化代码编辑器
        if (this.openWithConfig?.needCodeEditor) {
            this._editorPanel.hasCodeEditor = true;
            this._editorPanel.showCodeEditor = true;
            // // 配置代码编辑器工具栏按钮
            // if (this.openWithConfig.toolButtons && this.openWithConfig.toolButtons.length > 0) {
            //   for (const toolBtn of this.openWithConfig.toolButtons) {
            //     toolBtn.handler = () => {
            //       toolBtn.handleClick(this);
            //     };
            //   }
            //   this._editorPanel.codeEditorDesigner.toolBtnsConfig = this.openWithConfig.toolButtons;
            //   this._editorPanel.detectChanges();
            // }
            // 打开对应的代码文件
            let filePath = this.path;
            if (this.openWithConfig?.getCodeFilePath) {
                try {
                    filePath = await this.openWithConfig.getCodeFilePath(this.path, this);
                } catch (error) {
                    console.error(error);
                }
            }
            let fileContent = '';
            if (this.openWithConfig && this.openWithConfig.getFile) {
                fileContent = await this.openWithConfig.getFile(this.path);
            }
            await this._editorPanel.codeEditor.value.open(filePath, fileContent);
            this.handleCodeChanged();
            await this.initCodeOutline();
        } else {
            this._editorPanel.showCodeEditor = false;
        }
        // 初始化设计器组件
        this._editorPanel.hasDesignerComponent = !!this.openWithConfig?.designerComponentUrl;
        if (!this.openWithConfig?.designerComponentUrl) {
            return;
        }
        this._editorPanel.loadingDesignerComponent = true;
        this._designerComponent = await this.initDesignerComponent(processEdit);
        this._editorPanel.hasDesignerComponent = !!this._designerComponent;
        this._editorPanel.loadingDesignerComponent = false;
        // 切换到用户实际想要打开的文件对应的编辑器状态（关联文件特性）
        const targetFilePath = this.openWithService.getParam("open") || this.defaultOpen;
        if (!!targetFilePath && !!this.openWithConfig.switchRelevantFile && this._designerComponent) {
            this.openWithConfig.switchRelevantFile(targetFilePath, this._designerComponent, this);
        }
    }

    /**
     * 初始化设计器动态组件
     * @param url 组件js文件路径
     * @returns 设计器组件
     */
    private async initDesignerComponent(processEditInstance: Ref<any>): Promise<any> {
        try {
            // const module = await System.import(url + `?v=${new Date().getTime()}`);
            // const moduleName = Object.keys(module).pop();
            // const moduleFactory = module[moduleName] as NgModuleFactory<any>;
            // const moduleRef = moduleFactory.create(this.injector);
            // const entryComponent = moduleRef['_bootstrapComponents'][0];
            // if (entryComponent) {
            //   const cmpFactory = moduleRef.componentFactoryResolver.resolveComponentFactory(entryComponent);
            //   // this._editorPanel.designerContainer.clear();
            //   const componentRef: ComponentRef<any> = this._editorPanel.designerContainer.createComponent(cmpFactory);
            //   // 初始化设计器组件，绑定切换、导航等事件
            if (this.openWithConfig && this.openWithConfig.initDesignerComponent && typeof this.openWithConfig.initDesignerComponent === 'function') {
                this.openWithConfig.initDesignerComponent(processEditInstance, this);
            }
            return Promise.resolve(processEditInstance);
            // }
        } catch (err) {
            console.error(`[代码视图]加载设计器组件失败`);
        }
        return null;
    }

    /**
     * 切换代码编辑器/设计器
     * @param showEditor 显示代码编辑器，否则显示设计器
     */
    public switchMode(showEditor?: boolean): void {
        // this._editorPanel.switchMode(showEditor);
    }

    /**
     * 保存
     * @remarks
     * 按照顺序进行如下操作：
     * 1. 如果启用了代码编辑器，调用代码编辑器的保存方法（可以通过配置一个空的保存方法，从而将所有保存逻辑集中到设计器组件上）
     * 2. 如果启用了动态设计器组件，调用设计器的保存回调方法，传入代码编辑器内容、代码编辑器内容解析结果、当前控制器实例
     * 3. 如果以上保存回调操作均成功执行，则调用代码编辑器的保存方法，并提示外层组件文件状态变更（仅当保存方法均执行成功时变更文件状态）
     * @returns 保存结果
     */
    public async save(): Promise<SaveResult> {
        let failTip = "保存失败";  // 默认的保存失败提示信息
        let editorSaveSuccess = true, designerSaveSuccess = true;
        let analysis: CodeAnalysisResult = {
            content: '',
            classes: undefined
        };
        if (this.hasCodeEditor) {
            analysis = await this._editorPanel.codeEditor.value.resolve(this.path);
            if (!analysis) {
                return { success: false, tip: failTip };  // 文件尚未打开则静默失败
            }
        }
        // 执行代码编辑器的保存操作
        if (this.hasCodeEditor) {
            try {
                if (this.openWithConfig?.saveFile) {
                    editorSaveSuccess = await this.openWithConfig.saveFile(this.path, analysis.content);
                }
            } catch (err) { editorSaveSuccess = false; }
        }
        // 执行动态设计器组件的保存操作
        if (this.hasDesignerComponent && this.openWithConfig?.save && this._designerComponent?.value) {
            try {
                const errorTip = await this.openWithConfig.save(
                    this._designerComponent,
                    analysis,
                    this,
                    editorSaveSuccess,
                );
                // 判断保存操作的执行结果
                if (!errorTip) {
                    designerSaveSuccess = true;
                } else {
                    designerSaveSuccess = false;
                    failTip = errorTip;
                }
            } catch (err) { designerSaveSuccess = false; }
        }
        // 仅当所有保存操作均执行成功后，才变更文件状态
        if (editorSaveSuccess && designerSaveSuccess) {
            if (this.hasCodeEditor) {
                await this._editorPanel.codeEditor.value.save(this.path);
                this.eventBus && this.eventBus.emit('FileChanged', { path: this.path, changed: false });
            }
            this.eventBus && this.eventBus.emit('DesignerFileChanged', { path: this.path, changed: false });
        }
        //  this._editorPanel.detectChanges();
        return (!editorSaveSuccess || !designerSaveSuccess) ? { success: false, tip: failTip } : { success: true };
    }

    /** 向代码视图注册保存回调函数 */
    private registerSaveCallback(): void {
        const callback = () => {
            return this.save();
        };
        this.eventBus && this.eventBus.registerSaveCallback(this.path, callback, true);
    }

    /**
     * 请求代码视图组件弹出通知消息
     * @param option 通知配置
     */
    public requestNotifyMessage(option): void {
        this.eventBus && this.eventBus.emit("NotifyMessage", option);
    }

    /** 正在执行保存操作（在代码视图之外打开前端构件设计器） */
    private directlySaving: boolean = false;

    /**
     * 直接保存，并反馈结果
     * 不通过代码视图打开时，点击保存按钮直接触发保存操作
     */
    public async directlySave(): Promise<void> {
        if (this.directlySaving) {
            console.warn(OPT_TOO_FREQUENT_TIP);
            return;
        }
        try {
            this.directlySaving = true;
            const result = await this.save();
            if (result.success) {
                const tip = result.tip || DEFAULT_SAVE_SUCCESS_TIP;
                this.notifyService.info({ position: 'top-center', message: tip });
            } else {
                const tip = result.tip || DEFAULT_SAVE_FAILED_TIP;
                this.notifyService.error({ position: 'top-center', message: tip });
            }
        } catch (err) {
            console.error("保存操作执行失败", err);
        } finally {
            this.directlySaving = false;
        }
    }
}
