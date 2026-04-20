import axios from 'axios' // 引入axios
const baseURL = import.meta.env.VITE_APP_CENTER_BASE_URL || 'http://139.196.147.52:8080'
const service = axios.create({
  baseURL,
  timeout: 99999
})
// http request 拦截器
service.interceptors.request.use(
  (config: any) => {
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
      console.log(response.data.message || '出现异常情况')
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
      console.log(error.response)
      throw error
    }
    // ElMessage.warning(error.response.data)
    console.log(error.response)
    throw error
  }
)
export default service
