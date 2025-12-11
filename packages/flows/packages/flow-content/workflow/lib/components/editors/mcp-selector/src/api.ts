import type { MCPCategoryInfo, MCPServerListResponse, MCPServerDetail } from './types';
import { post } from '@/api/request';


// 获取MCP分类列表
export async function fetchMCPCategories(): Promise<MCPCategoryInfo[]> {
    try {
        const response = await post('/runtime/sys/v1.0/mcpServer/category/list', {});
        return response;
    } catch (error) {
        console.warn('真实API不可用，使用Mock数据:', error);
        return []
    }
}

// 获取MCP服务器列表
export async function fetchMCPServers(params: {
    page: number;
    pageSize: number;
    mcpServerName?: string;
    firstCategoryId?: string;
    secondCategoryId?: string;
}): Promise<MCPServerListResponse | null> {
    try {
        const response = await post('/runtime/sys/v1.0/mcpServer/list', {
          ...params,
          onlineStatus: '1',
          mcpServerStatus: '2'
        });
        return response;
    } catch (error) {
        console.warn('真实API不可用', error);
        return null;
    }
}

// 获取MCP服务器详情
export async function fetchMCPServerDetail(mcpServerId: string): Promise<MCPServerDetail | null> {
    try {
        const response = await post('/runtime/sys/v1.0/mcpServer/detail', { mcpServerId });
        return response;
    } catch (error) {
        console.warn('真实API不可用', error);
        return null;
    }
}

