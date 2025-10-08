/**
 * 代码编辑器中央控制器
 * @remarks
 * 掌握标签页、中心编辑器等组件实例，对外封装打开文件、关闭文件等基本接口
 */
import { throttle } from "lodash-es";
import { EventBusHandler } from "../event-bus/handler";
import { IEventBus, SaveResult } from "../event-bus/lib/types";
import { FileItem } from "../type/file-item";
import { CodeTab } from "../type/tab";
import { ContextService } from "./context.service";
import { FMessageBoxService } from "@farris/ui-vue";
import { FNotifyService } from "@farris/ui-vue";
import { CommonEvent } from "../event-bus/lib/event-bus";
import { Observable } from "rxjs";
import { NavTreeData } from "../type/tree";
import { EditorEventType } from "../type/editor-event";

export class EditorController {
    context: ContextService;
    DEFAULT_SAVE_ALL_SUCCESS_TIP = "全部保存成功";
    DEFAULT_SAVE_SUCCESS_TIP = "保存成功";
    DEFAULT_SAVE_FAILED_TIP = "保存失败";
    // 标签页
    tabs: any;
    editors: any;
    fileNavTree: any;
    classNavTree: any;
    messageService: any;
    notifyService: any;
    eventBusHandler: EventBusHandler;
    /** 保存当前页签的文件 - 节流版本 */
    public throttledSaveCurrentFile: () => void;
    get eventBus(): IEventBus {
        return this.eventBusHandler && this.eventBusHandler.eventBus;
    }
    /**
     * 通知表单设计器代码编辑器内容已修改
     */
    private detectFileDirtyHandler = (data) => { };
    constructor() {
        this.eventBusHandler = new EventBusHandler();
        this.notifyService = new FNotifyService();
        this.messageService = FMessageBoxService;
        this.context = new ContextService();
        this.eventBusHandler.getInstance();
        this.throttledSaveCurrentFile = throttle(() => {
            this.doSaveCurrentFile(true);
        }, 600);
    }
    public getEventBusId(): string {
        return this.eventBusHandler.eventBusId;
    }
    public getContextService(): ContextService {
        return this.context;
    }
    /**
     * 初始化
     * @param tabInstanceRef 
     * @param editorPanelsInstanceRef 
     * @param fileNavTreeInstanceRef 
     * @param classNavTreeInstanceRef 
     * @param detectFileDirtyHandler 
     */
    public init(tabInstanceRef: any, editorPanelsInstanceRef: any, fileNavTreeInstanceRef: any, classNavTreeInstanceRef: any, detectFileDirtyHandler): void {
        this.tabs = tabInstanceRef;
        this.editors = editorPanelsInstanceRef;
        this.detectFileDirtyHandler = detectFileDirtyHandler;
        this.fileNavTree = fileNavTreeInstanceRef;
        this.classNavTree = classNavTreeInstanceRef;
        // 订阅内部和外部事件
        this.subscribeOuterEvent();
    }

