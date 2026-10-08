import axios from 'axios' // 引入axios

// HTTPS 走 nginx 代理，HTTP 直连 8080（兼容 dev 模式）
const getBaseURL = (): string => {
  if (typeof location !== 'undefined' && location.protocol === 'https:') {
    return '/solo-mte-8080';
  }
  return (import.meta as any).env.VITE_BASE_PATH || 'http://127.0.0.1:8080';
};

const service = axios.create({
  baseURL: getBaseURL(),
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
