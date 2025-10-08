/* eslint-disable no-use-before-define */
import { cloneDeep } from 'lodash-es';
import { EventsEditorActions, EventsEditorMapItem, UseEventsEditor, UseEventsEditorUtils } from '../types/events-editor';
import { UseFormCommandService } from '../types/command';
import { UseFormSchema } from '../types';

export function useEventsEditorUtils(commandService: UseFormCommandService, formSchemaService: UseFormSchema, eventEditorService: UseEventsEditor): UseEventsEditorUtils {

    /** 初始传入值 */
    function formProperties(propertyData, viewModelId, eventList, switchEvents?: (propertyData, eventList) => object) {
        const componentLists = getcomponentLists(viewModelId);
        const commandList = commandService.generateInternalCommandList();
        const allComponentList = eventEditorService.getAllComponentList();
        const viewModelDisplay = commandService.viewModelDisplay();
        const formBasicService = formSchemaService.getFormMetadataBasicInfo();
        // DesignControlLocaleHandler.handleEventPropI18n(eventList, propertyData, commandService.localeService);

        const properties =
        {
            viewModelId: viewModelId,
            propertyID: viewModelId,
            propertyType: 'events',
            /** 内置构件显示的命令列表 */
            internalCommandList: commandList,
            /** (事件设定)可绑定事件默认列表; */
            events: eventList,
            /** 已绑定的事件（拼接已有的参数值，拼接当前事件->待集成-从dom结构中取值，事件及对应的字符串） */
            boundEventsList: commandService.findParamtersPosition(propertyData, eventList, viewModelId, allComponentList),
            /** 视图模型已有命令 */
            viewModel: viewModelDisplay,
            /** 目标组件对应的所有可选的组件 */
            componentLists: componentLists,
            /** 所有组件列表 */
            allComponentList: allComponentList,
            /** 接收formBasicService.formMetaBasicInfo.relativePath */
            relativePath: formBasicService.relativePath,
            /** 接收this.formBasicService.envType */
            envType: 'designer',
            /** 初始为空，用于存储用户点击「导入新命令」的控制器值 */
            newController: [],
            isAddControllerMethod: false,
            /** 开关控制类按钮的回调函数 */
            getEventList: () => refreshEventsAndCommandList(propertyData, commandList, viewModelId, allComponentList, eventList, switchEvents),
            /** 获取事件的路径 */
            getEventPath: () => eventEditorService.getEventPath(propertyData.id, viewModelId, commandList),
            /** 组件通讯相关的源表单信息 */
            sourceCommunication: resolveSourceCommunication(propertyData)
        };
        return properties;
    }
    /**
     * 收集组件通讯相关的源表单信息
     */
    function resolveSourceCommunication(propertyData: any) {
        const communication = {
            formId: '',
            formCode: '',
            componentId: '',
            externalContainerId: '',
            needSelectSourceControl: propertyData.type === 'external-container',
            parameterData: commandService.getEventParameterGeneralData()
        };

        // 画布选中外部容器
        if (propertyData.type === 'external-container') {
            communication.formId = propertyData.externalComponent?.id;
            communication.formCode = propertyData.externalComponent?.code;
            communication.externalContainerId = propertyData.id;
        } else {
            // 画布选中当前表单的控件
            const formBasicInfo = formSchemaService.getFormMetadataBasicInfo();
            communication.formId = formBasicInfo.id;
            communication.formCode = formBasicInfo.code;
            communication.componentId = propertyData.id;
        }
        return communication;
    }

    /** 事件编辑器传出值处理 */
    function saveRelatedParameters(propertyData: any, viewModelId: string, eventList, parameters: any) {
        if (parameters.isAddControllerMethod) {

            if (!parameters.controlInfo && propertyData.type) {
                // parameters.controlInfo = { type: propertyData.type, name: DgControl[propertyData.type] && DgControl[propertyData.type].name };
                parameters.controlInfo = { type: propertyData.type, name: propertyData.type };
            }

            commandService.addControllerMethod(propertyData, viewModelId, parameters);
            return;
        }

        /** 根据返回值整合为actions结构 */
        const actions = formActionsStructure(eventEditorService, propertyData, parameters);
        /** 增删改组件dom中事件绑定值 */
        eventsValueChanged(propertyData, actions, eventList, parameters);
        /** 更新dom中的actions节点 */
        const domActions = cloneDeep(domActionsChanged(actions));
        /** 更新dom中viewModel的绑定值 */
        commandService.viewModelDomChanged(propertyData, eventList, viewModelId, domActions);
        /** 删除viewModel中冗余的命令 */
        if (parameters['preCommand'] !== undefined) {
            // 将preCommand中的命令与action节点的命令相比较，若action节点中不存在，则在视图模型中删除
            delViewModelCommand(parameters, domActions);
        }
        /** 更新dom中的webcmds节点 */
        domWebcmdChanged(parameters);
        /** 更新函数中获取到的webcmds*/
        functionWebcmdsChanged(parameters);
        /** 存在重复被使用的「已绑定命令」，则更新actions节点 */
        if (parameters['repititionCommand']) {
            repititionCommandExist(parameters, propertyData);
        }
    }

    /** 目标组件规则判定 */
    function getcomponentLists(viewModelId) {
        const components = formSchemaService.getComponents();
        const componentListsItem = {
            componentId: '',
            viewModelId: ''
        };
        let componentLists = [] as any;
        let curComponent = 0;
        for (let i = 0; i < components.length; i++) {
            const viewModel = formSchemaService.getViewModelById(components[i].viewModel);
            const isFormComponentBindingMainEntity = components[i].componentType.includes('form') && viewModel?.bindTo === '/';

            // 筛选出root-component及form类型的component，（form类型并且绑定子表的情况例外）
            if (components[i].componentType.toLowerCase() !== 'frame' && !isFormComponentBindingMainEntity) {
                componentListsItem.componentId = cloneDeep(components[i].id);
                componentListsItem.viewModelId = cloneDeep(components[i].viewModel);
                componentLists.push(cloneDeep(componentListsItem));
                if (viewModelId === componentListsItem.viewModelId) {
                    curComponent = i;
                }
            }
        }
        // 当前组件是否为root-component
        if (components[curComponent].componentType.toLowerCase() !== 'frame') {
            componentLists = [];
        }
        return componentLists;
    }

    /** 根据返回值整合为actions结构 */
    function formActionsStructure(eventEditorService, data, parameters) {
        const actions: EventsEditorActions = {
            sourceComponent: {
                id: data.id,
                viewModelId: cloneDeep(parameters.viewModelId),
                map: []
            }
        };
        parameters.boundEventsList.forEach(boundEventItem => {
            if (!boundEventItem.command?.id) {
                return;
            }
            const mapItem: EventsEditorMapItem = {
                event: {
                    label: boundEventItem.boundEvents.label,
                    name: boundEventItem.boundEvents.name,
                },
                targetComponent: cloneDeep(eventEditorService.formTargetComponent(boundEventItem, parameters.viewModelId)),
                command: {
                    id: boundEventItem.command.id,
                    label: boundEventItem.command.label,
                    name: boundEventItem.command.name,
                    handlerName: boundEventItem.command.handlerName,
                    params: cloneDeep(boundEventItem.command.property),
                    isNewGenerated: boundEventItem.command.isNewGenerated || false,
                    isRtcCommand: boundEventItem.command['isRtcCommand'],
                    isInvalid: boundEventItem.command.isInvalid || false,
                },
                controller: {
                    id: boundEventItem.controller.id,
                    label: boundEventItem.controller.label,
                    name: boundEventItem.controller.name,
                }
            };
            if (boundEventItem.command['targetComponent']) {
                mapItem.targetComponent.id = boundEventItem.command.targetComponent;
            }
            if (mapItem.targetComponent.viewModelId !== undefined) {
                actions.sourceComponent.map.push(cloneDeep(mapItem));
            }
        });
        return actions;
    }
    /**
     * 将组件通讯数据保存到控件dom中
     */
    function resolveCommunicationValue(data: any, event: any, parameters: any) {
        const relatedBoundList = parameters?.boundEventsList?.filter(eventItem => {
            if (eventItem.boundEvents) {
                return eventItem.boundEvents.label === event.label;
            }
        });
        if (data[event.label] && data[event.label].includes('communication:')) {
            data[event.label] = null;
        }
        if (relatedBoundList.length) {
            const communicationIds: string[] = [];
            relatedBoundList.map(boundCommunication => {
                if (boundCommunication.communication) {
                    communicationIds.push(`communication:${boundCommunication.communication.id}`);
                    deleteActionItem(data.id, event.label);
                    return;
                }
            });
            if (communicationIds.length) {
                data[event.label] = communicationIds.join(';');
            }
        }
    }
    /** 增删改组件dom中事件绑定值 */
    function eventsValueChanged(data, actions, eventList, parameters) {
        // 增加或修改：data[事件id] = 'viewModelId.targetComponent-viewModelId.command';
        actions.sourceComponent.map.forEach(mapItem => {
            // 判断是存储为三段path或一段path
            if (mapItem.targetComponent.viewModelId && (actions.sourceComponent.viewModelId !== mapItem.targetComponent.viewModelId)) {
                data[mapItem.event.label] = cloneDeep(`root-viewmodel.${mapItem.targetComponent.viewModelId}.${mapItem.command.label}`);
            } else {
                data[mapItem.event.label] = cloneDeep(`${mapItem.command.label}`);
            }
        });
        /** 删除 data[事件id] = null */
        eventList.forEach(event => {
            resolveCommunicationValue(data, event, parameters);
            if (data[event.label]?.includes('communication:')) {
                return;
            }
            const exist = actions.sourceComponent.map.find(mapItem => mapItem.event.label === event.label);
            if (!exist) {
                data[event.label] = null;
                deleteActionItem(data.id, event.label);
            }
        });
    }

    /** 处理启用后隐藏的的事件的参数 */
    function handleParameterOfHiddenEvents(domActionsList, actionsListOnEventInterface) {
        // 找出隐藏的事件
        const hiddenEventsObject = domActionsList.filter(domActionsListItem =>
            !actionsListOnEventInterface.some(actionsListOnEventInterfaceItem =>
                actionsListOnEventInterfaceItem.event.label === domActionsListItem.event.label));
        // 同步隐藏事件参数
        hiddenEventsObject.forEach(hiddenEventsObjectItem => {
            // 隐藏事件是否绑定相同命令
            const matchingItem = actionsListOnEventInterface.find(actionsListOnEventInterfaceItem =>
                actionsListOnEventInterfaceItem.command.id === hiddenEventsObjectItem.command.id);
            // 若有，则同步参数
            if (matchingItem) {
                hiddenEventsObjectItem.command.params = matchingItem.command.params;
            }
        });
        // 同步到domAction
        domActionsList.map(domActionsListItem => {
            const matchingItem = hiddenEventsObject.find(hiddenEventsObjectItem =>
                hiddenEventsObjectItem.event.label === domActionsListItem.event.label);
            return matchingItem ? matchingItem : domActionsListItem;
        });
        return domActionsList;
    }

    /** 更新dom中的acions节点 */
    function domActionsChanged(actionsOnEventInterface) {
        if (actionsOnEventInterface.sourceComponent.map.length) {
            if (formSchemaService.getModule().actions === undefined) {
                formSchemaService.getModule().actions = [cloneDeep(actionsOnEventInterface)];
            }
            else {
                const domActions = formSchemaService.getModule().actions;
                let actionExist = false;
                domActions.forEach(domActionItem => {
                    if (actionsOnEventInterface.sourceComponent.id === domActionItem.sourceComponent.id) {
                        actionsOnEventInterface.sourceComponent.map.forEach(mapItem => {
                            // 若存在相同源组件，则判断是否存在同一个事件
                            const eventIndex = domActionItem.sourceComponent.map.findIndex(domMapItem => mapItem.event.label === domMapItem.event.label);
                            if (eventIndex > -1) {
                                actionExist = true;
                                // 存储过该事件，覆盖
                                domActionItem.sourceComponent.map[eventIndex] = cloneDeep(mapItem);
                            } else {
                                // 没有存储该事件，则增加
                                domActionItem.sourceComponent.map.push(cloneDeep(mapItem));
                            }
                            if (domActionItem.sourceComponent.map.length !== actionsOnEventInterface.sourceComponent.map) {
                                const domActionsList = handleParameterOfHiddenEvents(domActionItem.sourceComponent.map, actionsOnEventInterface.sourceComponent.map);
                                domActionItem.sourceComponent.map = cloneDeep(domActionsList);
                            }
                        });
                    }
                });
                if (!actionExist) {
                    domActions.push(cloneDeep(actionsOnEventInterface));
                }
                formSchemaService.getModule().actions = cloneDeep(domActions);
            }
        }
        const domActions = cloneDeep(formSchemaService.getModule().actions);
        return domActions;
    }
    /** 删除viewModel中冗余的命令 */
    function delViewModelCommand(parameters, domActions) {
        let preCommandExist = false;
        let targetComponent;
        domActions.forEach(domActionsItem => {
            domActionsItem.sourceComponent.map.forEach(mapItem => {
                if (mapItem.command.id === parameters.preCommand.id && mapItem.command.label === parameters.preCommand.label) {
                    preCommandExist = true;
                    targetComponent = mapItem.targetComponent.viewModelId;
                }
            });
        });
        // 该命令没有被任何事件绑定，且该命令是事件面板内置的命令，则删除
        if (!preCommandExist) {
            const viewModelcommand = cloneDeep(formSchemaService.getViewModels());
            viewModelcommand.forEach(vmItem => {
                vmItem.commands.forEach((vmCommandsItem, index) => {
                    if (parameters.preCommand.isNewGenerated && vmCommandsItem.id === parameters.preCommand.id && vmCommandsItem.code === parameters.preCommand.label) {
                        const isDeclared = formSchemaService.getModule()['declarations'] ? checkIfDelViewModelCommand(vmCommandsItem) : false;
                        if (!isDeclared) { vmItem.commands.splice(index, 1); }
                    }
                });
            });
            formSchemaService.setViewmodels(cloneDeep(viewModelcommand));
        }
    }
    /** 检测是否在组件声明中声明过该命令,若有声明，则不删除 */
    function checkIfDelViewModelCommand(vmCommandsItem) {
        // eslint-disable-next-line prefer-destructuring
        const declarations = formSchemaService.getModule()['declarations'];
        // root-viewmodel.data-grid-component-viewmodel.loadCard1;
        let i = 0;
        while (i < declarations.commands.length) {
            const { command } = declarations.commands[i];
            i++;
            if (vmCommandsItem.code === command) {
                return true;
            }
        }
        return false;
    }
    /** 更新dom中的webcmds节点 */
    function domWebcmdChanged(parameters) {
        if (formSchemaService.getCommands() === undefined) {
            formSchemaService.setCommands([]);
        }

        const { relativePath } = parameters;
        const webcmds = formSchemaService.getCommands();
        if (parameters.boundEventsList) {
            parameters.boundEventsList.forEach(boundEventListItem => {
                if (!boundEventListItem.command) {
                    return;
                }
                const command = {
                    host: boundEventListItem.command.id,
                    handler: boundEventListItem.command.handlerName,
                };
                let exist = false;
                webcmds.forEach(webcmdsItem => {
                    // 已经存储过该控制器
                    if (webcmdsItem.id === boundEventListItem.controller.id) {
                        exist = true;
                        let commandExist = -1;
                        if (webcmdsItem.refedHandlers) {
                            commandExist = webcmdsItem.refedHandlers.findIndex(commandItem =>
                                command.host === commandItem.host);
                        } else {
                            webcmdsItem['refedHandlers'] = [];
                            webcmdsItem.refedHandlers.push(cloneDeep(command));
                        }
                        if (commandExist === -1) {
                            webcmdsItem.refedHandlers.push(cloneDeep(command));
                        }
                    }
                });
                // 没有存储过该控制器
                if (!exist && boundEventListItem.controller.label) {
                    if (boundEventListItem.controller.label !== '') {
                        const content = {
                            id: boundEventListItem.controller.id,
                            path: relativePath,
                            name: `${boundEventListItem.controller.label}.webcmd`,
                            refedHandlers: [] as any,
                            code: boundEventListItem.controller.code,
                            nameSpace: boundEventListItem.controller.nameSpace,
                        };
                        content.refedHandlers.push(cloneDeep(command));
                        webcmds.push(cloneDeep(content));
                    }
                }
            });
            formSchemaService.setCommands(cloneDeep(webcmds));
        }
        formSchemaService.setCommands(cloneDeep(webcmds));
    }
    /** 更新函数中获取到的webcmds*/
    function functionWebcmdsChanged(parameters) {
        if (parameters.newController) {
            commandService.commandsChanged(parameters.newController);
        }
    }
    /** 删除事件时同时移除actions对应节点 */
    function deleteActionItem(id, eventLabel) {
        const domActions = formSchemaService.getModule().actions || [];
        domActions.forEach(function (actionsItem, index) {
            if (actionsItem.sourceComponent.id === id) {
                actionsItem.sourceComponent.map.forEach(function (mapItem, index) {
                    if (mapItem.event.label === eventLabel) {
                        actionsItem.sourceComponent.map.splice(index, 1);
                    }
                });
            }
            if (actionsItem.sourceComponent.map.length === 0) {
                domActions.splice(index, 1);
            }
        });
        formSchemaService.getModule().actions = cloneDeep(domActions);
    }
    /** 存在重复被使用的「已绑定命令」，则更新actions节点 */
    function repititionCommandExist(parameters, propertyData) {
        if (parameters['repititionCommand'].length !== 0) {
            const actions = cloneDeep(formSchemaService.getModule().actions);
            const repititionCommand = cloneDeep(parameters.repititionCommand);
            repititionCommand.forEach(repititionCommandItem => {
                let copiedEventLabel;
                // 提取使用了「已绑定命令」的 事件的相关值
                parameters.boundEventsList.forEach(boundEventsListItem => {
                    copiedEventLabel = (boundEventsListItem.command.id === repititionCommandItem.command.id) ? boundEventsListItem.boundEvents.label : undefined;
                });
                if (copiedEventLabel !== undefined) {
                    let data;
                    actions.forEach(actionsItem => {
                        actionsItem.sourceComponent.map.forEach(mapItem => {
                            if (propertyData.id === actionsItem.sourceComponent.id && mapItem.controller.id === repititionCommandItem.controller.id && mapItem.command.id === repititionCommandItem.command.id && mapItem.event.label === copiedEventLabel) {
                                // 记录 使用了「已绑定命令」的 事件的相关值
                                data = {
                                    targetComponent: mapItem.targetComponent,
                                    command: mapItem.command
                                };
                            }
                        });
                    });
                    actions.forEach(actionsItem => {
                        actionsItem.sourceComponent.map.forEach(mapItem => {
                            // 更新「已绑定命令」原始数据
                            if (mapItem.command.id === repititionCommandItem.command.id && mapItem.controller.id === repititionCommandItem.controller.id && mapItem.event.label === repititionCommandItem.event.label) {
                                mapItem.targetComponent = cloneDeep(data['targetComponent']);
                                mapItem.command = cloneDeep(data['command']);
                            }
                        });
                    });
                    formSchemaService.getModule().actions = cloneDeep(actions);
                }
            });
        }
    }

    /** 开关控制类按钮的回调函数 */
    function refreshEventsAndCommandList(propertyData, commandList: any[], viewModelId, allComponentList, eventList, switchEvents?: (propertyData, eventList) => object) {
        if (switchEvents) {
            eventList = switchEvents(propertyData, eventList);
        }
        // DesignControlLocaleHandler.handleEventPropI18n(eventList, propertyData, commandService.localeService);

        commandList = commandService.generateInternalCommandList();
        const boundEventsList = commandService.findParamtersPosition(propertyData, eventList, viewModelId, allComponentList);
        return {
            internalCommandList: commandList,
            events: eventList,
            boundEventsList
        };
    }

    function jumpToMethod(command) {
        commandService.webCmpBuilderService.jumpToCodeView(command);
    }

    return { formProperties, saveRelatedParameters, jumpToMethod };
}
