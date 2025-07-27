/**
 * Electron IPC API type definitions
 */

interface ElectronAPI {
  auth: {
    storeToken: (token: string) => Promise<{ success: boolean; error?: string }>
    getToken: () => Promise<{ success: boolean; token?: string; error?: string }>
    removeToken: () => Promise<{ success: boolean; error?: string }>
  }
  
  system: {
    getNetworkInfo: () => Promise<{
      success: boolean
      ipAddress: string
      macAddress: string
      error?: string
    }>
  }
  
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
    removeAllListeners: (event: string) => void
  }
  
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  
  fs: {
    showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string; error?: string }>
  }
  
  shell: {
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
