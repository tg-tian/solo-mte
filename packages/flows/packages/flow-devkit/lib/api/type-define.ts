import { type ApiResult, handleApiRequest, post } from './request';
import type { TypeRefer } from '@farris/flow-devkit/types';

const BASE_URL = `/runtime/bcc/v2.0/typeDefine`;

export class TypeDefineApi {

    public static getListRefer(): Promise<ApiResult<TypeRefer[]>> {
        return handleApiRequest(() => post(`${BASE_URL}/list_refer`, {}));
    }
}
