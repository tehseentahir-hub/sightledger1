'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL, getRequestErrorMessage } from '../lib/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMounted(true)

    const clearSession = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      delete axios.defaults.headers.common['Authorization']
      setUser(null)
    }

    const hydrateSession = async () => {
      try {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
          clearSession()
          return
        }

        const cachedUser = JSON.parse(userData)
        if (!cachedUser || typeof cachedUser !== 'object') {
          clearSession()
          return
        }

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        const res = await axios.get(`${API_URL}/auth/me`)
        if (cancelled) return

        const verifiedUser = {
          ...cachedUser,
          ...res.data,
          role: res.data?.role || cachedUser.role,
          type: res.data?.type || cachedUser.type,
          shop_id: res.data?.shop_id || cachedUser.shop_id || res.data?.id,
          name: res.data?.name || cachedUser.name || res.data?.owner_name,
          business_mode: res.data?.business_mode || cachedUser.business_mode,
        }

        localStorage.setItem('user', JSON.stringify(verifiedUser))
        setUser(verifiedUser)
      } catch (error) {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    hydrateSession()

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email, password, role = 'shop_owner') => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password, role })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      setUser(res.data.user)
      return { success: true, user: res.data.user }
    } catch (error) {
      return { success: false, message: getRequestErrorMessage(error, 'Login failed. Please check email, password, and role.') }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, mounted }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
