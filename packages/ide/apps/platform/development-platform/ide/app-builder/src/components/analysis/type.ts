/**
 * 分析工具类型定义
 */

/**
 * 任务状态枚举
 */
export enum TaskStatus {
    Pending = 0,       // 待执行
    Running = 1,       // 执行中
    Completed = 100,   // 已完成
    Failed = -1,       // 失败
    Cancelled = -2,    // 已取消
}

/**
 * 分析选项
 */
export interface AnalysisOption {
    /** 是否启用 */
    enabled: boolean;
}

/**
 * Java版本配置
 */
export interface JavaOption {
    /** 是否启用 */
    enabled: boolean;
    /** Java版本 */
    version: string;
}

/**
 * 分析选项配置
 */
export interface AnalysisOptionsConfig {
    /** Java配置 */
    java?: JavaOption;
    /** 依赖注入分析 */
    dependencyInjection?: AnalysisOption;
    /** Web端点分析 */
    webEndpoints?: AnalysisOption;
    /** 持久化框架分析 */
    persistenceFramework?: AnalysisOption;
    /** 基础框架特性分析 */
    baseFramework?: AnalysisOption;
}

/**
 * 任务信息
 */
export interface AyalysisTask {
    /** 任务ID */
    id: string;
    /** 任务名称 */
    name: string;
    /** 提交时间 */
    creationTime: Date;
    /** 完成时间 */
    completedTime?: Date;
    /** 关联应用 */
    targetApp: string;
    /** 版本标志 */
    version: string;
    /** 分析选项 */
    options: string[];
    /** 分析状态 (0-100) */
    status: number;
    /** 任务状态枚举 */
    statusEnum?: TaskStatus;
    /** 备注 */
    description?: string;
    /** 程序文件路径 */
    programFilePath?: string;
    /** 分析选项配置 */
    analysisOptions?: AnalysisOptionsConfig;
}

/**
 * 分析报告状态枚举
 */
export enum AnalysisReportStatus {
    Completed = 'completed',
    Generating = 'generating',
    Failed = 'failed',
}

/**
 * 报告概览统计
 */
export interface ReportOverview {
    totalIssues: number;
    errors: number;
    warnings: number;
    suggestions: number;
    complianceRate: number;
}

/**
 * 报告详情项类型
 */
export type ReportItemType = 'error' | 'warning' | 'info' | 'suggestion';

/**
 * 报告详情项
 */
export interface ReportItem {
    id: string;
    name: string;
    description: string;
    type: ReportItemType;
    suggestion?: string;
    location?: string;
}

/**
 * 分析报告
 */
export interface AnalysisReport {
    id: string;
    taskId: string;
    taskName: string;
    title: string;
    generatedTime: Date;
    status: AnalysisReportStatus;
    targetApp: string;
    version: string;
    overview: ReportOverview;
    details: ReportItem[];
    reportPath?: string;
}

/**
 * 报告筛选条件
 */
export interface ReportFilter {
    keyword?: string;
    status?: AnalysisReportStatus;
}

/**
 * Web端点信息
 */
export interface WebEndpoint {
    path: string;
    method: string;
    className: string;
    functionName: string;
}

/**
 * 调用图节点
 */
export interface CallGraphNode {
    className: string;
    methodName: string;
    type: string;
}

/**
 * 调用图边
 */
export interface CallGraphEdge {
    from: string;
    to: string;
}

/**
 * 调用图
 */
export interface CallGraph {
    nodes: CallGraphNode[];
    edges: CallGraphEdge[];
}

/**
 * 数据流信息
 */
export interface DataFlow {
    source: string;
    sink: string;
    description: string;
}

/**
 * 分析结果
 */
export interface AnalysisResult {
    webEndpoints?: WebEndpoint[];
    callGraph?: CallGraph;
    dataFlow?: DataFlow[];
}

/**
 * 任务详情
 */
export interface TaskDetail extends AyalysisTask {
    results?: AnalysisResult;
    reportPath?: string;
}
