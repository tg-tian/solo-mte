import axios from 'axios'

const service = axios.create({
  baseURL: import.meta.env.VITE_BASE_PATH as string,
  timeout: 99999
})

service.interceptors.request.use(
  (config: any) => {
    return config
  },
  (error) => {
    console.error(error)
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response) => {
    if (response.status !== 200) {
      console.log(response.data.message || '出现异常情况')
    }
    return response
  },
  (error) => {
    if (error.message && error.message.includes('timeout')) {
      console.error('请求超时')
      throw error
    }
    if (error.response && error.response.status) {
      console.log(error.response)
      throw error
    }
    console.log(error.response)
    throw error
  }
)

export default service
