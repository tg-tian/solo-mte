import request from '../utils/request'
import { Component as ComponentModel } from '../types/models'

// Get all components
export const getComponents = (domainId?: number) => {
  return request({
    url: '/components',
    method: 'get',
    params: { domainId }
  })
}

// Get component by ID
export const getComponentById = (id: number) => {
  return request({
    url: `/components/${id}`,
    method: 'get'
  })
}

// Create component
export const createComponent = (component: ComponentModel) => {
  return request({
    url: '/components',
    method: 'post',
    data: component
  })
}

// Update component
export const updateComponent = (id: number, component: ComponentModel) => {
  return request({
    url: `/components/${id}`,
    method: 'put',
    data: component
  })
}

// Delete component
export const deleteComponent = (id: number) => {
  return request({
    url: `/components/${id}`,
    method: 'delete'
  })
}

export function bindingComponent(domainId: number, componentId: number) {
  return request({
      url: `/domain/component/binding`,
      method: 'post',
      data: {
          domainId: domainId,
          componentId: componentId
      }
  })
}

export function unbindingComponent(domainId: number, componentId: number) {
  return request({
      url: `/domain/component/unbinding`,
      method: 'post',
      data: {
          domainId: domainId,
          componentId: componentId
      }
  })
}

// For mocking data in development
import { reactive } from 'vue'
import { ComponentType, PurposeType } from '../types/models'

// Mock components
export const mockComponents = reactive<ComponentModel[]>([
  {
    id: 1,
    code: 'START_NODE',
    name: '开始节点',
    description: '流程的起始节点',
    type: ComponentType.Node,
    purpose: PurposeType.BusinessFlow,
    createTime: '2023-10-15 08:30:00',
    updateTime: '2023-11-20 14:22:33',
    inputConstraint: {
      quantity: 0,
      type: 'none'
    },
    outputConstraint: {
      quantity: 1,
      type: 'any'
    }
  },
  {
    id: 2,
    code: 'PROCESS_NODE',
    name: '处理节点',
    description: '业务流程处理节点',
    type: ComponentType.Node,
    purpose: PurposeType.BusinessFlow,
    createTime: '2023-10-16 09:45:12',
    updateTime: '2023-11-21 16:30:45',
    inputConstraint: {
      quantity: 1,
      type: 'any'
    },
    outputConstraint: {
      quantity: 1,
      type: 'any'
    }
  },
  {
    id: 3,
    code: 'DECISION_NODE',
    name: '决策节点',
    description: '条件分支节点',
    type: ComponentType.Node,
    purpose: PurposeType.InterfaceFlow,
    createTime: '2023-10-17 11:20:05',
    updateTime: '2023-11-22 10:15:30',
    inputConstraint: {
      quantity: 1,
      type: 'any'
    },
    outputConstraint: {
      quantity: -1, // -1 means unlimited
      type: 'any'
    }
  },
  {
    id: 4,
    code: 'NORMAL_EDGE',
    name: '普通连接线',
    description: '连接两个节点的普通边',
    type: ComponentType.Edge,
    purpose: PurposeType.BusinessFlow,
    createTime: '2023-10-18 14:10:25',
    updateTime: '2023-11-23 09:40:18',
    startConstraint: {
      quantity: 1,
      type: 'node'
    },
    endConstraint: {
      quantity: 1,
      type: 'node'
    }
  },
  {
    id: 5,
    code: 'DEVICE_NODE',
    name: '设备节点',
    description: '代表物理设备的节点',
    type: ComponentType.Node,
    purpose: PurposeType.DeviceLogic,
    createTime: '2023-10-19 16:35:42',
    updateTime: '2023-11-24 13:25:50',
    inputConstraint: {
      quantity: -1,
      type: 'any'
    },
    outputConstraint: {
      quantity: -1,
      type: 'any'
    }
  }
] as any[])
