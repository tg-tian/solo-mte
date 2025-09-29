/* eslint-disable prefer-destructuring */
/* eslint-disable complexity */
/* eslint-disable no-use-before-define */
import { inject, ref } from 'vue';
import { clone, cloneDeep } from "lodash-es";
import axios, { AxiosResponse } from 'axios';
import { FLoadingService, FMessageBoxService, schemaMap } from "@farris/ui-vue";
import { MetadataService } from "./metadata.service";
import { FormViewModel, FormWebCmd, UseDesignViewModel, UseFormSchema, UseFormStateMachine, UseSchemaService } from "../types";
import { CommandMetadataConvertor } from "./command/command-metadata";
import { UseCommandBuilderService, UseFormCommandService } from "../types/command";
import { IdService } from "../components/view-model-designer/method-manager/service/id.service";
import { useParameterEditorData } from "./use-parameter-editor-data";
import { useEventParameterData } from "./use-event-parameter-data";
import { getSupportedControllerMethods } from "./command/supported-controller";
import { ParamConfig } from "../components/view-model-designer/method-manager/entity/param";
import { CallbackFn, useComponentProvider } from './use-component-provider';

import { DesignerMode } from "../types/designer-context";
import { useEventMapping } from './schema-repository/controller/use-event-mapping';

