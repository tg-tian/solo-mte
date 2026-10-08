import { computed, defineComponent, inject, ref, onMounted } from "vue";
import { FButton, FProgress } from "@farris/ui-vue";
import { AnalysisProps, analysisProps } from "./analysis.props";
import { mockAnalysisTasks } from './mock-data';
import FAppAnalysisTaskCard from './components/analysis-task-card.component';
import FAppAnalysisReport from './components/analysis-report/analysis-report.component';
import FAppAnalysisLogViewer from './components/analysis-log-viewer.component';
import { AyalysisTask } from "./type";
import { listTasks, queryTask, stopTask, createTask, TaskStatus } from "./service";
import type { Ref } from 'vue';

type ViewType = 'listView' | 'cardView' | 'reportView' | 'logView';

export default defineComponent({
    name: 'FAppAnalysis',
    props: analysisProps,
    emits: [],
    setup(props: AnalysisProps, context) {
        const title = '程序分析任务列表';
        const analysisTasks = ref<AyalysisTask[]>(mockAnalysisTasks);
        const currentView = ref<ViewType>('listView');
        const selectedTaskForReport = ref<AyalysisTask | null>(null);
        const selectedTaskForLog = ref<AyalysisTask | null>(null);
        const loading = ref<boolean>(false);
        const error = ref<string>('');
        
        // 从父组件获取当前应用名称
        const appNameRef = inject<Ref<string>>('f-admin-app-name');
        const currentAppName = computed(() => appNameRef?.value || props.appName || '');

        // 组件挂载时加载任务列表
        onMounted(() => {
            loadTasks();
        });

        // 加载任务列表（从API）
        async function loadTasks() {
            loading.value = true;
            error.value = '';
            
            try {
                const response = await listTasks();
                if ((response.code === 0 || response.success) && response.data) {
                    // 转换API数据格式为组件格式
                    const allTasks = response.data.map((task: any) => {
                        // 解析时间戳 (可能是字符串或数字)
                        const createdTime = parseTimestamp(task.createdTime);
                        const modifiedTime = parseTimestamp(task.modifiedTime);
                        
                        return {
                            id: task.taskId,
                            name: task.taskName,
                            creationTime: createdTime,
                            completedTime: modifiedTime,
                            targetApp: task.programFilePath?.split('/').pop() || task.taskName || '未知',
                            version: task.analysisOptions?.java?.version ? `Java ${task.analysisOptions.java.version}` : 'v1.0.0',
                            options: extractOptions(task.analysisOptions),
                            status: convertStatus(task.status),
                            statusEnum: task.status,
                            programFilePath: task.programFilePath || '',
                            analysisOptions: task.analysisOptions,
                        };
                    });
                    
                    // 使用当前应用名称过滤任务列表
                    if (currentAppName.value) {
                        analysisTasks.value = allTasks.filter(task => 
                            task.name.startsWith(currentAppName.value)
                        );
                    } else {
                        analysisTasks.value = allTasks;
                    }
                } else {
                    // API调用失败，使用Mock数据
                    console.warn('API调用失败，使用Mock数据:', response.message);
                    analysisTasks.value = [...mockAnalysisTasks];
                }
            } catch (err) {
                // 网络错误，使用Mock数据
                console.warn('网络错误，使用Mock数据:', err);
                analysisTasks.value = [...mockAnalysisTasks];
            } finally {
                loading.value = false;
            }
        }
        
        // 解析时间戳
        function parseTimestamp(timestamp: string | number | undefined): Date {
            if (!timestamp) return new Date();
            const num = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
            return new Date(num);
        }

        // 转换任务状态 (支持大小写)
        function convertStatus(status: string): number {
            const upperStatus = status?.toUpperCase();
            switch (upperStatus) {
                case 'COMPLETED':
                    return 100;
                case 'RUNNING':
                case 'PENDING':
                    return 50;
                case 'FAILED':
                    return -1;
                case 'CANCELLED':
                    return -2;
                default:
                    return 0;
            }
        }

        // 提取分析选项 (支持 enable 和 enabled 两种格式)
        function extractOptions(options?: any): string[] {
            if (!options) return [];
            const opts: string[] = [];
            if (options.java?.version) opts.push(`Java ${options.java.version}`);
            if (options.dependencyInjection?.enable || options.dependencyInjection?.enabled) opts.push('依赖注入');
            if (options.webEndpoints?.enable || options.webEndpoints?.enabled) opts.push('Web端点');
            if (options.rpc?.enable || options.rpc?.enabled) opts.push('RPC');
            if (options.storedXSS?.enable || options.storedXSS?.enabled) opts.push('存储型XSS');
            if (options.sqlInjection?.enable || options.sqlInjection?.enabled) opts.push('SQL注入');
            return opts;
        }

        // 任务操作
        function onClickNewTask() {
            currentView.value = 'cardView';
        }

        function onClickAnalysisCard(payload: string) {
            if (payload === 'cancel' || payload === 'confirm') {
                currentView.value = 'listView';
                // 如果是确认创建，刷新列表
                if (payload === 'confirm') {
                    loadTasks();
                }
            }
        }

        function onViewReport(task: AyalysisTask) {
            selectedTaskForReport.value = task;
            currentView.value = 'reportView';
        }

        function onViewLog(task: AyalysisTask) {
            selectedTaskForLog.value = task;
            currentView.value = 'logView';
        }

        function onBackFromReport() {
            selectedTaskForReport.value = null;
            currentView.value = 'listView';
        }

        function onBackFromLog() {
            selectedTaskForLog.value = null;
            currentView.value = 'listView';
        }

        async function onDeleteTask(task: AyalysisTask) {
            if (confirm(`确定要删除任务 ${task.id} 吗？`)) {
                const index = analysisTasks.value.findIndex(t => t.id === task.id);
                if (index > -1) {
                    analysisTasks.value.splice(index, 1);
                }
            }
        }

        async function onStopTask(task: AyalysisTask) {
            if (confirm(`确定要停止任务 ${task.id} 吗？`)) {
                try {
                    const response = await stopTask(task.id);
                    if (response.code === 0) {
                        // 更新本地状态
                        task.status = -2;
                        alert('任务已停止');
                    } else {
                        alert(`停止失败: ${response.message}`);
                    }
                } catch (err) {
                    alert('网络错误，停止任务失败');
                }
            }
        }

        function onRefreshTasks() {
            loadTasks();
        }

        function renderTitleArea() {
            return (
                <div class="f-title">
                    <div class="f-title-logo"></div>
                    <h4 class="f-title-text">{title}</h4>
                </div>
            );
        }

        function renderToolbar() {
            return (
                <div class="f-toolbar">
                    <FButton icon="f-icon f-icon-refresh" type="secondary" size="small" onClick={onRefreshTasks}>
                        刷新
                    </FButton>
                    <FButton icon="f-icon f-icon-plus" type="primary" onClick={onClickNewTask}>
                        新建任务
                    </FButton>
                </div>
            );
        }

        function renderStatusBadge(status: number) {
            if (status >= 100) {
                return <span class="status-badge status-completed">已完成</span>;
            } else if (status > 0) {
                return <span class="status-badge status-running">进行中</span>;
            } else if (status < 0) {
                return <span class="status-badge status-failed">已失败</span>;
            } else {
                return <span class="status-badge status-pending">待执行</span>;
            }
        }

        function renderAnalysisTaskList() {
            return (
                <div class="f-task-list-wrapper">
                    {loading.value && (
                        <div class="loading-overlay">
                            <span class="f-icon f-icon-loading"></span>
                            <span>加载中...</span>
                        </div>
                    )}
                    <div class="task-list-header">
                        <div class="header-cell task-name">任务名称</div>
                        <div class="header-cell task-app">关联应用</div>
                        <div class="header-cell task-options">分析选项</div>
                        <div class="header-cell task-time">提交时间</div>
                        <div class="header-cell task-status">状态</div>
                        <div class="header-cell task-actions">操作</div>
                    </div>
                    <div class="task-list-body">
                        {analysisTasks.value.map((task) => (
                            <div class="task-row" key={task.id}>
                                <div class="header-cell task-name">
                                    <span class="task-name-text" title={task.name}>{task.name}</span>
                                </div>
                                <div class="header-cell task-app">
                                    <span class="task-app-text" title={task.targetApp}>{task.targetApp}</span>
                                </div>
                                <div class="header-cell task-options">
                                    {task.options.map((option, idx) => (
                                        <span key={idx} class="option-tag">{option}</span>
                                    ))}
                                </div>
                                <div class="header-cell task-time">
                                    <div class="time-text">
                                        <span>{task.creationTime.toLocaleDateString()}</span>
                                        <span class="time-detail">{task.creationTime.toLocaleTimeString()}</span>
                                    </div>
                                </div>
                                <div class="header-cell task-status">
                                    <FProgress percent={Math.max(0, task.status)} size="small"></FProgress>
                                    {renderStatusBadge(task.status)}
                                </div>
                                <div class="header-cell task-actions">
                                    <div class="action-buttons">
                                        {task.status >= 100 && (
                                            <FButton 
                                                type="link" 
                                                icon="f-icon f-icon-document" 
                                                title="查看报告"
                                                onClick={() => onViewReport(task)}
                                            ></FButton>
                                        )}
                                        {(task.status > 0 && task.status < 100) && (
                                            <FButton 
                                                type="link" 
                                                icon="f-icon f-icon-log" 
                                                title="查看日志"
                                                onClick={() => onViewLog(task)}
                                            ></FButton>
                                        )}
                                        {(task.status > 0 && task.status < 100) && (
                                            <FButton 
                                                type="link" 
                                                icon="f-icon f-icon-stop" 
                                                title="停止任务"
                                                onClick={() => onStopTask(task)}
                                            ></FButton>
                                        )}
                                        <FButton 
                                            type="link" 
                                            icon="f-icon f-icon-delete" 
                                            title="删除"
                                            onClick={() => onDeleteTask(task)}
                                        ></FButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {analysisTasks.value.length === 0 && !loading.value && (
                        <div class="empty-content">
                            <span class="f-icon f-icon-empty" style="font-size: 48px; color: #ccc;"></span>
                            <p>暂无任务数据</p>
                            <FButton type="primary" onClick={onClickNewTask}>新建任务</FButton>
                        </div>
                    )}
                    {error.value && (
                        <div class="error-message">
                            <span class="f-icon f-icon-warning-circle"></span>
                            <span>{error.value}</span>
                        </div>
                    )}
                </div>
            );
        }

        function renderAnalysistTaskCard() {
            return <FAppAnalysisTaskCard defaultTaskName={currentAppName.value} onChange={onClickAnalysisCard}></FAppAnalysisTaskCard>;
        }

        function renderAnalysisReport() {
            return <FAppAnalysisReport onBack={onBackFromReport}></FAppAnalysisReport>;
        }

        function renderAnalysisLogViewer() {
            if (!selectedTaskForLog.value) return null;
            return <FAppAnalysisLogViewer task={selectedTaskForLog.value} onBack={onBackFromLog}></FAppAnalysisLogViewer>;
        }

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard f-app-analysis">
                    <div class="f-admin-main-header"></div>
                    <div class="f-admin-main-content">
                        <div class="f-page-header" >
                            <nav class="f-page-header-base">
                                {renderTitleArea()}
                                {currentView.value === 'listView' && renderToolbar()}
                            </nav>
                            <div class="f-page-header-background"></div>
                        </div>
                        <div class="f-page-main">
                            {currentView.value === 'listView' && renderAnalysisTaskList()}
                            {currentView.value === 'cardView' && renderAnalysistTaskCard()}
                            {currentView.value === 'reportView' && renderAnalysisReport()}
                            {currentView.value === 'logView' && renderAnalysisLogViewer()}
                        </div>
                    </div>
                </div>
            );
        };
    }
});
