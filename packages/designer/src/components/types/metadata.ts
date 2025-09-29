import { Ref } from "vue";
import { ExternalComponentSchema } from "../components/form-designer/components/external-component-panel/composition/types";
import { FormComponent, FormExpression, FormStateMachine, FormWebCmd } from "./basic";
import { DesignViewModel } from "./design-viewmodel";
import { DesignerMode, UseDesignerContext } from "./designer-context";
import { FormSchema, FormSchemaEntity, FormSchemaEntityField } from "./entity-schema";
import { FormVariable, FormViewModel, FormViewModelField } from "./view-model";
import { Communication } from '@farris/ui-vue/components/events-editor';

export interface FormOptions {
    /**
     * 启用静态文本
     */
    enableTextArea?: boolean;

    publishFormProcess?: boolean;

    /**
     * 界面渲染模式：编译（生成代码并编译），动态渲染（动态解析，本地不生成代码，不编译）
     */
    renderMode?: 'compile' | 'dynamic';

    /** 变更集提交策略 */
    changeSetPolicy?: 'entire' | 'valid';

    /** 启用服务器端变更检测：菜单或应用关闭前调用后端接口确认后端缓存中的数据是否已经保存并提示用户 */
    enableServerSideChangeDetection?: boolean;

    /** 生成表单代码时将之前的源码都删除 */
    enableDeleteSourceCode?: boolean;

    /** 表单是否可以被组合 */
    canBeComposed?: boolean;

    /** 表单是否启用业务流 */
    enableAif?: boolean;

    /** 表单是否启用数据类型转换 */
    paramTypeTransform?: boolean;
}

export interface FormMetaDataModule {
    id: string;

    code: string;

    name: string;

    type: string;

    creator: string;

    creationDate: Date;

    updateVersion: string;

    // 实体
    entity: Array<FormSchema>;

    // 状态机
    stateMachines: Array<FormStateMachine>;

    // 视图模型
    viewmodels: Array<FormViewModel>;

    // 源组件-事件-命令-目标组件的映射关系
    actions: Array<any>;

    // 组件
    components: Array<FormComponent>;

    // 构件
    webcmds: Array<FormWebCmd>;

    // 表单所属模板
    templateId: string;

    // 表单模板对应的拖拽控制规则
    templateRule?: string;

    // 是否组合表单
    isComposedFrm: boolean;

    // 表单所在的工程名
    projectName: string;

    // 自定义样式
    customClass: any;

    // 外部模块声明
    extraImports: Array<{ name: string; path: string }>;

    /** 表达式配置 */
    expressions: FormExpression[];

    // 当前表单的展示形式：modal|page|sidebar
    showType?: string;

    // 页面级按钮配置（目前用于Header和ModalFooter组件内部的工具栏按钮）
    toolbar: {
        items: { [viewModelId: string]: any };
        configs: { modal?: any; page?: any; sidebar?: any };
    };

    /** 表单元数据id */
    metadataId?: string;

    externalComponents?: ExternalComponentSchema[];

    /** 组件通讯 */
    communications?: Array<Communication>;
}

export interface FormMetadaDataDom {

    module: FormMetaDataModule;

    options?: FormOptions;
}

export interface MetadataDto {
    /** 表单标识（对于运行时定制表单，此id为基础表单id） */
    id: string;
    nameSpace?: string;
    /** 表单编号（对于运行时定制表单，此code为基础表单code） */
    code: string;
    /** 表单名称（对于运行时定制表单，此name为基础表单name） */
    name: string;

    fileName?: string;

    type?: string;

    bizobjectID?: string;

    relativePath: string;

    extendProperty?: string;

    content?: string;

    extendable?: boolean;

    properties?: { framework: string, [propsName: string]: any }

