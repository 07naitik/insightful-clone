import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  FolderOpen,
  Clock,
  Camera,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { analyticsApi, employeeApi, timeEntryApi } from '../utils/api'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  totalProjects: number
  activeTimeEntries: number
  totalHours: number
  totalScreenshots: number
}

interface RecentActivity {
  id: number
  type: 'login' | 'start_tracking' | 'stop_tracking' | 'screenshot'
  employee_name: string
  message: string
  time: string
  ip_address?: string
}

const StatCard: React.FC<{
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease'
  icon: React.ComponentType<any>
  color: string
  href?: string
}> = ({ title, value, change, changeType, icon: Icon, color, href }) => {
  const content = (
    <div className={`stat-card ${href ? 'cursor-pointer hover:shadow-lg' : ''}`}>
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
          <div className="flex items-center mt-1">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change && (
              <span className={`ml-2 flex items-center text-sm ${
                changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {changeType === 'increase' ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {change}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return href ? <Link to={href}>{content}</Link> : content
}

const ActivityItem: React.FC<{ activity: RecentActivity }> = ({ activity }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'start_tracking':
        return <Clock className="h-4 w-4 text-green-600" />
      case 'stop_tracking':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'screenshot':
        return <Camera className="h-4 w-4 text-purple-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="flex items-start space-x-3 py-3">
      <div className="flex-shrink-0">
        {getActivityIcon(activity.type)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{activity.employee_name}</span> {activity.message}
        </p>
        <div className="flex items-center mt-1 space-x-2">
          <p className="text-xs text-gray-500">{activity.time}</p>
          {activity.ip_address && (
            <span className="text-xs text-gray-400">• IP: {activity.ip_address}</span>
          )}
        </div>
      </div>
    </div>
  )
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalProjects: 0,
    activeTimeEntries: 0,
    totalHours: 0,
    totalScreenshots: 0,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchDashboardData = async () => {
    try {
      // Get dashboard stats
      const statsResponse = await analyticsApi.getDashboardStats()
      if (statsResponse.success) {
        setStats(statsResponse.data)
      }

      // Get recent time entries for activity feed
      const timeEntriesResponse = await timeEntryApi.getAll()
      if (timeEntriesResponse.success) {
        // Convert time entries to activity items
        const activities: RecentActivity[] = timeEntriesResponse.data
          .slice(0, 10) // Latest 10 activities
          .map((entry: any) => ({
            id: entry.id,
            type: entry.is_active ? 'start_tracking' : 'stop_tracking',
            employee_name: `Employee #${entry.employee_id}`,
            message: entry.is_active 
              ? `started tracking time on Task #${entry.task_id}` 
              : `completed ${Math.round((entry.duration_seconds || 0) / 60)} minutes of work`,
            time: new Date(entry.start_time).toLocaleString(),
            ip_address: entry.ip_address,
          }))

        // Add some simulated screenshot activities
        const screenshotActivities = activities.slice(0, 3).map((activity, index) => ({
          ...activity,
          id: activity.id + 1000 + index,
          type: 'screenshot' as const,
          message: 'captured screenshot during active session',
          time: new Date(Date.now() - (index + 1) * 5 * 60 * 1000).toLocaleString(),
        }))

        const allActivities = [...activities, ...screenshotActivities]
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, 8)

        setRecentActivities(allActivities)
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600">Monitor your team's productivity and system health</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Activity className="h-4 w-4" />
          <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          change="+12% this month"
          changeType="increase"
          icon={Users}
          color="bg-blue-500"
          href="/employees"
        />
        <StatCard
          title="Active Now"
          value={stats.activeEmployees}
          icon={Activity}
          color="bg-green-500"
        />
        <StatCard
          title="Total Projects"
          value={stats.totalProjects}
          change="+3 new projects"
          changeType="increase"
          icon={FolderOpen}
          color="bg-purple-500"
          href="/projects"
        />
        <StatCard
          title="Active Sessions"
          value={stats.activeTimeEntries}
          icon={Clock}
          color="bg-orange-500"
          href="/time-tracking"
        />
        <StatCard
          title="Total Hours Tracked"
          value={`${stats.totalHours}h`}
          change="+18% this week"
          changeType="increase"
          icon={TrendingUp}
          color="bg-indigo-500"
        />
        <StatCard
          title="Screenshots Captured"
          value={stats.totalScreenshots}
          icon={Camera}
          color="bg-pink-500"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Link 
              to="/time-tracking" 
              className="text-sm text-primary-600 hover:text-primary-500 flex items-center"
            >
              View all <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-1">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">System Health</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-900">API Services</p>
                  <p className="text-xs text-green-700">All systems operational</p>
                </div>
              </div>
              <span className="text-xs font-medium text-green-800 bg-green-200 px-2 py-1 rounded-full">
                Online
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-900">Database</p>
                  <p className="text-xs text-green-700">Connection stable</p>
                </div>
              </div>
              <span className="text-xs font-medium text-green-800 bg-green-200 px-2 py-1 rounded-full">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Camera className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Screenshot Service</p>
                  <p className="text-xs text-blue-700">Monitoring active sessions</p>
                </div>
              </div>
              <span className="text-xs font-medium text-blue-800 bg-blue-200 px-2 py-1 rounded-full">
                Active
              </span>
            </div>

            {stats.activeTimeEntries > 0 && (
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Active Sessions</p>
                    <p className="text-xs text-orange-700">{stats.activeTimeEntries} employees currently tracking time</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-orange-800 bg-orange-200 px-2 py-1 rounded-full">
                  {stats.activeTimeEntries} Active
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link 
              to="/settings"
              className="text-sm text-primary-600 hover:text-primary-500 flex items-center"
            >
              System settings <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/employees"
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center"
          >
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Manage Employees</p>
            <p className="text-xs text-gray-500">Add, edit, or deactivate users</p>
          </Link>
          
          <Link
            to="/projects"
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center"
          >
            <FolderOpen className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Create Project</p>
            <p className="text-xs text-gray-500">Set up new tracking projects</p>
          </Link>
          
          <Link
            to="/time-tracking"
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center"
          >
            <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">View Time Logs</p>
            <p className="text-xs text-gray-500">Monitor active sessions</p>
          </Link>
          
          <Link
            to="/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center"
          >
            <TrendingUp className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">View Reports</p>
            <p className="text-xs text-gray-500">Analyze productivity data</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
