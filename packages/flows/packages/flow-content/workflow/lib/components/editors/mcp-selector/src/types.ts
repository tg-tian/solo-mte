// MCP分类信息
export interface MCPCategoryInfo {
    mcpCategoryId: string;
    mcpCategoryName: string;
    parentId: string | null;
    categoryLevel: string;
    isSystemInit: string;
}

// MCP服务器信息
export interface MCPServerInfo {
    mcpServerName: string;
    mcpServerStatus: number;
    mcpServerDesc: string;
    firstCategoryId: string;
    secondCategoryId: string;
    mcpServerImage: string;
    mcpServerId?: string;
}

// MCP工具信息
export interface MCPTool {
    mcpToolId: string;
    mcpToolName: string;
    mcpToolDesc: string;
    inputSchema: {
        type: string;
        properties: Record<string, {
            description: string;
            type: string;
            default?: any;
        }>;
        required: string[];
    };
}

// MCP服务器详情
export interface MCPServerDetail {
    mcpServerName: string;
    mcpServerId: string;
    mcpServerCode: string;
    firstCategoryId: string;
    secondCategoryId: string;
    mcpServerDesc: string;
    image: string;
    mcpServerType: string;
    mcpServerUrl: string;
    mcpServerHeader: string;
    mcpToolList: MCPTool[];
    callMsg: string;
}

// 分页信息
export interface Pagination {
    totalCount: number;
    totalPage: number;
    currentPage: number;
    pageSize: number;
}

// MCP服务器列表响应
export interface MCPServerListResponse {
    pagination: Pagination;
    mcpServerInfoList: MCPServerInfo[];
}
