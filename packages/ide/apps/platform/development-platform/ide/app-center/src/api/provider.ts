import axios, { type AxiosResponse } from 'axios'
import type { ProviderConfig } from '../types/device'

export function getProviders(): Promise<AxiosResponse<ProviderConfig[]>> {
  return axios.get('/providers')
}

export function createProvider(data: ProviderConfig): Promise<AxiosResponse<{ ok: boolean; error?: string }>> {
  return axios.post('/providers', data)
}

export function updateProvider(provider: string, data: Partial<ProviderConfig>): Promise<AxiosResponse<{ ok: boolean; error?: string }>> {
  return axios.put(`/providers/${provider}`, data)
}

export function deleteProvider(provider: string): Promise<AxiosResponse<{ ok: boolean; error?: string }>> {
  return axios.delete(`/providers/${provider}`)
}
