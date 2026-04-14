import axios, { type AxiosResponse } from 'axios'
import type { Device, DeviceCommand } from '../types/device'

export function getDevices(): Promise<AxiosResponse<Device[]>> {
  return axios.get('/devices')
}

export function createDevice(data: Device): Promise<AxiosResponse<{ ok: boolean }>> {
  return axios.post('/devices', data)
}

export function updateDevice(id: string | number, data: Partial<Device>): Promise<AxiosResponse<{ ok: boolean }>> {
  return axios.put(`/devices/${id}`, data)
}

export function deleteDevice(id: string | number): Promise<AxiosResponse<{ ok: boolean }>> {
  return axios.delete(`/devices/${id}`)
}

export function discoverDevices(): Promise<AxiosResponse<Device[]>> {
  return axios.get('/discoverDevices')
}

export function sendCommand(command: DeviceCommand): Promise<AxiosResponse<{ ok: boolean }>> {
  return axios.post('/devices/command', command)
}
