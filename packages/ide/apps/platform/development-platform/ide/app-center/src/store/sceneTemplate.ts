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

        

    },

    persist: true
})