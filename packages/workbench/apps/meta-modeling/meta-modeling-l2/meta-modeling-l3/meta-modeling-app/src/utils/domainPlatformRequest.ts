import axios from 'axios' // 引入axios
import { ElMessage } from 'element-plus'
import { getToken } from './auth'
const service = axios.create({
    baseURL: import.meta.env.VITE_DOMAIN_TEMPLATE_PATH as string,
    timeout: 99999
})
// http request 拦截器
service.interceptors.request.use(
    (config: any) => {
        // 全局添加 token
        if (getToken()) {
            config.headers['token'] = getToken()
        }
        return config
    },
    (error) => {
        console.error(error)
        return Promise.reject(error)
    }
)
// http response 拦截器
service.interceptors.response.use(
    (response) => {
        if (response.status !== 200 && response.status !== 201) {
            ElMessage.error(response.data.message || '出现异常情况')
        }
        return response
    },
    (error) => {
        // 网络超时
        if (error.message && error.message.includes('timeout')) {
            console.error('请求超时')
            throw error
        }
        if (error.response && error.response.status) {
            ElMessage.error(error.response.data.message)
            console.log(error.response)
            throw error
        }
        // ElMessage.warning(error.response.data)
        console.log(error.response)
        throw error
    }
)
export default service
