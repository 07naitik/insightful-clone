import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../contexts/ApiContext'
import { useOfflineQueue } from '../contexts/OfflineQueueContext'
import Timer from './Timer'
import ProjectTaskSelector from './ProjectTaskSelector.tsx'
import StatusIndicator from './StatusIndicator.tsx'
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
  const { getProjects, getTasks, getTimeEntries, createTimeEntry, stopTimeEntry, uploadScreenshot } = useApi()
  const { addToQueue } = useOfflineQueue()

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
  
  // Refs to access current state in screenshot listener (avoid closure issues)
  const isTrackingRef = useRef(isTracking)
  const currentTimeEntryRef = useRef(currentTimeEntry)
  const employeeRef = useRef(employee)
  
  // Update refs whenever state changes
  useEffect(() => {
    isTrackingRef.current = isTracking
  }, [isTracking])
  
  useEffect(() => {
    currentTimeEntryRef.current = currentTimeEntry
  }, [currentTimeEntry])
  
  useEffect(() => {
    employeeRef.current = employee
  }, [employee])

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
      
      // Reset all timer state first
      setCurrentTimeEntry(null)
      setIsTracking(false)
      setSelectedProject(null)
      setSelectedTask(null)

      // Load projects
      const projectsData = await getProjects()
      setProjects(projectsData)

      // Only check for active time entry if employee is properly loaded
      if (employee && employee.id) {
        console.log('Loading time entries for employee:', employee.id)
        const timeEntries = await getTimeEntries(employee.id, true)
        const activeEntry = timeEntries.find(entry => entry.is_active)
        
        if (activeEntry) {
          console.log('Found active time entry:', activeEntry)
          setCurrentTimeEntry(activeEntry)
          setIsTracking(true)
          
          // Find and set the associated project and task for the active entry
          const allTasks = await getTasks()
          const task = allTasks.find(t => t.id === activeEntry.task_id)
          if (task) {
            setSelectedTask(task)
            const project = projectsData.find(p => p.id === task.project_id)
            if (project) {
              setSelectedProject(project)
            }
          }
        } else {
          console.log('No active time entry found')
          
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
    console.log('Start tracking - selectedTask:', selectedTask)
    console.log('Start tracking - employee:', employee)
    console.log('Start tracking - selectedProject:', selectedProject)
    
    // More specific validation with better error messages
    if (!employee) {
      setError('Authentication error. Please logout and login again.')
      return
    }
    
    if (!selectedProject) {
      setError('Please select a project before starting')
      return
    }
    
    if (!selectedTask) {
      setError('Please select a task before starting')
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
    console.log('Stop tracking - currentTimeEntry:', currentTimeEntry)
    if (!currentTimeEntry) {
      console.log('Stop tracking - no current time entry, returning')
      return
    }

    try {
      setError('')
      console.log('Stop tracking - attempting to stop time entry:', currentTimeEntry.id)
      
      // Stop the time entry
      await stopTimeEntry(currentTimeEntry.id)
      console.log('Stop tracking - time entry stopped successfully')
      
      setCurrentTimeEntry(null)
      setIsTracking(false)
      
      // Stop screenshot schedule
      await stopScreenshotSchedule()
      console.log('Stop tracking - screenshot schedule stopped')

    } catch (err) {
      console.error('Failed to stop tracking:', err)
      setError('Failed to stop time tracking. Please try again.')
    }
  }

  const startScreenshotSchedule = async () => {
    try {
      console.log('Starting screenshot schedule with interval:', screenshotInterval, 'minutes')
      await window.api.screenshot.startSchedule(screenshotInterval)
      setIsScreenshotScheduled(true)
      console.log('Screenshot schedule started successfully')
    } catch (err) {
      console.error('Failed to start screenshot schedule:', err)
    }
  }

  const stopScreenshotSchedule = async () => {
    try {
      console.log('Stopping screenshot schedule')
      await window.api.screenshot.stopSchedule()
      setIsScreenshotScheduled(false)
      console.log('Screenshot schedule stopped successfully')
    } catch (err) {
      console.error('Failed to stop screenshot schedule:', err)
    }
  }

  const setupScreenshotListener = () => {
    console.log('Setting up screenshot listener')
    window.api.screenshot.onTrigger(async () => {
      const currentIsTracking = isTrackingRef.current
      const currentEntry = currentTimeEntryRef.current
      const currentEmployee = employeeRef.current
      
      console.log('Screenshot trigger received! isTracking:', currentIsTracking, 'currentTimeEntry:', currentEntry, 'employee:', currentEmployee)
      if (currentIsTracking && currentEntry && currentEmployee) {
        let screenshotResult: any = null
        try {
          console.log('Starting screenshot capture process')
          // Capture screenshot
          screenshotResult = await window.api.screenshot.capture()
          console.log('Screenshot capture result:', screenshotResult)
          
          if (screenshotResult.success && screenshotResult.data) {
            // Get current network info
            const networkInfo = await window.api.system.getNetworkInfo()
            
            // Upload screenshot
            await uploadScreenshot(
              screenshotResult.data,
              currentEmployee.id,
              currentEntry.id,
              screenshotResult.permission,
              networkInfo.success ? networkInfo.ipAddress : undefined,
              networkInfo.success ? networkInfo.macAddress : undefined
            )
          }
        } catch (error) {
          console.error('Failed to handle screenshot capture:', error)
          // Add to offline queue if failed
          if (screenshotResult?.success && screenshotResult.data) {
            try {
              const networkInfo = await window.api.system.getNetworkInfo()
              await addToQueue({
                type: 'screenshot_upload',
                data: {
                  imageData: screenshotResult.data,
                  employeeId: currentEmployee.id,
                  timeEntryId: currentEntry.id,
                  permission: screenshotResult.permission,
                  ip: networkInfo.success ? networkInfo.ipAddress : undefined,
                  mac: networkInfo.success ? networkInfo.macAddress : undefined
                },
                maxRetries: 3
              })
              console.log('Screenshot queued for offline upload')
            } catch (queueError) {
              console.error('Failed to queue screenshot for upload:', queueError)
            }
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
            status={isTracking ? 'working' : 'idle'}
            currentTask={selectedTask?.name}
            timeElapsed={isTracking ? '00:00:00' : undefined}
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
            onProjectChange={loadTasksForProject}
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
