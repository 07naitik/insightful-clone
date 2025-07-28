import Cookies from 'js-cookie'

const API_BASE_URL = 'http://localhost:8000/api/v1'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export const apiCall = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const token = Cookies.get('admin_token')
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.detail || errorData.message || `HTTP ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('API call failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// Employee Management APIs
export const employeeApi = {
  getAll: () => apiCall('/employees'),
  getById: (id: number) => apiCall(`/employees/${id}`),
  create: (data: any) => apiCall('/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiCall(`/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiCall(`/employees/${id}`, {
    method: 'DELETE',
  }),
  activate: (id: number, data: any) => apiCall(`/employees/${id}/activate`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

// Project Management APIs
export const projectApi = {
  getAll: () => apiCall('/projects'),
  getById: (id: number) => apiCall(`/projects/${id}`),
  create: (data: any) => apiCall('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiCall(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiCall(`/projects/${id}`, {
    method: 'DELETE',
  }),
}

// Task Management APIs
export const taskApi = {
  getAll: () => apiCall('/tasks'),
  getById: (id: number) => apiCall(`/tasks/${id}`),
  create: (data: any) => apiCall('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiCall(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiCall(`/tasks/${id}`, {
    method: 'DELETE',
  }),
}

// Time Entry Management APIs
export const timeEntryApi = {
  getAll: () => apiCall('/time_entries'),
  getById: (id: number) => apiCall(`/time_entries/${id}`),
  create: (data: any) => apiCall('/time_entries', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiCall(`/time_entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  stop: (id: number) => apiCall(`/time_entries/${id}/stop`, {
    method: 'POST',
    body: JSON.stringify({}),
  }),
  delete: (id: number) => apiCall(`/time_entries/${id}`, {
    method: 'DELETE',
  }),
}

// Screenshot Management APIs
export const screenshotApi = {
  getAll: () => apiCall('/screenshots'),
  getById: (id: number) => apiCall(`/screenshots/${id}`),
  delete: (id: number) => apiCall(`/screenshots/${id}`, {
    method: 'DELETE',
  }),
}

// Analytics APIs
export const analyticsApi = {
  getDashboardStats: async () => {
    const [employees, projects, timeEntries, screenshots] = await Promise.all([
      employeeApi.getAll(),
      projectApi.getAll(),
      timeEntryApi.getAll(),
      screenshotApi.getAll(),
    ])

    const activeEmployees = employees.success 
      ? employees.data.filter((emp: any) => emp.is_active && emp.is_activated).length
      : 0

    const activeTimeEntries = timeEntries.success
      ? timeEntries.data.filter((entry: any) => entry.is_active).length
      : 0

    const totalHours = timeEntries.success
      ? timeEntries.data.reduce((sum: number, entry: any) => 
          sum + (entry.duration_seconds || 0), 0) / 3600
      : 0

    return {
      success: true,
      data: {
        totalEmployees: employees.success ? employees.data.length : 0,
        activeEmployees,
        totalProjects: projects.success ? projects.data.length : 0,
        activeTimeEntries,
        totalHours: Math.round(totalHours * 10) / 10,
        totalScreenshots: screenshots.success ? screenshots.data.length : 0,
      }
    }
  },

  getTimeTrackingStats: async () => {
    const response = await timeEntryApi.getAll()
    if (!response.success) return response

    const entries = response.data
    const today = new Date().toISOString().split('T')[0]
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const todayEntries = entries.filter((entry: any) => 
      entry.start_time.startsWith(today))
    
    const weekEntries = entries.filter((entry: any) => 
      entry.start_time >= lastWeek)

    const todayHours = todayEntries.reduce((sum: number, entry: any) => 
      sum + (entry.duration_seconds || 0), 0) / 3600

    const weekHours = weekEntries.reduce((sum: number, entry: any) => 
      sum + (entry.duration_seconds || 0), 0) / 3600

    return {
      success: true,
      data: {
        todayHours: Math.round(todayHours * 10) / 10,
        weekHours: Math.round(weekHours * 10) / 10,
        todayEntries: todayEntries.length,
        weekEntries: weekEntries.length,
        activeNow: entries.filter((entry: any) => entry.is_active).length,
      }
    }
  }
}
