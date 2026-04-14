import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import DeviceModelList from '../views/DeviceModelList.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'DeviceModelList',
    component: DeviceModelList
  },
  {
    path: '/setting',
    name: 'DeviceModelSetting',
    // 引用本地组件
    component: () => import('../views/DeviceModelSetting.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