    private subscribeOuterEvent(): void {
        // 监听导航树打开文件事件
        this.eventBus.subscribe(EditorEventType.OpenFile, (info: { path: string, data: NavTreeData }) => {
            this.openFile(info.path, info.data.appendInfo);
            // this.root.detectChanges();
        }, this);
        // 监听文件内容变更事件
        this.eventBus.subscribe(EditorEventType.FileChanged, (info: { path: string, changed: boolean }) => {
            const fileItem = this.context.getFileItemByPath(info.path);
            const tab = this.tabs.value.getTab(info.path);
            if (!fileItem || !tab) {
                return;
            }
            fileItem.isCodeFileDirty = !!info.changed;
            tab.isDirty = fileItem.isDirty;
            this.notifyFormDirtyInfo();
            // this.root.detectChanges();
        }, this);
        // 监听设计器文件内容变更事件
        this.eventBus.subscribe(EditorEventType.DesignerFileChanged, (info: { path: string, changed: boolean }) => {
            const fileItem = this.context.getFileItemByPath(info.path);
            const tab = this.tabs.value.getTab(info.path);
            if (!fileItem || !tab) {
                return;
            }
            fileItem.isDesignerFileDirty = !!info.changed;
            tab.isDirty = fileItem.isDirty;
            // 通知表单，代码编辑器已修改
            this.notifyFormDirtyInfo();
            // this.root.detectChanges();
        }, this);
        // 监听代发消息提示事件
        this.eventBus.subscribe(EditorEventType.NotifyMessage, (option) => {
            if (!!option && !!option.type) {
                this.notifyService[option.type](option);
                // this.root.detectChanges();
            }
        }, this);
        this.eventBus.subscribe(EditorEventType.TabSelected, (path: string) => {
            this.fileNavTree?.value?.selectByPath(path);
            this.classNavTree?.value?.selectByPath(path);
        }, this);
    }
    /**
      * 处理标签页选中事件
      * @param path 文件路径
      */
    public handleTabSelected(path: string): void {
        const fileItem = this.context.getFileItemByPath(path);
        // 如果路径与上下文中记录的当前文件路径不符，则需要切换相关组件的内容
        if (path !== this.context.currentFilePath && !!fileItem) {
            this.showFile(fileItem.curPath);
        }
        // 通知左侧导航树切换选中节点（注意：该事件必须在当前文件路径变更之后发出）
        this.eventBus.emit(EditorEventType.TabSelected, fileItem?.curPath);
    }
    public openFile(data: any, appendInfo?: any): void {
        const { path, webComponentId, webCommandId, metadataReadonly = false } = data;
        // 判断文件是否已经被打开
        const isFileExist = this.context.isFileExist(path);
        if (isFileExist) {
            // 如果文件已经被打开，则直接显示已有文件
            const oldFileItem = this.context.getFileItemByPath(path);
            const mainPath = oldFileItem && oldFileItem.mainPath;
            if (!!mainPath && !!appendInfo) {
                this.eventBus.setAppendInfo(mainPath, appendInfo);
            }
            this.showFile(path);
            return;
        }
        // 文件没有被打开，新增页签并切换编辑器
        const newFileItem = this.context.openFile(path);
        if (!newFileItem) {
            return;  // 传入的path是可能为空的
        }
        if (!!newFileItem.mainPath && !!appendInfo) {
            this.eventBus.setAppendInfo(newFileItem.mainPath, appendInfo);
        }
        this.tabs.value.addTab(new CodeTab(newFileItem.mainPath, newFileItem.title, newFileItem.icon), true);
        const success = this.editors.value.open(newFileItem.mainPath, { "open": path, webComponentId, webCommandId, metadataReadonly });
        if (!success) {
            console.error("不存在针对该文件的打开方式配置", newFileItem.mainPath);
            return;
        }
        this.showFile(path);  // 为了更新关联文件标题以及切换关联文件内容
    }

    public showFile(path: string): void {
        // 获取当前已有文件条目
        const fileItem = this.context.getFileItemByPath(path);
        // 如果正在显示这个页签，则仅需要进行关联文件切换
        const isCurrentTab = this.context.currentFilePath === path;
        // 切换当前显示文件路径
        this.context.currentFilePath = path;
        // 如果路径切换不成功，说明文件条目不存在
        if (this.context.currentFilePath !== path) {
            return;
        }
        const mainPath = fileItem?.mainPath;
        if (fileItem) {
            fileItem.curPath = path;
        }
        // 按照新的路径更新标签页的标题和图标
        this.updateTabTitle(path);
        // 按照新的路径进行关联文件切换
        // this.eventBus.emit(EditorEventType.SwitchRelevantFile, path, mainPath);
        // 显示目标页签和标签页
        if (!isCurrentTab) {
            this.tabs.value.selectById(mainPath);
            this.editors.value.show(mainPath);
        }
    }

