import React, { useState } from 'react'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api/v1'

const PasswordActivation = ({ token, onSuccess, onError }) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      onError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      onError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    
    try {
      const response = await axios.post(`${API_BASE_URL}/employees/activate`, {
        token: token,
        password: password
      })
      
      onSuccess(response.data)
    } catch (error) {
      onError(error.response?.data?.detail || 'Password activation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="password-form">
      <h3>🔐 Set Your Password</h3>
      <p>Create a secure password for your account:</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Enter your password"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Confirm your password"
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Setting Password...' : 'Activate Account'}
        </button>
      </form>
      
      <div className="password-requirements">
        <h4>Password Requirements:</h4>
        <ul>
          <li>At least 8 characters</li>
          <li>Contains uppercase letter</li>
          <li>Contains lowercase letter</li>
          <li>Contains number</li>
        </ul>
      </div>
    </div>
  )
}

export default PasswordActivation
