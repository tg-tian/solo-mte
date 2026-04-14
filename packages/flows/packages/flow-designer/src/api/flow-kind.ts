import { type ApiResult, handleApiRequest, get } from './request';
import type { FlowKindInfo, FlowNodeGroupInfo, FlowNodeInfo } from '@flow-designer/types';

const BASE_URL = `/runtime/bcc/v1.0/aiflowtoolBar`;

export class FlowKindApi {

    /**
     * 获取流程分类列表
     * @returns 流程分类列表
     */
    public static async getFlowKindList(): Promise<ApiResult<FlowKindInfo[]>> {
        const result = await handleApiRequest<FlowKindInfo[]>(() => get(`${BASE_URL}/listFlowKind`));
        this.correctAllUrl(result.data);
        return result;
    }

    /**
     * 获取流程分类下的节点分组列表
     * @param flowKind 流程分类ID
     * @returns 节点分组列表
     */
    public static async getFlowNodeGroups(flowKind: string): Promise<ApiResult<FlowNodeGroupInfo[]>> {
        const result = await handleApiRequest<FlowNodeGroupInfo[]>(() => get(`${BASE_URL}/listNodeGroupByKind/${flowKind}`));
        this.correctFlowNodeGroups(result.data);
        return result;
    }

    /**
     * 获取包含全部节点的分组列表
     * @returns 包含全部节点的分组列表
     */
    public static async getAllFlowNodeGroups(): Promise<ApiResult<FlowNodeGroupInfo[]>> {
        const result = await handleApiRequest<FlowNodeGroupInfo[]>(() => get(`${BASE_URL}/listNodeGroup`));
        this.correctFlowNodeGroups(result.data);
        return result;
    }

    /**
     * 获取所有节点
     * @returns 所有节点
     */
    public static async getAllFlowNodes(): Promise<ApiResult<FlowNodeInfo[]>> {
        const result = await handleApiRequest<FlowNodeInfo[]>(() => get(`${BASE_URL}/listNode`));
        this.correctAllUrl(result.data);
        return result;
    }

    private static correctFlowNodeGroups(groups: FlowNodeGroupInfo[] = []): void {
        groups.forEach((group) => {
            const nodes = (group.nodes || []).filter((node) => !!node);
            group.nodes = nodes;
            nodes.forEach((node) => {
                node.jsUrl = this.correctUrl(node.jsUrl);
            });
        });
    }

    private static correctAllUrl(items: (FlowNodeInfo | FlowKindInfo)[] = []): void {
        items.forEach((item) => {
            item.jsUrl = this.correctUrl(item.jsUrl);
        });
    }

    public static correctUrl(url: string): string {
        if (!url || typeof url !== 'string') {
            return '';
        }
        const trimmedUrl = url.trim();
        const urlObj = new URL(trimmedUrl, window.location.href);
        return urlObj.href;
    }
}
