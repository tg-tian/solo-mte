/**
 * Copyright (c) 2020 - present, Inspur Genersoft Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { defineComponent, inject, ref, SetupContext, watch, nextTick, onMounted, Ref } from 'vue';
import { cloneDeep } from 'lodash-es';
import { FButton, FTreeView, FLoadingService, RowOptions, VisualData } from '@farris/ui-vue';
import { UseEntityTreeData } from '../composition/use-entity-tree-data';
import { entityTreeProps, EntityTreeProps } from './entity-tree-view.props';
import { useUpdateEntitySchema } from '../composition/use-update-entity-schema';
import { UseControlCreator, UseDesignViewModel, UseSchemaService } from '../../../../components/types';
import '../composition/entity-tree-view.css';
import './entity-tree-view.scss';
import { DesignerMode, UseDesignerContext } from '../../../../components/types/designer-context';
import { useOpenNewEntity } from '../composition/use-new-entity';
import { useOpenNewField } from '../composition/use-new-field-modal';
import { useOpenModifyField } from '../composition/use-modify-field-modal';

export default defineComponent({
    name: 'FEntityTreeView',
    props: entityTreeProps,
    emits: ['entityUpdated'] as (string[] & ThisType<void>) | undefined,
    setup(props: EntityTreeProps, context: SetupContext) {
        const entityTreeRef = ref();
        const dragularCompostion = ref(props.dragula);
        const useFormSchema: any = inject('useFormSchema');
        const schemaService = inject('schemaService') as UseSchemaService;
        const { treeViewData, resolveEntityTreeData, assignExpandState, setTreeDraggable, appendTreeToDragulaContainer,
            existedEntityCodes, resolveRtcEntityTreeData, serializedTreeData } = UseEntityTreeData(useFormSchema, schemaService);
        const designViewModelUtils = inject('designViewModelUtils') as UseDesignViewModel;
        const controlCreatorUtils = inject('controlCreatorUtils') as UseControlCreator;
        const useUpdateEntitySchemaComposition = useUpdateEntitySchema(schemaService, useFormSchema, designViewModelUtils, controlCreatorUtils, context);
        const loadingService: FLoadingService | any = inject<FLoadingService>('FLoadingService');

        // 获取当前设计器运行环境
        const designerContext = inject('designerContext') as UseDesignerContext;
        const designerMode = designerContext.designerMode as DesignerMode;

        /** 原始实体数据 */
        const entityData = ref(props.data.module?.entity);
        const columns = ref([{ field: 'name', title: '', dataType: 'string' }]);
        /** 树节点图标 */
        const treeNodeIconsData = {
            fold: 'f-icon f-icon-file-folder-close text-primary mr-1',
            unfold: 'f-icon f-icon-file-folder-open text-primary mr-1',
            leafnodes: 'f-icon f-icon-preview mr-1'
        };
        /** 当前新增加的实体编号集合，表单保存后清空集合。 */
        const newEntityCodeList: Ref<string[]> = ref([]);

        /** 获取树表绑定数据 */
        function getTreeViewData() {
            if (!entityData.value) {
                return;
            }
            const oldTreeViewData = cloneDeep(treeViewData.value);
            treeViewData.value = [];
            serializedTreeData.value = [];
            const mainEntity = entityData.value[0].entities[0];
            existedEntityCodes.value = [];
            treeViewData.value.push(resolveEntityTreeData(mainEntity, 0, null));

            resolveRtcEntityTreeData();

            assignExpandState(treeViewData.value, oldTreeViewData);
        }

        /** 刷新实体树 */
        function refreshEntityTree() {
            // 清除SchemaSerivce中记录的schema变更集
            schemaService.entityChangeset = null;

            getTreeViewData();
            if (entityTreeRef.value && entityTreeRef.value.updateDataSource) {
                entityTreeRef.value.updateDataSource(treeViewData.value);

                nextTick(() => {
                    setTreeDraggable();
                });
            }
        }
        function onClick(payload: MouseEvent) {
            useUpdateEntitySchemaComposition.synchronizeFromViewObject(loadingService);
        }

        context.expose({ refreshEntityTree });

        getTreeViewData();

        // 配置行样式、行收折等特性
        const rowOptions: Partial<RowOptions> = {
            customRowStyle: (dataItem: any) => {
                return {
                    'occupied': dataItem?.isOccupied,
                    'no-drag': !dataItem?.draggable,
                    'drag-copy': dataItem?.draggable,
                    [`id=${dataItem.id}`]: true,
                    'from-outside': dataItem?.rtFieldSourceType || dataItem.rtRelateParentSchemaField
                };
            },
            customRowStatus: (visualData: VisualData) => {
                if (visualData.collapse === undefined) {
                    visualData.collapse = visualData.raw.collapse;
                }
                return visualData;
            }
        };

        watch(
            () => props.dragula,
            (newValue: any) => {
                dragularCompostion.value = newValue;
                if (dragularCompostion.value?.getDragulaInstance) {
                    appendTreeToDragulaContainer(dragularCompostion.value.getDragulaInstance());
                }
            }
        );

        function onTreeNodeExpanded() {
            nextTick(() => {
                setTreeDraggable();
            });
        }


        onMounted(() => {
            newEntityCodeList.value = [];
        });
        const { openNewEntityModal } = useOpenNewEntity(useFormSchema, existedEntityCodes, refreshEntityTree, newEntityCodeList);
        const { openNewFieldModal } = useOpenNewField(useFormSchema, newEntityCodeList, refreshEntityTree, serializedTreeData);
        const { openModifyFieldModal } = useOpenModifyField(useFormSchema, designViewModelUtils, refreshEntityTree, serializedTreeData, context);

        return () => {
            return <div class="designer-schema-tree">
                <FTreeView ref={entityTreeRef}
                    data={treeViewData.value}
                    columnOption={{ fitColumns: true, fitMode: 'expand' }}
                    columns={columns.value}
                    selectable={true}
                    showTreeNodeIcons={true}
                    treeNodeIconsData={treeNodeIconsData}
                    row-option={rowOptions}
                    onExpandNode={onTreeNodeExpanded}>
                    {{
                        cellTemplate: ({ cell, row }) => {
                            const rowData = row.raw;
                            return <>
                                <div class="f-utils-fill-flex-row pr-3">
                                    <span class="test">{rowData.name}</span>
                                    {/* 运行时定制实体节点，支持新增字段和新增子表 */}
                                    {designerMode === DesignerMode.PC_RTC && rowData.nodeType === 'entity' &&
                                        <div class="toolbar-panel">
                                            <FButton customClass={{ "toolbar-action": true }} type="'link'" icon="f-icon-add" title="新增字段" onClick={(event) => openNewFieldModal(event, row.raw)}></FButton>
                                            {!rowData.parent && <FButton customClass={{ "toolbar-action": true }} type="'link'" icon="f-icon-list-new" title="新增子实体" onClick={openNewEntityModal}></FButton>}
                                        </div>
                                    }
                                    {/* 字段节点，支持查看或修改字段属性 */}
                                    {rowData.nodeType === 'field' && !rowData.rtFieldSourceType && !rowData.rtRelateParentSchemaField &&
                                        <div class="toolbar-panel">
                                            <FButton customClass={{ "toolbar-action": true, "need-mouse-in": true }} type="'link'" icon="f-icon-more" title="字段信息" onClick={(event) => openModifyFieldModal(event, row.raw)}></FButton>
                                        </div>
                                    }
                                    {/* 低代码表单实体节点，支持刷新实体数据 */}
                                    {designerMode !== DesignerMode.PC_RTC && rowData.nodeType === 'entity' && !rowData.parent &&
                                        <div class="toolbar-panel">
                                            <FButton customClass={{ "toolbar-action": true }} type="'link'" icon="f-icon-recurrence" title="刷新" onClick={onClick}></FButton>
                                        </div>
                                    }
                                </div>
                            </>;
                        },
                    }}

                </FTreeView>
            </div >;
        };
    }
});
