import { saveSceneTemplate} from '@/api/template'
import { defineStore } from 'pinia'

export const useSceneTemplateStore = defineStore('sceneTemplate', {
    state: () => ({
        sceneTemplates: [],
        currentSceneTemplate: null,
        loading: false,
        total: 0
    }),

    actions: {
        setCurrentSceneTemplate(sceneTemplate: any) {
            this.currentSceneTemplate = sceneTemplate
        },

        // Save the scene itself as a template
        async saveSceneTemplate(sceneData: any, devices: any) {
            try {
                let dslData = {
                    sceneData: sceneData,
                    devices: devices,
                }
                let res = await saveSceneTemplate(dslData);
                if (res.status === 200) {
                    return true
                }
            } catch (error) {
                console.error('Failed to save scene template:', error)
                throw error
            }
        },

    },

    persist: true
})