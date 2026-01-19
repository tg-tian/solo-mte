import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router'
import DomainList from '@/views/meta/DomainList/index.vue'
import Layout from '@/views/components/Layout/index.vue'
import SceneList from '@/views/domain/SceneList/index.vue'
import Login from '@/views/Login/index.vue'
import { getToken } from '@/utils/auth'

const routes: RouteRecordRaw[] = [
    {
        path: '/login',
        name: '登录',
        component: Login,
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/',
        name: '低代码平台',
        component: Layout,
        meta: {
            keepAlive: true,
            requiresAuth: true
        },
        children: [
            {
                path: 'meta',
                name: '元工具平台',
                component: null,
                children: [
                    {
                        path: 'devicetype/list',
                        name: '设备类型列表',
                        component: () => import('@/views/meta/DeviceTypeList/index.vue')
                    },
                    {
                        path: 'devicetype/setting',
                        name: '设备类型定制',
                        component: () => import('@/views/meta/DeviceTypeSetting/index.vue')
                    },
                    {
                        path: 'devicemodel/list',
                        name: '设备型号列表',
                        component: () => import('@/views/meta/DeviceModelList/index.vue')
                    },
                    {
                        path: 'domain/list',
                        name: '领域列表',
                        component: DomainList
                    },
                    {
                        path: 'domain/setting',
                        name: '领域定制',
                        component: () => import('@/views/meta/DomainSetting/index.vue')
                    },
                    {
                        path: 'component/list',
                        name: '组件类型',
                        component: () => import('@/views/meta/ComponentList/index.vue')
                    },
                    {
                        path: 'component/setting',
                        name: '组件定制',
                        component: () => import('@/views/meta/ComponentSetting/index.vue')
                    },
                    {
                        path: 'nodetype/list',
                        name: '节点类型列表',
                        component: () => import('@/views/meta/NodeTypeList/index.vue')
                    },
                    {
                        path: 'nodetype/setting',
                        name: '节点类型定制',
                        component: () => import('@/views/meta/NodeTypeSetting/index.vue')
                    }
                ]
            },
            {
                path: 'domain',
                name: '领域平台',
                component: null,
                children: [
                    {
                        path: 'scene/list',
                        name: '场景列表',
                        component: SceneList
                    },
                    {
                        path: 'scene/setting',
                        name: '场景定制',
                        component: () => import('@/views/domain/SceneSetting/index.vue')
                    }
                ]
            }
        ]
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

// 登录拦截
router.beforeEach((to, _from, next) => {
    if (to.meta.requiresAuth && !getToken()) {
        // 如果路由需要身份验证并且用户未登录，重定向到登录页
        next('/login')
    } else {
        // 否则，继续导航
        next()
    }
})

export default router