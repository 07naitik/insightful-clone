import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import Dexie, { Table } from 'dexie'

interface QueuedAction {
  id?: number
  type: 'screenshot_upload' | 'time_entry_create' | 'time_entry_update'
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
}

// IndexedDB setup with Dexie
class OfflineDatabase extends Dexie {
  queuedActions!: Table<QueuedAction>

  constructor() {
    super('InsightfulOfflineDB')
    this.version(1).stores({
      queuedActions: '++id, type, timestamp, retryCount'
    })
  }
}

const db = new OfflineDatabase()

interface OfflineQueueContextType {
  isOnline: boolean
  queueSize: number
  addToQueue: (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>
  processQueue: () => Promise<void>
  clearQueue: () => Promise<void>
}

const OfflineQueueContext = createContext<OfflineQueueContextType | undefined>(undefined)

export const useOfflineQueue = () => {
  const context = useContext(OfflineQueueContext)
  if (context === undefined) {
    throw new Error('useOfflineQueue must be used within an OfflineQueueProvider')
  }
  return context
}

interface OfflineQueueProviderProps {
  children: ReactNode
}

export const OfflineQueueProvider: React.FC<OfflineQueueProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueSize, setQueueSize] = useState(0)

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => {
      setIsOnline(true)
      processQueue() // Auto-process queue when coming back online
    }
    
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial queue size check
    updateQueueSize()

    // Auto-process queue every 30 seconds when online
    const intervalId = setInterval(() => {
      if (isOnline) {
        processQueue()
      }
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(intervalId)
    }
  }, [isOnline])

  const updateQueueSize = async () => {
    try {
      const count = await db.queuedActions.count()
      setQueueSize(count)
    } catch (error) {
      console.error('Failed to update queue size:', error)
    }
  }

  const addToQueue = async (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) => {
    try {
      await db.queuedActions.add({
        ...action,
        timestamp: Date.now(),
        retryCount: 0
      })
      await updateQueueSize()
      console.log('Action added to offline queue:', action.type)
    } catch (error) {
      console.error('Failed to add action to queue:', error)
    }
  }

  const processQueue = async () => {
    if (!isOnline) return

    try {
      const queuedActions = await db.queuedActions.orderBy('timestamp').toArray()
      
      for (const action of queuedActions) {
        try {
          await processQueuedAction(action)
          await db.queuedActions.delete(action.id!)
          console.log('Processed queued action:', action.type)
        } catch (error) {
          console.error('Failed to process queued action:', error)
          
          // Increment retry count
          const updatedRetryCount = action.retryCount + 1
          
          if (updatedRetryCount >= action.maxRetries) {
            // Max retries reached, remove from queue
            await db.queuedActions.delete(action.id!)
            console.error('Max retries reached for action, removing from queue:', action.type)
          } else {
            // Update retry count
            await db.queuedActions.update(action.id!, { retryCount: updatedRetryCount })
          }
        }
      }
      
      await updateQueueSize()
    } catch (error) {
      console.error('Failed to process queue:', error)
    }
  }

  const processQueuedAction = async (action: QueuedAction): Promise<void> => {
    const API_BASE_URL = 'http://localhost:8000/api/v1'
    
    // Get current token
    const tokenResult = await window.api.auth.getToken()
    if (!tokenResult.success || !tokenResult.token) {
      throw new Error('No authentication token available')
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${tokenResult.token}`
    }

    switch (action.type) {
      case 'screenshot_upload': {
        const { imageData, employeeId, timeEntryId, permission, ip, mac } = action.data
        
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

        const response = await fetch(`${API_BASE_URL}/screenshots`, {
          method: 'POST',
          headers,
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Screenshot upload failed: ${response.statusText}`)
        }
        break
      }

      case 'time_entry_create': {
        const response = await fetch(`${API_BASE_URL}/time_entries`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(action.data)
        })

        if (!response.ok) {
          throw new Error(`Time entry creation failed: ${response.statusText}`)
        }
        break
      }

      case 'time_entry_update': {
        const { timeEntryId, ...updateData } = action.data
        const response = await fetch(`${API_BASE_URL}/time_entries/${timeEntryId}`, {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          throw new Error(`Time entry update failed: ${response.statusText}`)
        }
        break
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  const clearQueue = async () => {
    try {
      await db.queuedActions.clear()
      await updateQueueSize()
      console.log('Offline queue cleared')
    } catch (error) {
      console.error('Failed to clear queue:', error)
    }
  }

  const value: OfflineQueueContextType = {
    isOnline,
    queueSize,
    addToQueue,
    processQueue,
    clearQueue
  }

  return (
    <OfflineQueueContext.Provider value={value}>
      {children}
    </OfflineQueueContext.Provider>
  )
}
