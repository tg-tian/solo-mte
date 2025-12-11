import { type ApiResult, handleApiRequest, get, post } from './request';
import type { TypeProvider, TypeRefer, Type } from '@farris/flow-devkit/types';

const BASE_URL = `/runtime/bcc/v2.0/typeQuery`;

export class TypeQueryApi {

    public static getTypeProviders(): Promise<ApiResult<TypeProvider[]>> {
        return handleApiRequest(() => get(`${BASE_URL}/queryTypeProvider`));
    }

    public static getTypeReferByProviderAndBizId(provider: string, bizId: string): Promise<ApiResult<TypeRefer[]>> {
        return handleApiRequest(() => get(`${BASE_URL}/queryTypeByProviderAndBizId/${provider}/${bizId}`));
    }

    public static getTypes(typeRefers: TypeRefer[]): Promise<ApiResult<Type[]>> {
        return handleApiRequest(() => post(`${BASE_URL}/batchQuery`, typeRefers));
    }
}
