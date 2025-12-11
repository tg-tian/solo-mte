import { type ApiResult, handleApiRequest, get, put } from './request';
import type { FlowMetadata } from '@farris/flow-devkit';

const BASE_URL = `/runtime/bcc/v1.0/aiflow`;

export class FlowApi {

    /**
     * 查询流程详情
     * @param id 流程ID
     * @returns 流程元数据
     */
    public static getFlowMetadata(flowMetadataId: string): Promise<ApiResult<FlowMetadata>> {
        return handleApiRequest(() => get(`${BASE_URL}/${flowMetadataId}`));
    }

    /**
     * 保存流程元数据
     * @param data 流程元数据
     */
    public static saveFlowMetadata(data: FlowMetadata): Promise<ApiResult<void>> {
        return handleApiRequest(() => put(BASE_URL, data));
    }
}
