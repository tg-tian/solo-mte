import request from '@/utils/request'
import domainPlatformRequest from "@/utils/domainPlatformRequest";
import { mockDomains } from './mock'

// 实际环境下的API接口



export function getDomains() {
    return request({
        url: '/domains',
        method: 'get'
    })
}

export function getDomainById(id: number) {
    return request({
        url: `/domains/${id}`,
        method: 'get'
    })
}

export function createDomain(data: any) {
    return request({
        url: '/domains',
        method: 'post',
        data
    })
}

export function createDomainFromTemplate(data: any, templates: any, deviceTypes: any, components: any) {
    return request({
        url: '/domains/from-template',
        method: 'post',
        data: {
            domainData: data,
            templates: templates,
            deviceTypes: deviceTypes,
            components: components
        }
    })
}

export function updateDomain(id: number, data: any) {
    return request({
        url: `/domains/${id}`,
        method: 'put',
        data
    })
}

export function deleteDomain(id: number) {
    return request({
        url: `/domains/${id}`,
        method: 'delete'
    })
}

export function publishDomain(data: any) {
    return request({
        url: `/domains/publish`,
        method: 'post',
        data: data
    })
}

export function setDomainPlatform(data: any){
    return domainPlatformRequest({
        url:"/api/v1/specification/create",
        method:'post',
        data: data
    })
}

// Mock API functions
export function getMockDomains() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                data: {
                    code: 200,
                    message: 'success',
                    data: mockDomains
                }
            })
        }, 300)
    })
}

export function getMockDomainById(id: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const domain = mockDomains.find(d => d.id === id)
            resolve({
                data: {
                    code: 200,
                    message: 'success',
                    data: domain
                }
            })
        }, 300)
    })
}

export function createMockDomain(data: any) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newDomain = {
                id: mockDomains.length + 1,
                ...data,
                createTime: new Date().toISOString().split('T')[0],
                updateTime: new Date().toISOString().split('T')[0],
                sceneCount: 0,
                status: 'active'
            }
            mockDomains.push(newDomain)
            resolve({
                data: {
                    code: 200,
                    message: 'success',
                    data: newDomain
                }
            })
        }, 300)
    })
}

export function updateMockDomain(id: number, data: any) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const index = mockDomains.findIndex(d => d.id === id)
            if (index !== -1) {
                mockDomains[index] = {
                    ...mockDomains[index],
                    ...data,
                    updateTime: new Date().toISOString().split('T')[0]
                }
                resolve({
                    data: {
                        code: 200,
                        message: 'success',
                        data: mockDomains[index]
                    }
                })
            } else {
                resolve({
                    data: {
                        code: 404,
                        message: 'Domain not found',
                        data: null
                    }
                })
            }
        }, 300)
    })
}

export function deleteMockDomain(id: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const index = mockDomains.findIndex(d => d.id === id)
            if (index !== -1) {
                mockDomains.splice(index, 1)
                resolve({
                    data: {
                        code: 200,
                        message: 'success',
                        data: null
                    }
                })
            } else {
                resolve({
                    data: {
                        code: 404,
                        message: 'Domain not found',
                        data: null
                    }
                })
            }
        }, 300)
    })
}
