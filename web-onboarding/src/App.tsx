import React from 'react'
import { Routes, Route } from 'react-router-dom'
import ActivationPage from './components/ActivationPage'
import HomePage from './components/HomePage'
import NotFoundPage from './components/NotFoundPage'
import './App.css'

const App: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <h1 className="app-title">
            <span className="logo">⏱️</span>
            Insightful Time Tracker
          </h1>
          <p className="app-subtitle">Employee Onboarding Portal</p>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/activate/:token" element={<ActivationPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>&copy; 2024 Insightful Time Tracker. All rights reserved.</p>
          <p>Need help? Contact your administrator.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
