import request from '../utils/request';

export function getDeviceTypes(domainId?: number) {
  return request.get('/api/v1/device-types', {
    params: { domainId }
  });
}

export function getAllDeviceTypesFallback() {
  return request.get('/meta/device-models');
}

export function bindingDeviceType(domainId: number, deviceModelId: number) {
  return request.post('/domain/devicetype/binding', {
    domainId,
    deviceModelId
  });
}

export function unbindingDeviceType(domainId: number, deviceModelId: number) {
  return request.post('/domain/devicetype/unbinding', {
    domainId,
    deviceModelId
  });
}
