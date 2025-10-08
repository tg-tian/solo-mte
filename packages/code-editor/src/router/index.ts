import { createRouter, createWebHistory } from 'vue-router';
import CodeEditor from '../../demos/code-editor/basic.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: CodeEditor
        }
    ]
});

export default router;
