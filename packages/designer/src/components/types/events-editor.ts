export interface EventsEditorMapItem {
    event: {
        label: string | undefined,
        name: string | undefined,
    },
    command: {
        id: string,
        label: string,
        name: string,
        handlerName: string,
        params?: any,
        showTargetComponent?: boolean;
        targetComponentId?: string;
        isNewGenerated?: boolean,
        isRtcCommand?: boolean,
        isInvalid: boolean
    },
    controller: {
        id: string,
        label: string,
        name: string,
    },
    targetComponent: {
        id: string,
        viewModelId: string,
    }
}

export interface EventsEditorActions {
    sourceComponent: {
        id: string,
        viewModelId: string,
        map: EventsEditorMapItem[],
    },
    path?: string
};

export interface ControllerListItem {
    label: string,
    name: string,
    id: string,
    handlerName: string,
    /** 当前命令需要选择目标组件*/
    showTargetComponent: boolean,
    cmpId: string,
    componentLists: any,
    targetComponent: any,
    isNewGenerated: any,
    isInvalid: boolean,
    property: any,
    isRtcCommand?: boolean,
}

export interface UseEventsEditorUtils {
    formProperties: (eventEditorService, formBasicService, domService, webCmdService, propertyData, viewModelId, eventList, switchEvents?: (propertyData, eventList) => object) => void;
    saveRelatedParameters: (eventEditorService, domService, webCmdService, propertyData: any, viewModelId: string, eventList, parameters: any) => void;
    jumpToMethod: (command: any) => void;
}

export interface Node {
    id: string;
    type: string;
    __parentId__?: string;
    contents?: Node[];
    /**
     * 组件类型
     */
    componentType?: string;
    [prop: string]: any;
}
export enum NodeType {
    /**
     * 隐藏区域
     */
    HiddenContainer = 'HiddenContainer',
    /**
     * 帮助控件
     */
    LookupEdit = 'LookupEdit',
    /**
     * 组件
     */
    Component = 'Component'
}

export interface UseEventsEditor {
    /**
  * 1. 获取已绑定命令的参数值（来自actions节点）
  * 2. 获取暂未绑定的命令参数值（来自viewmodel节点）
  * @param savedViewModelItem 
  * @param controllerListItem 
  * @param domJson 
  */
    getCommandParameter: (savedViewModelItem: any, controllerListItem: ControllerListItem, domJson: any) => any;
    /**
  * 事件编辑器-已有方法-命令路径处理 
  * @param propertyDataId 组件id
  * @param viewModelId 视图模型id
  * @param webCmdService 
  * @returns 
  */
    getEventPath: (propertyDataId: string, viewModelId: string, commandList: any) => { actionWithPath: any, viewModelDisplay: any };
    getAllComponentList: () => Array<any>;
    formTargetComponent: (boundEventItem: any, vmid: string) => void;

}