    nameLanguage?: any;
    /** 运行时定制表单维度一 */
    dimension1?: string;
    /** 运行时定制表单维度二 */
    dimension2?: string;
    /** 运行时定制表单id */
    rtcId?: string;
    /** 运行时定制表单编号 */
    rtcCode?: string;
    /** 运行时定制表单名称 */
    rtcName?: string;
}
export interface UseFormMetadata {
    /** 查询表单元数据 */
    queryMetadata: () => Promise<FormMetadaDataDom>;
    /** 保存表单元数据 */
    saveFormMetadata: () => Promise<any>;
    /** 查询表单模板的拖拽控制规则 */
    queryFormTemplateRule: (module: any) => Promise<void>;
    /** 发布表单 */
    publishFormMetadata?: () => Promise<{ result: boolean, error?: string }>;
    /** 部署表单 */
    deployFrontFile?: (metadataId: string, path: string) => Promise<any>;
    /** 运行表单 */
    runForm: (loadingService: any, messageBoxService: any, designerContext: UseDesignerContext, metdataPath: string) => void;
    /** 发布菜单 */
    publishMenu: (messageBoxService: any, notifyService: any) => void;

}
export interface UseFormSchema {
    /** 设计器当前运行环境 */
    designerMode: DesignerMode;
    /** 表单元数据基础信息（外层结构） */
    getFormMetadataBasicInfo: () => MetadataDto;

    setFormMetadataBasicInfo: (newMetadata: MetadataDto) => void;

    /** 获取表单元数据 */
    getFormSchema: () => FormMetadaDataDom;

    getSchemas: () => FormSchema | undefined;

    setFormSchema: (newSchema: FormMetadaDataDom) => void;

    /** 根据Comonent id 获取组件节点*/
    getComponentById: (targetComponentId: string) => FormComponent | undefined;

    /** 根据viewmodel id 获取组件节点*/
    getComponentByViewModelId: (targetViewModelId: string) => FormComponent | undefined;

    /** 获取页面模型版本 */
    getUpdateVersion: () => string;

    /** 根据viewmodel id获取模型节点 */
    getViewModelById: (targetViewModelId: string) => FormViewModel | undefined;

    /**
     * 根据指定条件获取元数据的节点
     * @param rootNode 根节点
     * @param predict 预设的判断逻辑
     */
    selectNode: (rootNode: any, predict: (item: any) => boolean) => any;

    /**
     * 根据指定条件获取元数据的节点以及其父节点
     * @param rootNode 根节点
     * @param predict 预设的判断逻辑
     * @param parentNode 初始父节点
     */

    selectNodeAndParentNode: (rootNode: any, predict: (item: any) => boolean, parentNode: any) => { node: any; parentNode: any } | undefined;

    getControlBasicInfoMap: () => Map<string, { showName: string, parentPathName: string }>;
    /**
     * 返回命令
     * @returns 
     */
    getCommands: () => FormWebCmd[];
    setCommands: (value: Array<FormWebCmd>) => void;
    getViewModels: () => FormViewModel[];
    getComponents: () => FormComponent[];
    setViewmodels: (value: any) => void;
    getModule: () => FormMetaDataModule;
    getViewModelIdByComponentId: (componentId: string) => string;
    deleteViewModelById: (componentId: string) => void;
    addViewModelField: (viewModelId, filedObject: FormViewModelField) => void;
    deleteViewModelFieldById: (viewModelId: string, fieldId: string) => void;
    clearViewModelFieldSchema: (viewModelId, fieldId) => void;
    modifyViewModelFieldById: (viewModelId, fieldId, changeObject, isMerge: boolean) => void;
    getControlClassByFormUnifiedLayout: (controlClass: string, componentId: string, formNode: any) => string;
    setFormTemplateRule: (rules: any) => void;
    getFormTemplateRule: () => any;
    getLocaleVariablesByViewModelId: (viewModelId: string) => any;
    getRootViewModelId: () => string;
    getRemoteVariables: () => any;
    getFieldsByViewModelId: (viewModelId: string) => FormSchemaEntityField[] | undefined;
    getExpressions: () => FormExpression[];
    setExpressions: (value: FormExpression[]) => void;
    deleteComponent: (componentId: string) => void;
    getControlsInCmpWidthBinding: (viewModelId: string, fieldId: string) => any;
    getVariableById: (variableId: string) => FormVariable | undefined;
    getVariableByCode: (variableCode: string) => FormVariable | undefined;
    updateRemoteVariables: (variables: FormSchemaEntityField[]) => void;
    getDefaultValueByFiledAndType: (propertyType: string, schema: FormSchemaEntityField) => any;
    getSchemaEntities: () => FormSchemaEntity[];
    getComponetsByPredicate(predicate: (component: any) => boolean);
    removeCommunicationInComponent: (componentSchema: any) => void;
    externalFormSchema: Map<string, ExternalFormMetadata>;
    getExternalComponents: () => any[];
}

