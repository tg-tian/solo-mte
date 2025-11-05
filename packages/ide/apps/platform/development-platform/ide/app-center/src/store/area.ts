import { defineStore } from 'pinia';
import {
    getAreas,
    getAreaById,
    createArea,
    updateArea,
    deleteArea,
    addChildren,
    buildAreaTree,
    deleteParent,
} from '../api/area'; // 使用 area API
import type { Area } from '../types/models'; // 引入 Area 类型

export const useAreaStore = defineStore('area', {
    state: () => ({
        areas: [] as Area[], // 存储区域列表
        loading: false, // 加载状态
        currentArea: null as Area | null // 当前选中的区域
    }),

    actions: {

        // 获取区域列表
        async fetchAreas(id:number) {
            if(!id){
                this.areas = []
                return
            }
            this.loading = true;
            try {
                const res: any = await getAreas(id);
                if (res.data && res.status === 200) {
                    this.areas = res.data;
                }
            } catch (error) {
                console.error('Failed to fetch areas:', error);
            } finally {
                this.loading = false;
            }
        },

        // 根据 ID 获取区域详情
        async fetchAreaById(id: number) {
            try {
                const res: any = await getAreaById(id);
                if (res.data && res.status === 200) {
                    this.currentArea = res.data;
                    return res.data;
                }
            } catch (error) {
                console.error('Failed to fetch area by ID:', error);
                throw error;
            }
        },

        // 创建区域
        async createArea(areaData: any) {
            try {
                const res: any = await createArea(areaData);
                if (res.data && res.status === 200) {
                    await this.fetchAreas(areaData.sceneId); // 刷新区域列表
                    return res.data;
                }
            } catch (error) {
                console.error('Failed to create area:', error);
                throw error;
            }
        },

        // 更新区域
        async updateArea(id: number, areaData: any) {
            try {
                const res: any = await updateArea(id, areaData);
                if (res.data && res.status === 200) {
                    await this.fetchAreas(areaData.sceneId); // 刷新区域列表
                    return res.data;
                }
            } catch (error) {
                console.error('Failed to update area:', error);
                throw error;
            }
        },

        // 删除区域
        async deleteArea(id: number) {
            try {
                const res: any = await deleteArea(id);
                if (res.data && res.status === 200) {
                    return true;
                }
            } catch (error) {
                console.error('Failed to delete area:', error);
                throw error;
            }
        },

        async addChildren(parentId: number, childIds: number[]) {
            try {
                const res: any = await addChildren(parentId,childIds);
                if (res.data && res.status === 200) {
                    return true;
                }
            } catch (error) {
                console.error('Failed to add children:', error);
                throw error;
            }
        },

        async buildAreaTree(sceneId: number, areaId: number) {
            try {
                const res: any = await buildAreaTree(sceneId,areaId);
                if (res.data && res.status === 200) {
                    await this.fetchAreas(sceneId)
                    return res.data;
                }
            } catch (error) {
                console.error('Failed to add children:', error);
                throw error;
            }
        },


        async deleteNode(id: number) {
            try {
                const res: any = await deleteParent(id);
                if (res.data && res.status === 200) {
                    return true;
                }
            } catch (error) {
                console.error('删除节点失败:', error);
            }
             
        },

        // 设置当前区域
        setCurrentArea(area: Area | null) {
            this.currentArea = area;
        },

        // 清空区域列表
        clearAreas() {
            this.areas = [];
        }
    },

    persist: true // 启用持久化
});
