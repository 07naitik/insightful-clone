import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface Project {
  id: number
  name: string
  description?: string
  created_at: string
  updated_at?: string
}

interface Task {
  id: number
  name: string
  project_id: number
  created_at: string
  updated_at?: string
}

interface TimeEntry {
  id: number
  employee_id: number
  task_id: number
  start_time: string
  end_time?: string
  ip_address?: string
  mac_address?: string
  is_active: boolean
  duration_seconds: number
  created_at: string
  updated_at?: string
}

interface Screenshot {
  id: number
  time_entry_id: number
  employee_id: number
  file_url: string
  file_name: string
  captured_at: string
  permission_flag: boolean
  ip_address?: string
  mac_address?: string
  file_size?: number
  created_at: string
}

interface ApiContextType {
  // Projects
  getProjects: () => Promise<Project[]>
  
  // Tasks
  getTasks: (projectId?: number) => Promise<Task[]>
  
  // Time Entries
  getTimeEntries: (employeeId?: number, activeOnly?: boolean) => Promise<TimeEntry[]>
  createTimeEntry: (taskId: number, ipAddress?: string, macAddress?: string) => Promise<TimeEntry>
  updateTimeEntry: (timeEntryId: number, endTime?: string, ipAddress?: string, macAddress?: string) => Promise<TimeEntry>
  stopTimeEntry: (timeEntryId: number) => Promise<TimeEntry>
  
  // Screenshots
  uploadScreenshot: (
    imageData: string, 
    employeeId: number, 
    timeEntryId: number, 
    permission: boolean, 
    ip?: string, 
    mac?: string
  ) => Promise<Screenshot>
  
  getScreenshots: (employeeId?: number, timeEntryId?: number) => Promise<Screenshot[]>
}

const ApiContext = createContext<ApiContextType | undefined>(undefined)

export const useApi = () => {
  const context = useContext(ApiContext)
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}

interface ApiProviderProps {
  children: ReactNode
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const { token } = useAuth()
  const API_BASE_URL = 'http://localhost:8000/api/v1'

  const makeApiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  const getProjects = async (): Promise<Project[]> => {
    return makeApiRequest('/projects')
  }

  const getTasks = async (projectId?: number): Promise<Task[]> => {
    const queryParams = projectId ? `?project_id=${projectId}` : ''
    return makeApiRequest(`/tasks${queryParams}`)
  }

  const getTimeEntries = async (employeeId?: number, activeOnly?: boolean): Promise<TimeEntry[]> => {
    const params = new URLSearchParams()
    if (employeeId) params.append('employee_id', employeeId.toString())
    if (activeOnly) params.append('active_only', 'true')
    
    const queryString = params.toString()
    return makeApiRequest(`/time_entries${queryString ? `?${queryString}` : ''}`)
  }

  const createTimeEntry = async (
    taskId: number, 
    ipAddress?: string, 
    macAddress?: string
  ): Promise<TimeEntry> => {
    return makeApiRequest('/time_entries', {
      method: 'POST',
      body: JSON.stringify({
        task_id: taskId,
        ip_address: ipAddress,
        mac_address: macAddress
      })
    })
  }

  const updateTimeEntry = async (
    timeEntryId: number, 
    endTime?: string, 
    ipAddress?: string, 
    macAddress?: string
  ): Promise<TimeEntry> => {
    const body: any = {}
    if (endTime) body.end_time = endTime
    if (ipAddress) body.ip_address = ipAddress
    if (macAddress) body.mac_address = macAddress

    return makeApiRequest(`/time_entries/${timeEntryId}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  }

  const stopTimeEntry = async (timeEntryId: number): Promise<TimeEntry> => {
    return makeApiRequest(`/time_entries/${timeEntryId}/stop`, {
      method: 'POST'
    })
  }

  const uploadScreenshot = async (
    imageData: string,
    employeeId: number,
    timeEntryId: number,
    permission: boolean,
    ip?: string,
    mac?: string
  ): Promise<Screenshot> => {
    // Convert base64 to blob
    const byteCharacters = atob(imageData)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/png' })

    // Create form data
    const formData = new FormData()
    formData.append('image', blob, 'screenshot.png')
    formData.append('employee_id', employeeId.toString())
    formData.append('time_entry_id', timeEntryId.toString())
    formData.append('permission', permission.toString())
    if (ip) formData.append('ip', ip)
    if (mac) formData.append('mac', mac)

    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/screenshots`, {
      method: 'POST',
      headers,
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  const getScreenshots = async (employeeId?: number, timeEntryId?: number): Promise<Screenshot[]> => {
    const params = new URLSearchParams()
    if (employeeId) params.append('employee_id', employeeId.toString())
    if (timeEntryId) params.append('time_entry_id', timeEntryId.toString())
    
    const queryString = params.toString()
    return makeApiRequest(`/screenshots${queryString ? `?${queryString}` : ''}`)
  }

  const value: ApiContextType = {
    getProjects,
    getTasks,
    getTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    stopTimeEntry,
    uploadScreenshot,
    getScreenshots
  }

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  )
}