    /**
     * 更新标签页的标题和图标
     * @param path 文件路径
     */
    private updateTabTitle(path: string): void {
        const fileItem = this.context.getFileItemByPath(path);
        if (!fileItem) {
            return;
        }
        // const tab = this.tabs.value.getTab(fileItem.mainPath);
        // tab.updateTitle(
        //     FileItem.getTitleFromPath(path),
        //     FileItem.getIconFromPath(path)
        // );
    }
    /**
   * 
   */

    public closeFile(path: string, force?: boolean): void {
        const fileItem = this.context.getFileItemByPath(path);
        if (!fileItem) {
            return;
        }
        if (!fileItem.isDirty || force) {
            this.directCloseFile(fileItem);
            return;
        }
        this.closeFiles([fileItem]).then(() => {
            this.notifyFormDirtyInfo();
        });
    }
    /**
 * 关闭指定的几个文件条目（对应的标签页）
 * @remarks 如果存在未保存的文件则先显示该文件并弹框提示用户是否保存
 * @param items 文件条目
 * @returns 返回Observable以便在执行完成后追加操作，别忘记订阅
 */
    private async closeFiles(items: FileItem[]): Promise<void> {
        const self = this;
        const promises = items.map(item => {
            return new Promise((resolve) => {
                // 如果文件未修改则直接关闭
                if (!item.isDirty) {
                    self.directCloseFile(item);
                    resolve(null);
                } else {  // 如果存在未保存的修改，则提示用户成功保存后关闭
                    this.showFile(item.curPath);  // 询问用户是否保存前先切换到对应的页面
                    // 优先显示标签页中的标题
                    const tab = this.tabs && this.tabs.value.getTab(item.mainPath);
                    const title = tab && tab.title || item.title;
                    const messageBox = this.messageService.show({
                        title: `是否要保存对${title}的更改？`,
                        detail: '如果不保存，你的更改将丢失。',
                        okButtonText: '',
                        cancelButtonText: '',
                        buttons: [
                            {
                                text: '保存',
                                class: 'btn btn-primary',
                                handle: () => {
                                    self.saveAndCloseFile(item.mainPath, true);
                                    messageBox.close();
                                    resolve(null);
                                }
                            },
                            {
                                text: '不保存',
                                class: 'btn btn-secondary',
                                handle: () => {
                                    self.directCloseFile(item);
                                    messageBox.close();
                                    // this.root.closeWithoutSave.emit();
                                    resolve(null);
                                }
                            },
                            {
                                text: '取消',
                                class: 'btn btn-secondary',
                                handle: () => {
                                    messageBox.close();
                                    resolve(null);
                                }
                            }
                        ]
                    });
                }
            });
        });
        // 等待所有 Promise 完成
        await Promise.all(promises);
    }
    /**
 * 保存并关闭文件
 * @param path 标签页路径
 * @param ignoreSuccessTip 不弹出保存成功提示
 */
    private async saveAndCloseFile(path: string, ignoreSuccessTip: boolean = false): Promise<void> {
        const result = await this.doSaveCurrentFile(true, path, ignoreSuccessTip);
        if (result && result.success) {
            this.closeFile(path, true);
        }
    }
    /** 直接关闭文件 */
    private directCloseFile(item: FileItem) {
        if (this.context.removeFile(item.mainPath)) {
            const { mainPath } = item;
            this.eventBus.emit(EditorEventType.CloseFile, mainPath, mainPath);
            this.tabs.value.removeTab(mainPath);
            this.editors.value.close(mainPath);
            this.eventBus.clearNotificationQueue(mainPath);
            this.eventBus.clearSaveCallback(mainPath);
            // 当文件关闭时，需要将当前文件路径也设置为空
            if (this.context.currentFileItem && this.context.currentFileItem.mainPath === mainPath) {
                this.context.currentFilePath = '';
            }
        }
    }

