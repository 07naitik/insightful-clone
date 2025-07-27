import React from 'react'
import './HomePage.css'

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Insightful Time Tracker</h1>
          <p className="hero-subtitle">
            Professional time tracking and productivity monitoring for remote teams
          </p>
          <div className="hero-features">
            <div className="feature">
              <div className="feature-icon">⏱️</div>
              <h3>Accurate Time Tracking</h3>
              <p>Track your work hours with precision across multiple projects and tasks</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📸</div>
              <h3>Automatic Screenshots</h3>
              <p>Visual proof of work with configurable screenshot intervals</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📊</div>
              <h3>Detailed Reports</h3>
              <p>Comprehensive productivity analytics and time reports</p>
            </div>
          </div>
        </div>
      </div>

      <div className="activation-info">
        <div className="info-card">
          <h2>Employee Activation</h2>
          <p>
            If you received an activation email from your administrator, 
            click the activation link in that email to set up your account.
          </p>
          <div className="activation-steps">
            <div className="step">
              <span className="step-number">1</span>
              <span>Check your email for the activation link</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span>Click the activation link to verify your account</span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span>Download and install the desktop application</span>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <span>Start tracking your time and productivity</span>
            </div>
          </div>
        </div>

        <div className="download-preview">
          <h3>Desktop Application</h3>
          <p>Available for Windows, macOS, and Linux</p>
          <div className="platform-icons">
            <div className="platform">
              <div className="platform-icon">🪟</div>
              <span>Windows</span>
            </div>
            <div className="platform">
              <div className="platform-icon">🍎</div>
              <span>macOS</span>
            </div>
            <div className="platform">
              <div className="platform-icon">🐧</div>
              <span>Linux</span>
            </div>
          </div>
        </div>
      </div>

      <div className="support-section">
        <h2>Need Help?</h2>
        <div className="support-options">
          <div className="support-option">
            <h4>Haven't received your activation email?</h4>
            <p>Check your spam folder or contact your administrator to resend the invitation.</p>
          </div>
          <div className="support-option">
            <h4>Technical Issues?</h4>
            <p>Contact your IT support team for assistance with installation or setup.</p>
          </div>
          <div className="support-option">
            <h4>Questions about time tracking?</h4>
            <p>Refer to the user guide or contact your project manager for guidance.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