export function useFormCommandService(
    formSchemaService: UseFormSchema, 
    useFormStateMachineComposition: UseFormStateMachine, 
    loadingService: FLoadingService, 
    webCmpBuilderService: UseCommandBuilderService,
    designViewModelUtils: UseDesignViewModel,
    schemaService: UseSchemaService
): UseFormCommandService {
    const { getFormFields, getHelpFields } = useEventMapping(designViewModelUtils, schemaService);
    const { externalComponentProps, externalComponents, externalParamterEditor } = useComponentProvider();
    const metadataService = new MetadataService();
    const messageService: any = FMessageBoxService;
    /** 命令列表下的参数 */
    let propertyItem: any;
    /** 内置构件控制器 */
    let internalCommandList = [] as any;
    /** 已绑定事件列表 */
    let boundEventsList: any;
    /** dom中的webCmds节点 */
    let commands: any;
    /** dom中的视图模型数据 */
    let viewModelData: any;
    /** 单个内置构件控制器 */
    const internalCommandListItem = {
        controllerName: {
            label: '',
            name: '',
            id: '',
            isCommon: false
        },
        controllerList: [
        ] as any
    };
    /** 控制器下的命令列表 */
    const controllerListItem = {
        label: '',
        name: '',
        id: '',
        handlerName: '',
        /** 当前命令需要选择目标组件 */
        showTargetComponent: false,
        /** 当前命令选择的目标组件的id */
        cmpId: '',
        componentLists: [] as any,
        isNewGenerated: undefined,
        isRtcCommand: undefined,
        isInvalid: false,
        property: [] as any
    };

    let newControllerMethodBindingInfo: {
        controlData: any,
        componentId: string,
        viewModelId: string,
        eventCode: string,
        methodCode: string,
        methodName: string,
        setPropertyRelates?: any;
    } | null;

    const { getEventParameterData } = useEventParameterData(formSchemaService, useFormStateMachineComposition);
    const {
        assembleOutline,
        assembleSchemaFieldsByComponent,
        assembleStateVariables,
        assembleSchemaFieldsUnderBoundEntity,
        getViewModelName
    } = useParameterEditorData(formSchemaService);
    function getCommands() {
        return commands;
    }
    /** 0.获取webcmd控制器（其参数为空）*/
    function checkCommands(): Promise<any> {
        const loadingInstance: any = FLoadingService.show({ message: '数据加载中，请稍候...' });
        return new Promise((resolve, reject) => {
            loadWebcmd().then((webCmds) => {
                commands = cloneDeep(webCmds);
                generateInternalCommandList();
                checkViewModelCommands(webCmds);
                updateViewModels(webCmds);
                syncActions();
                loadingInstance.value?.close();
                resolve([]);
            }).catch((error) => {
                messageService.warning(error?.response?.data?.Message || '加载控制器失败');
                loadingInstance.value?.close();
                reject(error);
            });
        });
    }
    /**
     * 返回目前支持的控制器命令
     */
    function filterSupportedCommand(controllerContent: any) {
        const { Id: controllerId, Commands: allCommands } = controllerContent;
        return getSupportedControllerMethods(controllerId, allCommands);
    }

    /** 1.生成webcmd控制器列表 
     * loadWebcmd=>loadCommand
    */
    function loadWebcmd(): Promise<any> {
        return new Promise((resolve, reject) => {
            loadCommandsInCurrentPath().then(() => {
                const commandsInfos = formSchemaService.getCommands();
                const metadataInfo = formSchemaService.getFormMetadataBasicInfo();
                if (!metadataInfo || !commandsInfos) {
                    resolve([]);
                    return;
                }
                const existedCommands: any = [];
                let requestCommandsMetadata = commandsInfos.map((webcmdInfo: FormWebCmd) => {
                    const existedCommand = commands?.find(existedCommand => existedCommand.Id === webcmdInfo.id);
                    if (existedCommand && !webcmdInfo.nameSpace?.includes('.Front')) {
                        existedCommands.push(existedCommand);
                        return;
                    }
                    return metadataService.getRefMetadata(metadataInfo.relativePath || '', webcmdInfo.id).then((response) => {
                        webcmdInfo.code = webcmdInfo.code ? webcmdInfo.code : response.data.code;
                        webcmdInfo.nameSpace = webcmdInfo.nameSpace ? webcmdInfo.nameSpace : response.data.nameSpace;
                        return response.data;
                    }).catch(() => {
                        // 1、当前表单中引用了构件中的方法：那么找不到构件时，提示用户是否要移除构件的引用。
                        // 2、当前表单没有引用构件中的任何方法：那么找不到构件时，自动移除构件引用信息，没有提示信息。
                        if (webcmdInfo.refedHandlers && webcmdInfo.refedHandlers.length) {
                            const msg = '获取元数据XXX失败，是否移除表单的引用？'.replace('XXX', webcmdInfo.name);
                            messageService.question(msg, '', () => {
                                formSchemaService.setCommands(formSchemaService.getCommands().filter(webCmd => webCmd.id !== webcmdInfo.id));
                            });
                        } else {
                            formSchemaService.setCommands(formSchemaService.getCommands().filter(webCmd => webCmd.id !== webcmdInfo.id));
                        }
                    });
                });
                requestCommandsMetadata = requestCommandsMetadata.filter(item => !!item);
                axios.all(requestCommandsMetadata).then(axios.spread((...metadataList) => {
                    // !!item进行转化
                    let metadataContentList = metadataList.filter(item => !!item).map(item => {
                        const content = new CommandMetadataConvertor().InitFromJobject(JSON.parse(item['content']));
                        const supportedCommands = item.nameSpace.includes('.Front') ? content.Commands : filterSupportedCommand(content);
                        content.Commands = supportedCommands;
                        return content;
                    });
                    metadataContentList = existedCommands.concat(metadataContentList);
                    resolve(metadataContentList);
                })).catch((error) => {

                    reject(error);

                });
            }).catch((error) => {
                reject(error);
            });;
        });
    }
    /**
     * 将当前表单相关的自定义构件追加到webCmds中
     */
    function loadCommandsInCurrentPath(): Promise<any> {
        const commandsInfos = formSchemaService.getCommands();
        const metadataInfo = formSchemaService.getFormMetadataBasicInfo();
        const formCode = formSchemaService.designerMode === DesignerMode.PC_RTC ? metadataInfo.rtcCode : metadataInfo.code;
        return new Promise((resolve, reject) => {
            const queryRelateComponent = formSchemaService.designerMode === DesignerMode.PC_RTC ?
                metadataService.queryRelatedComponentMetadata(formSchemaService.getFormMetadataBasicInfo().rtcId) :
                metadataService.getMetadataList(metadataInfo.relativePath, '.webcmd');
            queryRelateComponent.then((response: any) => {
                const metadataList = response.data ? response.data : response;
                if (!metadataList) {
                    resolve(null);
                    return;
                }
                for (const item of metadataList) {
                    if (item.type !== 'WebCommand' || !item.extendProperty) {
                        continue;
                    }

                    const extendProperty = JSON.parse(item.extendProperty);

                    // 比对表单编号，若不匹配说明是其他表单关联的自定义构件
                    if (extendProperty && extendProperty.FormCode !== formCode) {
                        continue;
                    }

                    // 只要是属于此表单的都需要加载，除非是已经添加到表单中
                    if (!commandsInfos.find(webcmdInfo => item.id === webcmdInfo.id)) {
                        // 画布渲染过程中，可能会在控件上补充属性，这种变更用户不感知，所以不需要通知IDE框架
                        window['suspendChangesOnForm'] = true;
                        const webcmd: FormWebCmd = {
                            id: item.id,
                            path: item.relativePath,
                            name: item.fileName,
                            refedHandlers: []
                        };
                        commandsInfos.push(webcmd);
                        window['suspendChangesOnForm'] = false;
                    }
                }
                resolve(null);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    function buildLookups() {
        const externalComponents = formSchemaService.getExternalComponents();
        const result: any[] = [];
        externalComponents.forEach((externalComponent) => {
            if (externalComponent.type === 'lookup') {
                // const lookupItem = { id: externalComponent.id, label: externalComponent.name };
                result.push(externalComponent);
            }
        });

        return result;
    }

    function getFieldMappingEditor(
        modelValue: string,
        parameter: any,
        currentCommand: any,
        viewModelId: string,
        onChangeValue: CallbackFn
    ) {
        const ExternalEventParameterComponent = externalComponents['fieldMapping'];
        const beforeOpen = async ({ fromDataSource, toDataSource, gridColumns }) => {
            const lookupIdParam = currentCommand.params.find((param: any) => {
                return param.name === 'lookupId';
            });
            if (lookupIdParam && !lookupIdParam.value) {
                messageService?.warning('请先选择数据源。');
                return false;
            }
            const foundParam = currentCommand.params.find((paramItem: any) => paramItem.name === 'lookupId');
            const foundLookup = buildLookups().find((lookup: any) => lookup.id === foundParam.value);
            const { helpId } = foundLookup;
            // 缺一个视图模型id
            if (helpId && viewModelId) {
                fromDataSource.value = await getHelpFields(helpId);
                toDataSource.value = await getFormFields(viewModelId);
                gridColumns[1].editor.data = toDataSource.value;
                return true;
            }
            return false;
        };
        return {
            type: externalParamterEditor['fieldMapping'],
            customRender: ExternalEventParameterComponent ? () =>
                <ExternalEventParameterComponent
                    {...externalComponentProps['fieldMapping'](
                        modelValue,
                        parameter,
                        onChangeValue,
                        beforeOpen
                    )}
                >
                </ExternalEventParameterComponent> : null
        };
    }

    function getParameterEditorByCommand(parameter: any, controlName: string, controlType: string, onChangeValue: any) {
        const name = controlName || parameter.name;
        const ExternalEventParameterComponent = externalComponents[name];
        // const onChangeValue = () => {
        //     commandsData.value[selectTreeNodeIndex.value] = selectedTreeNode.value;
        //     updateViewModel(commandsData.value);
        // };
        return {
            type: externalParamterEditor[name] || controlType || 'Default',
            customRender: ExternalEventParameterComponent ? () =>
                <ExternalEventParameterComponent
                    {...externalComponentProps[name](parameter,
                        onChangeValue
                    )}
                >
                </ExternalEventParameterComponent> : null
        };
    }

    /** 2.生成内置构件中的控制器列表数据 */
    function generateInternalCommandList() {
        commands = cloneDeep(getUniqueValue(commands, 'Id'));
        internalCommandList = [] as any;
        commands.forEach(controller => {
            internalCommandListItem.controllerName = {
                label: controller.Code,
                name: controller.Name,
                id: controller.Id,
                isCommon: controller.Extends.IsCommon

            };
            if (!controller.Commands) {
                controller['Commands'] = [];
            }
            controller.Commands.forEach(command => {
                controllerListItem.label = command.Code;
                controllerListItem.name = command.Name;
                controllerListItem.id = command.Id;
                controllerListItem.handlerName = command.Code;
                if (command.Parameters) {
                    command.Parameters.forEach(params => {
                        const cloneParams = cloneDeep(params);
                        propertyItem = {
                            id: params.Id,
                            name: cloneDeep(params.Code),
                            value: '',
                            shownName: params.Name,
                            description: params.Description,
                            editorType: cloneDeep(params.EditorType),
                            isRetVal: params.IsRetVal,
                            parameterType: params.parameterType,
                            origin: cloneParams,
                            context: {
                                // 通用编辑器数据
                                generalData: {
                                    assembleOutline,
                                    assembleSchemaFieldsByComponent,
                                    assembleStateVariables,
                                    assembleSchemaFieldsUnderBoundEntity,
                                    getEditor: (
                                        modelValue: string,
                                        propertyItem: any,
                                        currentCommand: any,
                                        viewModelId: string,
                                        onChangeValue: CallbackFn) =>
                                        params.controlSource?.type === 'MappingFieldsEditor' ?
                                            getFieldMappingEditor(
                                                modelValue,
                                                propertyItem,
                                                currentCommand,
                                                viewModelId,
                                                onChangeValue
                                            ) :
                                            getParameterEditorByCommand(
                                                propertyItem,
                                                params.Code,
                                                cloneParams.controlSource?.type || 'Default',
                                                onChangeValue),
                                },
                                // 回调方法或状态机动作或目标组件数据列表
                                data: getEventParameterData(params.controlSource?.context?.data?.value) || [],
                            }
                        };
                        controllerListItem.property.push(cloneDeep(propertyItem));
                    });
                }
                else {
                    command['Parameters'] = [];
                    controllerListItem.property = [];
                }
                internalCommandListItem.controllerList.push(cloneDeep(controllerListItem));
                controllerListItem.property = [];
            });
            internalCommandList.push(cloneDeep(internalCommandListItem));
            internalCommandListItem.controllerList = [];
        });
        return internalCommandList;

    }
    /** 2-1.去重 */
    function getUniqueValue(itemWithSameValue, identifier) {
        if (!itemWithSameValue) {
            // 存在极限场景此属性为undefined
            itemWithSameValue = [];
            return itemWithSameValue;
        }
        const value = cloneDeep(itemWithSameValue);
        for (let i = 0; i < value.length; i++) {
            for (let j = i + 1; j < value.length; j++) {
                if (value[i][identifier] === value[j][identifier]) {
                    value.splice(j, 1);
                    j--;
                }
            }
        }
        itemWithSameValue = cloneDeep(value);
        return itemWithSameValue;
    }

    /** 3.检查视图模型的命令是否符合存储规范 */
    function checkViewModelCommands(webCmds) {

        // 设计器自动补充的属性，不记录变更
        window['suspendChangesOnForm'] = true;

        formSchemaService.getViewModels().forEach(viewModel => {
            if (!viewModel.commands || viewModel.commands.length === 0) {
                return;
            }
            viewModel.commands.map(curCmd => {
                const webCmd = webCmds.find(item => item.Id === curCmd.cmpId);
                if (!webCmd) {
                    curCmd.isInvalid = true;
                    return;
                }
                const commandInWebCmd = webCmd.Commands.find(c => c.Code === curCmd.handlerName);

                if (commandInWebCmd) {
                    curCmd.isInvalid = false;

                    // 将表单中记录的参数名称更新为控制器中的参数名称
                    if (curCmd.params && curCmd.params.length && commandInWebCmd.Parameters && commandInWebCmd.Parameters.length) {
                        curCmd.params.forEach((curParam) => {
                            const paramInWebCmd = commandInWebCmd.Parameters.find(param => param.Code === curParam.name);
                            if (paramInWebCmd) {
                                curParam.shownName = paramInWebCmd.Name;
                                delete curParam.description;
                            }
                        });
                    }
                } else {
                    curCmd.isInvalid = true;
                }
            });
        });

        window['suspendChangesOnForm'] = false;
    }
    /**
    * 将变更同步到表单DOM中，主要处理新命令参数没有填写，也不会带着type类型的问题
    * @param commands 命令列表
    */
    function updateViewModels(webCmds) {
        formSchemaService.getViewModels().forEach(viewModel => {
            if (!viewModel.commands || viewModel.commands.length === 0) {
                return;
            }
            viewModel.commands.map(curCommand => {
                const webCmd = webCmds.find(item => item.Id === curCommand.cmpId);
                // 不可用或者已有参数，不需要特殊处理
                if (curCommand.isInvalid || !curCommand.params || curCommand.params.length > 0) {
                    return;
                }
                const commandInWebCmd = webCmd.Commands.find(commandItem => commandItem.Code === curCommand.handlerName);
                if (commandInWebCmd) {
                    // 将表单中记录的参数名称更新为控制器中的参数名称
                    if (commandInWebCmd.Parameters && commandInWebCmd.Parameters.length) {
                        curCommand.params = commandInWebCmd.Parameters.reduce((result: ParamConfig[], parameter: any) => {
                            const param = new ParamConfig();
                            param.name = parameter.Code;
                            param.shownName = parameter.Name;
                            param.type = parameter.ParameterType;
                            param.EditorType = parameter && parameter.EditorType ? parameter.EditorType : null;
                            param.value = '';
                            param.description = parameter.Description;
                            param.controlSource = parameter.controlSource;
                            param.defaultValue = parameter.defaultValue;
                            result.push(param.toJson());
                            return result;
                        }, []);
                    }
                }
            });
        });
    }

    /** 4.渲染表单取出所有的已绑定事件，同步至actions节点 */
    function syncActions() {
        if (commands) {
            let components = cloneDeep(formSchemaService.getComponents());
            components = components.filter(c => !c.fakeDel);
            const findEvents = [];
            let allBoundEvents = findBoundEvent(components, findEvents, 'root-viewmodel');
            getUniqueEvent(allBoundEvents);
            const array = [];
            const viewModel = cloneDeep(formSchemaService.getFormSchema().module.viewmodels);
            if (allBoundEvents.length !== 0) {
                allBoundEvents = setActions(getComponentId(matchWebcmd(matchVM(allBoundEvents, viewModel))), 0, array);
            }
            formSchemaService.getFormSchema().module.actions = cloneDeep(allBoundEvents);
        }
    }
    /** 4-1-1.遍历components节点，找到所有事件 */
    function findBoundEvent(components, findEvents, viewModelId, excludedEvents?: string[]) {
        if (!components?.length) {
            return;
        }
        components.forEach((componentsItem) => {
            if (componentsItem['viewModel']) { viewModelId = componentsItem['viewModel']; }

            // 子级控件通用的连接关键字
            const childrenKeys = ['contents', 'columns', 'buttons', 'children'];
            childrenKeys.map(key => {
                if (componentsItem[key]) {
                    findBoundEvent(componentsItem[key], findEvents, viewModelId);
                }
            });

            // 页头或标签页内嵌的响应式工具栏
            if (componentsItem['toolbar']) {
                if (componentsItem['toolbar']['buttons']) {
                    findBoundEvent(componentsItem['toolbar']['buttons'], findEvents, viewModelId);
                }
            }
            // 筛选方案
            if (componentsItem['fields']) {
                const fieldConfigs = componentsItem['fields'];
                fieldConfigs.forEach(fieldConfigsItem => {
                    if (fieldConfigsItem['editor']) {
                        findBoundEvent([fieldConfigsItem['editor']], findEvents, viewModelId);
                    }
                });
            }

            const componentType = componentsItem.type === 'form-group' && componentsItem.editor ? componentsItem.editor.type : componentsItem.type;
            const controlEventPropertyIDList = schemaMap[componentType]?.events;
            if (controlEventPropertyIDList) {
                const eventKeys = Object.keys(controlEventPropertyIDList);
                for (let i = 0; i < eventKeys.length; i++) {
                    if (excludedEvents && excludedEvents.length && excludedEvents.includes(eventKeys[i])) {
                        continue;
                    }
                    const exist = Object.prototype.hasOwnProperty.call(componentsItem, eventKeys[i]);
                    if (exist && componentsItem[eventKeys[i]]) {
                        // 判定三段式路径
                        const paths = componentsItem[eventKeys[i]].includes('.') ? componentsItem[eventKeys[i]].split('.') : undefined;
                        const vmId = paths !== undefined ? paths[1] : viewModelId;
                        const cmdLabel = paths !== undefined ? paths[2] : componentsItem[eventKeys[i]];
                        const findEventsItem = {
                            id: componentsItem['id'],
                            eventLabel: eventKeys[i],
                            eventName: controlEventPropertyIDList[eventKeys[i]],
                            commandLabel: cmdLabel,
                            viewModelId: vmId
                        };
                        findEvents.push(cloneDeep(findEventsItem));
                    }
                }
            }

        });
        return findEvents;
    }

    /** 4-2.去重-去除特殊情况下存储的相同事件及命令 */
    function getUniqueEvent(allBoundEvents) {
        const value = cloneDeep(allBoundEvents);
        for (let i = 0; i < value.length; i++) {
            for (let j = i + 1; j < value.length; j++) {
                if (value[i]['id'] === value[j]['id'] && value[i]['eventLabel'] === value[j]['eventLabel']) {
                    value.splice(j, 1);
                    j--;
                }
            }
        }
        allBoundEvents = cloneDeep(value);
        return allBoundEvents;
    }
    /** 4-3.根据遍历components和toolbar得出的所有事件，结合viewmodel和webcmd,得到参数值 */
    function matchVM(allBoundEvents, viewModel) {
        const updatedBoundEvents = [] as any;
        allBoundEvents.forEach(boundEvenItem => {
            viewModel.forEach(viewModelItem => {
                if (viewModelItem.id === boundEvenItem.viewModelId) {
                    viewModelItem.commands.forEach(commandItem => {
                        if (commandItem.code === boundEvenItem.commandLabel) {
                            const event = {
                                id: boundEvenItem.id,
                                eventLabel: boundEvenItem.eventLabel,
                                eventName: boundEvenItem.eventName,
                                viewModelId: boundEvenItem.viewModelId,
                                commandId: commandItem.id,
                                commandLabel: boundEvenItem.commandLabel,
                                commandName: commandItem.name,
                                handlerName: commandItem.handlerName,
                                cmpId: commandItem.cmpId,
                                isNewGenerated: commandItem.isNewGenerated || false,
                                isRtcCommand: commandItem['isRtcCommand'],
                                isInvalid: commandItem.isInvalid || false,
                                params: cloneDeep(commandItem.params),
                                controllerId: '',
                                controllerLabel: '',
                                controllerName: '',
                            };
                            if (commandItem['targetComponent']) {
                                event['targetComponent'] = commandItem.targetComponent;
                            }
                            updatedBoundEvents.push(cloneDeep(event));
                        }
                    });
                }
            });
        });
        return updatedBoundEvents;
    }
    /** 4-4.根据遍历components得出的所有事件，结合webcmd,得到控制器值 */
    function matchWebcmd(allBoundEvents) {
        commands.forEach(commandItem => {
            allBoundEvents.forEach(allBoundEventsItem => {
                if (commandItem.Id === allBoundEventsItem.cmpId) {
                    commandItem.Commands.forEach(item => {
                        if (item.Code === allBoundEventsItem.handlerName) {
                            allBoundEventsItem.controllerId = commandItem.Id;
                            allBoundEventsItem.controllerLabel = commandItem.Code;
                            allBoundEventsItem.controllerName = commandItem.Name;
                        }
                    });
                }
            });
        });
        allBoundEvents.forEach(function (allBoundEventsItem, index) {
            // 失效命令
            if (allBoundEventsItem.controllerId === '' && allBoundEventsItem.controllerLabel === '' && allBoundEventsItem.controllerName === '') {
                allBoundEvents.splice(index, 1);
            }
        });
        return allBoundEvents;
    }
    /** 4-5.根据遍历components得出的事件的viewmodelId,得到componentId值 */
    function getComponentId(allBoundEvents) {
        const components = formSchemaService.getComponents();
        const viewModel = formSchemaService.getViewModels();
        for (let i = 0; i < components.length; i++) {
            allBoundEvents.forEach(allBoundEventsItem => {
                if (viewModel[i] && viewModel[i].id === allBoundEventsItem.viewModelId) {
                    allBoundEventsItem.componentId = components[i].id;
                }
            });
        }
        return allBoundEvents;
    }
    /** 4-6.标准样式化actions */
    function setActions(allBoundEvents, num, array) {
        const action = {
            sourceComponent: {
                id: '',
                viewModelId: '',
                map: [] as any
            }
        };
        if (!allBoundEvents[num]) {
            return;
        }
        action.sourceComponent.id = allBoundEvents[num].id;
        action.sourceComponent.viewModelId = allBoundEvents[num].viewModelId;
        let i = num;
        while (i < allBoundEvents.length) {
            if (allBoundEvents[i].id === action.sourceComponent.id) {
                const mapItem = {
                    event: {
                        label: allBoundEvents[i].eventLabel,
                        name: allBoundEvents[i].eventName
                    },
                    targetComponent: {
                        id: allBoundEvents[i].componentId,
                        viewModelId: allBoundEvents[i].viewModelId
                    },
                    command: {
                        id: allBoundEvents[i].commandId,
                        label: allBoundEvents[i].commandLabel,
                        name: allBoundEvents[i].commandName,
                        handlerName: allBoundEvents[i].handlerName,
                        params: cloneDeep(allBoundEvents[i].params),
                        cmpId: allBoundEvents[i].cmpId,
                        isNewGenerated: allBoundEvents[i].isNewGenerated || false,
                        isRtcCommand: allBoundEvents[i]['isRtcCommand'],
                        isInvalid: allBoundEvents[i].isInvalid || false,
                    },
                    controller: {
                        id: allBoundEvents[i].controllerId,
                        label: allBoundEvents[i].controllerLabel,
                        name: allBoundEvents[i].controllerName
                    }
                };
                if (allBoundEvents[i]['componentId']) {
                    mapItem.targetComponent.id = allBoundEvents[i].componentId;
                }
                action.sourceComponent.map.push(cloneDeep(mapItem));
                i++;
                if (i === allBoundEvents.length) {
                    array.push(cloneDeep(action));
                }
            }
            else {
                array.push(cloneDeep(action));
                setActions(allBoundEvents, i, array);
                break;
            }
        }
        return array;
    }

    /**
     *  更新事件编辑器获取到的commands
     * webCmdsChanged=>commandsChanged
    */
    function commandsChanged(newController) {
        newController.forEach(newControllerItem => {
            const item = new CommandMetadataConvertor().InitFromJobject(newControllerItem);
            commands.push(cloneDeep(item));
        });
        checkViewModelCommands(commands);
    }
    function generateCommunication(propertyData: any, event, events) {
        const eventLabel = propertyData[event.label];
        const communicationLabels = eventLabel.split(';').filter(item => item.includes('communication:'));
        const communicationIdArray = communicationLabels.map(item => item.replace('communication:', ''));
        communicationIdArray.forEach(communicationId => {
            const boundEventsListItem = {
                command: {},
                controller: {},
                boundEvents: {},
                communication: {
                    id: communicationId,
                }
            };
            events.forEach(each => {
                if (each.label === event.label) { boundEventsListItem.boundEvents = cloneDeep(each); }
            });

            boundEventsList.push(cloneDeep(boundEventsListItem));
        });

    }
    /** 
     * 事件面板调用-1
     * a. 合并视图模型带参数的命令&控制器中无参数的命令
     * b. 生成绑定事件列表
     *  */
    function findParamtersPosition(propertyData: any, events: any, viewModelId: string, allComponentList: any) {
        boundEventsList = [];
        const viewModelData = cloneDeep(formSchemaService.getViewModels());
        // 1. 遍历当前container的组件dom结构的所有事件的值
        events.forEach(event => {
            if (propertyData[event.label]) {
                if (propertyData[event.label].includes('communication:')) {
                    generateCommunication(propertyData, event, events);
                    return;
                }
                // 三段式path：root-viewmodel.items-component-viewmodel.itemsAddItem1 或 一段path：itemsAddItem1
                const paths = propertyData[event.label].includes('.') ? propertyData[event.label].split('.') : undefined;
                const { recordCommand, recordController } = handleParams(viewModelData, paths, propertyData[event.label], viewModelId, allComponentList);
                generateBoundEventsList(event, events, recordController, recordCommand);
            }
        });
        return boundEventsList;
    }
    /** 1-a.在视图模型中找到命令，并填充参数值*/
    function handleParams(viewModelData, paths, propCmdLabel, viewModelId, allComponentList) {
        const vmId = paths !== undefined ? paths[1] : viewModelId;
        const cmdLabel = paths !== undefined ? paths[2] : propCmdLabel;
        let cmpId;
        if (allComponentList.length && vmId !== undefined) {
            const componentList = allComponentList.find(componentListsItem => componentListsItem.viewModelId === vmId);
            cmpId = componentList === undefined ? undefined : componentList.componentId;
        }
        // 若命令不存在，则提示！，并允许用户绑定其他命令
        let recordCommand = {
            id: 'abandoned',
            code: cmdLabel,
            label: cmdLabel,
            name: cmdLabel,
            params: [],
            handlerName: cmdLabel,
            cmpId: '',
            shortcut: {},
            extensions: [],
            isInvalid: false,
            isNewGenerated: undefined,
            showTargetComponent: false,
            targetComponent: cmpId,
            isRtcCommand: undefined,
        };
        let recordController = {
            controllerName: {
                label: '',
                name: '',
                id: '',
            },
            controllerList: {
            },
            boundEvents: {
            }
        };
        viewModelData.forEach(element => {
            // 5. 寻找命令-确认itemsAddItem1的位置
            if (element.code.includes(vmId)) {
                element.commands.forEach(viewModelcommand => {
                    // 6-1. 若命令存在，且参数不为空
                    if (viewModelcommand.code === cmdLabel && viewModelcommand.params.length !== 0) {
                        // 判断是否为已失效命令
                        if (!viewModelcommand['isInvalid']) {
                            // 7-1. 若存在参数，则合并该命令在VM与控制器中的参数值
                            const combinedParamtersResult = combineViewModelCommandParameters(viewModelcommand.params, viewModelcommand, recordController, recordCommand, cmpId);
                            recordController = combinedParamtersResult.recordController;
                            recordCommand = combinedParamtersResult.recordCommand;
                        }
                        else {
                            // 命令已被删除
                            recordCommand.id = 'deleted';
                        }
                    }
                    // 6-2 若命令存在，且参数为空的处理
                    else if (viewModelcommand.code === cmdLabel && viewModelcommand.params.length === 0) {
                        // 判断是否为已失效命令
                        if (!viewModelcommand['isInvalid']) {
                            // 7-2. 不需要进行内置构件的处理，仅记录了命令所在的控制器及带前后缀的命令名称
                            internalCommandList.forEach(controller => {
                                if (controller.controllerName.id === viewModelcommand.cmpId) {
                                    controller.controllerList.forEach(command => {
                                        if (command.handlerName === viewModelcommand.handlerName) {
                                            recordController = cloneDeep(controller);
                                            recordCommand = getRecordController(command, viewModelcommand, recordCommand, cmpId);
                                        }
                                    });
                                }
                            });
                        } else {
                            // 命令已被删除
                            recordCommand.id = 'deleted';
                        }
                    }
                });

            }
        });
        return {
            recordController,
            recordCommand
        };
    }
    function combineViewModelCommandParameters(commandParams, viewModelcommand, recordController, recordCommand, cmpId) {
        const internalCommandListClone = cloneDeep(internalCommandList);
        commandParams.forEach(param => {
            // 7-1-1.handlerName唯一，code为带前后缀的命令英文名，name为中文名，param是当前待合并的参数（有值）
            const combinedParamtersResult = combinedParamters(param, viewModelcommand, recordController, recordCommand, cmpId, internalCommandListClone);
            recordController = combinedParamtersResult.recordController;
            recordCommand = combinedParamtersResult.recordCommand;
        });
        return {
            recordController,
            recordCommand
        };
    }
    /** 1-a.合并视图模型带参数的命令&控制器中无参数的命令 */
    function combinedParamters(paramWithValue: any, viewModelcommand, recordController, recordCommand, cmpId, sourceCommandList = null) {
        // 7-1-2. handlerName唯一，code为带前后缀的命令英文名，paramWithValue是当前待合并的参数（有值）
        (sourceCommandList || internalCommandList).forEach(controller => {
            // 控制器相同
            if (controller.controllerName.id === viewModelcommand.cmpId) {
                controller.controllerList.forEach(command => {
                    // 7-1-3. command.handlerName来自内置构件；handlerName来自视图模型
                    if (command.handlerName === viewModelcommand.handlerName) {
                        command.property.forEach(paramWithoutValue => {
                            if (paramWithoutValue.name === paramWithValue.name) {
                                paramWithoutValue.value = cloneDeep(paramWithValue.value);
                            }
                        });
                        recordController = cloneDeep(controller);
                        recordCommand = getRecordController(command, viewModelcommand, recordCommand, cmpId);
                    }
                });
            }
        });
        return {
            recordController,
            recordCommand
        };
    }
    /** 1-a.存储绑定事件对应的控制器参数值 */
    function getRecordController(command, viewModelcommand, recordCommand, cmpId) {
        // 1-a-1. 由于vm未记录控制器，此处根据命令找到控制器，并将有值的参数对应的命令command记录
        recordCommand = cloneDeep(command);
        // 1-a-2.记录带前后缀的英文名、中文名/参数
        recordCommand.label = viewModelcommand.code;
        recordCommand.name = viewModelcommand.name;
        recordCommand.id = viewModelcommand.id;
        recordCommand.targetComponent = cmpId;
        recordCommand.isRtcCommand = viewModelcommand.isRtcCommand;
        return recordCommand;
    }
    /** 1-b.生成已绑定的事件列表 */
    function generateBoundEventsList(event, events, recordController, recordCommand) {
        if (recordController !== undefined) {
            const boundEventsListItem = {
                command: {
                },
                controller: {
                },
                boundEvents: {
                }
            };
            events.forEach(each => {
                if (each.label === event.label) { boundEventsListItem.boundEvents = cloneDeep(each); }
            });
            boundEventsListItem.controller = cloneDeep(recordController.controllerName);
            boundEventsListItem.command = cloneDeep(recordCommand);
            boundEventsList.push(cloneDeep(boundEventsListItem));
        }
    }


    /** 事件面板调用-2
     * 2-a.找到视图模型，在视图模型中增删改命令及参数 */
    function viewModelDomChanged(propertyData: any, events: any, viewModelId: string, domActions: any) {
        const viewModelData = cloneDeep(formSchemaService.getViewModels());
        events.forEach(event => {
            // 1. 遍历当前container的dom结构的所有事件的值
            if (propertyData[event.label] && !propertyData[event.label].includes('communication:')) {
                // 三段式path：root-viewmodel.items-component-viewmodel.itemsAddItem1 或 一段path：itemsAddItem1
                const paths = propertyData[event.label].includes('.') ? propertyData[event.label].split('.') : undefined;
                handleViewModel(viewModelData, paths, propertyData[event.label], viewModelId, domActions, propertyData);
            }
        });
        formSchemaService.setViewmodels(cloneDeep(viewModelData));
    }
    /** 2-a.在视图模型中增删改命令及参数 */
    function handleViewModel(viewModelData, paths, propCmdLabel, viewModelId, domActions, propertyData) {
        const newCommand = {
            id: '',
            code: '',
            name: '',
            params: [],
            handlerName: '',
            cmpId: '',
            shortcut: {},
            extensions: [],
            isInvalid: false,
            isNewGenerated: undefined,
            targetComponent: undefined,
            isRtcCommand: undefined,
        };
        const vmId = paths !== undefined ? paths[1] : viewModelId;
        const cmdLabel = paths !== undefined ? paths[2] : propCmdLabel;
        // 4. 遍历找到存储命令的第二层path——path[1]，viewModel的items-component-viewmodel
        viewModelData.forEach(element => {
            if (element.code === vmId) {
                let commandExist = false;
                // 5. 借助整体dom中的domActions节点，寻找命令-确认itemsAddItem1的位置
                domActions.forEach(action => {
                    // 6. 匹配domActions，取出所有需要的值，包括命令名/事件名/参数/id等等；
                    if (action.sourceComponent.id === propertyData.id) {
                        action.sourceComponent.map.forEach(mapItem => {
                            if (mapItem.command.label === cmdLabel) {
                                newCommand.id = cloneDeep(mapItem.command.id);
                                newCommand.code = mapItem.command.label;
                                newCommand.name = mapItem.command.name;
                                newCommand.params = serializeParameter(mapItem.command.params);
                                newCommand.handlerName = mapItem.command.handlerName;
                                newCommand.cmpId = cloneDeep(mapItem.controller.id);
                                newCommand.shortcut = mapItem.command.shortcut;
                                newCommand.isRtcCommand = mapItem.command['isRtcCommand'];
                                newCommand.isNewGenerated = mapItem.command.isNewGenerated || false;
                                newCommand.isInvalid = mapItem.command.isInvalid || false;
                                newCommand.extensions = mapItem.command.extensions;
                                if (mapItem.command.isInvalid) {
                                    newCommand.isInvalid = mapItem.command.isInvalid;
                                }
                                newCommand.targetComponent = mapItem.targetComponent.id;
                            }
                        });
                    }
                });
                // 7-1. 匹配viewModel中存储的是否有该命令：itemsAddItem1，若存在该命令，则更新新的值
                element.commands.forEach(function (command, index) {
                    if (command.code === cmdLabel) {
                        commandExist = true;
                        element.commands.splice(index, 1, cloneDeep(newCommand));
                    }
                });
                // 7-2. 若没有该命令，则进行添加;并且不为已删除的命令，则添加
                if (!commandExist && newCommand.id !== 'abandoned') {
                    element.commands.push(cloneDeep(newCommand));
                }
            }
            // 8-1. 剪切掉其他同名称的命令
            else {
                // 8-1. 匹配其他viewModel中是否有同名称的命令，若有，则删除；
                element.commands.forEach(function (command, index) {
                    if (command.code === cmdLabel) {
                        element.commands.splice(index, 1);
                    }
                });
            }
        });
    }


    /** 事件面板调用-3
     * 3-a.存储事件编辑器「视图模型」中所有的viewModel数据 */
    function viewModelDisplay() {
        let savedViewModel = [] as any;
        const savedViewModelItem = {
            controllerName: {
                label: '',
                name: '',
                id: '',
            },
            controllerList: [
            ]
        };
        /** 控制器下的命令列表 */
        const controllerListItem = {
            label: '',
            name: '',
            id: '',
            handlerName: '',
            showTargetComponent: false,
            isNewGenerated: undefined,
            isRtcCommand: undefined,
            isInvaild: false,
            cmpId: '',
            componentLists: [],
            targetComponent: undefined,
            property: [

            ]
        };
        if (!formSchemaService.getModule().actions) {
            return savedViewModel;
        }

        formSchemaService.getModule().actions.forEach(actionItem => {
            actionItem.sourceComponent.map.forEach(mapItem => {
                savedViewModelItem.controllerName.id = mapItem.controller.id;
                savedViewModelItem.controllerName.name = mapItem.controller.name;
                savedViewModelItem.controllerName.label = mapItem.controller.label;
                savedViewModel.push(cloneDeep(savedViewModelItem));
                savedViewModel = getUniqueController(savedViewModel);
            });
        });

        savedViewModel.forEach(savedViewModelItem => {
            formSchemaService.getModule().actions.forEach(actionItem => {
                actionItem.sourceComponent.map.forEach(mapItem => {
                    if (mapItem.controller.id === savedViewModelItem.controllerName.id) {
                        controllerListItem.label = mapItem.command.label;
                        controllerListItem.name = mapItem.command.name;
                        controllerListItem.id = mapItem.command.id;
                        controllerListItem.handlerName = mapItem.command.handlerName;
                        controllerListItem.property = cloneDeep(mapItem.command.params);
                        controllerListItem.cmpId = mapItem.controller.id;
                        controllerListItem.isNewGenerated = mapItem.isNewGenerated || false;
                        controllerListItem.isRtcCommand = mapItem['isRtcCommand'];
                        controllerListItem.isInvaild = mapItem.inInvalid || false;
                        if (mapItem.targetComponent.id) {
                            controllerListItem.targetComponent = mapItem.targetComponent.id;
                        } else {
                            controllerListItem.targetComponent = undefined;
                        }
                        savedViewModelItem.controllerList.push(cloneDeep(controllerListItem));
                    }
                });
            });
        });
        return savedViewModel;
    }

    /** 去重 */
    function getUniqueController(itemWithSameValue) {
        const value = cloneDeep(itemWithSameValue);
        for (let i = 0; i < value.length; i++) {
            for (let j = i + 1; j < value.length; j++) {
                if (value[i]['controllerName']['id'] === value[j]['controllerName']['id']) {
                    value.splice(j, 1);
                    j--;
                }
            }
        }
        itemWithSameValue = cloneDeep(value);
        return itemWithSameValue;
    }

    /** 触发新增控制器方法 */
    function addControllerMethod(propertyData: any, viewModelId: string, parameters: any) {
        const { methodCode, methodName } = resolveNewMethodForCodeEditor(propertyData, viewModelId, parameters);
        webCmpBuilderService.addControllerMethod(methodCode, methodName);
    }
    /**
     * private
     * 序列化视图模型中的命令参数
     * @param parameters 参数
     * @returns 
     */
    function serializeParameter(parameters: any[]) {
        const results = [] as any;
        if (parameters && Array.isArray(parameters) && parameters.length > 0) {
            parameters.forEach(parameter => {
                const item: any = {};
                if (Object.prototype.hasOwnProperty.call(parameter, 'name')) {
                    item.name = parameter.name;
                }
                if (Object.prototype.hasOwnProperty.call(parameter, 'shownName')) {
                    item.shownName = parameter.shownName;
                }
                if (Object.prototype.hasOwnProperty.call(parameter, 'value')) {
                    item.value = parameter.value;
                }
                const parameterType = parameter.origin?.ParameterType;
                if (parameterType && parameterType !== 'string') {
                    item.type = parameterType;
                }
                results.push(item);
            });
        }
        return results;
    }

    function getControlName(propertyData: any, controlInfo: any): string {
        if (propertyData.type === 'lookup' && propertyData.name && typeof propertyData.name === 'string') {
            return propertyData.name;
        }
        return propertyData.title || propertyData.text || propertyData.label || controlInfo.name;
    }

    /**
     * 交互面板跳转到代码视图前，收集控件信息，用于自动绑定新增的方法
     * @param propertyData 控件schema值
     * @param viewModelId 控件所属视图模型id
     * @param parameters 点击添加新方法后，交互面板返回的参数
     * @param controlTypeName 控件类型名称
     */
    function resolveNewMethodForCodeEditor(propertyData: any, viewModelId: string, parameters: any): { methodCode: string, methodName: string; } {
        const eventCode = parameters.newFuncEvents && parameters.newFuncEvents.label || '';
        const eventName = parameters.newFuncEvents && parameters.newFuncEvents.name || '';
        const upperEventCode = eventCode.length > 1 ? (eventCode.slice(0, 1).toUpperCase() + eventCode.slice(1)) : eventCode;

        let methodCode = 'method';
        let methodName = '方法';

        // 方法编号：控件类型+事件编号；方法名称：控件名称+事件名称
        const { controlInfo } = parameters;
        if (controlInfo) {
            const controlType = controlInfo.type;
            const controlName = getControlName(propertyData, controlInfo);
            if (controlType && controlType.length > 1 && controlName) {
                const lowerControlType = controlType.slice(0, 1).toLowerCase() + controlType.slice(1);
                methodCode = `${lowerControlType}${upperEventCode}`.replace(/_/g, '').replace(/-/g, '');

                const joinChar = '';
                methodName = `${controlName}${joinChar}${eventName}`.replace(/_/g, '').replace(/-/g, '');

            }
        }

        newControllerMethodBindingInfo = {
            controlData: propertyData,
            viewModelId,
            componentId: formSchemaService.getComponentByViewModelId(viewModelId)?.id || '',
            eventCode,
            methodCode,
            methodName,
            setPropertyRelates: parameters.setPropertyRelates
        };


        return {
            methodCode,
            methodName
        };
    }
    function getViewModelCommandLabel() {
        const codeSet = new Set<string>();
        const viewmodel = formSchemaService.getFormSchema().module.viewmodels;
        viewmodel.forEach(viewmodelItem => {
            viewmodelItem.commands.forEach(commandItem => {
                codeSet.add(commandItem.code.toLowerCase());
            });
        });
        return codeSet;
    }
    /**
     * 获取唯一的方法编号后缀
     */
    function getUniqueCommandCodeSuffix(newCommandCode: string) {
        const codeSet = getViewModelCommandLabel();
        let suffix = 0;
        let newCode;
        while (true) {
            newCode = suffix > 0 ? newCommandCode + suffix : newCommandCode;
            if (!codeSet.has(newCode.toLowerCase())) {
                break;
            }
            ++suffix;
        }
        return suffix;
    }
    /**
     * 代码视图返回新增方法的编号、名称后，由设计器将方法添加到控件上
     * @param methodCode 新增方法的编号
     * @param methodName 新增方法的名称
     */
    function bindNewMethodToControl(methodCode: string, methodName: string) {
        if (!newControllerMethodBindingInfo) {
            return;
        }
        const commandBuildInfo = webCmpBuilderService.getBuildInfo();
        if (!commandBuildInfo || !commandBuildInfo.webCmdId) {
            return;
        }
        const { eventCode, viewModelId } = newControllerMethodBindingInfo;
        const viewModel = formSchemaService.getViewModelById(viewModelId);
        // 避免方法编号重复（场景：扩展表单新增的方法可能会与基础表单的方法重名）
        const methodHandle = methodCode;
        const codeSuffix = getUniqueCommandCodeSuffix(methodCode);
        methodCode = codeSuffix > 0 ? methodCode + codeSuffix : methodCode;
        methodName = codeSuffix > 0 ? methodName + codeSuffix : methodName;
        // 1、控件绑定命令
        newControllerMethodBindingInfo.controlData[eventCode] = methodCode;

        // 2、控件绑定命令后，可能会需要联动其他属性的变更
        if (newControllerMethodBindingInfo.setPropertyRelates) {
            newControllerMethodBindingInfo.setPropertyRelates(newControllerMethodBindingInfo.controlData, null);
        }

        // 3、视图模型添加命令
        let commandId = new IdService().generate();
        const viewModelCommand = viewModel?.commands.find(co => co.code === methodCode && co.handlerName === methodCode && co.cmpId === commandBuildInfo.webCmdId);
        if (!viewModelCommand) {
            viewModel?.commands.push(
                {
                    id: commandId,
                    code: methodCode,
                    name: methodName,
                    params: [],
                    handlerName: methodHandle,
                    cmpId: commandBuildInfo.webCmdId,
                    isRtcCommand: formSchemaService.designerMode === DesignerMode.PC_RTC ? true : undefined
                }
            );
        } else {
            commandId = viewModelCommand.id;
        }

        // 4、webCmd添加构件
        if (formSchemaService.getCommands()) {
            let customCmd = formSchemaService.getCommands().find(cmd => cmd.id === commandBuildInfo.webCmdId);
            if (!customCmd) {
                customCmd = {
                    id: commandBuildInfo.webCmdId,
                    path: commandBuildInfo.relativePath,
                    name: `${commandBuildInfo.code}.webcmd`,
                    refedHandlers: []
                };
                formSchemaService.getCommands().push(customCmd);
            }
            if (!customCmd?.refedHandlers?.find(handler => handler.host === commandId && handler.handler === methodHandle)) {
                customCmd?.refedHandlers?.push(
                    {
                        host: commandId,
                        handler: methodHandle
                    }
                );
            }
        }

        newControllerMethodBindingInfo = null;
    }
    /**
     * 根据参数获取新控制器元数据信息，然后过滤出支持的方法，返回新的控制器元数据
     */
    function getSupportedControllerMetadata(controller: any): Promise<any> {
        const metadataInfo = formSchemaService.getFormMetadataBasicInfo();
        return new Promise((resolve, reject) => {
            metadataService.getPickMetadata(metadataInfo.relativePath, controller).then((response: any) => {
                const { content, code, nameSpace } = response?.metadata || {};
                if (content) {
                    const newController = JSON.parse(content);
                    // 筛选支持的方法
                    const supportedList = nameSpace.includes('.Front') ? newController.Commands : getSupportedControllerMethods(newController.Id, newController.Commands);
                    newController.Commands = supportedList;
                    resolve({ controller: newController, code, nameSpace });
                } else {
                    resolve(null);
                }
            }).catch((error) => {
                reject(error);
            });
        });
    }
    /**
     * 根据控制器元数据构造内置控制器
     * @param controller 
     * @param code 
     * @param nameSpace 
     * @returns 
     */
    function getInternalControllerFromControllerMetadata(controller: any, code, nameSpace = ''): any {
        // 构造内置控制器
        const importData = {
            /** 控制器名称 */
            controllerName: {
                id: controller.Id,
                /** 控制器编号 */
                label: controller.Code,
                /** 控制器中文名 */
                name: controller.Name,
                code: code,
                nameSpace: nameSpace
            },
            /** 当前控制器下的方法列表 */
            controllerList: [] as any
        };
        if (controller.Commands) {
            controller.Commands.forEach(commandsItem => {
                const controllerListItem = {
                    label: commandsItem.Code,
                    name: commandsItem.Name,
                    id: commandsItem.Id,
                    handlerName: commandsItem.Code,
                    targetComponent: undefined,
                    hasPath: false,
                    cmpId: '',
                    componentLists: [],
                    shortcut: {},
                    // true：表明为新增项，可以编辑
                    isRtcCommand: commandsItem['isRtcCommand'],
                    isNewGenerated: commandsItem['isNewGenerated'] || false,
                    extensions: [],
                    isInvalid: false,
                    property: [] as any
                };
                if (!commandsItem.Parameters) {
                    commandsItem['Parameters'] = [];
                    controllerListItem.property = [] as any;
                }
                commandsItem.Parameters.forEach(parameterItem => {
                    const cloneParams = cloneDeep(parameterItem);
                    if (controllerListItem.property) {
                        const propertyItem = {
                            name: parameterItem.Code,
                            value: '',
                            shownName: parameterItem.Name,
                            description: parameterItem.Description,
                            id: '',
                            editorType: '',
                            isRetVal: false,
                            parameterType: '',
                            origin: cloneParams,
                            context: {
                                // 通用编辑器数据
                                generalData: {
                                    assembleOutline,
                                    assembleSchemaFieldsByComponent,
                                    assembleStateVariables,
                                    assembleSchemaFieldsUnderBoundEntity,
                                    getEditor: (
                                        modelValue: string,
                                        propertyItem: any,
                                        currentCommand: any,
                                        viewModelId: string,
                                        onChangeValue: CallbackFn) =>
                                        parameterItem.controlSource?.type === 'MappingFieldsEditor' ?
                                            getFieldMappingEditor(
                                                modelValue,
                                                propertyItem,
                                                currentCommand,
                                                viewModelId,
                                                onChangeValue
                                            ) :
                                            getParameterEditorByCommand(
                                                propertyItem,
                                                parameterItem.Code,
                                                cloneParams.controlSource?.type || 'Default',
                                                onChangeValue),
                                },
                                // 回调方法或状态机动作或目标组件数据列表
                                data: getEventParameterData(parameterItem.controlSource?.context?.data?.value) || [],
                            }
                        };
                        controllerListItem.property.push(propertyItem);
                    }
                });
                importData.controllerList.push(controllerListItem);
            });
        }
        return importData;
    }
    /** 组装参数编辑器需要的回调方法 */
    function getEventParameterGeneralData() {
        return {
            assembleOutline,
            assembleSchemaFieldsByComponent,
            assembleStateVariables,
            assembleSchemaFieldsUnderBoundEntity,
            getEventParameterData,
            getViewModelName
        };
    }

    return {
        checkCommands, commandsChanged, generateInternalCommandList, viewModelDisplay, findParamtersPosition, addControllerMethod, viewModelDomChanged, getCommands, bindNewMethodToControl, getInternalControllerFromControllerMetadata, getSupportedControllerMetadata,
        getEventParameterGeneralData, webCmpBuilderService, syncActions,
        findBoundEvent,
        getUniqueEvent
    };
}
