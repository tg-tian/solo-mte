import axios, { type AxiosResponse } from 'axios'
import type { DeviceShadow } from '../types/models'

export function getDeviceShadows(): Promise<AxiosResponse<DeviceShadow[]>> {
  return axios.get('/deviceShadows')
}
