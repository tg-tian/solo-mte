import { CodeLocationInfo, CodeOutlineInfo, IClass, IMethod } from "../type/code-outline";
import { CommonFileNavTreeDataService } from "../type/nav/common-file";
import { EditorEventType } from "../type/editor-event";
import { NavTreeNode } from "../type/tree";
import { EditorController } from "./editor.controller";

const ICON_CLASS = "nav-treenode-icon nav-treenode-icon--outline_class";
const ICON_METHOD = "nav-treenode-icon nav-treenode-icon--outline_method";

/** 类视图导航数据服务 */

export class ClassNavTreeDataSource extends CommonFileNavTreeDataService {

    /** 由打开页签的文件路径到其代码大纲导航树数据的映射 */
    private mainPath2OutlineData = new Map<string, NavTreeNode[]>();

    /** 用于生成递增的节点id序列号 */
    private counter = 0;
    constructor(editorController: EditorController) {
        super();
        this.editorController = editorController;
        this.afterPropertySet();
    }
    afterPropertySet(): void {
        this.subscribeOuterEvent();
    }

    private subscribeOuterEvent(): void {
        const eventBus = this.editorController?.eventBus;
        // 订阅代码大纲变化事件，维护大纲数据映射（新增或更新条目）
        eventBus?.subscribe(EditorEventType.CodeOutlineChanged, (info: CodeOutlineInfo) => {
            this.handleCodeOutlineChanged(info);
        }, this);
        // 订阅当前标签页切换事件，在当前页签变更时，通知导航树组件刷新数据
        eventBus?.subscribe(EditorEventType.TabSelected, () => {
            this.handleTabSelected();
        }, this);
        // 订阅标签页关闭事件，当文件关闭时，维护大纲数据映射（删除对应的条目）
        eventBus?.subscribe(EditorEventType.CloseFile, (path: string) => {
            this.handleCloseFile(path);
        }, this);
    }

    private handleCodeOutlineChanged(info: CodeOutlineInfo): void {
        if (!info || !info.path || !info.classes) {
            return;
        }
        const treeData = this.mapIClass2TreeData(info.classes, info.path);
        this.mainPath2OutlineData.set(info.path, treeData);
        this.handleTabSelected();
    }

    private handleTabSelected(): void {
        if (this.refreshNavTreeCallback && typeof this.refreshNavTreeCallback === 'function') {
            this.refreshNavTreeCallback();
        }
    }

    private handleCloseFile(path: string): void {
        if (!!path && this.mainPath2OutlineData.has(path)) {
            this.mainPath2OutlineData.delete(path);
        }
        this.handleTabSelected();
    }

    /**
     * 将类结构信息转化为大纲树节点数据
     * @remarks 同时在此处完成图标样式类的指定
     */
    private mapIClass2TreeData(classes: IClass[], path: string): NavTreeNode[] {
        this.counter = 0;
        const nodes = [] as any;
        for (const _class of classes) {
            const newClassNode = this.createClassNode(_class, path);
            if (_class.methods) {
                for (const _method of _class.methods) {
                    const newMethodNode = this.createMethodNode(_class, _method, path);
                    newClassNode.children?.push(newMethodNode);
                }
            }
            nodes.push(newClassNode);
        }
        return nodes;
    }
    private createClassNode(_class: IClass, path: string): NavTreeNode {
        const serialNumber = ++this.counter;
        const id = `${path}_${_class.code}_${serialNumber}`;
        return {
            id,
            data: {
                id,
                name: _class.code,
                path,
                canOpen: false,
                icon: ICON_CLASS,
                appendInfo: {
                    className: _class.code
                } as CodeLocationInfo
            },
            icon: ICON_CLASS,
            expandedIcon: ICON_CLASS,
            collapsedIcon: ICON_CLASS,
            children: [],
            expanded: true,
            leaf: false
        };
    }
    private createMethodNode(_class: IClass, _method: IMethod, path: string): NavTreeNode {
        const serialNumber = ++this.counter;
        const id = `${path}_${_class.code}_${_method.code}_${serialNumber}`;
        return {
            id,
            data: {
                id,
                name: _method.code,
                path,
                canOpen: false,
                icon: ICON_METHOD,
                appendInfo: {
                    className: _class.code,
                    methodName: _method.code
                } as CodeLocationInfo
            },
            icon: ICON_METHOD,
            expandedIcon: ICON_METHOD,
            collapsedIcon: ICON_METHOD,
            children: [],
            expanded: false,
            leaf: true
        };
    }

    enableLayeredLoading(): boolean {
        return false;
    }

    getChildren(): Promise<NavTreeNode[]> {
        const empty = Promise.resolve([]);
        const contextService = this.editorController?.getContextService();
        if (contextService) {
            const curPath = contextService.currentFileItem && contextService.currentFileItem.mainPath;
            if (!curPath) {  // 当前文件已被关闭，暂无数据
                return empty;
            }
            const treeData = this.mainPath2OutlineData.get(curPath);
            if (treeData) {
                return Promise.resolve(treeData);
            }
        }
        return empty;
    }

    handleDblClick(node: NavTreeNode): boolean {
        // 通过事件总线将大纲定位信息发送给对应的页签，通知其定位代码
        if (!!node && !!node.data && !!node.data.appendInfo) {
            this.editorController?.eventBus.emit(EditorEventType.CodeOutlineLocateRequest, node.data.appendInfo, node.data.path);
        }
        return false;
    }

}
