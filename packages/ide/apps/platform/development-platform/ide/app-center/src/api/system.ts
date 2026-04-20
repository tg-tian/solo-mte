import type { AxiosResponse } from 'axios'
import request from '../utils/request'

export function getMapperLoaderUrl(): Promise<AxiosResponse<{ url: string }>> {
  return request.get('/system/mapper-loader-url')
}

export function updateMapperLoaderUrl(url: string): Promise<AxiosResponse<{ ok: boolean; url: string; error?: string }>> {
  return request.put('/system/mapper-loader-url', { url })
}
