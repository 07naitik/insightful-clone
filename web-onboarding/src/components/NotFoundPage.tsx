import React from 'react'
import { Link } from 'react-router-dom'
import './NotFoundPage.css'

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-content">
          <div className="error-code">404</div>
          <h1 className="error-title">Page Not Found</h1>
          <p className="error-description">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          
          <div className="error-actions">
            <Link to="/" className="home-button">
              Go to Home
            </Link>
            <button 
              className="back-button"
              onClick={() => window.history.back()}
            >
              Go Back
            </button>
          </div>

          <div className="help-section">
            <h3>Looking for something specific?</h3>
            <ul className="help-links">
              <li>
                <Link to="/">Employee Onboarding Portal</Link>
              </li>
              <li>
                <a href="mailto:support@company.com">Contact Support</a>
              </li>
              <li>
                <a href="#" onClick={() => window.location.reload()}>
                  Refresh Page
                </a>
              </li>
            </ul>
          </div>

          <div className="common-issues">
            <h4>Common Issues:</h4>
            <ul>
              <li>Check if the activation link in your email is complete</li>
              <li>Make sure the URL wasn't truncated when copied</li>
              <li>Try opening the link in a new browser window</li>
              <li>Contact your administrator if the link has expired</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
