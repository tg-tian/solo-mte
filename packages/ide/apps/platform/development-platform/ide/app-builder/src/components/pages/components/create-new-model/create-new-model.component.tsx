import { defineComponent, inject, ref } from "vue";
import { F_MODAL_SERVICE_TOKEN, FModalService } from "@farris/ui-vue";
import { CreateNewModelProps, createNewModelProps } from "./create-new-model.props";
import { WIZARD_OPTIONS } from "./wizard-options";
import { UseIde } from "../../../../composition/types";

export default defineComponent({
    name: 'FCreateNewModel',
    props: createNewModelProps,
    emits: ['created', 'submit'] as (string[] & ThisType<void>) | undefined,
    setup(props: CreateNewModelProps, context) {
        const modalService: FModalService | null = inject(F_MODAL_SERVICE_TOKEN, null);
        const useIdeComposition = inject('f-admin-ide') as UseIde;
        const { setInitCommandData } = useIdeComposition;
        // TODO: 这些变量需要根据实际业务逻辑进行定义
        const isOpen = ref(true);
        const activeMeteDataMenu = ref(0);
        const METADATA_MENU_LIST = ref([
            { name: '常用', list: [0, 1, 9, 2] },
            { name: '全部', list: [0, 1, 2, 9, 3, 4, 5, 6, 7, 8, 10, 11] },
            { name: '实体', list: [0, 6, 7] },
            { name: '页面', list: [1, 9] },
            { name: '帮助', list: [2] },
            { name: '查询', list: [3] },
            { name: '构件', list: [4, 5, 10] },
            { name: '服务', list: [8, 11] }
        ]);
        const localeData = ref({
            newMetadata: '新建元数据',
            newBusinessEntity: '新建业务实体',
            newViewModel: '新建视图模型',
            newForm: '新建表单',
            newMobileForm: '新建移动表单',
            newHelpMetadata: '新建帮助文档',
            newQueryObject: '新建查询对象',
            newWebServiceComponent: '新建Web服务构件',
            newCommonComponent: '新建通用构件',
            newUnifiedDataType: '新建统一数据类型',
            newInternalApi: '新建内部API',
            newSourceCodeMetadata: '新建源代码元数据',
            newExternalApi: '新建外部API',
            newDBO: '新建DBO',
        });

        function changeMeteDataMenu(index: number) {
            activeMeteDataMenu.value = index;
        }

        function createNewMetadata(event: MouseEvent, type: string) {
            event.stopPropagation();
            // TODO: 实现创建新元数据的逻辑
            // "/platform/dev/main/web/webide/plugins-new/be-create-wizard/index.html?frameID=6a1050e5-defb-4aaf-97d2-9dc8395a824b&command=Command%3AopenMetadataGuide%3AGSPBusinessEntity-new"
            const modelOptions = {
                dialogType: 'iframe',
                fitContent: false,
                showButtons: false,
                title: WIZARD_OPTIONS[type].title,
                width: WIZARD_OPTIONS[type].modalOptions.width,
                height: WIZARD_OPTIONS[type].modalOptions.height,
                src: `${WIZARD_OPTIONS[type].url}?frameID=6a1050e5-defb-4aaf-97d2-9dc8395a824b&command=${WIZARD_OPTIONS[type].activationCommands}`,
                acceptCallback: () => {
                    context.emit('submit', { type });
                },
                closedCallback: () => {
                    context.emit('created', { type });
                }
            }
            setInitCommandData('6a1050e5-defb-4aaf-97d2-9dc8395a824b', {
                mdtype: type,
                type: type
            } as any);
            modalService?.open(modelOptions);
        }

        return () => {
            const currentMenu = METADATA_MENU_LIST.value[activeMeteDataMenu.value];

            return (
                <div class={['ide-sidebar-panels', { 'ide-sidebar-hide': !isOpen.value }]}>
                    <span class="left-arrow"></span>
                    <div class="create-metadata-title" style="background-color: transparent;">
                        {localeData.value.newMetadata}
                    </div>
                    <div class="create-metadata-content">
                        <div class="content-menu">
                            {METADATA_MENU_LIST.value.map((item, i) => (
                                <div
                                    key={i}
                                    class={['content-menu-item', { 'content-menu-item-first': i === 0 }]}
                                    onClick={() => changeMeteDataMenu(i)}
                                >
                                    <p class={{ 'content-menu-select': i === activeMeteDataMenu.value }}>
                                        {item.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div style="width:100%; height: 100%" class="content-list">
                            {/* 任务：新建业务实体 */}
                            {currentMenu?.list.indexOf(0) > -1 && (
                                <div
                                    class="create-metadata task-item-new-be"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'GSPBusinessEntity')}
                                >
                                    <i class="task-icon"></i>
                                    <span class="task-title">{localeData.value.newBusinessEntity}</span>
                                </div>
                            )}
                            {currentMenu?.list.indexOf(7) > -1 && (
                                <div
                                    class="create-metadata task-item-new-vo"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'GSPViewModel')}
                                >
                                    <i class="task-icon "></i>
                                    <span class="task-title">{localeData.value.newViewModel}</span>
                                </div>
                            )}
                            {/* 任务：新建页面 */}
                            {currentMenu?.list.indexOf(1) > -1 && (
                                <div
                                    class="create-metadata task-item-new-frm"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'Form')}
                                >
                                    <i class="task-icon"></i>
                                    <span class="task-title">{localeData.value.newForm}</span>
                                </div>
                            )}
                            {currentMenu?.list.indexOf(9) > -1 && (
                                <div
                                    class="create-metadata task-item-new-mfrm"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'MobileForm')}
                                >
                                    <i class="task-icon"></i>
                                    <span class="task-title">{localeData.value.newMobileForm}</span>
                                </div>
                            )}
                            {/* 任务：新建帮助 */}
                            {currentMenu?.list.indexOf(2) > -1 && (
                                <div
                                    class="create-metadata task-item-new-help"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'HelpMetadata')}
                                >
                                    <i class="task-icon "></i>
                                    <span class="task-title">{localeData.value.newHelpMetadata}</span>
                                </div>
                            )}
                            {currentMenu?.list.indexOf(3) > -1 && (
                                <div
                                    class="create-metadata task-item-new-query"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'QueryObject')}
                                >
                                    <i class="task-icon "></i>
                                    <span class="task-title">{localeData.value.newQueryObject}</span>
                                </div>
                            )}
                            {currentMenu?.list.indexOf(4) > -1 && (
                                <div
                                    class="create-metadata task-item-new-service"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'WebServiceComponent')}
                                >
                                    <i class="task-icon "></i>
                                    <span class="task-title">{localeData.value.newWebServiceComponent}</span>
                                </div>
                            )}
                            {currentMenu?.list.indexOf(5) > -1 && (
                                <div
                                    class="create-metadata task-item-new-common"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'CommonComponent')}
                                >
                                    <i class="task-icon "></i>
                                    <span class="task-title">{localeData.value.newCommonComponent}</span>
                                </div>
                            )}
                            {currentMenu?.list.indexOf(6) > -1 && (
                                <div
                                    class="create-metadata task-item-new-unifie"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'UnifiedDataType')}
                                >
                                    <i class="task-icon "></i>
                                    <span class="task-title">{localeData.value.newUnifiedDataType}</span>
                                </div>
                            )}
                            {currentMenu?.list.indexOf(8) > -1 && (
                                <div
                                    class="create-metadata task-item-new-internalApi"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'InternalApi')}
                                >
                                    <i class="task-icon "></i>
                                    <span class="task-title">{localeData.value.newInternalApi}</span>
                                </div>
                            )}
                            {currentMenu?.list.indexOf(10) > -1 && (
                                <div
                                    class="create-metadata task-item-new-customweb"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'SourceCodeMetadata')}
                                >
                                    <i class="task-icon "></i>
                                    <span class="task-title">{localeData.value.newSourceCodeMetadata}</span>
                                </div>
                            )}
                            {currentMenu?.list.indexOf(11) > -1 && (
                                <div
                                    class="create-metadata task-item-new-externalApi"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'ExternalApi')}
                                >
                                    <i class="task-icon "></i>
                                    <span class="task-title">{localeData.value.newExternalApi}</span>
                                </div>
                            )}
                            {currentMenu?.list.indexOf(12) > -1 && (
                                <div
                                    class="create-metadata task-item-new-dbo"
                                    onClick={(e: MouseEvent) => createNewMetadata(e, 'newDbo')}
                                >
                                    <i class="task-icon "></i>
                                    <span class="task-title">{localeData.value.newDBO}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };
    }
});