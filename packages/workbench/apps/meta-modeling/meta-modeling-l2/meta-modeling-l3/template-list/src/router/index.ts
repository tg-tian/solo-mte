import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import TemplateList from '../views/TemplateList.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'TemplateList',
    component: TemplateList
  },
  {
    path: '/template-setting',
    name: 'TemplateSetting',
    // 引用本地组件
    component: () => import('../views/TemplateSetting.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
