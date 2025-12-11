import { get, post, put, del, handleApiRequest, type ApiResult } from './request';
import type { Workflow } from '@/types/workflow';

/**
 * 获取工作流列表
 * @param bizTypeId 查询参数
 * @returns 包装后的工作流列表结果
 */
export const getWorkflowList = (bizTypeId?: string): Promise<ApiResult<Workflow[]>> => {
  return handleApiRequest(() => get(`/runtime/bcc/v1.0/aiflow/listByBizTypeId/${bizTypeId}`));
};

/**
 * 创建新工作流
 * @param data 工作流数据
 * @returns 包装后的创建结果
 */
export const createWorkflow = (data: Omit<Workflow, 'id'>): Promise<ApiResult<Workflow>> => {
  return handleApiRequest(() => post('/runtime/bcc/v1.0/aiflow', data));
};

/**
 * 删除工作流
 * @param id 工作流ID
 * @returns 包装后的删除结果
 */
export const deleteWorkflow = (id: string): Promise<ApiResult<boolean>> => {
  return handleApiRequest(() => del(`/runtime/bcc/v1.0/aiflow/${id}`));
};

/**
 * 复制工作流
 * @param id 工作流ID
 * @returns 包装后的复制结果
 */
export const copyWorkflow = (id: string): Promise<ApiResult<Workflow>> => {
  return handleApiRequest(() => get(`/runtime/bcc/v1.0/aiflow/copy/${id}`));
};

/**
 * 发布工作流
 * @param id 工作流ID
 * @returns 包装后的发布结果
 */
export const publishWorkflow = (id: string): Promise<ApiResult<boolean>> => {
  return handleApiRequest(() => post(`/runtime/bcc/v1.0/aiflow/release/${id}`));
};

/**
 * 更新工作流
 * @param id 工作流ID
 * @param data 工作流数据
 * @returns 包装后的更新结果
 */
export const updateWorkflow = (id: number, data: Partial<Workflow>): Promise<ApiResult<Workflow>> => {
  return handleApiRequest(() => put(`/workflows/${id}`, data));
};
