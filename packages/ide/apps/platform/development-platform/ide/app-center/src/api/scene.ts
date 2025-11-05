import request from '../utils/request'
import { mockScenes } from './mock'
import scenePlatformRequest from "../utils/scenePlatformRequest";

// 实际环境下的API接口
export function getScenes(domainId?: number) {
    return request({
        url: '/scenes',
        method: 'get',
        params: { domainId }
    })
}

export function getSceneById(id: number) {
    return request({
        url: `/scenes/${id}`,
        method: 'get'
    })
}

export function createScene(data: any) {
    // 确保位置数据被正确格式化
    const locationData = data.location ? data.location : 
                       (data.lng && data.lat ? { lng: data.lng, lat: data.lat } : undefined)
    
    return request({
        url: '/scenes',
        method: 'post',
        data: {
            ...data,
            location: locationData
        }
    })
}

export function updateScene(id: number, data: any) {
    // 确保位置数据被正确格式化
    const locationData = data.location ? data.location : 
                       (data.lng && data.lat ? { lng: data.lng, lat: data.lat } : undefined)
    
    return request({
        url: `/scenes/${id}`,
        method: 'put',
        data: {
            ...data,
            location: locationData
        }
    })
}

export function deleteScene(id: number) {
    return request({
        url: `/scenes/${id}`,
        method: 'delete'
    })
}

export function publishScene(data: any) {
    return request({
        url: `/scenes/publish`,
        method: 'post',
        data: data
    })
}

export function downloadScene(id : number) {
    return request({
        url:`/scenes/download/${id}`,
        method:"get"
    })
}

export function getSceneDeviceTypes(sceneId: number) {
    return request({
        url: `/devices/devicetype-list?sceneId=${sceneId}`,
        method: 'get'
    })
}

export function setScenePlatform(data: any){
    return scenePlatformRequest({
        url:"/api/v1/specification/create",
        method:'post',
        data: data
    })
}


// Mock API functions for development without backend
export function getMockScenes(domainId?: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let data = [...mockScenes]
            if (domainId) {
                data = data.filter(s => s.domainId === domainId)
            }
            resolve({
                data: {
                    code: 200,
                    message: 'success',
                    data: data.map(scene => ({
                        ...scene,
                        location: scene.location // Ensure location is returned
                    }))
                }
            })
        }, 300)
    })
}

export function getMockSceneById(id: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const scene = mockScenes.find(s => s.id === id)
            resolve({
                data: {
                    code: 200,
                    message: 'success',
                    data: scene
                }
            })
        }, 300)
    })
}

export function createMockScene(data: any) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newScene = {
                id: mockScenes.length + 1,
                ...data,
                createTime: new Date().toISOString().split('T')[0],
                updateTime: new Date().toISOString().split('T')[0],
                deviceCount: 0
            }
            mockScenes.push(newScene)
            resolve({
                data: {
                    code: 200,
                    message: 'success',
                    data: newScene
                }
            })
        }, 300)
    })
}

export function updateMockScene(id: number, data: any) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const index = mockScenes.findIndex(s => s.id === id)
            if (index !== -1) {
                mockScenes[index] = {
                    ...mockScenes[index],
                    ...data,
                    updateTime: new Date().toISOString().split('T')[0]
                }
                resolve({
                    data: {
                        code: 200,
                        message: 'success',
                        data: mockScenes[index]
                    }
                })
            } else {
                resolve({
                    data: {
                        code: 404,
                        message: 'Scene not found',
                        data: null
                    }
                })
            }
        }, 300)
    })
}

export function deleteMockScene(id: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const index = mockScenes.findIndex(s => s.id === id)
            if (index !== -1) {
                mockScenes.splice(index, 1)
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
                        message: 'Scene not found',
                        data: null
                    }
                })
            }
        }, 300)
    })
}
