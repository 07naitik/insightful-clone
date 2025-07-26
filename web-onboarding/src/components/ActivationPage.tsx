import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import DownloadSection from './DownloadSection'
import './ActivationPage.css'

interface Employee {
  id: number
  name: string
  email: string
  is_active: boolean
  is_activated: boolean
  created_at: string
}

interface ActivationState {
  loading: boolean
  success: boolean
  error: string
  employee: Employee | null
}

const ActivationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<ActivationState>({
    loading: true,
    success: false,
    error: '',
    employee: null
  })

  // API base URL - configurable via environment variables
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

  useEffect(() => {
    if (token) {
      activateEmployee(token)
    } else {
      setState({
        loading: false,
        success: false,
        error: 'Invalid activation link. No token provided.',
        employee: null
      })
    }
  }, [token])

  const activateEmployee = async (activationToken: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: '' }))

      // Call the backend activation endpoint
      const response = await axios.post(`${API_BASE_URL}/employees/activate`, {
        token: activationToken
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      })

      const employee: Employee = response.data

      setState({
        loading: false,
        success: true,
        error: '',
        employee
      })

    } catch (error) {
      let errorMessage = 'Account activation failed. Please try again or contact support.'

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 422) {
          errorMessage = 'Invalid or already used activation token.'
        } else if (error.response?.status === 404) {
          errorMessage = 'Activation token not found.'
        } else if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Unable to connect to server. Please try again later.'
        }
      }

      setState({
        loading: false,
        success: false,
        error: errorMessage,
        employee: null
      })
    }
  }

  const retryActivation = () => {
    if (token) {
      activateEmployee(token)
    }
  }

  if (state.loading) {
    return (
      <div className="activation-page">
        <div className="activation-container">
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <h2>Activating Your Account</h2>
            <p>Please wait while we activate your employee account...</p>
          </div>
        </div>
      </div>
    )
  }

  if (state.success && state.employee) {
    return (
      <div className="activation-page">
        <div className="activation-container">
          <div className="success-section">
            <div className="success-icon">✅</div>
            <h2>Account Activated Successfully!</h2>
            <p>Welcome to the Insightful Time Tracker, <strong>{state.employee.name}</strong>!</p>
            <div className="employee-details">
              <p><strong>Email:</strong> {state.employee.email}</p>
              <p><strong>Account Status:</strong> Active</p>
              <p><strong>Activated:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <DownloadSection />

          <div className="next-steps">
            <h3>Next Steps:</h3>
            <ol>
              <li>Download and install the Insightful Time Tracker application</li>
              <li>Launch the application and sign in with your email address</li>
              <li>Select a project and task to begin tracking your time</li>
              <li>The application will automatically capture screenshots during active tracking</li>
            </ol>
          </div>

          <div className="support-section">
            <h4>Need Help?</h4>
            <p>If you encounter any issues with the installation or login process, please contact your administrator or IT support team.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="activation-page">
      <div className="activation-container">
        <div className="error-section">
          <div className="error-icon">❌</div>
          <h2>Activation Failed</h2>
          <p className="error-message">{state.error}</p>
          
          <div className="error-actions">
            <button 
              className="retry-button"
              onClick={retryActivation}
            >
              Try Again
            </button>
            <button 
              className="contact-button"
              onClick={() => window.location.href = 'mailto:support@company.com'}
            >
              Contact Support
            </button>
          </div>

          <div className="troubleshooting">
            <h4>Troubleshooting:</h4>
            <ul>
              <li>Make sure you're using the latest activation link from your email</li>
              <li>Check that the activation link hasn't expired</li>
              <li>Ensure you have a stable internet connection</li>
              <li>Try refreshing this page and clicking the link again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivationPage
