import { inject, ref } from "vue";
import { FormWebCmd, UseFormSchema } from "../../../../../types";
import { MetadataService } from "../../../../../composition/metadata.service";
import { IdService } from "../../service/id.service";
import { MethodBuilder } from "../../composition/build-method";
import axios from 'axios';

export function useWebCommandSelector() {

    const useFormSchema = inject('useFormSchema') as UseFormSchema;

    /** 树表格绑定数据 */
    const webCommandsTreeData = ref([]);

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
     * 将控制器组装成树表格要求的层级结构。
     * @param metadataContentList 控制器元数据列表
     */
    function resolveWebCommandTreeData(commandsMetadataContent: any[]) {
        selectedCommands.value = [];

        let commandsData = commandsMetadataContent.map((commandContent: any) => {
            const commands = commandContent.Commands ? (commandContent.Commands as any[]).map((command: any) => {
                return {
                    data: {
                        id: new IdService().generate(), // 部分构件下的命令id是重复的，影响了树表的勾选，故此处重置id
                        name: command.Name,
                        code: command.Code,
                        children: [],
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
                    children: commands,
                    originalData: commandContent,
                    isController: true
                },
                children: [],
                expanded: true
            };

        });
        commandsData = unique(commandsData);

        // 转换为farris vue treegrid需要的结构
        const useMethodComposition = new MethodBuilder(useFormSchema);
        webCommandsTreeData.value = [];
        useMethodComposition.convertCommandsDataToTreeGridFormat(commandsData, webCommandsTreeData.value, 0, null);
        return webCommandsTreeData.value;
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

            new MetadataService().GetMetadataListByType(relativePath, '.webcmd').then((response: any) => {
                const allCommandsMetadata: any[] = response.data;
                const commandsMetadataInThePage = allCommandsMetadata.filter((commandMetadata: any) => {
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

                const allCommandInfoReferencedInThePage = webCmdInfos.reduce((result: Map<string, FormWebCmd>, commandInfo: FormWebCmd) => {
                    result.set(commandInfo.id, commandInfo);
                    return result;
                }, commandsMetadataInThePage);

                const requestCommandsMetadata = Array.from(allCommandInfoReferencedInThePage.values())
                    .map((commandInfo: FormWebCmd) => new MetadataService().queryMetadataById(relativePath, commandInfo.id)
                        .catch(() => { console.log(`获取元数据${commandInfo.name}失败，请检查。`); })
                    );

                axios.all(requestCommandsMetadata).then(axios.spread((...commandsMetadata) => {
                    const commandsMetadataContent = commandsMetadata.filter((item: any) => !!item.data)
                        .map((item: any) => JSON.parse(item.data.content));

                    resolveWebCommandTreeData(commandsMetadataContent);
                    resolve(commandsMetadataContent);
                }));
            }, (error) => {
                reject();
            });

        });
    }

    return {
        loadWebCommands,
        webCommandsTreeData
    };
}
