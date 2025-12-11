import { type ApiResult, handleApiRequest, get } from './request';

const BASE_URL = '/runtime/bcc/v2.0/typeTree';

export interface TreeNodeData {
    id: string;
    code: string;
    name: string;
    layer: number;
    parent: string;
}

export class TypeTreeApi {

    public static getBillCategories(): Promise<ApiResult<TreeNodeData[]>> {
        return handleApiRequest(() => get(`${BASE_URL}/billCategories`));
    }

    public static getBusinessObjects(): Promise<ApiResult<TreeNodeData[]>> {
        return handleApiRequest(() => get(`${BASE_URL}/businessObject`));
    }
}
