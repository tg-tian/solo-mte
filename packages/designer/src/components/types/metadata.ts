import { FormComponent, FormExpression, FormStateMachine, FormWebCmd } from "./basic";
import { FormSchema } from "./entity-schema";
import { FormViewModel } from "./view-model";

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

    caption: string;

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

    serviceRefs: Array<any>;

    // 表单所属模板
    templateId: string;

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

    qdpInfo: any;

    /** 表单元数据id */
    metadataId?: string;

}

export interface FormMetadaDataDom {

    module: FormMetaDataModule;

    options?: FormOptions;
}

export interface MetadataDto {
    id: string;

    nameSpace: string;

    code: string;

    name: string;

    fileName: string;

    type: string;

    bizobjectID: string;

    relativePath: string;

    extendProperty: string;

    content: string;

    extendable: boolean;

}

export interface UseFormSchema {

    /** 表单元数据基础信息（外层结构） */
    getFormMetadataBasicInfo: () => MetadataDto;

    setFormMetadataBasicInfo: (newMetadata: MetadataDto) => void;

    /** 获取表单元数据 */
    getFormSchema: () => FormMetadaDataDom;

    setFormSchema: (newSchema: FormMetadaDataDom) => void;

    /** 根据Comonent id 获取组件节点*/
    getComponentById: (targetComponentId: string) => FormComponent | undefined;

    /** 根据viewmodel id 获取组件节点*/
    getComponentByViewModelId: (targetViewModelId: string) => FormComponent | undefined;

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
    // eslint-disable-next-line max-len
    selectNodeAndParentNode: (rootNode: any, predict: (item: any) => boolean, parentNode: any) => { node: any; parentNode: any } | undefined;

}
