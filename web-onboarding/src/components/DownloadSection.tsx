import React, { useState, useEffect } from 'react'
import './DownloadSection.css'

interface DownloadLink {
  platform: string
  icon: string
  filename: string
  size: string
  url: string
}

const DownloadSection: React.FC = () => {
  const [userPlatform, setUserPlatform] = useState<string>('')

  useEffect(() => {
    // Detect user's platform for default download
    const platform = navigator.platform.toLowerCase()
    if (platform.includes('win')) {
      setUserPlatform('windows')
    } else if (platform.includes('mac')) {
      setUserPlatform('macos')
    } else if (platform.includes('linux')) {
      setUserPlatform('linux')
    }
  }, [])

  // In production, these URLs would be actual download links
  const downloadLinks: DownloadLink[] = [
    {
      platform: 'windows',
      icon: '🪟',
      filename: 'InsightfulTimeTracker-Setup.exe',
      size: '45.2 MB',
      url: '/downloads/InsightfulTimeTracker-Setup.exe'
    },
    {
      platform: 'macos',
      icon: '🍎',
      filename: 'InsightfulTimeTracker.dmg',
      size: '52.1 MB',
      url: '/downloads/InsightfulTimeTracker.dmg'
    },
    {
      platform: 'linux',
      icon: '🐧',
      filename: 'InsightfulTimeTracker.AppImage',
      size: '48.7 MB',
      url: '/downloads/InsightfulTimeTracker.AppImage'
    }
  ]

  const handleDownload = (downloadLink: DownloadLink) => {
    // In production, this would trigger the actual download
    // For demo purposes, we'll show an alert
    alert(`Download would start for: ${downloadLink.filename}\n\nIn production, this would download the ${downloadLink.platform} version of the Insightful Time Tracker application.`)
    
    // Uncomment this line for actual downloads:
    // window.location.href = downloadLink.url
  }

  const getPrimaryDownload = () => {
    return downloadLinks.find(link => link.platform === userPlatform) || downloadLinks[0]
  }

  const getSecondaryDownloads = () => {
    return downloadLinks.filter(link => link.platform !== userPlatform)
  }

  return (
    <div className="download-section">
      <h2 className="download-title">Download Insightful Time Tracker</h2>
      <p className="download-subtitle">
        Get started with time tracking by downloading the desktop application
      </p>

      <div className="primary-download">
        {(() => {
          const primaryDownload = getPrimaryDownload()
          return (
            <div className="download-card primary">
              <div className="download-header">
                <span className="download-icon">{primaryDownload.icon}</span>
                <div className="download-info">
                  <h3>Recommended for your system</h3>
                  <p className="download-platform">
                    {primaryDownload.platform.charAt(0).toUpperCase() + primaryDownload.platform.slice(1)}
                  </p>
                </div>
              </div>
              <div className="download-details">
                <span className="download-filename">{primaryDownload.filename}</span>
                <span className="download-size">{primaryDownload.size}</span>
              </div>
              <button 
                className="download-button primary"
                onClick={() => handleDownload(primaryDownload)}
              >
                Download Now
              </button>
            </div>
          )
        })()}
      </div>

      <div className="secondary-downloads">
        <h4>Other Platforms</h4>
        <div className="download-grid">
          {getSecondaryDownloads().map((downloadLink) => (
            <div key={downloadLink.platform} className="download-card secondary">
              <div className="download-header">
                <span className="download-icon">{downloadLink.icon}</span>
                <div className="download-info">
                  <p className="download-platform">
                    {downloadLink.platform.charAt(0).toUpperCase() + downloadLink.platform.slice(1)}
                  </p>
                  <span className="download-size">{downloadLink.size}</span>
                </div>
              </div>
              <button 
                className="download-button secondary"
                onClick={() => handleDownload(downloadLink)}
              >
                Download
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="system-requirements">
        <h4>System Requirements</h4>
        <div className="requirements-grid">
          <div className="requirement-item">
            <h5>Windows</h5>
            <ul>
              <li>Windows 10 or later</li>
              <li>4GB RAM minimum</li>
              <li>200MB free disk space</li>
            </ul>
          </div>
          <div className="requirement-item">
            <h5>macOS</h5>
            <ul>
              <li>macOS 10.14 or later</li>
              <li>4GB RAM minimum</li>
              <li>200MB free disk space</li>
            </ul>
          </div>
          <div className="requirement-item">
            <h5>Linux</h5>
            <ul>
              <li>Ubuntu 18.04+ or equivalent</li>
              <li>4GB RAM minimum</li>
              <li>200MB free disk space</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="installation-help">
        <h4>Installation Instructions</h4>
        <div className="help-steps">
          <div className="help-step">
            <span className="step-number">1</span>
            <div className="step-content">
              <strong>Download</strong> the application for your operating system
            </div>
          </div>
          <div className="help-step">
            <span className="step-number">2</span>
            <div className="step-content">
              <strong>Install</strong> by running the downloaded file and following the setup wizard
            </div>
          </div>
          <div className="help-step">
            <span className="step-number">3</span>
            <div className="step-content">
              <strong>Launch</strong> the application and sign in with your email address
            </div>
          </div>
          <div className="help-step">
            <span className="step-number">4</span>
            <div className="step-content">
              <strong>Start tracking</strong> by selecting a project and clicking the start button
            </div>
          </div>
        </div>
      </div>

      <div className="security-note">
        <h4>🔒 Security & Privacy</h4>
        <p>
          The Insightful Time Tracker application is digitally signed and secure. 
          Screenshots and time data are encrypted during transmission and stored securely.
        </p>
      </div>
    </div>
  )
}

export default DownloadSection
