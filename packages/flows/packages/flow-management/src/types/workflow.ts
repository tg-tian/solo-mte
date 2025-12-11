// 工作流数据类型定义
export interface Workflow {
  id: string;
  name: string;
  description: string;
  kind: string;
  releaseStatus: '0' | '1' | '2'; // '0': 未发布、'1': 当前版本未发布、'2': 已发布
  [key: string]: any;
}

// 分页响应数据
export interface PaginationResult<T> {
  list: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

// 工作流创建请求类型
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  kind: string;
  releaseStatus: '0' | '1' | '2'; // '0': 未发布、'1': 当前版本未发布、'2': 已发布
}

// 为了向后兼容，保留WorkflowItem类型别名
export type WorkflowItem = Workflow;
