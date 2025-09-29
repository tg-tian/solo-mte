import { WebCommand } from "../components/view-model-designer/method-manager/entity/web-command";
import { Ref } from "vue";
export interface UseCommandBuilderService {
    addControllerMethod: (methodCode: string, methodName: string) => void;
    addWebCommandMethod: (command: WebCommand, targetWebCmd?: { controllerCode: string, controllerName: string }) => void;
    eventBetweenDesignerAndCodeView: Ref<{ eventName: string, eventValue: any }>;
    getBuildInfo: () => any;
    jumpToCodeView: (param: { tsFilePathName: string, command: WebCommand }) => void;
}
export interface UseFormCommandService {
    checkCommands: () => Promise<any>;
    commandsChanged: (newController) => void;
    generateInternalCommandList: () => any;
    viewModelDisplay: () => Array<any>;
    findParamtersPosition: (propertyData: any, events: any, viewModelId: string, allComponentList: any) => Array<any>;
    addControllerMethod: (propertyData: any, viewModelId: string, parameters: any) => void;
    viewModelDomChanged: (propertyData: any, events: any, viewModelId: string, domActions: any) => void;
    getCommands: () => any;
    bindNewMethodToControl: (methodCode: string, methodName: string) => void;
    getInternalControllerFromControllerMetadata: (controller: any, code: string, nameSpace: string) => any;
    getSupportedControllerMetadata: (controller: any) => Promise<any>;
    getEventParameterGeneralData: () => any;
    webCmpBuilderService: UseCommandBuilderService;
    syncActions: () => any;
    findBoundEvent: (components: any[], findEvents: any[], viewModelId: string, excludedEvents?: string[]) => any;
    getUniqueEvent: (allBoundEvents: any[]) => any[];
}


/** 构件操作参数 */
export declare class Parameter {
    Id: string;
    Code: string;
    Name: string;
    Description: string;
    ParameterType: string;
    IsRetVal: boolean;
}
/** 构件操作 */
export declare class Operation {
    Id: string;
    Code: string;
    Name: string;
    Description: string;
    Parameters: Array<Parameter>;
}
/**
 * Web构件元数据
 */
export declare class WebComponentMetadata {
    Id: string;
    Code: string;
    Description: string;
    Source: string;
    Operations: Array<Operation>;
    IsCommon: boolean;
    ClassName: string;
    FormCode: string;
    PackageName: string;
    PackageVersion: string;
    Version: number;
}
