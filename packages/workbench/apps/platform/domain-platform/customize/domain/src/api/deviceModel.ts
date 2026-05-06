import request from '../utils/request';

export function getDeviceModels(domainId?: number) {
  return request.get('/meta/device-models', {
    params: { domainId }
  });
}

export function bindDeviceModel(domainId: number, deviceModelId: number) {
  return request.post(`/meta/device-models/${deviceModelId}/domains/${domainId}`);
}

export function unbindDeviceModel(domainId: number, deviceModelId: number) {
  return request.delete(`/meta/device-models/${deviceModelId}/domains/${domainId}`);
}