    // public switchView(force?: boolean): void {
    //     if (!!force) {
    //         this.directSwitchView();
    //         return;
    //     }
    //     const hasDirtyFile = this.context.hasDirtyFile();
    //     if (hasDirtyFile) {
    //         const message = this.msgSrv.show('warning', '存在尚未保存的文件，是否继续跳转？', {
    //             initialState: {
    //                 buttons: [
    //                     {
    //                         text: '保存并跳转',
    //                         cls: 'btn btn-primary',
    //                         handle: async () => {
    //                             message.close();
    //                             try {
    //                                 const results = await this.doSaveAllFile(true, true);
    //                                 this.root.saved.emit()
    //                                 if (this.isAllSavedSuccess(results)) {
    //                                     this.directSwitchView();
    //                                 }
    //                             } catch (err) { }
    //                         }
    //                     },
    //                     {
    //                         text: '仅跳转',
    //                         cls: 'btn btn-secondary',
    //                         handle: () => {
    //                             message.close();
    //                             this.root.closeWithoutSave.emit();
    //                             this.directSwitchView();
    //                         }
    //                     },
    //                     {
    //                         text: '取消',
    //                         cls: 'btn btn-secondary',
    //                         handle: () => {
    //                             message.close();
    //                         }
    //                     }
    //                 ]
    //             }
    //         });
    //     } else {
    //         this.directSwitchView();
    //     }
    // }
    /**
     * 直接关闭所有标签页
     */
    private closeAllFileDirectly(): void {
        const items = this.context.fileItems;
        const itemsToRemove = [] as any;
        for (const item of items) {
            itemsToRemove.push(item);
        }
        for (const itemToRemove of itemsToRemove) {
            try {
                this.directCloseFile(itemToRemove);
            } catch (err) {
                console.log("销毁标签页失败", err);
            }
        }
    }
    public async doSaveAllFile(notifyResult: boolean = false, ignoreSuccessTip: boolean = false): Promise<SaveResult[]> {
        const resultArr = await this.saveAllFile();
        for (const result of resultArr) {
            if (result && !!result.mainPath && !!result.success) {
                this.resetFileChanged(result.mainPath);
            }
        }
        if (notifyResult && resultArr && resultArr.length > 0) {
            this.notifyAllSaveResult(resultArr, ignoreSuccessTip);
        }
        return resultArr;
    }
    /**
     * 保存全部文件
     * @remarks 将保存全部有变更的文件（标签页可能配置“未变更也保存”选项）
     * @returns 保存结果
     */
    private async saveAllFile(): Promise<SaveResult[]> {
        // 为保存结果设置默认的路径和名称信息
        const setDefaultPath = (fileItem: FileItem, saveResult: SaveResult): SaveResult => {
            saveResult && (saveResult.curPath = fileItem.curPath);
            saveResult && (saveResult.mainPath = fileItem.mainPath);
            saveResult && (saveResult.name = fileItem.title);
            return saveResult;
        };
        const results: Promise<SaveResult>[] = [];
        for (const fileItem of this.context.fileItems) {
            const { mainPath } = fileItem;
            const callbackInfo = this.eventBus.getSaveCallback(mainPath);
            const callback = callbackInfo && callbackInfo.callback;
            if (!callback || typeof callback !== 'function') {
                continue;
            }
            // 如果文件数据未变更且未设置“未变更也保存”选项，则不保存该条目
            const { alwaysSave } = callbackInfo;
            if (!fileItem.isDirty && !alwaysSave) {
                continue;
            }
            const saveResult = callback().then((result) => {
                return setDefaultPath(fileItem, result);
            }).catch(() => {
                return setDefaultPath(fileItem, { success: false });
            });
            results.push(saveResult);
        }
        let saveResultArr: SaveResult[] = [];
        try {
            saveResultArr = await Promise.all(results);
        } catch (err) {
            console.error(err);
        }
        // this.root.saved.emit();
        return saveResultArr;
    }
    /**
 * 保存当前文件
 * @param path 指定一个标签页路径，保存该标签页的文件（而不是保存当前文件）
 * @remarks 无论当前文件是否有变更都重新执行其保存回调函数
 * @returns 保存结果，如果为空则表示当前没有文件被打开
 */
    private async saveCurrentFile(path?: string): Promise<SaveResult | null> {
        // 获取当前文件条目路径
        const fileItem = path ? this.context.getFileItemByPath(path) : this.context.currentFileItem;
        if (!fileItem) {
            return Promise.resolve(null);
        }
        // 获取保存回调函数
        const callbackInfo = this.eventBus.getSaveCallback(fileItem.mainPath);
        const callback = callbackInfo && callbackInfo.callback;
        if (!callback || typeof callback !== 'function') {
            return Promise.resolve(null);
        }
        // 执行保存操作
        let saveResult: SaveResult | null = null;
        try {
            saveResult = await callback();
        } catch {
            saveResult = { success: false };
        }
        // this.root.saved.emit();
        saveResult && (saveResult.curPath = fileItem.curPath);
        saveResult && (saveResult.mainPath = fileItem.mainPath);
        saveResult && (saveResult.name = fileItem.title);
        return saveResult;
    }
    public async doSaveCurrentFile(notifyResult: boolean = false, path?: string, ignoreSuccessTip: boolean = false): Promise<SaveResult | null> {
        const result = await this.saveCurrentFile(path);
        if (result && !!result.mainPath && !!result.success) {
            this.resetFileChanged(result.mainPath);
        }
        if (notifyResult && !!result) {
            if (!result.success || !ignoreSuccessTip) {  // 判断是否忽略成功提示信息
                this.notifyOneSaveResult(result);
            }
        }
        return result;
    }
    private resetFileChanged(mainPath: string): void {
        const fileItem = this.context.getFileItemByPath(mainPath);
        const tab = this.tabs.value.getTab(mainPath);
        if (!fileItem || !tab) {
            return;
        }
        fileItem.isCodeFileDirty = false;
        fileItem.isDesignerFileDirty = false;
        tab.isDirty = fileItem.isDirty;
        // this.root.detectChanges();
    }
    private notifyAllSaveResult(results: SaveResult[], ignoreSuccessTip: boolean = false): void {
        if (!results || results.length === 0) {
            return;
        }
        let allSuccess = true;
        for (const result of results) {
            if (!result.success) {
                const tip = this.DEFAULT_SAVE_FAILED_TIP;
                const message = `${result.name} ${tip}`;
                this.messageService.error(message);
                allSuccess = false;
            }
        }
        if (allSuccess && !ignoreSuccessTip) {
            this.notifyService.success({ position: 'top-center', message: this.DEFAULT_SAVE_ALL_SUCCESS_TIP });
        }
    }

    private notifyOneSaveResult(result: SaveResult): void {
        if (!result) {
            return;
        }
        if (result.success) {
            this.notifyService.success({ position: 'top-center', message: this.DEFAULT_SAVE_SUCCESS_TIP });
        } else {
            this.notifyService.error({ position: 'top-center', type: 'error', msg: this.DEFAULT_SAVE_FAILED_TIP, timeout: 3500 });
        }
    }
    public sendNotification(path: string, event: CommonEvent): Observable<any> | null {
        // 如果找不到path对应的文件条目，说明文件尚未打开，静默失败
        const fileItem = this.context.getFileItemByPath(path);
        if (!fileItem || !fileItem.mainPath) {
            return null;
        }
        return this.eventBus.pushNotificationQueue(fileItem.mainPath, event);
    }
    private notifyFormDirtyInfo() {
        if (this.detectFileDirtyHandler) {
            const flag = this.context.hasDirtyFile();
            this.detectFileDirtyHandler(flag);
        }
    }
}
