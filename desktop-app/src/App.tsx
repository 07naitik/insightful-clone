import React, { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ApiProvider } from './contexts/ApiContext'
import { OfflineQueueProvider } from './contexts/OfflineQueueContext'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize app
    const init = async () => {
      try {
        // Check for existing authentication
        const tokenResult = await window.api.auth.getToken()
        if (tokenResult.success && tokenResult.token) {
          // Token exists, will be handled by AuthContext
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    init()
  }, [])

  if (!isInitialized || isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing Insightful Time Tracker...</p>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-title">
          <h1>Insightful Time Tracker</h1>
        </div>
        <div className="window-controls">
          <button 
            className="window-control minimize"
            onClick={() => window.api.window.minimize()}
            title="Minimize"
          >
            −
          </button>
          <button 
            className="window-control maximize"
            onClick={() => window.api.window.maximize()}
            title="Maximize"
          >
            □
          </button>
          <button 
            className="window-control close"
            onClick={() => window.api.window.close()}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
      
      <div className="app-content">
        {isAuthenticated ? <Dashboard /> : <LoginScreen />}
      </div>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ApiProvider>
          <OfflineQueueProvider>
            <AppContent />
          </OfflineQueueProvider>
        </ApiProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
