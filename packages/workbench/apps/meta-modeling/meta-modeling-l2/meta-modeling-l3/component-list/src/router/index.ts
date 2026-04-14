import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import NodeTypeList from '../views/NodeTypeList.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'NodeTypeList',
    component: NodeTypeList
  },
  {
    path: '/setting',
    name: 'NodeTypeSetting',
    // 引用本地组件
    component: () => import('../views/NodeTypeSetting.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
