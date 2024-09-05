import { DataColumn } from "@farris/ui-vue/components/data-view";
import { FInputGroup } from "@farris/ui-vue/components/input-group";
import { FTreeGrid } from "@farris/ui-vue/components/tree-grid";
import { FormViewModel } from "../../../../../types";
import { SetupContext, defineComponent, ref, computed, reactive } from "vue";
import { useViewModelMethod } from "./use-method";
import { Command } from "../../entity/command";
import { ParamConfig } from "../../entity/param";
import { MethodListProps, methodListProps } from "./method-list.props";

import './method-list.scss';

export default defineComponent({
    name: 'FMethodList',
    props: methodListProps,
    emits: [],
    setup(props: MethodListProps, context) {
        /** 树表格实例 */
        const treeGridRef = ref();

        const columns: DataColumn[] = [
            { field: 'name', title: '方法名称', dataType: 'string' },
            { field: 'code', title: '方法编号', dataType: 'string' }
        ];

        const rowNumberOption = computed(() => { return { enable: false }; });

        const { commandsData, activeViewModel, selectedTreeNode, isCommandNodeSelected,
            paramsData, updateCommandParamFromWebCmd, onChangeSelectedCommand
        } = useViewModelMethod(props);

        /**
         * 由外部触发刷新方法
         */
        function refreshMethodList(newCommandsData: Array<Command>, newActiveViewModel: FormViewModel, selectedCommandId?: string) {
            commandsData.value = newCommandsData || [];
            activeViewModel.value = newActiveViewModel;
            treeGridRef.value.updateDataSource(commandsData.value);

            if (commandsData.value.length) {
                treeGridRef.value.selectItemById(selectedCommandId || selectedTreeNode.value?.id || commandsData.value[0].id);
            } else {
                selectedTreeNode.value = null;
                paramsData.value = [];
            }
        }
        context.expose({ refreshMethodList, selectedTreeNode, isCommandNodeSelected });

        /**
         * 渲染方法的来源信息
         */
        function renderCommandSource() {
            const selectedData = selectedTreeNode.value?.data;
            if (isCommandNodeSelected.value && selectedData && selectedData.controllerName) {
                return <div class="f-struct-wrapper">
                    <div class="f-section-form f-section-in-main f-section pt-0">
                        <div class="f-section-header">
                            <div class="f-title">
                                <h4 class="f-title-text">方法来源</h4>
                            </div>
                        </div>
                        <div class="f-section-content pl-2">
                            <div class="col-12 mb-2 d-inline-block">
                                <div class="farris-group-wrap">
                                    <div class="form-group farris-form-group">
                                        <label class="col-form-label">
                                            <span class="farris-label-text">控制器：
                                                {selectedData.controllerName}（{selectedData.controllerCode}）
                                            </span>
                                        </label>
                                        {selectedData.handlerShowName ?
                                            <label class="col-form-label">
                                                <span class="farris-label-text">
                                                    引用方法：{selectedData.handlerShowName}（{selectedData.handlerName}）
                                                </span>
                                            </label> : ''}

                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>;
            }
        }

        /**
         * 渲染操作的来源信息
         */
        function renderHandlerSource() {
            const selectedData = selectedTreeNode.value?.data;
            if (!isCommandNodeSelected.value && selectedData && selectedData.componentName) {
                return <div class="f-struct-wrapper" >
                    <div class="f-section-form f-section-in-main f-section pt-0">
                        <div class="f-section-header">
                            <div class="f-title">
                                <h4 class="f-title-text">构件</h4>
                            </div>
                        </div>
                        <div class="f-section-content pl-2">
                            <div class="col-12 mb-2 d-inline-block">
                                <div class="farris-group-wrap">
                                    <div class="form-group farris-form-group">
                                        <label class="col-form-label">
                                            <span class="farris-label-text">
                                                构件名称： {selectedData.componentName}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>;
            }
        }

        /**
         * 渲染方法参数面板
         */
        function renderParameterPanel() {
            const selectedData = selectedTreeNode.value?.data;

            if (isCommandNodeSelected.value && selectedData && paramsData.value?.length > 0) {

                return <div class="f-section-form f-section-in-main f-section pt-0">
                    <div class="f-section-header">
                        <div class="f-title">
                            <h4 class="f-title-text">方法参数</h4>
                            {selectedData.needRefreshParam ?
                                <span title="构件中方法的参数发生变更，请点击更新"
                                    class="update-param text-warning" onClick={updateCommandParamFromWebCmd}>
                                    <i class="ml-2 f-icon f-icon-recurrence"></i> 更新
                                </span> : ''}

                        </div>
                    </div>
                    <div class="f-section-content pl-2">
                        {paramsData.value.map((paramData: ParamConfig) => {
                            const paramDescriptionTooltip = reactive({ content: paramData.description, placement: 'top' });
                            return <div class="col-12 mb-2 d-inline-block">
                                <div class="farris-group-wrap">
                                    <div class="form-group farris-form-group">
                                        <label class="col-form-label">
                                            <span class="farris-label-text" title={paramData.name}>
                                                {paramData.shownName}
                                            </span>
                                            {paramData.description ?
                                                <span class="farris-label-tips ml-2" v-tooltip={paramDescriptionTooltip}>
                                                    <i class="f-icon f-icon-message_help" style="color:#878D99;"></i>
                                                </span> : ''}
                                            {paramData.isDisused ?
                                                <span title="参数已在构件中被移除，请更新！">
                                                    <i class="ml-2 f-icon f-icon-message_warning text-warning text-tip"></i>
                                                </span> : ''}
                                        </label>

                                        <div class="farris-input-wrap f-cmp-inputgroup">
                                            <FInputGroup
                                                v-model={paramData.value}
                                                group-text={'<i class="f-icon f-icon-lookup"></i>'}
                                            ></FInputGroup>
                                        </div>
                                    </div>
                                </div >
                            </div >;
                        })}
                    </div >
                </div>;
            }
        }
        return () => {
            return (

                <div class="f-utils-fill-flex-row main-panel">
                    <div class="command-panel border">
                        <FTreeGrid ref={treeGridRef} columns={columns} data={commandsData.value} fit={true} row-number={rowNumberOption}
                            onSelectionChange={onChangeSelectedCommand}></FTreeGrid>
                    </div>
                    <div class="param-panel f-utils-fill">
                        {renderCommandSource()}
                        {renderHandlerSource()}
                        {renderParameterPanel()}
                    </div>
                </div>

            );
        };
    }
});
