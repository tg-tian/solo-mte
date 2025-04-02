import { IOperationNode } from './operation-node';
import { SwitchNode } from './switch-node';
import { ExecuteNode, OperationExtendLevel } from './execute-node';
import { OperationCollection } from './operation-collection';
import { ITreeNode } from './tree-node';
import { ParamConfig } from './param';
import { Extension } from './extension';
import { Case } from './case';
import {
    BranchCollectionCommandItem, BranchCommandItem, CmdParameter, CmpMethodRefering,
    CommandItemType, ICommandItem, WebCommand, WebCommandMetadata
} from './web-command';

export class Command implements ITreeNode {
    public webCommand: WebCommand | undefined;

    expanded?: boolean;

    id = '';

    code = '';

    name = '';

    params: ParamConfig[] = [];

    cmpId = '';

    handlerName = '';

    extensions: Extension[] = [];

    handlers?: OperationCollection;

    shortcut?: any;

    root?: ITreeNode;

    /** 是否为运行时定制添加的命令 */
    isRTCmd?: boolean;

    /** 命令的参数是否需要刷新--用于构件中删除命令参数的场景 */
    needRefreshParam = false;

    /** 命令是否已失效（被删除） */
    isInValid? = false;

    /** 命令描述信息 */
    description?: string;

    /** 命令所属控制器的名称 */
    controllerName?: string;

    /** 命令所属控制器的编号 */
    controllerCode?: string;

    isNewGenerated?: boolean;

    targetComponent?: string;

    /**  是否为内置控制器下的命令 */
    isFromPresetController?: boolean;

    /** 命令在构件中的名称 */
    handlerShowName?: string;

    get children(): ITreeNode[] {
        return this.handlers || [];
    }

    get data(): { id: string; name: string; code: string; description?: string; controllerCode?: string; controllerName?: string } {
        return {
            id: this.id,
            name: this.name,
            code: this.code,
            description: this.description,
            controllerCode: this.controllerCode,
            controllerName: this.controllerName
        };
    }

    /**
     * 构造命令信息
     * @param webCommand 构件中的命令结构
     * @param commandJsonOrCmpId 表单中记录的命令结构或者构件id
     */
    constructor(webCommand: WebCommand, commandJsonOrCmpId: any | string, webCmd?: WebCommandMetadata) {
        if (!webCommand) {
            console.warn('参数错误，webCommand不能为空！ 无效的命令');
            return;
        }
        this.root = this;
        this.webCommand = webCommand;

        this.handlerName = this.webCommand.Code;
        this.handlerShowName = this.webCommand.Name;
        if (this.webCommand.Description === '此处添加方法描述') {
            this.webCommand.Description = '';
        }
        if (typeof commandJsonOrCmpId === 'string') {
            this.id = this.webCommand.Id;
            this.code = this.webCommand.Code;
            this.name = this.webCommand.Name;
            this.cmpId = commandJsonOrCmpId;
            this.description = this.webCommand.Description;
            this.extensions = [];
            this.addParamFromWebCommand();
        } else {
            this.id = commandJsonOrCmpId.id;
            this.code = commandJsonOrCmpId.code;
            this.name = commandJsonOrCmpId.name;
            this.description = this.webCommand.Description;
            this.cmpId = commandJsonOrCmpId.cmpId;
            this.isNewGenerated = commandJsonOrCmpId.isNewGenerated;
            this.targetComponent = commandJsonOrCmpId.targetComponent;
            this.extensions = [];

            // 添加快捷键配置
            this.shortcut = commandJsonOrCmpId.shortcut || {};

            this.extensions = commandJsonOrCmpId.extensions ? commandJsonOrCmpId.extensions.map((extensionData) => {
                const extension = new Extension(extensionData, commandJsonOrCmpId);
                extension.root = this;
                return extension;
            }) : [];

            // 先加载表单记录的参数信息，再从构件中加载参数
            this.params = commandJsonOrCmpId.params && commandJsonOrCmpId.params.length ?
                commandJsonOrCmpId.params.map((param) => new ParamConfig(param)) : [];

            this.addParamFromWebCommand();
        }

        if (webCmd) {
            this.controllerCode = webCmd.Code;
            this.controllerName = webCmd.Name;

            this.isFromPresetController = !webCmd.Code.includes('_frm_');
        }

        this.handlers = new OperationCollection();
        this.handlers.push(...this.loadHandlers(this.webCommand.Items, this.getExtensionMap(), this));

    }

    toJson() {
        const params = this.params.map((param) => param.toJson());

        const extensions = this.extensions.map((extension) => extension.toJson());

        const result: any = {
            id: this.id,
            code: this.code,
            name: this.name,
            params,
            handlerName: this.handlerName,
            cmpId: this.cmpId,
            shortcut: this.shortcut ? JSON.parse(JSON.stringify(this.shortcut)) : {},
            extensions,
            isRTCmd: this.isRTCmd,
            isInvalid: this.isInValid
        };
        if (this.isNewGenerated !== undefined) {
            result.isNewGenerated = this.isNewGenerated;
        }
        if (this.targetComponent !== undefined) {
            result.targetComponent = this.targetComponent;
        }

        return result;
    }

    /**
     * 扩展信息放入map中.
     * key是position最后一个guid，即被扩展节点的id.
     * value是数组，一个节点可能有最多三种扩展：操作前，操作后，替换
     */
    private getExtensionMap() {
        const map = new Map<string, Extension[]>();
        this.extensions.reduce((result: Map<string, Extension[]>, extension: Extension) => {
            const position = typeof extension.position === 'string' ?
                extension.position : (extension.position as string[])[(extension.position as string[]).length - 1];
            const extensionsInMap = result.has(position) ? result.get(position) as Extension[] : [];
            extensionsInMap?.push(extension);
            result.set(position, extensionsInMap);
            return result;
        }, map);
        return map;
    }

