import type { AxiosResponse } from 'axios'
import request from '../../../../../../../src/utils/device-request'
import type { Device, DeviceCommand } from '../types/device'

export function getDevices(): Promise<AxiosResponse<Device[]>> {
  return request.get('/devices')
}

export function createDevice(data: Device): Promise<AxiosResponse<{ ok: boolean }>> {
  return request.post('/devices', data)
}

export function updateDevice(id: string | number, data: Partial<Device>): Promise<AxiosResponse<{ ok: boolean }>> {
  return request.put(`/devices/${id}`, data)
}

export function deleteDevice(id: string | number): Promise<AxiosResponse<{ ok: boolean }>> {
  return request.delete(`/devices/${id}`)
}

export function discoverDevices(): Promise<AxiosResponse<Device[]>> {
  return request.get('/discoverDevices')
}

export function sendCommand(command: DeviceCommand): Promise<AxiosResponse<{ ok: boolean }>> {
  return request.post('/devices/command', command)
}
