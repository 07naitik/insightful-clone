import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Database, 
  Shield, 
  Bell, 
  Users, 
  Camera, 
  Server,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SystemSettings {
  general: {
    companyName: string
    timezone: string
    dateFormat: string
    enableNotifications: boolean
  }
  security: {
    sessionTimeout: number
    requireStrongPasswords: boolean
    enableTwoFactor: boolean
    allowRemoteAccess: boolean
  }
  monitoring: {
    screenshotInterval: number
    enableScreenshots: boolean
    enableActivityLogging: boolean
    enableIpTracking: boolean
  }
  notifications: {
    emailNotifications: boolean
    slackIntegration: boolean
    webhookUrl: string
    notifyOnLogin: boolean
    notifyOnTimeStart: boolean
  }
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      companyName: 'Insightful Time Tracking',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      enableNotifications: true
    },
    security: {
      sessionTimeout: 24,
      requireStrongPasswords: true,
      enableTwoFactor: false,
      allowRemoteAccess: true
    },
    monitoring: {
      screenshotInterval: 10,
      enableScreenshots: true,
      enableActivityLogging: true,
      enableIpTracking: true
    },
    notifications: {
      emailNotifications: true,
      slackIntegration: false,
      webhookUrl: '',
      notifyOnLogin: true,
      notifyOnTimeStart: true
    }
  })

  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'monitoring' | 'notifications'>('general')
  const [showWebhookUrl, setShowWebhookUrl] = useState(false)
  const [systemStatus, setSystemStatus] = useState({
    database: 'connected',
    api: 'online',
    screenshots: 'active',
    storage: 'healthy'
  })

  const handleSave = async () => {
    try {
      // In a real app, this would save to backend
      localStorage.setItem('adminSettings', JSON.stringify(settings))
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      // Reset to defaults
      setSettings({
        general: {
          companyName: 'Insightful Time Tracking',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          enableNotifications: true
        },
        security: {
          sessionTimeout: 24,
          requireStrongPasswords: true,
          enableTwoFactor: false,
          allowRemoteAccess: true
        },
        monitoring: {
          screenshotInterval: 10,
          enableScreenshots: true,
          enableActivityLogging: true,
          enableIpTracking: true
        },
        notifications: {
          emailNotifications: true,
          slackIntegration: false,
          webhookUrl: '',
          notifyOnLogin: true,
          notifyOnTimeStart: true
        }
      })
      toast.success('Settings reset to defaults')
    }
  }

  const testConnection = async (service: string) => {
    toast.loading(`Testing ${service} connection...`, { id: 'test' })
    
    // Simulate API call
    setTimeout(() => {
      toast.success(`${service} connection successful`, { id: 'test' })
    }, 1500)
  }

  useEffect(() => {
    // Load settings from localStorage if available
    const savedSettings = localStorage.getItem('adminSettings')
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error('Failed to load saved settings:', error)
      }
    }
  }, [])

  const tabs = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'monitoring', label: 'Monitoring', icon: Camera },
    { key: 'notifications', label: 'Notifications', icon: Bell }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure system behavior and preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="btn btn-secondary flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Database className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-900">Database</p>
                <p className="text-xs text-green-700">Connected</p>
              </div>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Server className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-900">API Service</p>
                <p className="text-xs text-green-700">Online</p>
              </div>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <Camera className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-900">Screenshots</p>
                <p className="text-xs text-blue-700">Active</p>
              </div>
            </div>
            <Info className="h-5 w-5 text-blue-500" />
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Database className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-900">Storage</p>
                <p className="text-xs text-green-700">Healthy</p>
              </div>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`w-full flex items-center px-3 py-2 text-left rounded-md transition-colors ${
                      activeTab === tab.key
                        ? 'bg-primary-100 text-primary-700 border-primary-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.general.companyName}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, companyName: e.target.value }
                      }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">This will appear in reports and notifications</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      className="input"
                      value={settings.general.timezone}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, timezone: e.target.value }
                      }))}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select
                      className="input"
                      value={settings.general.dateFormat}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, dateFormat: e.target.value }
                      }))}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableNotifications"
                      className="mr-3"
                      checked={settings.general.enableNotifications}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, enableNotifications: e.target.checked }
                      }))}
                    />
                    <label htmlFor="enableNotifications" className="text-sm text-gray-700">
                      Enable system notifications
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      className="input"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                      }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Users will be logged out after this period of inactivity</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireStrongPasswords"
                        className="mr-3"
                        checked={settings.security.requireStrongPasswords}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, requireStrongPasswords: e.target.checked }
                        }))}
                      />
                      <label htmlFor="requireStrongPasswords" className="text-sm text-gray-700">
                        Require strong passwords
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableTwoFactor"
                        className="mr-3"
                        checked={settings.security.enableTwoFactor}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, enableTwoFactor: e.target.checked }
                        }))}
                      />
                      <label htmlFor="enableTwoFactor" className="text-sm text-gray-700">
                        Enable two-factor authentication
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowRemoteAccess"
                        className="mr-3"
                        checked={settings.security.allowRemoteAccess}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, allowRemoteAccess: e.target.checked }
                        }))}
                      />
                      <label htmlFor="allowRemoteAccess" className="text-sm text-gray-700">
                        Allow remote access
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Monitoring Settings */}
            {activeTab === 'monitoring' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Monitoring Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Screenshot Interval (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      className="input"
                      value={settings.monitoring.screenshotInterval}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        monitoring: { ...prev.monitoring, screenshotInterval: parseInt(e.target.value) }
                      }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">How often to capture screenshots during active sessions</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableScreenshots"
                        className="mr-3"
                        checked={settings.monitoring.enableScreenshots}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          monitoring: { ...prev.monitoring, enableScreenshots: e.target.checked }
                        }))}
                      />
                      <label htmlFor="enableScreenshots" className="text-sm text-gray-700">
                        Enable automatic screenshots
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableActivityLogging"
                        className="mr-3"
                        checked={settings.monitoring.enableActivityLogging}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          monitoring: { ...prev.monitoring, enableActivityLogging: e.target.checked }
                        }))}
                      />
                      <label htmlFor="enableActivityLogging" className="text-sm text-gray-700">
                        Enable activity logging
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableIpTracking"
                        className="mr-3"
                        checked={settings.monitoring.enableIpTracking}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          monitoring: { ...prev.monitoring, enableIpTracking: e.target.checked }
                        }))}
                      />
                      <label htmlFor="enableIpTracking" className="text-sm text-gray-700">
                        Enable IP address tracking
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h3>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="emailNotifications"
                        className="mr-3"
                        checked={settings.notifications.emailNotifications}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, emailNotifications: e.target.checked }
                        }))}
                      />
                      <label htmlFor="emailNotifications" className="text-sm text-gray-700">
                        Enable email notifications
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="slackIntegration"
                        className="mr-3"
                        checked={settings.notifications.slackIntegration}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, slackIntegration: e.target.checked }
                        }))}
                      />
                      <label htmlFor="slackIntegration" className="text-sm text-gray-700">
                        Enable Slack integration
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Webhook URL
                    </label>
                    <div className="relative">
                      <input
                        type={showWebhookUrl ? 'text' : 'password'}
                        className="input pr-10"
                        value={settings.notifications.webhookUrl}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, webhookUrl: e.target.value }
                        }))}
                        placeholder="https://hooks.slack.com/services/..."
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                      >
                        {showWebhookUrl ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">URL for sending webhook notifications</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="notifyOnLogin"
                        className="mr-3"
                        checked={settings.notifications.notifyOnLogin}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, notifyOnLogin: e.target.checked }
                        }))}
                      />
                      <label htmlFor="notifyOnLogin" className="text-sm text-gray-700">
                        Notify on user login
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="notifyOnTimeStart"
                        className="mr-3"
                        checked={settings.notifications.notifyOnTimeStart}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, notifyOnTimeStart: e.target.checked }
                        }))}
                      />
                      <label htmlFor="notifyOnTimeStart" className="text-sm text-gray-700">
                        Notify when time tracking starts
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => testConnection('notification')}
                      className="btn btn-secondary"
                    >
                      Test Notification Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Test Buttons */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Diagnostics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => testConnection('Database')}
            className="btn btn-secondary flex items-center justify-center"
          >
            <Database className="h-4 w-4 mr-2" />
            Test Database
          </button>
          <button
            onClick={() => testConnection('API')}
            className="btn btn-secondary flex items-center justify-center"
          >
            <Server className="h-4 w-4 mr-2" />
            Test API
          </button>
          <button
            onClick={() => testConnection('Screenshot Service')}
            className="btn btn-secondary flex items-center justify-center"
          >
            <Camera className="h-4 w-4 mr-2" />
            Test Screenshots
          </button>
          <button
            onClick={() => testConnection('Storage')}
            className="btn btn-secondary flex items-center justify-center"
          >
            <Database className="h-4 w-4 mr-2" />
            Test Storage
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
