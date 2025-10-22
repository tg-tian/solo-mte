import { computed, defineComponent, ref } from "vue";
import { FButton, FListView, FProgress, FSection } from "@farris/ui-vue";
import { AnalysisProps, analysisProps } from "./analysis.props";
import { mockAnalysisTasks } from './mock-data';

import FAppAnalysisTaskCard from './components/analysis-task-card.component';
import { AyalysisTask } from "./type";

export default defineComponent({
    name: 'FAppAnalysis',
    props: analysisProps,
    emits: [],
    setup(props: AnalysisProps, context) {
        const title = '程序分析任务列表';
        const analysisListViewRef = ref();
        const analysisTasks = ref<AyalysisTask[]>(mockAnalysisTasks);
        const currentView = ref('listView');
        const shouldShowListView = computed(() => currentView.value === 'listView');
        const shouldShowCardView = computed(() => currentView.value === 'cardView');

        function renderTitleArea() {
            return (
                <div class="f-title">
                    <div class="f-title-logo"></div>
                    <h4 class="f-title-text">{title}</h4>
                </div>
            );
        }

        function onClickNewTask() {
            currentView.value = 'cardView';

        }

        function onClickAnalysisCard(payload: string) {
            if (payload === 'cancel' || payload === 'confirm') {
                currentView.value = 'listView';
            }
        }

        function renderToolbar() {
            return (
                <div class="f-toolbar">
                    <FButton onClick={onClickNewTask}>新建任务</FButton>
                </div>
            );
        }

        function renderAnalysisTaskList() {
            return <FSection class="f-utils-fill-flex-column">
                <FListView ref={analysisListViewRef} data={analysisTasks.value}>
                    {{
                        content: ({ item, index, selectedItem }) => {
                            return (
                                <div class="f-app-analysis-task">
                                    <div class="analysis-task-id">
                                        <label>任务ID</label>
                                        <span>{item.id}</span>
                                    </div>
                                    <div class="analysis-creation-time">
                                        <label>提交时间</label>
                                        <div>{(item.creationTime as Date).toLocaleDateString()}</div>
                                        <div>{(item.creationTime as Date).toLocaleTimeString()}</div>
                                    </div>
                                    <div class="analysis-completed-time">
                                        <label>完成时间</label>
                                        {/* <span>{item.completedTime}</span> */}
                                    </div>
                                    <div class="analysis-task-name">
                                        <label>任务名称</label>
                                        <span>{item.name}</span>
                                    </div>
                                    <div class="analysis-target-app">
                                        <label>关联应用</label>
                                        <span>{item.targetApp}</span>
                                    </div>
                                    <div class="analysis-version">
                                        <label>版本标志</label>
                                        <span>{item.version}</span>
                                    </div>
                                    <div class="analysis-options">
                                        <label>分析选项</label>
                                        {item.options.map((option: string) => <span>{option}</span>)}
                                    </div>
                                    <div class="analysis-status">
                                        <label>分析状态</label>
                                        <FProgress percent={item.status}></FProgress>
                                    </div>
                                    <div class="analysis-operation">
                                        <label>操作</label>
                                        <span></span>
                                    </div>
                                    <div class="analysis-description">
                                        <label>备注</label>
                                        <span>{item.description}</span>
                                    </div>
                                </div>
                            );
                        }
                    }}
                </FListView>
            </FSection>;
        }

        function renderAnalysistTaskCard() {
            return <FAppAnalysisTaskCard onChange={onClickAnalysisCard}></FAppAnalysisTaskCard>;
        }

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard f-app-analysis">
                    <div class="f-admin-main-header"></div>
                    <div class="f-admin-main-content">
                        <div class="f-page-header" >
                            <nav class="f-page-header-base">
                                {renderTitleArea()}
                                {renderToolbar()}
                            </nav>
                            <div class="f-page-header-background"></div>
                        </div>
                        <div class="f-page-main">
                            {shouldShowListView.value && renderAnalysisTaskList()}
                            {shouldShowCardView.value && renderAnalysistTaskCard()}
                        </div>
                    </div>
                </div>
            );
        };
    }
});
