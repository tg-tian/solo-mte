import axios, { type AxiosResponse } from 'axios'

export function getMapperLoaderUrl(): Promise<AxiosResponse<{ url: string }>> {
  return axios.get('/system/mapper-loader-url')
}

export function updateMapperLoaderUrl(url: string): Promise<AxiosResponse<{ ok: boolean; url: string; error?: string }>> {
  return axios.put('/system/mapper-loader-url', { url })
}
