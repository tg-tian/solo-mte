import axios from 'axios';

export interface QualityChecksConfig {
    baseFramework: boolean;
    dependencyInjection: boolean;
    webEndpoints: boolean;
    persistenceFramework: boolean;
}

export function getQualityConfig(): Promise<{ ok: boolean; config: QualityChecksConfig }> {
    return axios.get('/solo-mte-publish/quality-config').then(res => res.data);
}

/**
 * 分析工具 API 服务层
 * 基于 APIFox 文档: https://app.apifox.com/project/6222436
 */

// API 基础地址配置
const API_BASE_URL = 'https://lowcode.pascal-lab.net';

// API 端点
export const API_ENDPOINTS = {
    // 文件上传
    FILE_UPLOAD: `${API_BASE_URL}/api/v2/file/upload`,
    
    // 任务相关
    TASK_CREATE: `${API_BASE_URL}/api/v2/task/create`,
    TASK_LIST: `${API_BASE_URL}/api/v2/task/list`,
    TASK_QUERY: `${API_BASE_URL}/api/v2/task/query`,
    TASK_LOG: `${API_BASE_URL}/api/v2/task/log`,
    TASK_STOP: `${API_BASE_URL}/api/v2/task/stop`,
};

/**
 * 通用响应类型
 */
export interface ApiResponse<T = any> {
    code: number;
    message: string;
    data: T;
    success?: boolean;
}

/**
 * 分析选项配置 - 匹配API返回格式
 */
export interface AnalysisOptions {
    java?: {
        version: string;
    };
    dependencyInjection?: {
        enable?: boolean;
        enabled?: boolean;
    };
    webEndpoints?: {
        enable?: boolean;
        enabled?: boolean;
    };
    rpc?: {
        enable?: boolean;
        enabled?: boolean;
    } | null;
    mq?: any;
    sqlAnalysis?: any;
    storedXSS?: {
        enable?: boolean;
        enabled?: boolean;
    };
    sqlInjection?: {
        enable?: boolean;
        enabled?: boolean;
    };
    authorizationBypass?: any;
}

/**
 * 创建任务请求
 */
export interface CreateTaskRequest {
    programFilePath?: string;   // 程序文件路径（如果已上传）
    programFile?: File;         // 程序文件（如果要上传）
    taskName: string;          // 任务名称
    analysisOptions: AnalysisOptions; // 分析选项
}

/**
 * 任务状态枚举 - 大小写都支持
 */
export enum TaskStatus {
    Pending = 'PENDING',       // 待执行
    Running = 'RUNNING',        // 执行中
    Completed = 'COMPLETED',   // 已完成
    Failed = 'FAILED',         // 失败
    Cancelled = 'CANCELLED',   // 已取消
    // 小写也支持
    PendingLower = 'pending',
    RunningLower = 'running',
    CompletedLower = 'completed',
    FailedLower = 'failed',
    CancelledLower = 'cancelled',
}

/**
 * 任务信息 - 匹配API返回格式
 */
export interface TaskInfo {
    taskId: string;
    taskName: string;
    status: string;            // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED (大写)
    createdTime?: string;      // 时间戳字符串
    modifiedTime?: string;     // 时间戳字符串
    analysisOptions: AnalysisOptions;
    programFilePath?: string;  // API可能不返回此字段
    reportPath?: string;       // 分析报告路径
}

/**
 * API返回的任务列表项
 */
export interface TaskListItem {
    taskId: string;
    taskName: string;
    status: string;
    createdTime: string;
    modifiedTime: string;
    analysisOptions: AnalysisOptions;
}

/**
 * 任务详情（包含分析结果）
 */
export interface TaskDetail extends TaskInfo {
    // 分析结果
    results?: {
        // Web端点分析结果
        webEndpoints?: Array<{
            path: string;
            method: string;
            className: string;
            functionName: string;
        }>;
        // 调用图
        callGraph?: {
            nodes: Array<{
                className: string;
                methodName: string;
                type: string;
            }>;
            edges: Array<{
                from: string;
                to: string;
            }>;
        };
        // 数据流
        dataFlow?: Array<{
            source: string;
            sink: string;
            description: string;
        }>;
    };
}

/**
 * 任务日志响应
 */
export interface TaskLogResponse {
    taskId: string;
    logs: string;
    lastUpdateTime: string;
}

/**
 * HTTP 请求封装
 */
async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        return {
            code: -1,
            message: error instanceof Error ? error.message : 'Request failed',
            data: null as any,
        };
    }
}

/**
 * 文件上传服务
 */
export async function uploadFile(file: File): Promise<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(API_ENDPOINTS.FILE_UPLOAD, {
            method: 'POST',
            body: formData,
        });
        
        return await response.json();
    } catch (error) {
        console.error('File upload failed:', error);
        return {
            code: -1,
            message: error instanceof Error ? error.message : 'Upload failed',
            data: '',
        };
    }
}

/**
 * 创建分析任务
 */
export async function createTask(params: CreateTaskRequest): Promise<ApiResponse<string>> {
    // 如果提供了文件，先上传
    if (params.programFile) {
        const uploadResult = await uploadFile(params.programFile);
        if (uploadResult.code !== 0) {
            return uploadResult;
        }
        params.programFilePath = uploadResult.data;
        delete params.programFile;
    }
    
    return request<string>(API_ENDPOINTS.TASK_CREATE, {
        method: 'POST',
        body: JSON.stringify(params),
    });
}

/**
 * 查询任务列表
 */
export async function listTasks(): Promise<ApiResponse<TaskInfo[]>> {
    return request<TaskInfo[]>(API_ENDPOINTS.TASK_LIST);
}

/**
 * 查询任务详情
 */
export async function queryTask(taskId: string): Promise<ApiResponse<TaskDetail>> {
    return request<TaskDetail>(`${API_ENDPOINTS.TASK_QUERY}?taskId=${taskId}`);
}

/**
 * 查询任务日志
 */
export async function getTaskLog(taskId: string): Promise<ApiResponse<TaskLogResponse>> {
    return request<TaskLogResponse>(`${API_ENDPOINTS.TASK_LOG}?taskId=${taskId}`);
}

/**
 * 停止/取消任务
 */
export async function stopTask(taskId: string): Promise<ApiResponse<boolean>> {
    return request<boolean>(`${API_ENDPOINTS.TASK_STOP}?taskId=${taskId}`);
}

// 导出所有 API 服务
export default {
    uploadFile,
    createTask,
    listTasks,
    queryTask,
    getTaskLog,
    stopTask,
    API_ENDPOINTS,
};
