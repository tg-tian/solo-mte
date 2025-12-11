import { get, handleApiRequest, type ApiResult } from './request';
import type { FlowKindInfo } from '@/types';

const BASE_URL = `/runtime/bcc/v1.0/aiflowtoolBar`;

export const getFlowKindList = (): Promise<ApiResult<FlowKindInfo[]>> => {
    return handleApiRequest<FlowKindInfo[]>(() => get(`${BASE_URL}/listFlowKind`));
};
