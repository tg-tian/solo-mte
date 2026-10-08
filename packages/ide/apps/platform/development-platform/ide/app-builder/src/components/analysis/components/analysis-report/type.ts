/**
 * 分析报告相关类型定义
 */

/** 分析报告状态枚举 */
export enum AnalysisReportStatus {
    /** 生成中 */
    Generating = 'generating',
    /** 已完成 */
    Completed = 'completed',
    /** 失败 */
    Failed = 'failed'
}

/** 报告项类型 */
export interface ReportItem {
    /** 报告项ID */
    id: string;
    /** 报告项名称 */
    name: string;
    /** 报告项描述 */
    description: string;
    /** 报告项类型 */
    type: 'warning' | 'error' | 'info' | 'suggestion';
    /** 建议 */
    suggestion?: string;
    /** 代码位置 */
    location?: string;
}

/** 分析报告 */
export interface AnalysisReport {
    /** 报告ID */
    id: string;
    /** 任务ID */
    taskId: string;
    /** 任务名称 */
    taskName: string;
    /** 报告标题 */
    title: string;
    /** 生成时间 */
    generatedTime: Date;
    /** 报告状态 */
    status: AnalysisReportStatus;
    /** 关联应用 */
    targetApp: string;
    /** 版本 */
    version: string;
    /** 概览统计 */
    overview: ReportOverview;
    /** 报告详情列表 */
    details: ReportItem[];
    /** 报告路径 */
    reportPath?: string;
}

/** 报告概览统计 */
export interface ReportOverview {
    /** 总问题数 */
    totalIssues: number;
    /** 错误数 */
    errors: number;
    /** 警告数 */
    warnings: number;
    /** 建议数 */
    suggestions: number;
    /** 符合度百分比 */
    complianceRate: number;
}

/** 报告筛选条件 */
export interface ReportFilter {
    /** 关键字搜索 */
    keyword?: string;
    /** 状态筛选 */
    status?: AnalysisReportStatus;
    /** 时间范围 */
    dateRange?: {
        start: Date;
        end: Date;
    };
}
