import { computed, defineComponent, ref } from "vue";
import { FButton, FProgress } from "@farris/ui-vue";
import { AnalysisReportProps, analysisReportProps } from "./analysis-report.props";
import { mockAnalysisReports, getReportStatusClass, getReportStatusText, getReportItemTypeClass } from "./mock-data";
import { AnalysisReport, AnalysisReportStatus } from "./type";

export default defineComponent({
    name: 'FAppAnalysisReport',
    props: analysisReportProps,
    emits: ['view-detail', 'export', 'back'],
    setup(props: AnalysisReportProps, context) {
        // 状态
        const reports = ref<AnalysisReport[]>(mockAnalysisReports);
        const selectedReport = ref<AnalysisReport | null>(null);
        const currentView = ref<'list' | 'detail'>('list');
        const activeTab = ref('overview');
        const filterKeyword = ref('');
        const filterStatus = ref<AnalysisReportStatus | ''>('');

        // 计算属性
        const filteredReports = computed(() => {
            let result = reports.value;
            
            // 关键字过滤
            if (filterKeyword.value) {
                const keyword = filterKeyword.value.toLowerCase();
                result = result.filter(report => 
                    report.title.toLowerCase().includes(keyword) ||
                    report.taskName.toLowerCase().includes(keyword) ||
                    report.targetApp.toLowerCase().includes(keyword)
                );
            }
            
            // 状态过滤
            if (filterStatus.value) {
                result = result.filter(report => report.status === filterStatus.value);
            }
            
            return result;
        });

        // 方法
        function onSearchInput(e: Event) {
            const target = e.target as HTMLInputElement;
            filterKeyword.value = target.value;
        }

        function onStatusFilterChange(e: Event) {
            const target = e.target as HTMLSelectElement;
            filterStatus.value = target.value as AnalysisReportStatus | '';
        }

        function onViewReport(report: AnalysisReport) {
            selectedReport.value = report;
            currentView.value = 'detail';
            context.emit('view-detail', report);
        }

        function onBackToList() {
            selectedReport.value = null;
            currentView.value = 'list';
            context.emit('back');
        }

        function onExportReport(report: AnalysisReport) {
            context.emit('export', report);
        }

        function onExportDetail() {
            if (selectedReport.value) {
                context.emit('export', selectedReport.value);
            }
        }

        function onTabChange(tabName: string) {
            activeTab.value = tabName;
        }

        // 渲染标题区域
        function renderTitleArea() {
            return (
                <div class="f-title">
                    <div class="f-title-logo"></div>
                    <h4 class="f-title-text">分析报告</h4>
                </div>
            );
        }

        // 渲染工具栏
        function renderToolbar() {
            return (
                <div class="f-toolbar">
                    <div class="toolbar-search">
                        <div class="input-group">
                            <div class="input-group-prepend">
                                <span class="input-group-text f-icon f-icon-search"></span>
                            </div>
                            <input 
                                type="text" 
                                class="form-control" 
                                placeholder="搜索报告..."
                                value={filterKeyword.value}
                                onInput={onSearchInput}
                            />
                        </div>
                    </div>
                    <select 
                        class="form-control status-select"
                        value={filterStatus.value}
                        onChange={onStatusFilterChange}
                    >
                        <option value="">全部状态</option>
                        <option value={AnalysisReportStatus.Completed}>已完成</option>
                        <option value={AnalysisReportStatus.Generating}>生成中</option>
                        <option value={AnalysisReportStatus.Failed}>失败</option>
                    </select>
                </div>
            );
        }

        // 渲染报告列表
        function renderReportList() {
            return (
                <div class="f-report-list">
                    {filteredReports.value.map(report => (
                        <div 
                            class="f-report-card" 
                            key={report.id}
                            onClick={() => onViewReport(report)}
                        >
                            <div class="report-card-header">
                                <div class="report-card-title">
                                    <h4>{report.title}</h4>
                                    <span class={`report-status ${getReportStatusClass(report.status)}`}>
                                        {getReportStatusText(report.status)}
                                    </span>
                                </div>
                                <div class="report-card-actions">
                                    <FButton 
                                        type="link" 
                                        icon="f-icon f-icon-export" 
                                        onClick={(e: MouseEvent) => { e.stopPropagation(); onExportReport(report); }}
                                    ></FButton>
                                </div>
                            </div>
                            <div class="report-card-meta">
                                <span class="meta-item">
                                    <span class="meta-label">任务：</span>
                                    <span class="meta-value">{report.taskName}</span>
                                </span>
                                <span class="meta-item">
                                    <span class="meta-label">应用：</span>
                                    <span class="meta-value">{report.targetApp}</span>
                                </span>
                                <span class="meta-item">
                                    <span class="meta-label">版本：</span>
                                    <span class="meta-value">{report.version}</span>
                                </span>
                            </div>
                            <div class="report-card-stats">
                                <div class="stat-item stat-errors">
                                    <span class="stat-count">{report.overview.errors}</span>
                                    <span class="stat-label">错误</span>
                                </div>
                                <div class="stat-item stat-warnings">
                                    <span class="stat-count">{report.overview.warnings}</span>
                                    <span class="stat-label">警告</span>
                                </div>
                                <div class="stat-item stat-suggestions">
                                    <span class="stat-count">{report.overview.suggestions}</span>
                                    <span class="stat-label">建议</span>
                                </div>
                                <div class="stat-item stat-rate">
                                    <FProgress percent={report.overview.complianceRate} size="small" />
                                    <span class="stat-label">符合度</span>
                                </div>
                            </div>
                            <div class="report-card-footer">
                                <span class="report-time">
                                    生成时间：{report.generatedTime.toLocaleDateString()} {report.generatedTime.toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))}
                    {filteredReports.value.length === 0 && (
                        <div class="empty-content">
                            <span class="f-icon f-icon-empty" style="font-size: 48px; color: #ccc;"></span>
                            <p>暂无报告数据</p>
                        </div>
                    )}
                </div>
            );
        }

        // 渲染概览统计
        function renderOverview() {
            if (!selectedReport.value) return null;
            
            const { overview } = selectedReport.value;
            
            return (
                <div class="f-report-overview">
                    <div class="overview-header">
                        <h3>概览统计</h3>
                    </div>
                    <div class="overview-stats-grid">
                        <div class="stat-card stat-total">
                            <div class="stat-icon">
                                <span class="f-icon f-icon-document"></span>
                            </div>
                            <div class="stat-info">
                                <span class="stat-number">{overview.totalIssues}</span>
                                <span class="stat-name">总问题数</span>
                            </div>
                        </div>
                        <div class="stat-card stat-errors">
                            <div class="stat-icon">
                                <span class="f-icon f-icon-close-circle"></span>
                            </div>
                            <div class="stat-info">
                                <span class="stat-number">{overview.errors}</span>
                                <span class="stat-name">错误</span>
                            </div>
                        </div>
                        <div class="stat-card stat-warnings">
                            <div class="stat-icon">
                                <span class="f-icon f-icon-warning-circle"></span>
                            </div>
                            <div class="stat-info">
                                <span class="stat-number">{overview.warnings}</span>
                                <span class="stat-name">警告</span>
                            </div>
                        </div>
                        <div class="stat-card stat-suggestions">
                            <div class="stat-icon">
                                <span class="f-icon f-icon-info-circle"></span>
                            </div>
                            <div class="stat-info">
                                <span class="stat-number">{overview.suggestions}</span>
                                <span class="stat-name">建议</span>
                            </div>
                        </div>
                        <div class="stat-card stat-rate">
                            <div class="stat-icon">
                                <span class="f-icon f-icon-check-circle"></span>
                            </div>
                            <div class="stat-info">
                                <span class="stat-number">{overview.complianceRate}%</span>
                                <span class="stat-name">符合度</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // 渲染报告详情
        function renderReportDetail() {
            if (!selectedReport.value) return null;
            
            const report = selectedReport.value;
            
            return (
                <div class="f-report-detail">
                    <div class="detail-header">
                        <FButton type="link" icon="f-icon f-icon-arrow-left" onClick={onBackToList}>
                            返回列表
                        </FButton>
                        <div class="detail-actions">
                            <FButton type="secondary" size="small" onClick={onExportDetail}>
                                <span class="f-icon f-icon-export" style="margin-right: 4px;"></span>
                                导出报告
                            </FButton>
                        </div>
                    </div>
                    <div class="detail-content">
                        <div class="detail-title-section">
                            <h2>{report.title}</h2>
                            <span class={`report-status-badge ${getReportStatusClass(report.status)}`}>
                                {getReportStatusText(report.status)}
                            </span>
                        </div>
                        <div class="detail-meta">
                            <div class="meta-row">
                                <span class="meta-label">关联任务：</span>
                                <span class="meta-value">{report.taskName}</span>
                            </div>
                            <div class="meta-row">
                                <span class="meta-label">目标应用：</span>
                                <span class="meta-value">{report.targetApp}</span>
                            </div>
                            <div class="meta-row">
                                <span class="meta-label">版本：</span>
                                <span class="meta-value">{report.version}</span>
                            </div>
                            <div class="meta-row">
                                <span class="meta-label">生成时间：</span>
                                <span class="meta-value">{report.generatedTime.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        {/* 原生 Tab 导航 */}
                        <div class="detail-tabs">
                            <div class="nav-tabs" role="tablist">
                                <div 
                                    class={`nav-tab-item ${activeTab.value === 'overview' ? 'active' : ''}`}
                                    onClick={() => onTabChange('overview')}
                                >
                                    概览
                                </div>
                                <div 
                                    class={`nav-tab-item ${activeTab.value === 'details' ? 'active' : ''}`}
                                    onClick={() => onTabChange('details')}
                                >
                                    详细列表
                                </div>
                            </div>
                            <div class="tab-content">
                                {activeTab.value === 'overview' && (
                                    <div class="tab-pane active">{renderOverview()}</div>
                                )}
                                {activeTab.value === 'details' && (
                                    <div class="tab-pane active">{renderDetailsList()}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // 渲染详细列表
        function renderDetailsList() {
            if (!selectedReport.value) return null;
            
            return (
                <div class="f-details-list">
                    {selectedReport.value.details.map(item => (
                        <div class={`detail-item ${getReportItemTypeClass(item.type)}`} key={item.id}>
                            <div class="item-header">
                                <span class={`item-type-badge ${getReportItemTypeClass(item.type)}`}>
                                    {item.type === 'error' ? '错误' : item.type === 'warning' ? '警告' : item.type === 'info' ? '信息' : '建议'}
                                </span>
                                <h4 class="item-name">{item.name}</h4>
                            </div>
                            <p class="item-description">{item.description}</p>
                            {item.suggestion && (
                                <p class="item-suggestion">
                                    <strong>建议：</strong>{item.suggestion}
                                </p>
                            )}
                            {item.location && (
                                <p class="item-location">
                                    <span class="f-icon f-icon-location"></span>
                                    {item.location}
                                </p>
                            )}
                        </div>
                    ))}
                    {selectedReport.value.details.length === 0 && (
                        <div class="empty-content">
                            <p>暂无详细数据</p>
                        </div>
                    )}
                </div>
            );
        }

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard f-app-analysis-report">
                    <div class="f-admin-main-header"></div>
                    <div class="f-admin-main-content">
                        <div class="f-page-header">
                            <nav class="f-page-header-base">
                                {renderTitleArea()}
                                {currentView.value === 'list' && renderToolbar()}
                            </nav>
                            <div class="f-page-header-background"></div>
                        </div>
                        <div class="f-page-main">
                            {currentView.value === 'list' && renderReportList()}
                            {currentView.value === 'detail' && renderReportDetail()}
                        </div>
                    </div>
                </div>
            );
        };
    }
});
