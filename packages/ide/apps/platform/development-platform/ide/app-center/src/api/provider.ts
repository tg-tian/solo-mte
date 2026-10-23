import type { AxiosResponse } from 'axios'
import request from '../../../../../../../src/utils/device-request'
import type { ProviderConfig } from '../types/device'

export function getProviders(): Promise<AxiosResponse<ProviderConfig[]>> {
  return request.get('/providers')
}

export function createProvider(data: ProviderConfig): Promise<AxiosResponse<{ ok: boolean; error?: string }>> {
  return request.post('/providers', data)
}

export function updateProvider(provider: string, data: Partial<ProviderConfig>): Promise<AxiosResponse<{ ok: boolean; error?: string }>> {
  return request.put(`/providers/${provider}`, data)
}

export function deleteProvider(provider: string): Promise<AxiosResponse<{ ok: boolean; error?: string }>> {
  return request.delete(`/providers/${provider}`)
}
