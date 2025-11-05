import axios from 'axios' // 引入axios
import { ElMessage } from 'element-plus'
import { getToken } from './auth'
const service = axios.create({
  baseURL: "http://139.196.147.52:8080",
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
    if (response.status !== 200) {
      ElMessage.error(response.data.message || '出现异常情况')
    }
    return response
  },
  (error) => {
    // 网络超时
    if (error.message && error.message.includes('timeout')) {
      console.error('请求超时')
      return error.response
    }
    if (error.response && error.response.status && error.response.status === 500) {
      ElMessage.error(error.response.data.message)
      console.log(error.response)
      return error.response
    }
    // ElMessage.warning(error.response.data)
    console.log(error.response)
    return error.response
  }
)
export default service
