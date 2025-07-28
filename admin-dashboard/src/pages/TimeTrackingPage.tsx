import React, { useState, useEffect } from 'react'
import { 
  Clock, 
  Play, 
  Pause, 
  StopCircle, 
  Search, 
  Filter,
  Calendar,
  User,
  FolderOpen,
  Camera,
  MapPin,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { timeEntryApi, employeeApi, projectApi, taskApi, screenshotApi } from '../utils/api'
import toast from 'react-hot-toast'
// import { format, formatDistanceToNow } from 'date-fns'

interface TimeEntry {
  id: number
  employee_id: number
  task_id: number
  start_time: string
  end_time: string | null
  is_active: boolean
  duration_seconds: number
  ip_address: string | null
  mac_address: string | null
  created_at: string
  updated_at: string | null
}

interface EnrichedTimeEntry extends TimeEntry {
  employee_name?: string
  project_name?: string
  task_name?: string
  duration_formatted?: string
}

interface Screenshot {
  id: number
  time_entry_id: number
  file_url: string
  captured_at: string
}

const TimeTrackingPage: React.FC = () => {
  const [timeEntries, setTimeEntries] = useState<EnrichedTimeEntry[]>([])
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all')
  const [dateFilter, setDateFilter] = useState('today')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'entries' | 'screenshots'>('entries')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchData = async () => {
    try {
      setLoading(true)
      const [entriesRes, screenshotsRes, employeesRes, projectsRes, tasksRes] = await Promise.all([
        timeEntryApi.getAll(),
        screenshotApi.getAll(),
        employeeApi.getAll(),
        projectApi.getAll(),
        taskApi.getAll()
      ])

      if (employeesRes.success) setEmployees(employeesRes.data)
      if (projectsRes.success) setProjects(projectsRes.data)
      if (tasksRes.success) setTasks(tasksRes.data)
      if (screenshotsRes.success) setScreenshots(screenshotsRes.data)

      if (entriesRes.success) {
        // Enrich time entries with related data
        const enrichedEntries: EnrichedTimeEntry[] = entriesRes.data.map((entry: TimeEntry) => {
          const employee = employeesRes.success ? employeesRes.data.find((e: any) => e.id === entry.employee_id) : null
          const task = tasksRes.success ? tasksRes.data.find((t: any) => t.id === entry.task_id) : null
          const project = projectsRes.success && task ? projectsRes.data.find((p: any) => p.id === task.project_id) : null
          
          const duration = entry.end_time 
            ? entry.duration_seconds
            : Math.floor((new Date().getTime() - new Date(entry.start_time).getTime()) / 1000)
          
          return {
            ...entry,
            employee_name: employee?.name || `Employee #${entry.employee_id}`,
            project_name: project?.name || 'Unknown Project',
            task_name: task?.name || `Task #${entry.task_id}`,
            duration_formatted: formatDuration(duration)
          }
        })
        
        setTimeEntries(enrichedEntries.sort((a, b) => 
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        ))
      }

      setLastUpdate(new Date())
    } catch (error) {
      toast.error('Error loading time tracking data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds for real-time monitoring
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const handleStopTracking = async (entry: EnrichedTimeEntry) => {
    if (!confirm(`Stop time tracking for ${entry.employee_name}?`)) return

    try {
      const response = await timeEntryApi.stop(entry.id)
      if (response.success) {
        toast.success('Time tracking stopped')
        fetchData()
      } else {
        toast.error(response.error || 'Failed to stop tracking')
      }
    } catch (error) {
      toast.error('Error stopping time tracking')
    }
  }

  const filteredEntries = timeEntries.filter(entry => {
    const matchesSearch = 
      entry.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.task_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && entry.is_active) ||
      (filterStatus === 'completed' && !entry.is_active)

    const matchesEmployee = selectedEmployee === 'all' || entry.employee_id.toString() === selectedEmployee

    const entryDate = new Date(entry.start_time)
    const today = new Date()
    const matchesDate = 
      dateFilter === 'all' ||
      (dateFilter === 'today' && entryDate.toDateString() === today.toDateString()) ||
      (dateFilter === 'week' && entryDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === 'month' && entryDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000))

    return matchesSearch && matchesStatus && matchesEmployee && matchesDate
  })

  const activeEntries = timeEntries.filter(e => e.is_active)
  const totalHoursToday = timeEntries
    .filter(e => new Date(e.start_time).toDateString() === new Date().toDateString())
    .reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 3600

  const exportData = () => {
    const csv = [
      ['Employee', 'Project', 'Task', 'Start Time', 'End Time', 'Duration', 'Status', 'IP Address', 'MAC Address'],
      ...filteredEntries.map(entry => [
        entry.employee_name,
        entry.project_name,
        entry.task_name,
        format(new Date(entry.start_time), 'yyyy-MM-dd HH:mm:ss'),
        entry.end_time ? format(new Date(entry.end_time), 'yyyy-MM-dd HH:mm:ss') : 'Active',
        entry.duration_formatted,
        entry.is_active ? 'Active' : 'Completed',
        entry.ip_address || 'N/A',
        entry.mac_address || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'time-entries.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Time entries exported')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Tracking Monitor</h1>
          <p className="text-gray-600">Real-time monitoring of employee time tracking and screenshots</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="btn btn-secondary flex items-center"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="btn btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <Play className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Active Now</h3>
              <div className="flex items-center mt-1">
                <p className="text-2xl font-semibold text-gray-900">{activeEntries.length}</p>
                <div className="ml-2 flex">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Today's Hours</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {Math.round(totalHoursToday * 10) / 10}h
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500">
              <User className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Employees Tracked</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(timeEntries.map(e => e.employee_id)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-pink-500">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Screenshots</h3>
              <p className="text-2xl font-semibold text-gray-900">{screenshots.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('entries')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'entries'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="h-4 w-4 inline-block mr-2" />
            Time Entries ({filteredEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('screenshots')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'screenshots'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Camera className="h-4 w-4 inline-block mr-2" />
            Screenshots ({screenshots.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search entries..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>

          <select
            className="input"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="all">All Employees</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <div className="flex items-center text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 mr-1" />
            Updated: {lastUpdate.toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'entries' && (
        <div className="card p-0">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee & Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Started
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.employee_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <FolderOpen className="h-3 w-3 mr-1" />
                            {entry.project_name} → {entry.task_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">
                        {entry.duration_formatted}
                      </div>
                      {entry.is_active && (
                        <div className="text-xs text-gray-500">
                          {Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 60000)}min ago
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.is_active ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        {entry.ip_address && (
                          <div className="flex items-center text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            IP: {entry.ip_address}
                          </div>
                        )}
                        {entry.mac_address && (
                          <div className="text-xs text-gray-400">
                            MAC: {entry.mac_address.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{new Date(entry.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        {entry.end_time && (
                          <div className="text-xs">
                            Ended: {new Date(entry.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {entry.is_active && (
                        <button
                          onClick={() => handleStopTracking(entry)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                          title="Stop tracking"
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                          Stop
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEntries.length === 0 && (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No time entries found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'screenshots' && (
        <div className="card">
          <div className="text-center py-8">
            <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Screenshot Monitoring</h3>
            <p className="text-gray-500 mb-4">
              Screenshots are automatically captured during active time tracking sessions
            </p>
            <div className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-50 text-blue-700">
              <Camera className="h-4 w-4 mr-2" />
              {screenshots.length} screenshots captured total
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions Alert */}
      {activeEntries.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {activeEntries.length} active session{activeEntries.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-green-600">
                Real-time monitoring enabled
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeTrackingPage
