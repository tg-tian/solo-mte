import axios from 'axios';
import { DesignerProps } from '../designer.props';
import { FormMetadaDataDom, UseFormSchema, UseFormMetadata, FormMetaDataModule, UseSchemaService } from '../types';
import { useLocation } from './use-location';
import { useFormMetadata } from './form-metadata.service';
import { cloneDeep, omit } from 'lodash-es';
import { RuntimeSchemaDiffService } from './runtime/runtime-schema-diff.service';
import { RuntimeComponentDiffService } from './runtime/runtime-component-diff.service';
import { FModalService, F_MODAL_SERVICE_TOKEN, MenuLookupContainer, useMenuTreeGridCoordinator } from "@farris/ui-vue";
import { inject, ref } from 'vue';

export function useRtcFormMetadata(
    props: DesignerProps,
    useFormSchemaComposition: UseFormSchema,
    schemaService: UseSchemaService): UseFormMetadata {

    /** 初始的表单元数据，用于在保存表单时做前后元数据内容的对比。 */
    let previousMetadataContent;

    /** 运行时定制，元数据查询、保存url */
    const rtcMetadataUrl = '/api/runtime/bcc/v1.0/template';

    const modalService: FModalService | null = inject(F_MODAL_SERVICE_TOKEN, null);
    /** 发布菜单的窗口实例 */
    const menuModalInstance = ref();
    /** 选中的菜单数据 */
    const menuSelectedData = ref();
    /** 菜单缓存 */
    const menuClearCache = ref();

    /** 获取表单元数据 */
    function queryMetadata(): Promise<FormMetadaDataDom> {
        const { getHrefParam } = useLocation();

        const dimension1 = getHrefParam('dim1');
        const dimension2 = getHrefParam('dim2');
        const metadataId = getHrefParam('metadataId');

        return new Promise((resolve, reject) => {

            axios.get(`${rtcMetadataUrl}/${metadataId}`).then((response: any) => {
                if (response?.data?.fieldTree && response?.data?.formContent) {
                    const { fieldTree, formContent } = response.data;
                    const formSchema = formContent.Contents;

                    const formMetadataBasicInfo: any = {
                        // 基础表单id code name
                        id: formSchema.module?.id,
                        code: formSchema.module?.code,
                        name: formSchema.module?.name,
                        resourceMetadataId: response.data.resourceMetadataId,
                        dimension1,
                        dimension2,

                        // 扩展表单id code name
                        rtcId: formContent.Id,
                        rtcCode: fieldTree.code,
                        rtcName: fieldTree.name
                    };
                    // 查询元数据具体信息
                    axios.get(`${rtcMetadataUrl}/metadata/${metadataId}`).then((metadataResponse: any) => {
                        const rtcFormMetadataBasicInfo = omit(metadataResponse.data, ['content', 'id', 'code', 'name']);
                        formMetadataBasicInfo.rtcId = metadataResponse.data.id;
                        formMetadataBasicInfo.rtcCode = metadataResponse.data.code;
                        formMetadataBasicInfo.rtcName = metadataResponse.data.name;
                        Object.assign(formMetadataBasicInfo, rtcFormMetadataBasicInfo);


                        useFormSchemaComposition.setFormMetadataBasicInfo(formMetadataBasicInfo);
                        useFormSchemaComposition.setFormSchema(formSchema);

                        previousMetadataContent = {
                            Id: formContent.Id,
                            Contents: cloneDeep(formSchema)
                        };
                        schemaService.rtcSchemaFields.value = fieldTree;

                        resolve(formSchema);
                    });

                }
            });
        });

    }
    function saveFormMetadata() {
        const currentFormSchema = useFormSchemaComposition.getFormSchema();
        const currentFormModule = useFormSchemaComposition.getModule();
        const schemaDiffService = new RuntimeSchemaDiffService(schemaService);
        const componentsDiffService = new RuntimeComponentDiffService();
        const { addedFields, modifiedFields } = schemaDiffService.getChanges(previousMetadataContent.Contents.module, currentFormModule);
        const { newLookupConfigs, deletedLookupConfigs, modifiedLookupConfigs } = componentsDiffService.getLookupConfigsChanges(previousMetadataContent.Contents.module.components, currentFormModule.components);
        const voChanges = {
            added: addedFields,
            modified: modifiedFields,
            newLookupConfigs,
            deletedLookupConfigs,
            modifiedLookupConfigs,
        };
        const currentMetadataContent = {
            Id: previousMetadataContent.Id,
            Contents: JSON.stringify(currentFormSchema)
        };
        const body = {
            voChanges,
            content: currentMetadataContent,
            voId: currentFormModule.entity[0].id,
            formId: previousMetadataContent.Id,
            eapiId: currentFormModule.entity[0].eapiId,
        };
        return new Promise((resolve, reject) => {
            axios.put(`${rtcMetadataUrl}/`, body).then(() => {
                previousMetadataContent.Contents = cloneDeep(currentFormSchema);
                resolve(null);
            }, (error) => {
                reject(error);
            });
        });

    }
    /**
     * 获取拖拽控制规则：合并公共规则和模板的特定规则
     */
    function queryFormTemplateRule(formModule: FormMetaDataModule): Promise<void> {
        return useFormMetadata(props, useFormSchemaComposition).queryFormTemplateRule(formModule);
    }

    /**
    * 运行表单
    */
    function runForm(loadingService: any, messageBoxService: any) {
        const currentFormSchema = useFormSchemaComposition.getFormSchema();
        const formBasicInfo = useFormSchemaComposition.getFormMetadataBasicInfo();
        const { dimension1, dimension2 } = formBasicInfo;
        const stateMachineMap = {};
        if (currentFormSchema.module.stateMachines && currentFormSchema.module.stateMachines[0]) {
            stateMachineMap[currentFormSchema.module.stateMachines[0].uri] = "";
        }
        const formId = previousMetadataContent.Id;
        const body = {
            formId,
            voId: currentFormSchema.module.entity[0].id,
            eapiId: currentFormSchema.module.entity[0].eapiId,
            stateMachineIds: stateMachineMap,
            webCmdIds: currentFormSchema.module.webcmds.map(cmd => cmd.id)
        };
        const loadingInstance = loadingService?.show({ message: '解析中，请稍候...' });
        axios.post(`${rtcMetadataUrl}/preview`, body).then((result) => {
            if (result?.data?.success && result?.data?.extraMessages) {
                const previewUrl = `${window.location.origin}/platform/common/web/renderer/index.html#/?dim1=${dimension1}&dim2=${dimension2}&metadataId=${formId}`;
                const windowProxy = window.open(previewUrl);
                if (!windowProxy) {
                    messageBoxService.error('预览失败，请调整浏览器安全设置后重试！');
                }
            } else {
                messageBoxService.error('表单编译失败！');
            }
            loadingInstance.value.close();
        }, (error) => {
            loadingInstance.value.close();
            messageBoxService.error(error || '表单解析失败');

        });
    }
    function onMenuCancel() {
        if (menuModalInstance.value.close) {
            menuModalInstance.value.close();
        }
    }
    /**
     * 菜单加载服务
     */
    function getFetchNodeApiUrl(expandedNode?: any): string {
        const enableLayeredLoading = false; // 待树列表滚动条问题修复后再启用分层加载
        if (enableLayeredLoading) {
            const ROOT_NODE_ID = '0';
            const currentNodeId = expandedNode?.id || ROOT_NODE_ID;
            return `/api/runtime/sys/v1.0/functions/layerFuncs/${currentNodeId}`;
        } else {
            if (expandedNode) {
                return '';
            }
            return '/api/runtime/sys/v1.0/functions/allfuncs';
        }
    }
    function renderPublichMenuComponent() {
        const modalContainerRef = ref();
        const useMenuTreeGrid = useMenuTreeGridCoordinator({ targetType: 'menu', fetchNodeApi: getFetchNodeApiUrl, modelValue: '' }, modalContainerRef);
        menuSelectedData.value = useMenuTreeGrid.selectedData;
        menuClearCache.value = useMenuTreeGrid.clearCache;

        return () => (<MenuLookupContainer targetType="menu" useTreeGridCoordinatorComposition={useMenuTreeGrid}></MenuLookupContainer>);
    }
    /**
     * 选择菜单后事件
     */
    function onMenuConfirm(messageBoxService: any, notifyService: any) {
        if (!menuSelectedData.value?.value) {
            notifyService?.warning({ message: '请选择数据！', position: 'top-center' });
            return;
        }

        const formBasicInfo = useFormSchemaComposition.getFormMetadataBasicInfo();
        const menuInfo = {
            dim1: formBasicInfo.dimension1,
            dim2: formBasicInfo.dimension2,
            isRtc: '1',
            metadataId: formBasicInfo.rtcId,
            menuId: menuSelectedData.value.value.id
        };

        axios.post(`${rtcMetadataUrl}/publishRtcMenu`, menuInfo).then(() => {
            notifyService?.success('发布成功！');
        }, (error) => {
            messageBoxService.error(error?.response?.data?.Message || '发布失败！');
        });

        onMenuCancel();
    }

    /**
     * 复制部署路径
     */
    function publishMenu(messageBoxService: any, notifyService: any) {
        if (!modalService) {
            return;
        }
        const modalEditorRef = modalService.open({
            title: '发布菜单',
            width: 800,
            height: 550,
            fitContent: false,
            showButtons: true,
            render: renderPublichMenuComponent(),
            enableEsc: false,
            draggable: true,
            closedCallback: () => {
                if (menuClearCache.value) {
                    menuClearCache.value();
                }
            },
            buttons: [
                {
                    class: 'btn btn-secondary',
                    text: '取消',
                    handle: () => {
                        onMenuCancel();
                    },
                },
                {
                    class: 'btn btn-primary',
                    text: '确定',
                    handle: () => {
                        onMenuConfirm(messageBoxService, notifyService);
                    },
                }
            ],
        });

        menuModalInstance.value = modalEditorRef?.modalRef?.value;
    }
    return { queryMetadata, saveFormMetadata, queryFormTemplateRule, runForm, publishMenu };

}
