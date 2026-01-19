import { defineStore } from 'pinia'
import {
    getMockScenes,
    createMockScene,
    updateMockScene,
    deleteMockScene,
    getScenes,
    createScene,
    updateScene,
    deleteScene,
    getSceneById,
    publishScene,
    getSceneDeviceTypes,
    downloadScene
} from '@/api/scene'
import { Scene } from '@/types/models'

export const useSceneStore = defineStore('scene', {
    state: () => ({
        scenes: [] as Scene[],
        loading: false,
        currentScene: null as Scene | null,
        // 设置环境变量，默认使用真实API数据
        useMockData: false
    }),

    actions: {
        async fetchScenes(domainId?: number) {
            this.loading = true
            try {
                // 始终使用真实API数据
                const res: any = await getScenes(domainId);
                    
                if (res && res.status === 200) {
                    // 处理真实API返回的数据 - 适配后端数据结构
                    // 后端可能直接返回数据数组，也可能封装在res.data中
                    const scenesData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                    
                    // 转换后端返回的数据结构为前端模型
                    this.scenes = scenesData.map((scene: any) => {
                        return {
                            id: scene.sceneId || scene.id,
                            code: scene.sceneCode || scene.code,
                            domainId: scene.domainId,
                            name: scene.sceneName || scene.name,
                            description: scene.sceneDescription || scene.description,
                            createTime: scene.createTime || new Date().toISOString().split('T')[0],
                            updateTime: scene.updateTime || new Date().toISOString().split('T')[0],
                            deviceCount: scene.deviceCount || 0,
                            status: scene.status || '1',
                            url: scene.url || '',
                            imageUrl: scene.imageUrl || '',
                            location: scene.location || {
                                lng: scene.longitude,
                                lat: scene.latitude
                            }
                        };
                    });

                    console.log('Scenes fetched from API:', this.scenes);
                }
            } catch (error) {
                console.error('Failed to fetch scenes:', error)
                // 如果API调用失败，回退到mock数据
                try {
                    console.warn('Falling back to mock data');
                    const mockRes: any = await getMockScenes(domainId);
                    if (mockRes.data && mockRes.data.code === 200) {
                        this.scenes = mockRes.data.data;
                    }
                } catch (mockError) {
                    console.error('Failed to fetch mock scenes:', mockError);
                }
            } finally {
                this.loading = false
            }
        },

        async getSceneById(id: number) {
            try {
                // 始终使用真实API数据
                const res: any = await getSceneById(id);
                    
                if (res && res.status === 200) {
                    // 转换后端返回的数据结构为前端模型
                    const sceneData = res.data;
                    this.currentScene = {
                        id: sceneData.sceneId || sceneData.id,
                        domainId: sceneData.domainId,
                        name: sceneData.sceneName || sceneData.name,
                        description: sceneData.sceneDescription || sceneData.description,
                        createTime: sceneData.createTime || new Date().toISOString().split('T')[0],
                        updateTime: sceneData.updateTime || new Date().toISOString().split('T')[0],
                        deviceCount: sceneData.deviceCount || 0,
                        status: sceneData.status || '1',
                        url: sceneData.url || '',
                        imageUrl: sceneData.imageUrl || '',
                        location: sceneData.location || {
                            lng: sceneData.longitude,
                            lat: sceneData.latitude
                        },
                    };
                    return this.currentScene;
                }
            } catch (error) {
                console.error('Failed to fetch scene by ID:', error);
                return null;
            }
        },

        async createScene(sceneData: any) {
            try {
                // 始终使用真实API数据
                const res: any = await createScene(sceneData);
                    
                if (res && res.status === 200) {
                    await this.fetchScenes(sceneData.domainId)
                    return res.data
                }
            } catch (error) {
                console.error('Failed to create scene:', error)
                throw error
            }
        },

        async updateScene(id: number, sceneData: any) {
            try {
                // 始终使用真实API数据
                const res: any = await updateScene(id, sceneData);
                
                if (res && res.status === 200) {
                    // 如果当前场景正在被更新，则同步更新它
                    if (this.currentScene && this.currentScene.id === id) {
                        this.currentScene = { ...this.currentScene, ...res.data }
                    }
                    
                    // 刷新场景列表
                    await this.fetchScenes(sceneData.domainId)
                    return res.data
                }
            } catch (error) {
                console.error('Failed to update scene:', error)
                throw error
            }
        },

        async deleteScene(id: number) {
            try {
                // 始终使用真实API数据
                const res: any = await deleteScene(id);
                
                if (res && res.status === 200) {
                    // 如果当前场景被删除，清除它
                    if (this.currentScene && this.currentScene.id === id) {
                        this.currentScene = null
                    }
                    
                    // 从本地数组中移除
                    this.scenes = this.scenes.filter(scene => scene.id !== id)
                    return true
                }
            } catch (error) {
                console.error('Failed to delete scene:', error)
                throw error
            }
        },

        async publishScene(domainId: number, sceneId: number, url: string, status: string, dslData?: any) {
            try {
                let data: any = {
                    sceneId: sceneId,
                    status: status??'1',
                    url: url
                }
                if(dslData){
                    data = {
                        ...data,
                        dslData: dslData
                    }
                }
                const res: any = await publishScene(data);
                
                if (res && res.status === 200) {
                    // 如果当前场景正在被更新，则同步更新它
                    if (this.currentScene && this.currentScene.id === sceneId) {
                        this.currentScene = { ...this.currentScene, ...res.data }
                    }
                    
                    // 刷新场景列表
                    await this.fetchScenes(domainId)
                    return res.data
                }
            } catch (error) {
                console.error('Failed to publish scene:', error)
                throw error
            }
        },

        async getSceneDeviceTypes(sceneId: number) {
            try {
                const res: any = await getSceneDeviceTypes(sceneId)
                if(res && res.status===200) {
                    return res.data
                } 
            } catch (error) {
                console.error('Failed to get scene deviceType list:', error)
                throw error
            }
        },

        setCurrentScene(scene: Scene) {
            this.currentScene = scene
        },

        async downloadScene(sceneId: number){
            try {
                const  res: any = await  downloadScene(sceneId)
                if(res && res.status === 200) {
                    return res.data
                }
            } catch (error) {
                console.error('Failed to download scene_message:', error)
                throw error
            }
        }
    },

    persist: true
})
