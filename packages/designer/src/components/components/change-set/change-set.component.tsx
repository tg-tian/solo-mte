import { computed, defineComponent, inject, onMounted, reactive, ref, Teleport } from "vue";
import { FCheckbox, FTooltip } from "@farris/ui-vue";
import { FTabs, FTabPage } from "@farris/ui-vue";
import { FTreeGrid } from "@farris/ui-vue";
import { FRadioGroup } from "@farris/ui-vue";
import { ChangeSetProps, changeSetProps } from "./change-set.props";
import { FormSchema } from "../../../components/types";
import { useSchemaChangeset } from "./composition/use-schema-changeset";
import { SchemaPropName } from "./composition/prop-name";
import { useUpdateEntity } from "./composition/use-update-entity";
import { useUpdateControls } from "./composition/use-update-controls";
import { cloneDeep } from "lodash-es";


export default defineComponent({
    name: 'FDesignerChangeSet',
    props: changeSetProps,
    emits: ['submit', 'cancel'],
    setup(props: ChangeSetProps, context) {
        const changeSetOfAddedTreeGrid = ref<any>();
        const changeSetOfRemovedTreeGrid = ref<any>();
        const modificationNavigationTreeGrid = ref<any>();
        const modificationDetailsTreeGrid = ref<any>();
        const currentFormSchema = ref<FormSchema>(props.currentFormSchema || {});
        const targetFormSchema = ref<FormSchema>(props.targetFormSchema || {});
        const changeSetOfAdded = ref([]);
        const changeSetOfRemoved = ref([]);
        /** 新增字段--全选 */
        const addFieldSelectedAll = ref(true);
        /** 删除字段---全选 */
        const deleteFieldSelectedAll = ref(true);

        const columnOption = { fitColumns: true };
        const rowNumberOption = { enable: false };
        const selectionOption = { enableSelectRow: false };
        const scopeOfApplyModification = ref(false);

        const useSchemaChangesetComposition = useSchemaChangeset();
        const {
            addSelected, addedTreeData, changeContrast, changeComplexFieldTypeList, changeFieldTypeEditorTypeList,
            changeFieldTypeList, changeList, changeLeftTreeData, changeSelected, deleteSelected, deletedTreeData,
            selectedAll, show
        } = useSchemaChangesetComposition;

        const columnsOfAddOrRemomveChangeSet = [
            { field: 'name', title: '名称' },
            { field: 'bindingField', title: '绑定字段' },
            { field: 'select', title: '更新' }
        ];
        /** 变更字段左侧树列配置 */
        const columnsOfModificationNavigate = [{ field: 'name', title: '字段名称' }];
        /** 变更树表列配置 */
        const columnsOfModificationDetails = [
            { field: 'propName', title: '属性名称' },
            { field: 'propCode', title: '属性编号' },
            { field: 'oldValue', title: '当前值' },
            { field: 'newValue', title: '新值' },
            { field: 'select', title: '更新', width: 120 }
        ];
        const updateRadioTypes = [{ value: false, text: '部分更新' }, { value: true, text: '全部更新' }];
        const toastWarningStyle = computed(() => {
            return {
                'color': '#7f5423',
                'background-color': '#fdecda',
                'border-color': '#fce5cb',
                'border-radius': '3px',
                'padding': '.75rem 1.25rem'
            };
        });
        const selectedTreeKey = ref('');
        const modificationPanelClass = computed(() => {
            return {
                'd-flex': !scopeOfApplyModification.value,
                'flex-fill f-utils-overflow-hidden pt-2': true,
                'd-none': scopeOfApplyModification.value
            };
        });
        const modificationGridPanelClass = computed(() => {
            return {
                'f-message-strip f-col-w9': true,
                'f-utils-flex-column': selectedTreeKey.value,
                'd-none': !selectedTreeKey.value
            };
        });

        const shouldShowFieldTypeEditorChangedWarning = computed(() => changeFieldTypeEditorTypeList.value.indexOf(selectedTreeKey.value) > -1);

        const shouldShowFieldTypeChangedWaring = computed(() => changeFieldTypeList.value.indexOf(selectedTreeKey.value) > -1);

        const shouldShowComplexFieldTypeChangedWarning = computed(() => changeComplexFieldTypeList.value.indexOf(selectedTreeKey.value) > -1);

        const changeSelectedDetails = computed(() => changeSelected.value[selectedTreeKey.value]);

        function onModificationNavigationChanged(seletedItems: any[]) {
            if (seletedItems && seletedItems.length) {
                const modificationChangesetItem = seletedItems[0];
                selectedTreeKey.value = modificationChangesetItem.id;
                if (modificationDetailsTreeGrid.value) {
                    const latestModificationDetails = changeContrast.value[selectedTreeKey.value];
                    modificationDetailsTreeGrid.value.updateDataSource(latestModificationDetails);
                }
            }
        }

        function onClickAddSelectCheckbox(checked: boolean) {
            if (!checked) {
                addFieldSelectedAll.value = false;
                return;
            }

            let hasUnSelected = false;
            Object.keys(addSelected.value).forEach((fieldId: string) => {
                if (!addSelected.value[fieldId]) {
                    hasUnSelected = true;
                }
            });
            addFieldSelectedAll.value = !hasUnSelected;
        }

        function onClickAddFieldSelectAllCheckbox(checked: boolean) {
            Object.keys(addSelected.value).forEach((fieldId: string) => {
                addSelected.value[fieldId] = checked;
            });
        }

        function onClickDeleteSelectCheckbox(checked: boolean) {
            if (!checked) {
                deleteFieldSelectedAll.value = false;
                return;
            }

            let hasUnSelected = false;
            Object.keys(deleteSelected.value).forEach((fieldId: string) => {
                if (!deleteSelected.value[fieldId]) {
                    hasUnSelected = true;
                }
            });
            deleteFieldSelectedAll.value = !hasUnSelected;
        }

        function onClickDeleteFieldSelectAllCheckbox(checked: boolean) {
            Object.keys(deleteSelected.value).forEach((fieldId: string) => {
                deleteSelected.value[fieldId] = checked;
            });
        }

        function batchSelectModificationDetails(changeList, isSelect, selectedTreeKey) {
            changeList.forEach(change => {
                if (change.selectable) {
                    changeSelected.value[selectedTreeKey][change.data.propPath] = isSelect;
                } else if (change.children && change.children.length > 0) {
                    batchSelectModificationDetails(change.children, isSelect, selectedTreeKey);
                }
            });
        }

        /**
         * 勾选变更列表中的复选框时，判断列表的全选按钮的勾选状态
         */
        function checkAllSelected(fieldId: string, flag: boolean) {
            if (!changeContrast.value[fieldId]) {
                return;
            }

            if (!flag) {
                selectedAll.value[selectedTreeKey.value] = false;
            }
            let hasUnSelected = false;
            const allChanges = changeList.value.filter(c => c.fieldId === fieldId);
            if (allChanges.length) {
                allChanges.forEach(node => {
                    if (changeSelected.value[fieldId] && !changeSelected.value[fieldId][node.propPath]) {
                        hasUnSelected = true;
                    }
                });
                selectedAll.value[selectedTreeKey.value] = !hasUnSelected;
            }
        }

        /**
         * 勾选变更列表中的复选框
         */
        function onClickChangeSelectCheckbox(fieldId: string, propPath: string) {
            if (!changeContrast.value[fieldId]) {
                return;
            }
            const flag = changeSelected.value[fieldId][propPath];
            const node = changeContrast.value[fieldId].find(c => c.data.propPath);

            // 联动属性
            const allChanges = changeList.value.filter(c => c.fieldId === fieldId);
            const changePaths = allChanges.length > 0 ? allChanges.map(f => f.propPath) : [];
            let relatedProps: string[] = [];
            if (changePaths.includes('type')) {
                relatedProps = changePaths;
            }
            else {
                relatedProps = SchemaPropName.getRelatedProps(node.data.isEntity, propPath, changePaths);
            }
            if (relatedProps && relatedProps.length) {
                relatedProps.forEach(prop => {
                    changeSelected.value[fieldId][prop] = changeSelected.value[fieldId][propPath];
                });
            }
            checkAllSelected(fieldId, flag);
        }

        function onClickChangeFieldSelectAllCheckbox(fieldId: string, propPath: string) {
            if (!selectedTreeKey.value) {
                return;
            }
            const latestModificationDetails = changeContrast.value[selectedTreeKey.value];
            batchSelectModificationDetails(latestModificationDetails, selectedAll.value[selectedTreeKey.value], selectedTreeKey.value);
        }
        function selectChangeItem(changeList: any[], isSelect: boolean, selectedTreeKey: string) {
            changeList.forEach(change => {
                if (change.selectable) {
                    changeSelected.value[selectedTreeKey][change.data.propPath] = isSelect;
                } else if (change.children && change.children.length > 0) {
                    selectChangeItem(change.children, isSelect, selectedTreeKey);
                }
            });
        }
        /**
         * 【更新】tab页的字段全选
         */
        function clickChangeFieldSelectAllRadio(newValue: boolean) {
            scopeOfApplyModification.value = newValue;
            Object.keys(changeContrast.value).forEach(treeKey => {
                selectedAll.value[treeKey] = scopeOfApplyModification.value;
                selectChangeItem(changeContrast.value[treeKey], scopeOfApplyModification.value, treeKey);
            });

        }

        onMounted(() => {
            show(currentFormSchema.value, targetFormSchema.value);
            // 新增、删除全选按钮
            addFieldSelectedAll.value = Object.keys(addSelected.value).length > 0;
            deleteFieldSelectedAll.value = Object.keys(deleteSelected.value).length > 0;
            if (changeSetOfAddedTreeGrid.value) {
                changeSetOfAddedTreeGrid.value.updateDataSource(addedTreeData.value);
            }
            if (changeSetOfRemovedTreeGrid.value) {
                changeSetOfRemovedTreeGrid.value.updateDataSource(deletedTreeData.value);
            }
            if (modificationNavigationTreeGrid.value) {
                modificationNavigationTreeGrid.value.updateDataSource(cloneDeep(changeLeftTreeData.value));
            }
        });

        function onSubmit() {
            const updateEntityUtil = useUpdateEntity(props, useSchemaChangesetComposition);
            if (!updateEntityUtil.checkIsNeedUpdate()) {
                context.emit('cancel');
                return;
            }
            // 更新实体
            updateEntityUtil.updateEntity();

            // 更新控件
            const updateControlsUtil = useUpdateControls(props, useSchemaChangesetComposition);
            updateControlsUtil.updateFormControls();

            context.emit('submit', {});
        }
        function onCancel() {
            context.emit('cancel');
        }

        function renderToolTipCell(cellData: any, isOldValueCell: boolean) {
            let currentTooltipStr = '';
            if (!cellData || typeof (cellData) !== 'object') {
                currentTooltipStr = cellData || '';
            } else {
                currentTooltipStr = JSON.stringify(cellData, null, 2);
            }
            const tooltipValue = reactive({ content: `<pre style="max-height: 200px;max-width:200px;">${currentTooltipStr} </pre>`, placement: isOldValueCell ? 'left' : 'right', trigger: 'click' });

            return <span v-tooltip={tooltipValue} clickToHide={false}>查看</span>;
        }
        return () => {
            const data = cloneDeep(changeLeftTreeData.value);
            return (
                <div class="h-100 f-utils-fill-flex-column">
                    <FTabs fill={true} >
                        <FTabPage id="added" title="新增">
                            <FTreeGrid ref={changeSetOfAddedTreeGrid} columns={columnsOfAddOrRemomveChangeSet} data={addedTreeData.value}
                                fit={true} columnOption={columnOption} rowNumber={rowNumberOption} showBorder={true} showStripe={false}>
                                {{
                                    'cellTemplate': ({ cell, row }) => {
                                        const isCheckCellInDetail = !row.raw.hasChildren && cell.field === 'select';
                                        return isCheckCellInDetail ? <FCheckbox v-model={addSelected.value[row.raw.id]} onChangeValue={onClickAddSelectCheckbox}></FCheckbox> :
                                            (cell.data != null ? cell.data.toString() : cell.data);
                                    },
                                    'headerCellTemplate': ({ headerCell }) => {
                                        const isCheckCellInHeader = headerCell.field === 'select';
                                        return isCheckCellInHeader ? <div class="custom-control custom-checkbox d-inline ml-2">
                                            <FCheckbox v-model={addFieldSelectedAll.value} onChangeValue={onClickAddFieldSelectAllCheckbox}>{headerCell.title}</FCheckbox>
                                        </div> : <span class="fv-column-title">{headerCell.title}</span>;
                                    }
                                }}
                            </FTreeGrid>
                        </FTabPage>
                        <FTabPage id="removed" title="删除">
                            <FTreeGrid ref={changeSetOfRemovedTreeGrid} columns={columnsOfAddOrRemomveChangeSet} data={deletedTreeData.value}
                                fit={true} columnOption={columnOption} rowNumber={rowNumberOption} showBorder={true} showStripe={false}>
                                {{
                                    'cellTemplate': ({ cell, row }) => {
                                        const isCheckCellInDetail = !row.raw.hasChildren && cell.field === 'select';
                                        return isCheckCellInDetail ? <FCheckbox v-model={deleteSelected.value[row.raw.id]} onChangeValue={onClickDeleteSelectCheckbox}></FCheckbox> :
                                            (cell.data != null ? cell.data.toString() : cell.data);
                                    },
                                    'headerCellTemplate': ({ headerCell }) => {
                                        const isCheckCellInHeader = headerCell.field === 'select';
                                        return isCheckCellInHeader ? <div class="custom-control custom-checkbox d-inline ml-2">
                                            <FCheckbox v-model={deleteFieldSelectedAll.value} onChangeValue={onClickDeleteFieldSelectAllCheckbox}>{headerCell.title}</FCheckbox>
                                        </div> : <span class="fv-column-title">{headerCell.title}</span>;
                                    }
                                }}
                            </FTreeGrid>
                        </FTabPage>
                        <FTabPage id="modified" title="更改">
                            <div>
                                <div class="border-bottom p-2">
                                    <FRadioGroup valueField="value" textField="text" data={updateRadioTypes} modelValue={scopeOfApplyModification.value} onChangeValue={clickChangeFieldSelectAllRadio}></FRadioGroup>
                                </div>
                            </div>
                            {<div class={modificationPanelClass.value}>
                                <div class="f-utils-overflow-xaya f-col-w3 scrollXFarrisTree">
                                    <FTreeGrid ref={modificationNavigationTreeGrid} columns={columnsOfModificationNavigate}
                                        data={cloneDeep(changeLeftTreeData.value)}
                                        fit={true} columnOption={columnOption} rowNumber={rowNumberOption} showBorder={false} showStripe={false}
                                        showHorizontalLines={false} showHeader={false} onSelectionChange={onModificationNavigationChanged}
                                    ></FTreeGrid>
                                </div>

                                <div class={modificationGridPanelClass.value}>
                                    {shouldShowFieldTypeEditorChangedWarning.value && <div class="toast toasty-type-warning" style={toastWarningStyle.value}>字段类型/编辑器类型已更改，请选中以下所有变更！更新后将自动替换相关控件。</div>}
                                    {shouldShowFieldTypeChangedWaring.value && <div class="toast toasty-type-warning" style={toastWarningStyle.value}>字段类型已更改，请选中以下所有变更！</div>}
                                    {shouldShowComplexFieldTypeChangedWarning.value && <div class="toast toasty-type-warning" style={toastWarningStyle.value}>字段类型已更改，更新后需要手动删除已经绑定此关联字段的控件，并重新添加。</div>}
                                    <div class="f-utils-fill-flex-column">
                                        <FTreeGrid ref={modificationDetailsTreeGrid} columns={columnsOfModificationDetails} idField="propPath"
                                            fit={true} columnOption={columnOption} rowNumber={rowNumberOption} showBorder={true} showStripe={false} selection={selectionOption}>
                                            {{
                                                'cellTemplate': ({ cell, row }) => {
                                                    const isCheckCellInDetail = cell.field === 'select' && row.raw.selectable;
                                                    const isRichTextContentCellInDetail = row.raw.isObject && (cell.field === 'oldValue' || cell.field === 'newValue');
                                                    if (isCheckCellInDetail) {
                                                        return <FCheckbox v-model={changeSelectedDetails.value[row.raw.propPath]} onChangeValue={() => onClickChangeSelectCheckbox(row.raw.fieldId, row.raw.propPath)}></FCheckbox>;
                                                    }
                                                    if (isRichTextContentCellInDetail) {
                                                        return renderToolTipCell(cell.data, cell.field === 'oldValue');
                                                    }
                                                    const cellText = cell.data !== null && cell.data !== undefined ? 
                                                            cell.data.toString() : 
                                                            cell.data;
                                                    // if (cell.showTips) {
                                                    //     return <FTooltip>
                                                    //         {
                                                    //             {
                                                    //                 default: () => cellText,
                                                    //                 contentTemplate: () => cellText
                                                    //             }
                                                    //         }
                                                    //     </FTooltip>;
                                                    // }
                                                    return cellText;
                                                    // return isCheckCellInDetail ? <FCheckbox v-model={changeSelectedDetails.value[row.raw.propPath]} onChangeValue={() => onClickChangeSelectCheckbox(row.raw.fieldId, row.raw.propPath)}></FCheckbox> :
                                                    //     (isRichTextContentCellInDetail ? renderToolTipCell(cell.data, cell.field === 'oldValue') : cell.data !== null ? cell.data.toString() : cell.data);
                                                },
                                                'headerCellTemplate': ({ headerCell }) => {
                                                    const isCheckCellInHeader = headerCell.field === 'select';
                                                    return isCheckCellInHeader ? <div class="custom-control custom-checkbox d-inline ml-2">
                                                        <FCheckbox v-model={selectedAll.value[selectedTreeKey.value]} onChangeValue={onClickChangeFieldSelectAllCheckbox}>{headerCell.title}</FCheckbox>
                                                    </div> : <span class="fv-column-title">{headerCell.title}</span>;
                                                }
                                            }}
                                        </FTreeGrid>
                                    </div>
                                </div>
                            </div>}

                        </FTabPage>
                    </FTabs>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onClick={onCancel}>取消</button>
                        <button type="button" class="btn btn-primary" onClick={onSubmit}>确定</button>
                    </div>

                </div>
            );
        };
    }
});
