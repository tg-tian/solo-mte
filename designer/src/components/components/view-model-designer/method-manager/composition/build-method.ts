/* eslint-disable no-restricted-syntax */
import axios from 'axios';
import { FormViewModel, FormWebCmd, UseFormSchema } from "../../../../types";
import { Command } from "../entity/command";
import { WebCommand, WebCommandMetadata } from "../entity/web-command";
import { IdService } from "../service/id.service";
import { MetadataService } from "../../../../composition/metadata.service";

export class MethodBuilder {

    constructor(private useFormSchema: UseFormSchema) { };

    private commands: Command[] | any[] = [];

    private commandsTreeData: any[] = [];

    /**
     * 加载表单相关的控制器和控制器内的方法，并组装为树表格所需的结构
     * @param commandsJson
     * @returns
     */
    public build(commandsJson: any[]): Promise<Command[] | any> {
        return new Promise((resolve, reject) => {
            this.loadWebcmd().then((webcmds: WebCommandMetadata[]) => {
                this.commands = [];

                for (const commandJson of commandsJson) {
                    if (commandJson.isInvalid) {
                        const node = {
                            data: commandJson,
                            selectable: true,
                            code: commandJson.code,
                            cmpId: commandJson.cmpId,
                            isInValid: true
                        } as any;
                        this.commands.push(node);
                        continue;
                    }

                    const webcmd = webcmds.find(item => item.Id === commandJson.cmpId);
                    if (!webcmd) {
                        continue;
                    }

                    const webCommand = webcmd.Commands.find(item => item.Code === commandJson.handlerName);
                    if (!webCommand) {
                        const node = {
                            data: commandJson,
                            selectable: true,
                            id: commandJson.id,
                            code: commandJson.code,
                            cmpId: commandJson.cmpId,
                            isInValid: true
                        } as any;
                        this.commands.push(node);
                        continue;
                    }

                    const command = new Command(webCommand, commandJson, webcmd);

                    // 唯一化id，如果添加多个相同命令，操作的id会重复，树节点开不开。
                    this.recursiveUniqueId(command.children);

                    this.commands.push(command);

                    // 记录命令的参数是否需要刷新
                    if (command.params.length) {
                        const disusedParam = command.params.find(param => param.isDisused);
                        command.needRefreshParam = !!disusedParam;
                    }
                }

                this.commandsTreeData = [];
                this.convertCommandsDataToTreeGridFormat(this.commands, this.commandsTreeData, 0, null);

                resolve(this.commandsTreeData);
            }, err => {
                // 若使用this.error 会导致流的中断，故使用next并增加flag标识
                resolve({
                    flag: 'error',
                    msg: err
                });
            });
        });

    }

    /**
     * 加载表单相关的控制器
     * @returns
     */
    private loadWebcmd(): Promise<WebCommandMetadata[]> {
        const webCmdInfos = this.useFormSchema.getFormSchema()?.module?.webcmds;

        const metadataInfo = this.useFormSchema.getFormMetadataBasicInfo();

        return new Promise((resolve, reject) => {
            if (!metadataInfo || !webCmdInfos) {
                resolve([]);
                return;
            }
            const relativePath = metadataInfo ? metadataInfo.relativePath : '';

            const requestCommandsMetadata = webCmdInfos.map((commandInfo: FormWebCmd) => {
                return new MetadataService().queryMetadataById(relativePath, commandInfo.id).catch(error => {
                    console.log(`获取元数据${commandInfo.name}失败，请检查。`);
                });
            });

            axios.all(requestCommandsMetadata).then(axios.spread((...metadataList) => {
                const metadataContentList = metadataList.filter((item: any) => !!item.data)
                    .map((item: any) => JSON.parse(item.data.content));
                resolve(metadataContentList);
            }));

        });

    }

    /**
     * 唯一化操作的id。如果添加多个相同命令，操作的id会重复，树节点的展开有问题
     */
    private recursiveUniqueId(arr: any[]) {
        const idService = new IdService();
        arr.forEach(item => {
            item.id = idService.generate();
            if (item.children && item.children.length) {
                this.recursiveUniqueId(item.children);
            }
        });
    }

    /**
     * 将方法列表转化为farris 树表格需要的结构
     * @param commandsData
     * @param commandTreeViewData
     * @param layer
     * @param parentTreeNode
     */
    public convertCommandsDataToTreeGridFormat(commandsData: any[], commandTreeViewData: any[], layer = 0, parentTreeNode: any) {
        commandsData.forEach((commandData: any) => {
            const commandTreeData = {
                data: commandData,
                id: commandData.id || commandData.data.id,
                code: commandData.code || commandData.data.code,
                name: commandData.name || commandData.data.name,
                layer,
                parent: parentTreeNode && parentTreeNode.id,
                hasChildren: true
            };
            commandTreeViewData.push(commandTreeData);

            if (commandData.children && commandData.children.length) {
                this.convertCommandsDataToTreeGridFormat(commandData.children, commandTreeViewData, layer + 1, commandTreeData);
            } else {
                commandTreeData.hasChildren = false;
            }
        });
    }

