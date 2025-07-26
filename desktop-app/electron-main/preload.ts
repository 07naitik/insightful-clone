/**
 * Electron Preload Script
 * Provides secure IPC bridge between main and renderer processes
 */

import { contextBridge, ipcRenderer } from 'electron'

// Define the API interface that will be exposed to the renderer
export interface ElectronAPI {
  // Authentication
  auth: {
    storeToken: (token: string) => Promise<{ success: boolean; error?: string }>
    getToken: () => Promise<{ success: boolean; token?: string; error?: string }>
    removeToken: () => Promise<{ success: boolean; error?: string }>
  }

  // System Information
  system: {
    getNetworkInfo: () => Promise<{
      success: boolean
      ipAddress: string
      macAddress: string
      error?: string
    }>
  }

  // Screenshot Operations
  screenshot: {
    capture: () => Promise<{
      success: boolean
      data?: string
      timestamp?: string
      permission: boolean
      error?: string
    }>
    startSchedule: (intervalMinutes?: number) => Promise<{ success: boolean; error?: string }>
    stopSchedule: () => Promise<{ success: boolean; error?: string }>
    onTrigger: (callback: () => void) => void
    removeAllListeners: (channel: string) => void
  }

  // File System Operations
  fs: {
    showSaveDialog: (options: any) => Promise<any>
  }

  // External Operations
  shell: {
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
  }

  // Window Controls
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
}

// Create the API object with secure IPC methods
const electronAPI: ElectronAPI = {
  // Authentication methods
  auth: {
    storeToken: (token: string) => ipcRenderer.invoke('auth:store-token', token),
    getToken: () => ipcRenderer.invoke('auth:get-token'),
    removeToken: () => ipcRenderer.invoke('auth:remove-token')
  },

  // System information methods
  system: {
    getNetworkInfo: () => ipcRenderer.invoke('system:get-network-info')
  },

  // Screenshot methods
  screenshot: {
    capture: () => ipcRenderer.invoke('screenshot:capture'),
    startSchedule: (intervalMinutes = 5) => ipcRenderer.invoke('screenshot:start-schedule', intervalMinutes),
    stopSchedule: () => ipcRenderer.invoke('screenshot:stop-schedule'),
    onTrigger: (callback: () => void) => {
      ipcRenderer.on('screenshot:trigger', callback)
    },
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel)
    }
  },

  // File system methods
  fs: {
    showSaveDialog: (options: any) => ipcRenderer.invoke('fs:show-save-dialog', options)
  },

  // Shell methods
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url)
  },

  // Window control methods
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  }
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Also expose it as 'api' for convenience
contextBridge.exposeInMainWorld('api', electronAPI)

// Type definitions for the global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI
    api: ElectronAPI
  }
}
