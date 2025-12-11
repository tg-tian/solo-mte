import { get, handleApiRequest, type ApiResult } from './request';

// 定义complexData的数据类型
export interface TreeNode {
  id: string;
  avatar: string;
  code: string;
  name: string;
  parent: string;
  layer: number;
  hasChildren?: boolean;
  expanded: boolean;
  // 可以根据实际数据结构添加更多字段
}

/**
 * 获取侧边栏的复杂数据
 * @returns 包装后的侧边栏数据结果
 */
export const getComplexData = (): Promise<ApiResult<TreeNode[]>> => {
  return handleApiRequest(async () => {
    try {
      const data = await get<TreeNode[]>('/runtime/bcc/v2.0/typeTree/billCategories');
      data.forEach((node) => {
        if (node) {
          node.expanded = false;
        }
      });
      // 确保返回的是数组
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  });
};
