import React, { useState, useEffect } from 'react'
import './Timer.css'

interface TimeEntry {
  id: number
  start_time: string
  end_time?: string
  is_active: boolean
  duration_seconds: number
}

interface TimerProps {
  isTracking: boolean
  currentTimeEntry: TimeEntry | null
  onStart: () => void
  onStop: () => void
  disabled: boolean
}

const Timer: React.FC<TimerProps> = ({
  isTracking,
  currentTimeEntry,
  onStart,
  onStop,
  disabled
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isTracking && currentTimeEntry) {
      // Calculate initial elapsed time
      const startTime = new Date(currentTimeEntry.start_time).getTime()
      const now = Date.now()
      const initialElapsed = Math.floor((now - startTime) / 1000)
      setElapsedSeconds(initialElapsed)

      // Update timer every second
      interval = setInterval(() => {
        const currentTime = Date.now()
        const elapsed = Math.floor((currentTime - startTime) / 1000)
        setElapsedSeconds(elapsed)
      }, 1000)
    } else {
      setElapsedSeconds(0)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isTracking, currentTimeEntry])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="timer-container">
      <div className="timer-display">
        <div className="time-value">
          {formatTime(elapsedSeconds)}
        </div>
        <div className="timer-status">
          {isTracking ? 'Tracking Time' : 'Not Tracking'}
        </div>
      </div>

      {currentTimeEntry && (
        <div className="timer-info">
          <div className="start-time">
            Started: {formatDate(currentTimeEntry.start_time)}
          </div>
        </div>
      )}

      <div className="timer-controls">
        {!isTracking ? (
          <button
            className="start-button"
            onClick={onStart}
            disabled={disabled}
            title={disabled ? 'Please select a project and task first' : 'Start tracking time'}
          >
            <span className="button-icon">▶</span>
            Start
          </button>
        ) : (
          <button
            className="stop-button"
            onClick={onStop}
          >
            <span className="button-icon">⏹</span>
            Stop
          </button>
        )}
      </div>

      {isTracking && (
        <div className="tracking-indicator">
          <div className="pulse-dot"></div>
          <span>Recording active</span>
        </div>
      )}
    </div>
  )
}

export default Timer
