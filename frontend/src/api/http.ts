import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

const http = axios.create({ baseURL: API_URL })

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default http
