import request from '../utils/request';

export function getComponents(domainId?: number) {
  return request.get('/components', {
    params: { domainId }
  });
}

export function bindingComponent(domainId: number, componentId: number) {
  return request.post('/domain/component/binding', {
    domainId,
    componentId
  });
}

export function unbindingComponent(domainId: number, componentId: number) {
  return request.post('/domain/component/unbinding', {
    domainId,
    componentId
  });
}