    private generateExecuteMethodNode(commandItem: ICommandItem, extensionMap: Map<string, Extension[]>, parent: ITreeNode) {
        const handler = new ExecuteNode(undefined, undefined, parent);
        const methodItem = commandItem as CmpMethodRefering;
        handler.id = methodItem.Id;
        handler.code = methodItem.Code;
        handler.name = methodItem.MethodName;
        handler.method = methodItem.MethodCode;
        handler.methodName = methodItem.MethodName;
        handler.cmpCode = methodItem.ComponentCode;
        handler.extendLevel = OperationExtendLevel.Comp;
        handler.componentName = methodItem.ComponentName;
        handler.componentCode = methodItem.ComponentCode;

        // 可扩展性
        handler.preExtendable = methodItem.IsBeforeExpansion;
        handler.replaceable = methodItem.IsReplaced;
        handler.postExtendable = methodItem.IsAfterExpansion;

        handler.root = this;

        // 处理扩展
        const extensions = extensionMap.get(handler.id);
        const extensionPointMap = new Map<'InsertBefore' | 'Replace' | 'InsertAfter', Extension>();
        extensions?.reduce((result: Map<'InsertBefore' | 'Replace' | 'InsertAfter', Extension>, extension: Extension) => {
            result.set(extension.type, extension);
            return result;
        }, extensionPointMap);

        if (extensionPointMap.has('InsertBefore') && methodItem.IsBeforeExpansion) {
            handler.preExtension = extensionPointMap.get('InsertBefore');
        }
        if (extensionPointMap.has('Replace') && methodItem.IsReplaced) {
            handler.replaceExtension = extensionPointMap.get('Replace');
            handler.replaced = true;
        }
        if (extensionPointMap.has('InsertAfter') && methodItem.IsAfterExpansion) {
            handler.postExtension = extensionPointMap.get('InsertAfter');
        }
        return handler;
    }

    private generateSwitchNode(commandItem: ICommandItem, extensionMap: Map<string, Extension[]>, parent: ITreeNode) {
        const handler = new SwitchNode(undefined, undefined, parent);
        const branchItem = commandItem as BranchCollectionCommandItem;
        handler.id = branchItem.Id;
        handler.name = branchItem.Name;
        handler.root = this;
        handler.cases = branchItem.Items && branchItem.Items.length ?
            branchItem.Items.filter((subItem: BranchCommandItem) => subItem.itemType === CommandItemType.Branch)
                .map((branchItem: BranchCommandItem) => {
                    const casee = new Case(handler);
                    casee.id = branchItem.Id;
                    casee.name = branchItem.Name;
                    casee.condition = branchItem.Express;
                    casee.root = this;
                    casee.handlers = new OperationCollection();
                    casee.handlers.push(...this.loadHandlers(branchItem.Items, extensionMap, handler));
                    return casee;
                }) : [];
        return handler;
    }

    private loadHandlers(items: ICommandItem[], extensionMap: Map<string, Extension[]>, parent: ITreeNode) {
        const commandHandlers = items.map((commandItem: ICommandItem) => {
            if (commandItem.itemType === CommandItemType.MethodRefer) {
                return this.generateExecuteMethodNode(commandItem, extensionMap, parent);
            }
            if (commandItem.itemType === CommandItemType.Branch || commandItem.itemType === CommandItemType.BranchCollection) {
                return this.generateSwitchNode(commandItem, extensionMap, parent);
            }
        });
        return commandHandlers as Array<IOperationNode & ITreeNode>;
    }

    /**
     * 标识已移除的参数
     * @param params 已有的参数
     * @param webCommand 构件中记录的参数
     */
    private processParams(params: any[], webCommand: any[]) {
        const webCommandCode = webCommand.map(item => item.Code);
        params.forEach(param => {
            if (!webCommandCode.includes(param.name)) {
                param.isDisused = true;
            }
        });
    }

    /**
     * 追加命令的参数：表单viewModel中没有，但是构件中有的参数
     * 对比方式：表单viewModel.command.name===构件命令Code( 构件的命令编号不能随意更改)
     */
    private addParamFromWebCommand() {
        if (!this.params) { this.params = []; }
        if (!this.webCommand || !this.webCommand.Parameters) { return; }

        // 标识已移除的参数
        this.processParams(this.params, this.webCommand.Parameters);

        this.webCommand.Parameters.reduce((result: ParamConfig[], parameter: CmdParameter) => {
            const existingParam = this.params.find(item => item.name === parameter.Code);
            // 存在的参数，更新类型、名称、说明
            if (existingParam) {
                existingParam.type = parameter.ParameterType;
                existingParam.shownName = parameter.Name;
                existingParam.EditorType = parameter.EditorType;
                existingParam.description = parameter.Description;
                existingParam.controlSource = parameter.controlSource;
                existingParam.defaultValue = parameter.defaultValue;
            }
            // 新增的参数
            else {
                const param = new ParamConfig();
                param.name = parameter.Code;
                param.shownName = parameter.Name;
                param.type = parameter.ParameterType;
                param.EditorType = parameter && parameter.EditorType ? parameter.EditorType : null;
                param.value = '';
                param.description = parameter.Description;
                param.controlSource = parameter.controlSource;
                param.defaultValue = parameter.defaultValue;
                result.push(param);
            }
            return result;
        }, this.params);
    }
}
