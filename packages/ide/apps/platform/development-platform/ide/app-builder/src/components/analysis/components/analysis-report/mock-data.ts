import { AnalysisReport, ReportItem, AnalysisReportStatus } from './type';

/** 模拟分析报告数据 */
export const mockAnalysisReports: AnalysisReport[] = [
    {
        id: 'RP1',
        taskId: 'RW1',
        taskName: '泵房控制程序分析',
        title: '泵房控制程序 - 代码质量分析报告',
        generatedTime: new Date('2025-05-12 10:30:00'),
        status: AnalysisReportStatus.Completed,
        targetApp: 'ProgramA',
        version: 'v1.0.0',
        overview: {
            totalIssues: 12,
            errors: 2,
            warnings: 5,
            suggestions: 5,
            complianceRate: 85
        },
        details: [
            {
                id: 'D1',
                name: '依赖注入配置检查',
                description: '检测到未使用依赖注入的类',
                type: 'warning',
                suggestion: '建议将硬编码依赖改为依赖注入方式',
                location: 'src/com/example/PumpController.java:45'
            },
            {
                id: 'D2',
                name: 'HTTP端点安全性',
                description: '发现潜在的HTTP端点安全风险',
                type: 'error',
                suggestion: '请添加JWT认证和输入验证',
                location: 'src/com/example/HttpEndpoint.java:78'
            },
            {
                id: 'D3',
                name: '代码复杂度',
                description: '部分方法复杂度超出阈值',
                type: 'suggestion',
                suggestion: '建议重构高复杂度方法',
                location: 'src/com/example/DataProcessor.java:120'
            },
            {
                id: 'D4',
                name: '持久化框架使用',
                description: '检测到JPA实体关系配置',
                type: 'info',
                location: 'src/com/example/entities/*.java'
            },
            {
                id: 'D5',
                name: '异常处理',
                description: '捕获了空指针异常但未记录',
                type: 'error',
                suggestion: '建议添加日志记录便于问题追踪',
                location: 'src/com/example/ServiceLayer.java:56'
            }
        ],
        reportPath: '/reports/RW1/report.html'
    },
    {
        id: 'RP2',
        taskId: 'RW2',
        taskName: '数据处理服务分析',
        title: '数据处理服务 - 代码质量分析报告',
        generatedTime: new Date('2025-05-11 14:20:00'),
        status: AnalysisReportStatus.Completed,
        targetApp: 'DataService',
        version: 'v2.1.0',
        overview: {
            totalIssues: 8,
            errors: 1,
            warnings: 3,
            suggestions: 4,
            complianceRate: 92
        },
        details: [
            {
                id: 'D6',
                name: '数据库连接池配置',
                description: '连接池大小配置可能不满足高并发需求',
                type: 'warning',
                suggestion: '建议增加连接池最大连接数',
                location: 'config/application.properties:25'
            },
            {
                id: 'D7',
                name: '日志规范',
                description: '部分日志级别使用不当',
                type: 'suggestion',
                suggestion: '生产环境建议使用WARN及以上级别',
                location: 'src/**/*.java'
            },
            {
                id: 'D8',
                name: 'API版本控制',
                description: '检测到API版本控制缺失',
                type: 'info',
                suggestion: '建议添加API版本控制以保证兼容性',
                location: 'src/main/java/com/api/**'
            }
        ],
        reportPath: '/reports/RW2/report.html'
    },
    {
        id: 'RP3',
        taskId: 'RW3',
        taskName: '用户认证模块分析',
        title: '用户认证模块 - 安全分析报告',
        generatedTime: new Date('2025-05-10 09:00:00'),
        status: AnalysisReportStatus.Completed,
        targetApp: 'AuthModule',
        version: 'v1.2.0',
        overview: {
            totalIssues: 15,
            errors: 3,
            warnings: 7,
            suggestions: 5,
            complianceRate: 78
        },
        details: [
            {
                id: 'D9',
                name: '密码加密',
                description: '检测到使用MD5进行密码加密',
                type: 'error',
                suggestion: 'MD5已被证明不安全，请使用BCrypt或SHA-256',
                location: 'src/security/PasswordUtil.java:30'
            },
            {
                id: 'D10',
                name: '会话管理',
                description: '会话超时配置过长',
                type: 'warning',
                suggestion: '建议将会话超时设置为30分钟以内',
                location: 'config/session.properties:10'
            }
        ],
        reportPath: '/reports/RW3/report.html'
    }
];

/** 获取报告状态对应的样式类名 */
export function getReportStatusClass(status: AnalysisReportStatus): string {
    const statusMap: Record<AnalysisReportStatus, string> = {
        [AnalysisReportStatus.Completed]: 'status-completed',
        [AnalysisReportStatus.Generating]: 'status-generating',
        [AnalysisReportStatus.Failed]: 'status-failed'
    };
    return statusMap[status] || '';
}

/** 获取报告状态对应的显示文本 */
export function getReportStatusText(status: AnalysisReportStatus): string {
    const statusTextMap: Record<AnalysisReportStatus, string> = {
        [AnalysisReportStatus.Completed]: '已完成',
        [AnalysisReportStatus.Generating]: '生成中',
        [AnalysisReportStatus.Failed]: '失败'
    };
    return statusTextMap[status] || '';
}

/** 获取报告项类型对应的样式类名 */
export function getReportItemTypeClass(type: ReportItem['type']): string {
    const typeMap: Record<ReportItem['type'], string> = {
        error: 'item-type-error',
        warning: 'item-type-warning',
        info: 'item-type-info',
        suggestion: 'item-type-suggestion'
    };
    return typeMap[type] || '';
}

/** 获取报告项类型对应的图标类名 */
export function getReportTypeIcon(type: ReportItem['type']): string {
    const iconMap: Record<ReportItem['type'], string> = {
        error: 'f-icon f-icon-close-circle',
        warning: 'f-icon f-icon-warning-circle',
        info: 'f-icon f-icon-info-circle',
        suggestion: 'f-icon f-icon-lightbulb'
    };
    return iconMap[type] || 'f-icon f-icon-document';
}

/** 获取报告项类型对应的图标颜色 */
export function getReportTypeIconColor(type: ReportItem['type']): string {
    const colorMap: Record<ReportItem['type'], string> = {
        error: '#FF6B6B',
        warning: '#FFB84D',
        info: '#388FFF',
        suggestion: '#5FC875'
    };
    return colorMap[type] || '#388FFF';
}
