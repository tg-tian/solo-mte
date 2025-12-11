import { type ApiResult, handleApiRequest, get } from './request';
import type { Type } from '@farris/flow-devkit/types';

const BASE_URL = `/runtime/bcc/v1.0/funcQuery`;

export class FuncQueryApi {

    public static getMethodTypes(): Promise<ApiResult<Type[]>> {
        return handleApiRequest(() => get(`${BASE_URL}/queryByScene/default`));
    }
}
