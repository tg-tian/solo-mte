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
import { computed, defineComponent, inject, onMounted, onUnmounted, provide, ref, SetupContext, watch } from 'vue';
import { codeViewProps, CodeViewProps } from '../props/code-view.props';
import FNavTreeDesign from './nav-tree.component';
import { FSplitter, FSplitterPane, FLoadingService } from '@farris/ui-vue';
import './code-view.scss';
import FDesignCodeTabs from './code-tabs.component';
import { EditorController } from '../composition/handler/editor.controller';
import FEditorPanelsDesign from './editor-panels.component';
import { throttle } from 'lodash-es';
import { CommonEvent } from '../composition/event-bus/lib/event-bus';
import { FrmCmpBuilder } from '../composition/handler/frm-cmp-builder';
import { ClassNavTreeDataSource } from '../composition/handler/class-nav-tree.service';
import { TreeDataSource } from '../composition/handler/tree-data-source.service';
import { DesignerMode } from '../../../../components/types/designer-context';

export default defineComponent({
    name: 'FCodeViewDesign',
    props: codeViewProps,
    emits: ['changeView', 'saveAll'] as (string[] & ThisType<void>) | undefined,
    setup(props: CodeViewProps, context: SetupContext) {
        const messagerService: any = inject('FMessageBoxService');
        const loadingService: any = inject<FLoadingService>('FLoadingService');
        const formBasicInfo = ref(props.formBasicInfo);
        const frmCmpBuilder = new FrmCmpBuilder(formBasicInfo.value);

        provide('designerMode', props.designerMode);
        // 顶部标签页
        const tabInstance = ref();
        // 编辑器面板
        const editorPanelsInstance = ref();
        const editorController = new EditorController();
        // 文件导航树
        const fileTreeInstance = ref();
        const fileTreeDataSource = new TreeDataSource(props.designerMode, formBasicInfo.value);
        // 类导航树
        const classTreeInstance = ref();
        // 类导航数据
        const classNavTreeDataSource = new ClassNavTreeDataSource(editorController);

        const eventBusId = ref(editorController.getEventBusId());
        const filePath = ref('');
        provide('editorService', editorController);
        function switchViewChangeHandler(ev) {
            context.emit('changeView', 'designer');
        }
        function checkEntryFilePath(path: string) {
            if (props.designerMode === DesignerMode.PC_RTC) {
                return `/${formBasicInfo.value.relativePath}/${formBasicInfo.value.rtcCode}.frm`; // 模拟低代码路径
            } else {
                return path.startsWith("/") ? path : `/${path}`;
            }

        }
        // 处理路径
        const entryFilePath = ref(checkEntryFilePath(props.entryFilePath));
        function detectFileDirtyHandler(info) {
            context.emit('detectFileDirty', info);
        }
        // 初始化EditorController
        editorController.init(tabInstance, editorPanelsInstance, fileTreeInstance, classTreeInstance, detectFileDirtyHandler);
        // 赋值路径
        editorController.getContextService().setEntryFilePath(entryFilePath.value);
        // 处理尺寸变化
        const resizedContainer = ref();
        const splitterPaneContainer = ref();
        let lastHeightRecord; // 初始高度
        const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
            if (entries.length) {
                const currentHeight = entries[0].contentRect.height;
                if (currentHeight === 0) {
                    return;
                }
                if (currentHeight !== lastHeightRecord) {
                    // 在这里可以触发相应的操作，比如更新数据等
                    lastHeightRecord = currentHeight;
                    splitterPaneContainer.value.reset();
                }
            }
        });

        watch(() => props.entryFilePath, (newValue) => {
            entryFilePath.value = checkEntryFilePath(newValue);
            editorController.getContextService().setEntryFilePath(entryFilePath.value);
        });

        onMounted(() => {
            lastHeightRecord = resizedContainer.value.offsetHeight;
            fileTreeInstance.value.setDataService(fileTreeDataSource);
            classTreeInstance.value.setDataService(classNavTreeDataSource);
            const element = resizedContainer.value;
            observer.observe(element);
        });

        onUnmounted(() => {
            observer.disconnect();
        });
        /**
         * 处理保存按钮点击事件
         */
        async function handleSaveBtnClicked(): Promise<void> {
            const results = await editorController.doSaveAllFile(props.directlyNotifySaveAllResults);
            context.emit('saveAll', results);
        }

        /**
         *
         * @returns
         */
        function renderSwitchButton() {
            return (
                <div class="switch-btn">
                    <div class="view-type-panel">
                        <div onClick={(event) => switchViewChangeHandler(event)}>
                            <div>
                                <span class="f-icon f-icon-perspective_view"></span>设计器
                            </div>
                        </div>
                        <div class="active">
                            <div>
                                <span class="f-icon f-icon-source-code"></span>代码
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        /**
         * 刷新导航树
         * @param tsFilePath 
         */
        function refreshNavTree(tsFilePath) {
            fileTreeInstance.value.reloadTreeData(tsFilePath);
        }
        function open(data: any) {
            editorController.openFile(data);
            filePath.value = data.path;
        }

        const flattenTreeData = (items, result = []) => {
            items = items || [];
            return items.reduce((resultObject, current) => {
                resultObject.push(current);
                if (current.children && current.children.length) {
                    flattenTreeData(current.children, resultObject);
                }
                return resultObject;
            }, result);
        };


        function openAndGoTo(data: any) {
            // console.log('打开并跳转', data, fileTreeInstance.value.controllers());
            const { command, controller } = data;
            if (controller) {
                const controllerFileName = controller.label + '.ts';
                const controllerFiles = flattenTreeData(fileTreeInstance.value.controllers() || []);

                const controllFile = controllerFiles.find(file => {
                    return file.data.name === controllerFileName;
                });

                if (controllFile?.path) {
                    editorController.openFile(controllFile);
                    filePath.value = controllFile.path;

                    editorController.sendNotification(controllFile.path, { eventName: 'GotoMethod', eventPayload: { methodCode: command.handlerName, methodName: command.name } });
                }
            }
        }

        /**
         * 点击文件导航树
         * @param data 
         */
        function selectFileNavRowHandler(data) {
            open(data);
        }
        function saveHandler(event) {
            event && event.stopPropagation();
            throttle(() => {
                handleSaveBtnClicked();
            }, 600)();
        }
        /**
         * 关闭标签页
         * @param tab 
         */
        function beforeCloseTab(tab) {
            editorController.closeFile(tab.id);
        }
        /**
         * 选中标签页
         * @param tab 
         */
        function selectTab(tab) {
            editorController.handleTabSelected(tab.id);
        }
        /**
         * 向标签页发送新通知
         * @param path 标签页路径
         * @param event 通知事件
         * @returns 被通知的标签页针对该事件反馈的结果（如果标签页不存在则返回null）
         */
        function sendNotification(path: string, event: CommonEvent) {
            return editorController.sendNotification(path, event);
        }
        async function executeCommand(command: string): Promise<void> {
            if (command === 'frm-file.refresh') {
                fileTreeInstance.value.reloadTreeData();
                // editorController.detectChangesFromRoot();
                return;
            }
            if (command === 'frm-file.addWebCmp') {
                const frmPath = editorController.getContextService().entryFilePath.value;
                const result = await frmCmpBuilder.addNewCmp(frmPath);
                if (!result) {
                    return;  // 用户点击取消
                }
                if (result.hasError) {
                    messagerService.error(result && result.errorTip || '构件创建失败，请刷新后重试');
                } else {
                    // 打开文件
                    editorController.openFile({ path: result.tsFilePath, webCommandId: result.webCommandId, webComponentId: result.webComponentId });
                }
                if (result.hasNewFile) {
                    fileTreeInstance.value.reloadTreeData(result.tsFilePath);
                }
                return;
            }
        }
        function getFileNavHeaderHTML() {
            return <div class="split-panel-header">
                <span class="header-title noselect text-truncate" title="文件导航">文件导航</span>
                <div class="split-panel-header--toolbar">
                    <div class="toolbar-item header-icon" title="刷新文件导航" onClick={() => executeCommand("frm-file.refresh")}>
                        <i class="f-icon f-icon-clockwise"></i>
                    </div>
                    <div class="toolbar-item header-icon" title="新增前端构件" onClick={() => executeCommand("frm-file.addWebCmp")}>
                        <i class="f-icon f-icon-amplification"></i>
                    </div>
                </div>
                {/* <div class="header-icon header-icon--toggler">
                    <i class="f-icon f-icon-arrow-chevron-up"></i>
                </div> */}
            </div>;
        }
        function getClassNavHeaderHTML() {
            return <div class="split-panel-header">
                <span class="header-title noselect  text-truncate" title="类导航">类导航</span>
                {/* <div class="header-icon header-icon--toggler ml-auto" >
                    <i class="f-icon f-icon-arrow-chevron-up"></i>
                </div> */}
            </div>;
        }
        context.expose({ refreshNavTree, open, sendNotification, openAndGoTo });

        return () => {
            return (
                <div class="code-editor-wrapper">
                    <div class="tab-bar">
                        {renderSwitchButton()}
                        <div class="tab-bar-divider"></div>
                        <FDesignCodeTabs ref={tabInstance} onBeforeClose={(tab) => beforeCloseTab(tab)} onSelected={(tab) => selectTab(tab)}></FDesignCodeTabs>
                        <div class="btn-tool-bar ml-auto">
                            <button class="btn btn-primary app-custom-save-btn" onClick={(event) => saveHandler(event)}>保存</button>
                        </div>
                    </div>
                    <div class="f-utils-fill-flex-column" ref={resizedContainer}>
                        <FSplitter>
                            <FSplitterPane position={'left'} resizable={true} width={300}>
                                <FSplitter class="h-100" direction={'column'}>
                                    {/* 文件导航 */}
                                    <FSplitterPane class="f-col-h6 d-flex flex-column" resizable={true} resizeHandle={'s'} ref={splitterPaneContainer} minHeight={160}>
                                        {getFileNavHeaderHTML()}
                                        <div class="f-utils-fill" style="padding-bottom:6px;">
                                            <FNavTreeDesign ref={fileTreeInstance} entryFilePath={entryFilePath.value} onSelectRow={(data) => selectFileNavRowHandler(data)}></FNavTreeDesign>
                                        </div>
                                    </FSplitterPane>
                                    {/* 类导航 padding解决遮挡拖拽条的问题*/}
                                    <section class="f-utils-fill-flex-column" style="min-height:160px;padding-top:6px;">
                                        {getClassNavHeaderHTML()}
                                        <div class="f-utils-fill">
                                            <FNavTreeDesign ref={classTreeInstance} entryFilePath={entryFilePath.value}></FNavTreeDesign>
                                        </div>
                                    </section>
                                </FSplitter>
                            </FSplitterPane>
                            <div class="editor-area f-utils-fill">
                                <FEditorPanelsDesign ref={editorPanelsInstance} eventBusId={eventBusId.value}></FEditorPanelsDesign>
                            </div>
                        </FSplitter>
                    </div>
                </div >
            );
        };
    }
});
