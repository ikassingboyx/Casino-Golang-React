import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// The API is served from the same origin as the app (Caddy in Docker, Vite's
// proxy in development); VITE_API_URL points it elsewhere.
export const API_URL: string = import.meta.env.VITE_API_URL ?? '/api'

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
