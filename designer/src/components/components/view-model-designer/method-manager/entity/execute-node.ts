import { Extension } from './extension';
import { ITreeNode } from './tree-node';
import { IOperationNode } from './operation-node';
import { ParamConfig } from './param';

export enum OperationExtendLevel {
    /** 构件 */
    'Comp' = 1,
    /** 表单 */
    'Form' = 2
}

export class ExecuteNode implements ITreeNode, IOperationNode {
    get data(): { id: string; name: string; code: string; componentCode: string; componentName: string } {
        return {
            id: this.id,
            name: this.methodName,
            code: this.code,
            componentCode: this.componentCode,
            componentName: this.componentName
        };
    }

    get children(): ITreeNode[] {
        const children = new Array<ITreeNode>();
        if (this.preExtension) {
            children.push(this.preExtension);
        }
        if (this.replaceExtension) {
            children.push(this.replaceExtension);
        } else {
            children.push({ data: { id: this.id + 1, name: this.name }, children: [], root: this.root });
        }
        if (this.postExtension) {
            children.push(this.postExtension);
        }

        if (children.length === 1 && children[0] !== this.replaceExtension) {
            // 没有扩展
            return [];
        }

        return children;
    }

    id = '';

    code = '';

    name = '';

    // serviceRef: ServiceRef; // 记录任务引用的服务
    serviceRefId = '';

    serviceName = ''; // 记录serviceRef的alias

    cmpCode = '';

    method = '';

    methodName = '';

    params?: Array<ParamConfig>;

    extendLevel?: OperationExtendLevel;

    preExtendable?: boolean;

    replaceable?: boolean;

    postExtendable?: boolean;

    // 扩展节点属性
    belongedExt?: Extension;

    // 基础节点属性
    replaced?: boolean;

    preExtension?: Extension;

    replaceExtension?: Extension;

    postExtension?: Extension;

    // 扩展编辑标志
    isEditing?: boolean;

    root?: ITreeNode;

    /** 操作所属的构件编号 */
    componentCode = '';

    /** 操作所属的构件名称 */
    componentName = '';

    constructor(executeNodeJson?: any, extension?: Extension, parent?: ITreeNode) {
        if (executeNodeJson) {
            this.parse(executeNodeJson, extension);
        }

    }

    parse(executeNodeJson: any, extension?: Extension) {
        this.id = executeNodeJson.id;
        this.code = executeNodeJson.code;
        this.name = executeNodeJson.name;
        this.serviceRefId = executeNodeJson.serviceRefId;
        this.serviceName = executeNodeJson.serviceName;
        this.cmpCode = executeNodeJson.cmpCode;
        this.method = executeNodeJson.method;
        this.methodName = executeNodeJson.methodName;
        this.extendLevel = executeNodeJson.extendLevel || OperationExtendLevel.Form;
        this.componentCode = executeNodeJson.componentCode;
        this.componentName = executeNodeJson.componentName;

        if (extension) {
            this.belongedExt = extension;
        }
        this.replaced = false;

        this.params = executeNodeJson.params && executeNodeJson.params.length ?
            executeNodeJson.params.map((paramData) => new ParamConfig(paramData)) : [];
    }

    toJson(): any {
        if (!this.params) {
            return;
        }

        const params = this.params && this.params.length ?
            this.params.map((paramConfig: ParamConfig) => paramConfig.toJson()) : [];

        return {
            'id': this.id,
            'type': 'executeNode',
            'code': this.code,
            'name': this.name,
            'serviceRefId': this.serviceRefId,
            'serviceName': this.serviceName,
            'cmpCode': this.cmpCode,
            'method': this.method,
            'params': params
        };
    }
}
