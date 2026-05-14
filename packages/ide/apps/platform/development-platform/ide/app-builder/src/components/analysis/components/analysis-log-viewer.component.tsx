import { defineComponent, ref, onMounted } from "vue";
import { FButton } from "@farris/ui-vue";
import { AyalysisTask } from "../type";
import { getTaskLog, TaskLogResponse } from "../service";

interface AnalysisLogViewerProps {
    task: AyalysisTask;
    onBack?: () => void;
}

export default defineComponent({
    name: 'FAppAnalysisLogViewer',
    props: {
        task: { type: Object as () => AyalysisTask, required: true },
        onBack: { type: Function }
    },
    setup(props: AnalysisLogViewerProps) {
        const logs = ref<string>('');
        const loading = ref<boolean>(true);
        const error = ref<string>('');
        const lastUpdateTime = ref<string>('');
        const autoRefresh = ref<boolean>(false);
        let refreshInterval: ReturnType<typeof setInterval> | null = null;

        // 加载日志
        async function loadLogs() {
            loading.value = true;
            error.value = '';
            
            try {
                const response = await getTaskLog(props.task.id);
                if (response.code === 0 && response.data) {
                    logs.value = response.data.logs || '暂无日志';
                    lastUpdateTime.value = response.data.lastUpdateTime || '';
                } else {
                    error.value = response.message || '获取日志失败';
                    logs.value = '获取日志失败，请稍后重试';
                }
            } catch (err) {
                error.value = '网络错误，请检查服务是否可用';
                logs.value = '网络错误，请检查分析服务是否运行在 http://127.0.0.1:8000';
            } finally {
                loading.value = false;
            }
        }

        // 刷新日志
        function onRefresh() {
            loadLogs();
        }

        // 自动刷新
        function toggleAutoRefresh() {
            autoRefresh.value = !autoRefresh.value;
            if (autoRefresh.value) {
                refreshInterval = setInterval(loadLogs, 3000);
            } else if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
            }
        }

        // 复制日志
        function onCopyLogs() {
            navigator.clipboard.writeText(logs.value).then(() => {
                alert('日志已复制到剪贴板');
            });
        }

        // 下载日志
        function onDownloadLogs() {
            const blob = new Blob([logs.value], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis-log-${props.task.id}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        }

        // 组件挂载时加载日志
        onMounted(() => {
            loadLogs();
        });

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard f-app-analysis-log-viewer">
                    <div class="f-admin-main-header"></div>
                    <div class="f-admin-main-content">
                        <div class="f-page-header">
                            <nav class="f-page-header-base">
                                <div class="f-title">
                                    <div class="f-title-logo"></div>
                                    <h4 class="f-title-text">任务日志</h4>
                                </div>
                                <div class="f-toolbar">
                                    <FButton 
                                        icon="f-icon f-icon-refresh" 
                                        type="secondary" 
                                        size="small" 
                                        onClick={onRefresh}
                                        disabled={loading.value}
                                    >
                                        刷新
                                    </FButton>
                                    <FButton 
                                        icon="f-icon f-icon-loop" 
                                        type={autoRefresh.value ? 'primary' : 'secondary'}
                                        size="small"
                                        onClick={toggleAutoRefresh}
                                    >
                                        {autoRefresh.value ? '停止刷新' : '自动刷新'}
                                    </FButton>
                                    <FButton 
                                        icon="f-icon f-icon-copy" 
                                        type="secondary" 
                                        size="small" 
                                        onClick={onCopyLogs}
                                    >
                                        复制
                                    </FButton>
                                    <FButton 
                                        icon="f-icon f-icon-download" 
                                        type="secondary" 
                                        size="small" 
                                        onClick={onDownloadLogs}
                                    >
                                        下载
                                    </FButton>
                                    {props.onBack && (
                                        <FButton 
                                            icon="f-icon f-icon-arrow-left" 
                                            type="secondary" 
                                            size="small"
                                            onClick={props.onBack}
                                        >
                                            返回
                                        </FButton>
                                    )}
                                </div>
                            </nav>
                            <div class="f-page-header-background"></div>
                        </div>
                        <div class="f-page-main">
                            <div class="log-container">
                                <div class="log-header">
                                    <div class="log-task-info">
                                        <span class="task-label">任务ID：</span>
                                        <span class="task-value">{props.task.id}</span>
                                        <span class="task-label" style="margin-left: 16px;">任务名称：</span>
                                        <span class="task-value">{props.task.name}</span>
                                    </div>
                                    {lastUpdateTime.value && (
                                        <div class="log-update-time">
                                            最后更新：{lastUpdateTime.value}
                                        </div>
                                    )}
                                </div>
                                <div class="log-content">
                                    {loading.value && (
                                        <div class="log-loading">
                                            <span class="f-icon f-icon-loading"></span>
                                            <span>加载中...</span>
                                        </div>
                                    )}
                                    {error.value && (
                                        <div class="log-error">
                                            <span class="f-icon f-icon-warning-circle"></span>
                                            <span>{error.value}</span>
                                        </div>
                                    )}
                                    <pre class="log-text">{logs.value}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };
    }
});
