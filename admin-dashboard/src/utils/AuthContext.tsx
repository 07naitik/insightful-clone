import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import { apiCall } from './api'

interface Employee {
  id: number
  name: string
  email: string
  is_active: boolean
  is_activated: boolean
  role?: string
  created_at: string
}

interface AuthContextType {
  employee: Employee | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  refreshEmployeeInfo: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshEmployeeInfo = async (token?: string) => {
    try {
      const authToken = token || Cookies.get('admin_token')
      if (!authToken) {
        setEmployee(null)
        setLoading(false)
        return
      }

      const response = await apiCall('/employees/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.success) {
        // Check if user has admin privileges (for demo, allow all activated employees admin access)
        const employeeData = response.data
        if (employeeData.is_activated) {
          employeeData.role = 'admin'
          setEmployee(employeeData)
        } else {
          toast.error('Access denied. Account not activated.')
          logout()
          return
        }
      } else {
        throw new Error(response.error || 'Failed to get employee info')
      }
    } catch (error) {
      console.error('Failed to refresh employee info:', error)
      Cookies.remove('admin_token')
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)

      const response = await fetch('http://localhost:8000/api/v1/auth/token', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Login failed')
      }

      const data = await response.json()
      const token = data.access_token

      // Store token
      Cookies.set('admin_token', token, { expires: 1 }) // 1 day

      // Get employee info and check admin privileges
      await refreshEmployeeInfo(token)
      
      if (employee || Cookies.get('admin_token')) {
        toast.success('Welcome to Admin Dashboard!')
        return true
      } else {
        return false
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    Cookies.remove('admin_token')
    setEmployee(null)
    toast.success('Logged out successfully')
  }

  useEffect(() => {
    const token = Cookies.get('admin_token')
    if (token) {
      refreshEmployeeInfo(token)
    } else {
      setLoading(false)
    }
  }, [])

  const value: AuthContextType = {
    employee,
    isAuthenticated: !!employee,
    loading,
    login,
    logout,
    refreshEmployeeInfo,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
