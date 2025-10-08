import { inject, ref } from "vue";
import { FormWebCmd, UseFormSchema } from "../../../../../types";
import { MetadataService } from "../../../../../composition/metadata.service";
import { IdService } from "../../service/id.service";
import { MethodBuilder } from "../../composition/build-method";
import axios from 'axios';
import { getAllSupportedControllers, getSupportedControllerMethods } from "../../../../../composition/command/supported-controller";
import { FNotifyService } from "@farris/ui-vue";

export function useWebCommandSelector() {

    const useFormSchema = inject('useFormSchema') as UseFormSchema;
    const notifyService: any = new FNotifyService();
    notifyService.globalConfig = { position: 'top-center' };

    /** 树表格绑定数据 */
    const webCommandsTreeData: any = ref([]);

    const selectedCommands = ref([]);

    /**
     * 校验控制器唯一
     * @param webcmdsData
     */
    function unique(webcmdsData: Array<any>): Array<any> {
        const uniquedWebCmdsData: any[] = [];
        webcmdsData.forEach(webcmdData => {
            const isExisted = uniquedWebCmdsData.find(res => res.data && webcmdData.data.id === res.data.id);
            if (!isExisted) {
                uniquedWebCmdsData.push(webcmdData);
            }
        });

        return uniquedWebCmdsData;
    }
    /**
     * 组装单条控制器的树节点数据
     */
    function resolveSingleWebCommand(commandContent: any) {
        const commands = commandContent.Commands ? (commandContent.Commands as any[]).map((command: any) => {
            return {
                data: {
                    id: new IdService().generate(), // 部分构件下的命令id是重复的，影响了树表的勾选，故此处重置id
                    name: command.Name,
                    code: command.Code,
                    originalData: command,
                    isController: false
                },
                children: []
            };
        }) : [];
        return {
            data: {
                id: commandContent.Id,
                name: commandContent.Name,
                code: commandContent.Code,
                originalData: commandContent,
                isController: true
            },
            children: commands
        };
    }
    /**
     * 将控制器组装成树表格要求的层级结构。
     * @param metadataContentList 控制器元数据列表
     */
    function resolveWebCommandTreeData(commandsMetadataContent: any[]) {
        selectedCommands.value = [];

        let commandsData = commandsMetadataContent.map((commandContent: any) => {
            return resolveSingleWebCommand(commandContent);
        });
        commandsData = unique(commandsData);

        // 转换为farris vue treegrid需要的结构
        const useMethodComposition = new MethodBuilder(useFormSchema);
        webCommandsTreeData.value = [];
        useMethodComposition.convertCommandsDataToTreeGridFormat(commandsData, webCommandsTreeData.value, 0, null);
        return webCommandsTreeData.value;
    }
    /**
     * 返回目前支持的控制器命令
     */
    function filterSupportedCommand(controllerContent: any) {
        const { Id: controllerId, Commands: allCommands } = controllerContent;
        return getSupportedControllerMethods(controllerId, allCommands);
    }
    /**
     * 加载当前页面相关的所有控制器及其方法
     */
    function loadWebCommands(): Promise<any[]> {

        const webCmdInfos = useFormSchema.getFormSchema()?.module?.webcmds;
        const formMetaBasicInfo = useFormSchema.getFormMetadataBasicInfo();
        webCommandsTreeData.value = [];
        return new Promise((resolve, reject) => {
            if (!formMetaBasicInfo) {
                reject();
                return;
            }

            const { relativePath } = formMetaBasicInfo;
            const supportedControllers = getAllSupportedControllers();

            new MetadataService().getMetadataListByType(relativePath, '.webcmd').then((response: any) => {

                const allCommandsMetadata: any[] = response.data;
                let commandsMetadataInThePage = new Map<string, FormWebCmd>;
                if (allCommandsMetadata?.length) {
                    commandsMetadataInThePage = allCommandsMetadata.filter((commandMetadata: any) => {
                        const hasExtendProperty = !!commandMetadata.extendProperty;
                        const extendPropertyObject = hasExtendProperty ? JSON.parse(commandMetadata.extendProperty) : {} as Record<string, any>;
                        const beloneToThePage = extendPropertyObject.FormCode === formMetaBasicInfo.code;
                        return beloneToThePage;
                    }).reduce((result: Map<string, FormWebCmd>, commandMetadataInThePage: any) => {
                        result.set(commandMetadataInThePage.id, {
                            id: commandMetadataInThePage.id,
                            path: commandMetadataInThePage.relativePath,
                            name: commandMetadataInThePage.fileName
                        });
                        return result;
                    }, new Map<string, FormWebCmd>);
                }


                const allCommandInfoReferencedInThePage = webCmdInfos.reduce((result: Map<string, FormWebCmd>, commandInfo: FormWebCmd) => {
                    result.set(commandInfo.id, commandInfo);
                    return result;
                }, commandsMetadataInThePage);

                const requestCommandsMetadata = Array.from(allCommandInfoReferencedInThePage.values())
                    .map((commandInfo: FormWebCmd) => new MetadataService().getRefMetadata(relativePath, commandInfo.id)
                        .catch(() => { console.log(`获取元数据${commandInfo.name}失败，请检查。`); })
                    );

                axios.all(requestCommandsMetadata).then(axios.spread((...commandsMetadata) => {
                    const commandsMetadataContent = commandsMetadata.filter((item: any) => {
                        if (!item.data) {
                            return false;
                        }
                        // 如果是自定义构件
                        if (item.data.nameSpace.includes('.Front')) {
                            return true;
                        }
                        return supportedControllers[item.data.id];
                    })
                        .map((item: any) => {
                            const content = JSON.parse(item.data.content);
                            const supportedCommands = item.data.nameSpace.includes('.Front') ? content.Commands : filterSupportedCommand(content);
                            content.Commands = supportedCommands;
                            return content;
                        });

                    resolveWebCommandTreeData(commandsMetadataContent);
                    resolve(commandsMetadataContent);
                }));
            }, (error) => {
                reject();
            });

        });
    }
    /**
     * 新增控制器后事件
     */
    async function addControllerMetadata(newController: any, newWebControllers: any[]) {
        const exsitedWebCmdInfos = useFormSchema.getFormSchema()?.module?.webcmds;
        if (exsitedWebCmdInfos.findIndex(item => item.id === newController.id) >= 0) {
            notifyService.warning('相同的控制器已经存在');
            return;
        }
        if (newWebControllers.findIndex(item => item.id === newController.id) >= 0) {
            notifyService.warning('相同的控制器已经存在');
            return;
        }
        const formMetaBasicInfo = useFormSchema.getFormMetadataBasicInfo();
        const { relativePath } = formMetaBasicInfo;
        let newWebCmdMetadata;
        await new MetadataService().getPickMetadata(relativePath, newController).then((result: any) => {
            newWebCmdMetadata = result?.metadata;
            const metadataContent = JSON.parse(newWebCmdMetadata?.content);
            metadataContent.Commands = newWebCmdMetadata.nameSpace.includes('.Front') ? metadataContent.Commands : filterSupportedCommand(metadataContent);
            const newWebCmd = resolveSingleWebCommand(metadataContent);
            const newWebCmdTreeData = [];
            const useMethodComposition = new MethodBuilder(useFormSchema);
            useMethodComposition.convertCommandsDataToTreeGridFormat([newWebCmd], newWebCmdTreeData, 0, null);

            webCommandsTreeData.value = webCommandsTreeData.value.concat(newWebCmdTreeData);
        });

        if (newWebCmdMetadata) {
            const newWebCommand = {
                id: newWebCmdMetadata.id,
                path: newWebCmdMetadata.relativePath,
                name: newWebCmdMetadata.fileName,
                code: newWebCmdMetadata.code,
                nameSpace: newWebCmdMetadata.nameSpace
            };
            newWebControllers.push(newWebCommand);
        }
    }

    return {
        loadWebCommands,
        webCommandsTreeData,
        addControllerMetadata
    };
}