    /**
     * 移除方法
     */
    public removeCommand(selectedTreeNode: any, activeViewModel: FormViewModel) {
        // 删除后自动定位到下一条方法
        let nextCommandId = '';
        const index = this.commands.findIndex(item => item.id === selectedTreeNode.id);
        if (index > -1 && index < this.commands.length - 1) {
            const nextSelectedCommand = this.commands[index + 1].data;
            nextCommandId = nextSelectedCommand?.id;
        }
        this.commands.splice(index, 1);

        this.removeWebCommandHandler(selectedTreeNode.data);

        this.commandsTreeData = [];
        this.convertCommandsDataToTreeGridFormat(this.commands, this.commandsTreeData, 0, null);
        this.updateViewModel(this.commands, activeViewModel);

        return { nextCommandId, commandsTreeData: this.commandsTreeData };
    }

    /**
     * 新增方法
     * @param newCommandDatas x
     * @param activeViewModel
     * @returns
     */
    public addCommand(
        newCommandDatas: {
            selectedCommands: Array<{ command: WebCommand; controller: WebCommandMetadata }>;
            newWebControllers: WebCommandMetadata;
        },
        activeViewModel: FormViewModel
    ) {
        if (!newCommandDatas.selectedCommands?.length) {
            return;
        }

        // 新增的构件：TODO

        // 新增的命令
        newCommandDatas.selectedCommands.forEach((newCommandData: { command: WebCommand; controller: WebCommandMetadata }) => {
            const selectedCommand = newCommandData.command;
            const { controller } = newCommandData;

            const command = new Command(selectedCommand, controller.Id, controller);
            command.id = new IdService().generate();
            command.isNewGenerated = false;

            this.recursiveUniqueId(command.children);

            // 处理code、name
            this.refreshCommandCodeName(command, activeViewModel.id);

            this.commands.push(command);

            this.addWebCommandHandler(command);

        });

        this.commandsTreeData = [];
        this.convertCommandsDataToTreeGridFormat(this.commands, this.commandsTreeData, 0, null);
        this.updateViewModel(this.commands, activeViewModel);
        return this.commandsTreeData;

    }

    /**
     * 方法重命名
     */
    public editCommand(selectedTreeNode: any, activeViewModel: FormViewModel, newCommandData: any) {
        Object.assign(selectedTreeNode.data, newCommandData);
        Object.assign(selectedTreeNode, newCommandData);

        this.updateViewModel(this.commands, activeViewModel);

        return this.commandsTreeData;
    }

    /**
     * 获取唯一的方法编号、名称
     */
    private refreshCommandCodeName(command: Command, viewModelId: string) {

        // 获取唯一的方法编号
        const codeSet = this.getViewModelCommandLabel();
        let i = 1;
        let newCode;
        const vmId = viewModelId.replace(/-/g, '').replace('component', '').replace('viewmodel', '');
        while (true) {
            newCode = vmId + command.code + i;
            if (!codeSet.has(newCode.toLowerCase())) {
                break;
            }
            ++i;
        }

        // 解决不同控制器handler重名的问题: 当前VMID+命令code+1
        command.name += i;
        command.code = command.code.slice(0, 1).toUpperCase() + command.code.slice(1);
        command.code = vmId + command.code + i;
    }

    private getViewModelCommandLabel() {
        const codeSet = new Set<string>();
        const viewmodel = this.useFormSchema.getFormSchema().module.viewmodels;
        viewmodel.forEach(viewmodelItem => {
            viewmodelItem.commands.forEach(commandItem => {
                codeSet.add(commandItem.code.toLowerCase());
            });
        });
        return codeSet;
    }

    /**
     * 记录方法的引用：向"webCmds"节点添加引用
     */
    private addWebCommandHandler(command: Command) {
        const webCmds = this.useFormSchema.getFormSchema().module.webcmds;
        if (webCmds instanceof Array) {
            const webcmd = webCmds.find(item => item.id === command.cmpId);
            if (webcmd) {
                webcmd.refedHandlers = webcmd.refedHandlers || [];
                webcmd.refedHandlers.push({ host: command.id, handler: command.handlerName });
            }
        }
    }

    /**
     * 移除方法的引用：向"webCmds"节点移除引用
     */
    private removeWebCommandHandler(command: Command) {
        const webCmds = this.useFormSchema.getFormSchema().module.webcmds;
        if (webCmds instanceof Array) {
            const webcmdIndex = webCmds.findIndex(item => item.id === command.cmpId);
            if (webcmdIndex > -1) {
                const webcmd = webCmds[webcmdIndex];
                const handlers = webcmd.refedHandlers || [];
                const index = handlers.findIndex(item => item.host === command.id);
                handlers.splice(index, 1);
                if (handlers.length === 0) {
                    webCmds.splice(webcmdIndex, 1);
                }
            }
        }
    }

    /**
     * 将变更同步到表单DOM中
     * @param commands 命令列表
     */
    private updateViewModel(commands: Array<Command>, activeViewModel: FormViewModel) {
        if (!commands || !activeViewModel) {
            return;
        }

        activeViewModel.commands = commands.length > 0 ? commands.filter((command: Command) => command instanceof Command && command.toJson)
            .map((command: Command) => command.toJson()) : [];

        const originalViewModel = this.useFormSchema?.getViewModelById(activeViewModel.id);
        if (originalViewModel) {
            originalViewModel.commands = activeViewModel.commands;
        }

    }
}
