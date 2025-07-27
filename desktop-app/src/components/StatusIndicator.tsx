/**
 * Status indicator component showing current work status
 */
import React from 'react'

interface Props {
  status: 'idle' | 'working' | 'paused' | 'offline'
  currentTask?: string
  timeElapsed?: string
}

const StatusIndicator: React.FC<Props> = ({
  status,
  currentTask,
  timeElapsed
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'working':
        return '#10b981' // green
      case 'paused':
        return '#f59e0b' // amber
      case 'offline':
        return '#ef4444' // red
      case 'idle':
      default:
        return '#6b7280' // gray
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'working':
        return 'Working'
      case 'paused':
        return 'Paused'
      case 'offline':
        return 'Offline'
      case 'idle':
      default:
        return 'Idle'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'working':
        return '🟢'
      case 'paused':
        return '🟡'
      case 'offline':
        return '🔴'
      case 'idle':
      default:
        return '⚪'
    }
  }

  const statusIndicatorStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1rem',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '0.875rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease'
  }

  const statusMainStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  }

  const statusDotStyle: React.CSSProperties = {
    width: '0.75rem',
    height: '0.75rem',
    borderRadius: '50%',
    flexShrink: 0,
    backgroundColor: getStatusColor()
  }

  const statusTextStyle: React.CSSProperties = {
    fontWeight: 600,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9em'
  }

  const timeElapsedStyle: React.CSSProperties = {
    marginLeft: 'auto',
    fontWeight: 700,
    color: '#1f2937',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
    fontSize: '1.1em',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px'
  }

  const currentTaskStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    paddingLeft: '1.5rem',
    fontSize: '0.8125rem'
  }

  const taskLabelStyle: React.CSSProperties = {
    color: '#6b7280',
    fontWeight: 500
  }

  const taskNameStyle: React.CSSProperties = {
    color: '#374151',
    fontWeight: 600,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }

  return (
    <div style={statusIndicatorStyle}>
      <div style={statusMainStyle}>
        <div style={statusDotStyle} />
        <span style={statusTextStyle}>
          <span style={{ fontSize: '1.2em', lineHeight: 1 }}>{getStatusIcon()}</span>
          <span>{getStatusText()}</span>
        </span>
        {timeElapsed && (
          <span style={timeElapsedStyle}>
            {timeElapsed}
          </span>
        )}
      </div>
      
      {currentTask && (
        <div style={currentTaskStyle}>
          <span style={taskLabelStyle}>Task:</span>
          <span style={taskNameStyle}>{currentTask}</span>
        </div>
      )}


    </div>
  )
}

export default StatusIndicator
