import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Users, 
  Clock, 
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell
} from 'recharts'
import { analyticsApi, timeEntryApi, employeeApi, projectApi } from '../utils/api'
// import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import toast from 'react-hot-toast'

interface AnalyticsData {
  totalEmployees: number
  activeEmployees: number
  totalProjects: number
  activeTimeEntries: number
  totalHours: number
  totalScreenshots: number
  todayHours: number
  weekHours: number
  todayEntries: number
  weekEntries: number
  activeNow: number
}

interface ChartData {
  date: string
  hours: number
  sessions: number
  employees: number
}

interface ProjectData {
  name: string
  hours: number
  sessions: number
  color: string
}

interface EmployeeData {
  name: string
  hours: number
  sessions: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [timeSeriesData, setTimeSeriesData] = useState<ChartData[]>([])
  const [projectData, setProjectData] = useState<ProjectData[]>([])
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7days')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Get dashboard stats
      const dashboardStats = await analyticsApi.getDashboardStats()
      const timeStats = await analyticsApi.getTimeTrackingStats()
      
      if (dashboardStats.success && timeStats.success) {
        setAnalytics({
          ...dashboardStats.data,
          ...timeStats.data
        })
      }

      // Get detailed data for charts
      const [timeEntriesRes, employeesRes, projectsRes] = await Promise.all([
        timeEntryApi.getAll(),
        employeeApi.getAll(),
        projectApi.getAll()
      ])

      if (timeEntriesRes.success && employeesRes.success && projectsRes.success) {
        generateChartData(timeEntriesRes.data, employeesRes.data, projectsRes.data)
      }

      setLastUpdate(new Date())
    } catch (error) {
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const generateChartData = (timeEntries: any[], employees: any[], projects: any[]) => {
    const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90
    const chartData: ChartData[] = []
    
    // Generate time series data
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
      
      const dayEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.start_time)
        return entryDate >= dayStart && entryDate <= dayEnd
      })
      
      const totalHours = dayEntries.reduce((sum, entry) => {
        return sum + (entry.duration_seconds || 0)
      }, 0) / 3600

      const uniqueEmployees = new Set(dayEntries.map(e => e.employee_id)).size

      chartData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        hours: Math.round(totalHours * 10) / 10,
        sessions: dayEntries.length,
        employees: uniqueEmployees
      })
    }
    setTimeSeriesData(chartData)

    // Generate project data
    const projectHours: { [key: number]: { hours: number, sessions: number } } = {}
    timeEntries.forEach(entry => {
      // For demo, we'll use task_id as a proxy for project assignment
      const projectId = entry.task_id % 3 + 1 // Simulate 3 projects
      
      if (!projectHours[projectId]) {
        projectHours[projectId] = { hours: 0, sessions: 0 }
      }
      projectHours[projectId].hours += (entry.duration_seconds || 0) / 3600
      projectHours[projectId].sessions += 1
    })

    const projectChartData: ProjectData[] = Object.entries(projectHours)
      .map(([id, data], index) => ({
        name: projects.find(p => p.id == id)?.name || `Project ${id}`,
        hours: Math.round(data.hours * 10) / 10,
        sessions: data.sessions,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8)
    
    setProjectData(projectChartData)

    // Generate employee data
    const employeeHours: { [key: number]: { hours: number, sessions: number } } = {}
    timeEntries.forEach(entry => {
      if (!employeeHours[entry.employee_id]) {
        employeeHours[entry.employee_id] = { hours: 0, sessions: 0 }
      }
      employeeHours[entry.employee_id].hours += (entry.duration_seconds || 0) / 3600
      employeeHours[entry.employee_id].sessions += 1
    })

    const employeeChartData: EmployeeData[] = Object.entries(employeeHours)
      .map(([id, data]) => ({
        name: employees.find(e => e.id == id)?.name || `Employee ${id}`,
        hours: Math.round(data.hours * 10) / 10,
        sessions: data.sessions
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10)
    
    setEmployeeData(employeeChartData)
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      summary: analytics,
      timeSeriesData,
      projectData,
      employeeData
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Analytics report exported')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600">Track productivity metrics and generate insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            className="input w-auto"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="btn btn-secondary flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportReport}
            className="btn btn-primary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-500">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Active Employees</h3>
              <div className="flex items-center mt-1">
                <p className="text-2xl font-semibold text-gray-900">{analytics.activeEmployees}</p>
                <span className="ml-2 flex items-center text-sm text-green-600">
                  <ArrowUpRight className="h-4 w-4" />
                  +{Math.round((analytics.activeEmployees / analytics.totalEmployees) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Total Hours</h3>
              <div className="flex items-center mt-1">
                <p className="text-2xl font-semibold text-gray-900">{analytics.totalHours}h</p>
                <span className="ml-2 flex items-center text-sm text-green-600">
                  <ArrowUpRight className="h-4 w-4" />
                  +18%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Today's Hours</h3>
              <div className="flex items-center mt-1">
                <p className="text-2xl font-semibold text-gray-900">{analytics.todayHours}h</p>
                <span className="ml-2 flex items-center text-sm text-blue-600">
                  <ArrowUpRight className="h-4 w-4" />
                  +{analytics.todayEntries} sessions
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-500">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Avg Daily Hours</h3>
              <div className="flex items-center mt-1">
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round((analytics.weekHours / 7) * 10) / 10}h
                </p>
                <span className="ml-2 flex items-center text-sm text-gray-500">
                  per day
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Tracking Trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Time Tracking Trend</h2>
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              {dateRange === '7days' ? 'Last 7 days' : dateRange === '30days' ? 'Last 30 days' : 'Last 90 days'}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Hours Tracked"
              />
              <Line 
                type="monotone" 
                dataKey="sessions" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Sessions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Employee Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Employee Activity</h2>
            <span className="text-sm text-gray-500">Top performers</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={employeeData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" fill="#3B82F6" name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Project Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Tooltip />
              <RechartsPieChart data={projectData} cx="50%" cy="50%" outerRadius={80}>
                {projectData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </RechartsPieChart>
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {projectData.slice(0, 4).map((project, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: project.color }}
                  ></div>
                  <span className="text-sm text-gray-700">{project.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{project.hours}h</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Performance */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Project Performance</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" fill="#3B82F6" name="Hours" />
              <Bar dataKey="sessions" fill="#10B981" name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performers Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Top Performers</h2>
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours Tracked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Session
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employeeData.slice(0, 5).map((employee, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-medium text-xs">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">{employee.hours}h</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{employee.sessions}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {Math.round((employee.hours / employee.sessions) * 60)}min
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
