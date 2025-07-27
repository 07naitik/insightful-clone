import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Employee {
  id: number
  name: string
  email: string
  is_active: boolean
  is_activated: boolean
  created_at: string
  updated_at?: string
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  employee: Employee | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)

  // API base URL - can be configured
  const API_BASE_URL = 'http://localhost:8000/api/v1'

  useEffect(() => {
    // Check for existing token on app start
    checkExistingAuth()
  }, [])

  const checkExistingAuth = async () => {
    try {
      setIsLoading(true)
      
      // Force clear any stale state first
      setToken(null)
      setEmployee(null) 
      setIsAuthenticated(false)
      
      // Get token from secure storage
      const tokenResult = await window.api.auth.getToken()
      
      if (tokenResult.success && tokenResult.token) {
        const storedToken = tokenResult.token
        setToken(storedToken)
        
        // Verify token with backend and get employee info
        try {
          console.log('AuthContext: Checking employee with token:', storedToken)
          const response = await fetch(`${API_BASE_URL}/employees/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          })

          console.log('AuthContext: Employee response status:', response.status)
          
          if (response.ok) {
            const employeeData = await response.json()
            console.log('AuthContext: Employee data received:', employeeData)
            setEmployee(employeeData)
            setIsAuthenticated(true)
          } else {
            console.log('AuthContext: Employee fetch failed, removing token')
            // Token is invalid, remove it
            await window.api.auth.removeToken()
            setToken(null)
          }
        } catch (error) {
          console.error('Failed to verify token:', error)
          await window.api.auth.removeToken()
          setToken(null)
        }
      }
    } catch (error) {
      console.error('Failed to check existing auth:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)

      // Create form data for OAuth2 token endpoint
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)

      const response = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        const newToken = data.access_token

        // Store token securely
        const storeResult = await window.api.auth.storeToken(newToken)
        
        if (storeResult.success) {
          setToken(newToken)
          
          // Get employee information (pass token directly to avoid timing issues)
          await refreshEmployeeInfo(newToken)
          
          setIsAuthenticated(true)
          return { success: true }
        } else {
          return { success: false, error: 'Failed to store authentication token securely' }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        return { 
          success: false, 
          error: errorData.detail || 'Invalid credentials' 
        }
      }
    } catch (error) {
      console.error('Login failed:', error)
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)

      // Call logout endpoint if we have a token
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        } catch (error) {
          console.error('Backend logout failed:', error)
          // Continue with local logout even if backend fails
        }
      }

      // Remove token from secure storage
      await window.api.auth.removeToken()
      
      // Clear ALL state completely
      setToken(null)
      setEmployee(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      
      // Force a page reload to clear any remaining state
      window.location.reload()
    } catch (error) {
      console.error('Logout failed:', error)
      // Even if logout fails, clear local state
      setToken(null)
      setEmployee(null)
      setIsAuthenticated(false)
      setIsLoading(false)
    }
  }

  const refreshEmployeeInfo = async (authToken?: string) => {
    const tokenToUse = authToken || token
    if (!tokenToUse) return

    console.log('AuthContext: Fetching employee info with token:', tokenToUse)
    try {
      const response = await fetch(`${API_BASE_URL}/employees/me`, {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('AuthContext: Employee response status:', response.status)

      if (response.ok) {
        const employeeData = await response.json()
        console.log('AuthContext: Employee data received:', employeeData)
        setEmployee(employeeData)
      } else {
        console.error('AuthContext: Failed to refresh employee info, status:', response.status)
      }
    } catch (error) {
      console.error('Failed to refresh employee info:', error)
    }
  }

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    token,
    employee,
    login,
    logout,
    refreshEmployeeInfo
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
