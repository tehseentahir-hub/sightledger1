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
    setMounted(true)

    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      if (token && userData) {
        const parsed = JSON.parse(userData)
        if (parsed && typeof parsed === 'object') {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
          setUser(parsed)
        }
      }
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
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
