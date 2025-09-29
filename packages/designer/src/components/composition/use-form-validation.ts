import { FMessageBoxService } from "@farris/ui-vue";
import { CommunicationParameter, CommunicationSource, CommunicationTarget } from "@farris/ui-vue/components/events-editor";
import { FormViewModel, UseFormSchema } from "../types";
import { UseFormCommandService } from "../types/command";

/**
 * 表单元数据有效性检查
 */
export function useFormValidation(useFormSchema: UseFormSchema, formCommandService: UseFormCommandService) {

    /**
     * 校验控件的普通事件命令是否有效
     */
    function checkEventValid(boundEvent: any) {
        const viewModel = useFormSchema.getViewModelById(boundEvent.viewModelId);
        let vmCommand;
        if (viewModel && viewModel.commands && viewModel.commands.length) {
            vmCommand = viewModel.commands.find(c => c.code === boundEvent.commandLabel && !c.isInvalid);
        }
        if (!vmCommand) {
            const controlInfo = useFormSchema.getControlBasicInfoMap().get(boundEvent.id);
            const controlName = (controlInfo && controlInfo.parentPathName) || boundEvent.id;
            let msg = `【ControlName】的【EventName】绑定的命令已被移除，请重新选择。`;
            msg = msg.replace('ControlName', controlName).replace('EventName', boundEvent.eventName);
            FMessageBoxService.warning(msg, '');
            return false;
        }
        return true;
    }
    /**
     * 检查表单内是否存在某一条命令
     * @param formModule 表单schema
     * @param viewModelId 命令所在的模型id
     * @param commandId 命令编号
     */
    function checkCommandExisted(formModule: any, viewModelId: string, commandCode: string) {
        const targetViewModel = formModule.module.viewmodels.find(viewModel => viewModel.id === viewModelId);
        if (!targetViewModel || !targetViewModel.commands) {
            return false;
        }
        const targetCommand = targetViewModel.commands.find(command => command.code === commandCode);
        if (!targetCommand) {
            return false;
        }
        return true;
    }
    /**
     * 检查表单内是否存在某一条变量
     * @param formModule 表单schema
     * @param viewModelId 变量所在的模型id
     * @param commandId 变量编号
     */
    function checkStateExisted(formModule: any, viewModelId: string, stateCode: string) {
        const targetViewModel = formModule.module.viewmodels.find(viewModel => viewModel.id === viewModelId);
        if (!targetViewModel || !targetViewModel.states) {
            return false;
        }
        const targetState = targetViewModel.states.find(state => state.code === stateCode);
        if (!targetState) {
            return false;
        }
        return true;
    }
    function checkCommunicationSource(source: CommunicationSource): boolean {
        // 当前表单id
        const currentFormId = useFormSchema.getFormMetadataBasicInfo().id;
        // 当前引入的所有外部表单
        const { externalFormSchema } = useFormSchema;

        // 源表单元数据
        const sourceForm = currentFormId === source.formId ? useFormSchema.getFormSchema() : externalFormSchema.get(source.externalContainerId || '')?.content;
        if (!sourceForm) {
            return false;
        }
        // 检查源表单的控件是否存在 TODO


        return true;
    }

    function checkCommunicationTarget(target: CommunicationTarget): boolean {
        // 当前表单id
        const currentFormId = useFormSchema.getFormMetadataBasicInfo().id;
        // 当前引入的所有子表单
        const { externalFormSchema } = useFormSchema;

        // 目标表单元数据
        const targetForm = currentFormId === target.formId ? useFormSchema.getFormSchema() : externalFormSchema.get(target.externalContainerId)?.content;
        if (!targetForm) {
            return false;
        }
        // 检查目标表单的命令是否存在
        const isCommandExisted = checkCommandExisted(targetForm, target.commandViewmodelId, target.commandCode);
        if (!isCommandExisted) {
            return false;
        }

        return true;
    }
    /**
     * 校验目标表单的目标参数（变量）是否存在
     * @param paramMapping 
     */
    function checkCommunicationTargetState(target: CommunicationTarget, paramMapping: CommunicationParameter) {
        // 当前表单id
        const currentFormId = useFormSchema.getFormMetadataBasicInfo().id;
        // 当前引入的所有子表单
        const { externalFormSchema } = useFormSchema;

        // 目标表单元数据
        const targetForm = currentFormId === target.formId ? useFormSchema.getFormSchema() : externalFormSchema.get(target.externalContainerId)?.content;
        if (!targetForm) {
            return false;
        }
        // 检查目标表单的命令是否存在
        const isCommandExisted = checkStateExisted(targetForm, paramMapping.targetVariableViewModelId, paramMapping.targetVariable);
        if (!isCommandExisted) {
            return false;
        }
        return true;
    }
    /**
     * 校验控件的组件通讯配置是否完整
     */
    function checkCommunicationValid(boundEvent: any) {
        const { commandLabel } = boundEvent;
        const controlInfo = useFormSchema.getControlBasicInfoMap().get(boundEvent.id);
        // 控件名称
        const controlName = (controlInfo && controlInfo.parentPathName) || boundEvent.id;

        const communicationIds = commandLabel.replace(/communication:/g, '').split(';');
        if (communicationIds?.length) {
            const communications = useFormSchema.getFormSchema().module.communications || [];
            for (const communicationId of communicationIds) {
                const communication = communications.find(item => item.id === communicationId);
                if (!communication) {
                    let msg = `【ControlName(ControlId)】的【EventName】绑定的通讯已被移除，请重新选择。`;
                    msg = msg.replace('ControlName', controlName).replace('EventName', boundEvent.eventName).replace('ControlId', boundEvent.id);
                    FMessageBoxService.warning(msg, '');
                    return false;
                }
                // 检查通讯是否配置完整
                const { source, target, paramMappings } = communication;
                const isSourceComplete = source && source.formId && source.componentId && source.event;
                const isTargetComplete = target && target.formId && target.commandCode;
                if (!isSourceComplete || !isTargetComplete) {
                    let msg = `【ControlName(ControlId)】配置的组件通讯不完整，请检查。`;
                    msg = msg.replace('ControlName', controlName).replace('ControlId', boundEvent.id);;
                    FMessageBoxService.warning(msg, '');
                    return false;
                }
                // 检查通讯内的事件、名称等是否有效
                if (!checkCommunicationSource(source) || !checkCommunicationTarget(target)) {
                    let msg = `【ControlName(ControlId)】配置的组件通讯已失效，请检查。`;
                    msg = msg.replace('ControlName', controlName).replace('ControlId', boundEvent.id);;
                    FMessageBoxService.warning(msg, '');
                    return false;
                }

                // 检查参数映射是否完整
                if (paramMappings?.length) {
                    for (const paramMapping of paramMappings) {
                        const isParamValid = paramMapping.sourceValue && paramMapping.targetVariable;
                        if (!isParamValid) {
                            let msg = `【ControlName(ControlId)】配置的组件通讯参数不完整，请检查。`;
                            msg = msg.replace('ControlName', controlName).replace('ControlId', boundEvent.id);;
                            FMessageBoxService.warning(msg, '');
                            return false;
                        }
                        // 检查参是否数失效
                        if (!checkCommunicationTargetState(target, paramMapping)) {
                            let msg = `【ControlName(ControlId)】配置的组件通讯参数已失效，请检查。`;
                            msg = msg.replace('ControlName', controlName).replace('ControlId', boundEvent.id);;
                            FMessageBoxService.warning(msg, '');
                            return false;
                        }
                    }
                }
            }
        }


        return true;
    }
    /**
     * 校验控件绑定的命令是否有效
     */
    function checkControlEventValid(): boolean {
        const components = useFormSchema.getComponents();
        const findEvents = [];

        // 控件的事件合集
        let allBoundEvents = formCommandService.findBoundEvent(components, findEvents, 'root-viewmodel');

        // 去重
        allBoundEvents = formCommandService.getUniqueEvent(allBoundEvents);

        if (allBoundEvents.length) {
            for (const boundEvent of allBoundEvents) {
                const validResult = boundEvent.commandLabel?.includes('communication') ? checkCommunicationValid(boundEvent) : checkEventValid(boundEvent);
                if (!validResult) {
                    return false;
                }

            }
        }


        return true;

    }
    /**
     * 表单保存前的校验
     */
    function checkBeforeSaved() {

        // 校验DOM中所有绑定事件、通讯事件是否有效
        if (!checkControlEventValid()) {
            return false;
        }
        return true;
    }

    return { checkBeforeSaved };
}
