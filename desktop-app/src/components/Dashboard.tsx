import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../contexts/ApiContext'
import { useOfflineQueue } from '../contexts/OfflineQueueContext'
import Timer from './Timer'
import ProjectTaskSelector from './ProjectTaskSelector'
import StatusIndicator from './StatusIndicator'
import './Dashboard.css'

interface Project {
  id: number
  name: string
  description?: string
}

interface Task {
  id: number
  name: string
  project_id: number
}

interface TimeEntry {
  id: number
  employee_id: number
  task_id: number
  start_time: string
  end_time?: string
  is_active: boolean
  duration_seconds: number
}

const Dashboard: React.FC = () => {
  const { employee, logout } = useAuth()
  const { getProjects, getTasks, getTimeEntries, createTimeEntry, stopTimeEntry } = useApi()
  const { isOnline, queueSize, processQueue } = useOfflineQueue()

  // State management
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [currentTimeEntry, setCurrentTimeEntry] = useState<TimeEntry | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Screenshot management
  const [screenshotInterval, setScreenshotInterval] = useState<number>(5) // minutes
  const [isScreenshotScheduled, setIsScreenshotScheduled] = useState(false)

  useEffect(() => {
    loadInitialData()
    setupScreenshotListener()

    return () => {
      // Clean up screenshot listener
      window.api.screenshot.removeAllListeners('screenshot:trigger')
    }
  }, [])

  useEffect(() => {
    // Load tasks when project changes
    if (selectedProject) {
      loadTasksForProject(selectedProject.id)
    }
  }, [selectedProject])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load projects
      const projectsData = await getProjects()
      setProjects(projectsData)

      // Check for active time entry
      if (employee) {
        const timeEntries = await getTimeEntries(employee.id, true)
        const activeEntry = timeEntries.find(entry => entry.is_active)
        
        if (activeEntry) {
          setCurrentTimeEntry(activeEntry)
          setIsTracking(true)
          
          // Find and set the associated project and task
          const allTasks = await getTasks()
          const task = allTasks.find(t => t.id === activeEntry.task_id)
          if (task) {
            setSelectedTask(task)
            const project = projectsData.find(p => p.id === task.project_id)
            if (project) {
              setSelectedProject(project)
            }
          }
          
          // Start screenshot schedule if tracking
          await startScreenshotSchedule()
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err)
      setError('Failed to load data. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const loadTasksForProject = async (projectId: number) => {
    try {
      const tasksData = await getTasks(projectId)
      setTasks(tasksData)
      
      // Clear selected task if it doesn't belong to the new project
      if (selectedTask && selectedTask.project_id !== projectId) {
        setSelectedTask(null)
      }
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setError('Failed to load tasks for selected project')
    }
  }

  const startTracking = async () => {
    if (!selectedTask || !employee) {
      setError('Please select a project and task before starting')
      return
    }

    try {
      setError('')
      
      // Get network information
      const networkInfo = await window.api.system.getNetworkInfo()
      
      // Create time entry
      const timeEntry = await createTimeEntry(
        selectedTask.id,
        networkInfo.success ? networkInfo.ipAddress : undefined,
        networkInfo.success ? networkInfo.macAddress : undefined
      )

      setCurrentTimeEntry(timeEntry)
      setIsTracking(true)
      
      // Start screenshot schedule
      await startScreenshotSchedule()

    } catch (err) {
      console.error('Failed to start tracking:', err)
      setError('Failed to start time tracking. Please try again.')
    }
  }

  const stopTracking = async () => {
    if (!currentTimeEntry) return

    try {
      setError('')
      
      // Stop the time entry
      const updatedEntry = await stopTimeEntry(currentTimeEntry.id)
      
      setCurrentTimeEntry(null)
      setIsTracking(false)
      
      // Stop screenshot schedule
      await stopScreenshotSchedule()

    } catch (err) {
      console.error('Failed to stop tracking:', err)
      setError('Failed to stop time tracking. Please try again.')
    }
  }

  const startScreenshotSchedule = async () => {
    try {
      await window.api.screenshot.startSchedule(screenshotInterval)
      setIsScreenshotScheduled(true)
    } catch (err) {
      console.error('Failed to start screenshot schedule:', err)
    }
  }

  const stopScreenshotSchedule = async () => {
    try {
      await window.api.screenshot.stopSchedule()
      setIsScreenshotScheduled(false)
    } catch (err) {
      console.error('Failed to stop screenshot schedule:', err)
    }
  }

  const setupScreenshotListener = () => {
    window.api.screenshot.onTrigger(async () => {
      if (isTracking && currentTimeEntry && employee) {
        try {
          // Capture screenshot
          const screenshotResult = await window.api.screenshot.capture()
          
          if (screenshotResult.success && screenshotResult.data) {
            // Get current network info
            const networkInfo = await window.api.system.getNetworkInfo()
            
            // Upload screenshot (or queue if offline)
            const { uploadScreenshot } = useApi()
            await uploadScreenshot(
              screenshotResult.data,
              employee.id,
              currentTimeEntry.id,
              screenshotResult.permission,
              networkInfo.success ? networkInfo.ipAddress : undefined,
              networkInfo.success ? networkInfo.macAddress : undefined
            )
          }
        } catch (error) {
          console.error('Failed to handle screenshot capture:', error)
          // Add to offline queue if failed
          const { addToQueue } = useOfflineQueue()
          if (screenshotResult.success && screenshotResult.data) {
            const networkInfo = await window.api.system.getNetworkInfo()
            await addToQueue({
              type: 'screenshot_upload',
              data: {
                imageData: screenshotResult.data,
                employeeId: employee.id,
                timeEntryId: currentTimeEntry.id,
                permission: screenshotResult.permission,
                ip: networkInfo.success ? networkInfo.ipAddress : undefined,
                mac: networkInfo.success ? networkInfo.macAddress : undefined
              },
              maxRetries: 3
            })
          }
        }
      }
    })
  }

  const handleLogout = async () => {
    // Stop tracking if active
    if (isTracking) {
      await stopTracking()
    }
    
    await logout()
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Welcome, {employee?.name}</h2>
          <p>{employee?.email}</p>
        </div>
        <div className="header-actions">
          <StatusIndicator 
            isOnline={isOnline} 
            queueSize={queueSize}
            isTracking={isTracking}
            onProcessQueue={processQueue}
          />
          <button 
            className="logout-button"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="dashboard-content">
        <div className="tracking-section">
          <ProjectTaskSelector
            projects={projects}
            tasks={tasks}
            selectedProject={selectedProject}
            selectedTask={selectedTask}
            onProjectSelect={setSelectedProject}
            onTaskSelect={setSelectedTask}
            disabled={isTracking}
          />

          <Timer
            isTracking={isTracking}
            currentTimeEntry={currentTimeEntry}
            onStart={startTracking}
            onStop={stopTracking}
            disabled={!selectedTask}
          />
        </div>

        <div className="settings-section">
          <h3>Screenshot Settings</h3>
          <div className="screenshot-settings">
            <label>
              Interval (minutes):
              <input
                type="number"
                min="1"
                max="60"
                value={screenshotInterval}
                onChange={(e) => setScreenshotInterval(parseInt(e.target.value))}
                disabled={isTracking}
              />
            </label>
            <div className="screenshot-status">
              Status: {isScreenshotScheduled ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
