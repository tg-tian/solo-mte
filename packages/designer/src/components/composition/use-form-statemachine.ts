import { UseFormSchema, UseFormStateMachine } from "../types";
import { MetadataService } from "./metadata.service";
import { inject } from "vue";

export default function (useFormSchemaComposition: UseFormSchema): UseFormStateMachine {
    let stateMachineMetadata: any;

    let renderStateData: any = [];

    const metadataService = new MetadataService();
    const messageBoxService: any = inject('FMessageBoxService');

    /**
     * 获取状态机中的可视化状态数据
     */
    function getRenderStates() {
        return renderStateData || [];
    }

    /**
     * 提取状态机中的可视化状态数据
     */
    function resolveRenderStateData(stateMachineCode: string) {
        Object.keys(stateMachineMetadata.renderState).forEach(item => {
            const state = stateMachineMetadata.renderState[item];
            renderStateData.push({
                id: item,
                name: state.name,
                exist: '是',
                stateMachineId: stateMachineCode
            });
        });
    }
    /**
     * 获取状态机元数据
     */
    function queryStateMachineMetadata(): void {
        renderStateData = [];
        const formSchema = useFormSchemaComposition.getFormSchema();
        const formBasicInfo = useFormSchemaComposition.getFormMetadataBasicInfo();
        if (!formSchema?.module || !formBasicInfo) {
            return;
        }
        const { stateMachines } = formSchema.module;
        if (stateMachines && stateMachines.length > 0) {
            stateMachines.forEach(stateMachine => {
                const { uri: stateMachineID, id: stateMachineCode } = stateMachine;
                const { relativePath } = formBasicInfo;
                metadataService.getRefMetadata(relativePath, stateMachineID).then(result => {
                    if (result?.data?.content) {
                        stateMachineMetadata = JSON.parse(result.data.content);
                    }
                    resolveRenderStateData(stateMachineCode);
                }, (error) => {
                    messageBoxService.error(error?.response?.data?.Message || '查询状态机元数据失败。');
                });
            });
        }
        return;
    }
    function getStateMachineMetadata() {
        return stateMachineMetadata;
    }

    return { getStateMachineMetadata, queryStateMachineMetadata, getRenderStates };
}