export interface UseSchemaService {
    convertViewObjectToEntitySchema: (viewObjectId: string, sessionId: string) => Promise<FormSchema | undefined>;
    getFieldByIDAndVMID: (id: string, viewModelId: string) => {
        schemaField: FormSchemaEntityField, isRefElement: boolean, refElementLabelPath: string
    } | undefined;
    getTableInfoByViewModelId(viewModelId: string): { id: string, code: string, name: string, label: string, type } | undefined;
    getFieldsByViewModelId: (viewModelId: string) => FormSchemaEntityField[];
    getFieldByID: (fieldId: string) => FormSchemaEntityField | undefined;

    /** 表单更新schema产生的变更记录 */
    entityChangeset: any;
    getSchemaEntities(): FormSchemaEntity[];
    getPrimaryField(): string;
    /** 运行时定制场景：获取某实体下来源于be或vo的字段（不在当前表单entity内的字段） */
    getRtcSchemaFieldsByEntity: (targetEntityId: string, rtSchemaNode?: any) => any;
    /** 运行时定制场景: 组装be或vo的字段为树结构 */
    assembleRtcSchemaTree: (treeNodes: any[]) => any;
    /** 运行时定制：打开表单时存储完整的字段信息 */
    rtcSchemaFields: Ref<any>;
    /** 运行时定制：{实体ID:实体中新增的字段树节点集合} */
    rtcAddedTreeNodes: Ref<any>;
    /** 运行时定制：平铺所有新增字段树节点（平铺关联带出字段） */
    rtcSerializedAddedTreeNodes: Ref<any[]>;
    /**  运行时定制：将be或vo的字段添加到表单实体中 */
    addRtcFieldsToSchemaEntity: (schemaField: FormSchemaEntityField) => void;
}
export interface UseDesignViewModel {
    assembleDesignViewModel: () => void;
    getAllFields2TreeByVMId: (viewModelId: string) => any[];
    getDgViewModel: (viewModelId: string) => DesignViewModel | null;
    deleteViewModelById: (viewModelId: string) => void;
    getDgViewModels: () => any[]
}
export interface UseControlCreator {
    setFormFieldProperty: (field: FormSchemaEntityField, editorType: string, controlClass: string) => any;
    setGridFieldProperty: (gridType: string, field: FormSchemaEntityField, metadata: any, needInlineEditor: false) => any;
    createFormGroupWithoutField: (editorType: string, controlClass: string) => any;
    setGridFieldFormatter: (gridFieldType: string, metadata: any, schemaField: any) => void;
    mapControlType2GridFieldType: (field: FormSchemaEntityField) => string;
}

export interface UseFormStateMachine {
    /** 请求获取状态机元数据 */
    queryStateMachineMetadata: () => void;
    /** 获取状态机元数据 */
    getStateMachineMetadata: () => any;
    /** 获取状态机元数据中的可视化状态 */
    getRenderStates: (value: any) => any[];
}

/**
 * 外部容器引入的外部表单元数据
 */
export interface ExternalFormMetadata {
    id: string;
    code: string;
    name: string;
    fileName: string;
    nameSpace: string;
    content: FormMetadaDataDom,
    nameLanguage: string;
}
