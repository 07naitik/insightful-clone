/**
 * Electron Main Process
 * Handles window management, IPC, and system-level operations
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import * as keytar from 'keytar'
// Removed screenshot-desktop import - using Electron's native desktopCapturer instead
import * as macaddress from 'macaddress'
import * as os from 'os'
import * as fs from 'fs'

const isDev = process.env.NODE_ENV === 'development'
const KEYTAR_SERVICE = 'insightful-time-tracker'
const KEYTAR_ACCOUNT = 'auth-token'
const TOKEN_FILE = join(os.homedir(), '.insightful-token')

class MainProcess {
  private mainWindow: BrowserWindow | null = null
  private screenshotInterval: NodeJS.Timeout | null = null

  async createWindow(): Promise<void> {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      show: false, // Don't show until ready-to-show
      icon: join(__dirname, '../public/icon.png'),
      webPreferences: {
        nodeIntegration: false, // Security: disable node integration
        contextIsolation: true, // Security: enable context isolation
        enableRemoteModule: false, // Security: disable remote module
        preload: join(__dirname, 'preload.js'), // Load preload script
        webSecurity: true
      }
    })

    // Load the app
    if (isDev) {
      await this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools()
    } else {
      await this.mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
    })

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
      if (this.screenshotInterval) {
        clearInterval(this.screenshotInterval)
      }
    })
  }

  setupIPC(): void {
    // Authentication with WSL fallback
    ipcMain.handle('auth:store-token', async (_, token: string) => {
      try {
        // Try keytar first
        await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, token)
        return { success: true }
      } catch (error) {
        console.error('Keytar failed, using file fallback:', error)
        try {
          // Fallback to file storage for WSL
          fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600 })
          return { success: true }
        } catch (fileError: any) {
          console.error('File storage also failed:', fileError)
          return { success: false, error: fileError.message }
        }
      }
    })

    ipcMain.handle('auth:get-token', async () => {
      try {
        // Try keytar first
        const token = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT)
        return { success: true, token }
      } catch (error) {
        console.error('Keytar failed, using file fallback:', error)
        try {
          // Fallback to file storage for WSL
          if (fs.existsSync(TOKEN_FILE)) {
            const token = fs.readFileSync(TOKEN_FILE, 'utf8')
            return { success: true, token }
          }
          return { success: false, error: 'No token found' }
        } catch (fileError: any) {
          console.error('File storage also failed:', fileError)
          return { success: false, error: fileError.message }
        }
      }
    })

    ipcMain.handle('auth:remove-token', async () => {
      try {
        await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT)
        return { success: true }
      } catch (error) {
        console.error('Failed to remove token:', error)
        return { success: false, error: error.message }
      }
    })

    // System Information
    ipcMain.handle('system:get-network-info', async () => {
      try {
        const networkInterfaces = os.networkInterfaces()
        let ipAddress = '127.0.0.1'
        
        // Get first non-internal IPv4 address
        for (const [name, interfaces] of Object.entries(networkInterfaces)) {
          if (interfaces) {
            for (const iface of interfaces) {
              if (iface.family === 'IPv4' && !iface.internal) {
                ipAddress = iface.address
                break
              }
            }
          }
        }

        // Get MAC address
        const macAddress = await new Promise<string>((resolve, reject) => {
          macaddress.one((err: Error | null, mac: string) => {
            if (err) reject(err)
            else resolve(mac)
          })
        })

        return {
          success: true,
          ipAddress,
          macAddress
        }
      } catch (error) {
        console.error('Failed to get network info:', error)
        return {
          success: false,
          error: error.message,
          ipAddress: '127.0.0.1',
          macAddress: '00:00:00:00:00:00'
        }
      }
    })

    // Screenshot Capture using Electron's native desktopCapturer
    ipcMain.handle('screenshot:capture', async () => {
      try {
        const { desktopCapturer } = await import('electron')
        
        console.log('Starting screenshot capture...')
        
        // Get available sources (screens and windows) with larger thumbnails
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 1920, height: 1080 },
          fetchWindowIcons: false
        })
        
        console.log('Found', sources.length, 'sources:')
        sources.forEach((source, index) => {
          console.log(`Source ${index}:`, source.name, 'id:', source.id)
        })
        
        if (sources.length === 0) {
          throw new Error('No displays found')
        }

        // Try to find the best screen source (prefer screen over window)
        let bestSource = sources.find(source => source.name.includes('Entire screen') || source.name.includes('Screen')) || sources[0]
        
        console.log('Using source:', bestSource.name, 'id:', bestSource.id)
        
        // Get the thumbnail
        const thumbnail = bestSource.thumbnail
        
        // Check if thumbnail is empty (black)
        const isEmpty = thumbnail.isEmpty()
        console.log('Thumbnail empty?', isEmpty, 'size:', thumbnail.getSize())
        
        if (isEmpty) {
          console.log('Thumbnail is empty, trying alternative sources...')
          // Try other sources if the first one is empty
          for (let i = 1; i < sources.length; i++) {
            const altSource = sources[i]
            console.log('Trying alternative source:', altSource.name)
            const altThumbnail = altSource.thumbnail
            if (!altThumbnail.isEmpty()) {
              bestSource = altSource
              console.log('Found non-empty source:', bestSource.name)
              break
            }
          }
        }
        
        // Convert to PNG buffer
        const buffer = bestSource.thumbnail.toPNG()
        
        // Convert buffer to base64
        const base64 = buffer.toString('base64')
        
        console.log('Screenshot captured successfully')
        console.log('- Source:', bestSource.name)
        console.log('- Buffer size:', buffer.length, 'bytes')
        console.log('- Base64 length:', base64.length)
        console.log('- Thumbnail size:', bestSource.thumbnail.getSize())
        
        return {
          success: true,
          data: base64,
          timestamp: new Date().toISOString(),
          permission: true,
          source: bestSource.name,
          size: bestSource.thumbnail.getSize()
        }
      } catch (error) {
        console.error('Failed to capture screenshot:', error)
        return {
          success: false,
          error: error.message,
          permission: false
        }
      }
    })

    // Screenshot Scheduling
    ipcMain.handle('screenshot:start-schedule', async (_, intervalMinutes: number = 5) => {
      try {
        if (this.screenshotInterval) {
          clearInterval(this.screenshotInterval)
        }

        this.screenshotInterval = setInterval(() => {
          this.mainWindow?.webContents.send('screenshot:trigger')
        }, intervalMinutes * 60 * 1000)

        return { success: true }
      } catch (error) {
        console.error('Failed to start screenshot schedule:', error)
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('screenshot:stop-schedule', async () => {
      try {
        if (this.screenshotInterval) {
          clearInterval(this.screenshotInterval)
          this.screenshotInterval = null
        }
        return { success: true }
      } catch (error) {
        console.error('Failed to stop screenshot schedule:', error)
        return { success: false, error: error.message }
      }
    })

    // File System Operations
    ipcMain.handle('fs:show-save-dialog', async (_, options) => {
      try {
        const result = await dialog.showSaveDialog(this.mainWindow!, options)
        return result
      } catch (error) {
        console.error('Failed to show save dialog:', error)
        return { canceled: true, error: error.message }
      }
    })

    // External Links
    ipcMain.handle('shell:open-external', async (_, url: string) => {
      try {
        await shell.openExternal(url)
        return { success: true }
      } catch (error) {
        console.error('Failed to open external URL:', error)
        return { success: false, error: error.message }
      }
    })

    // Window Controls
    ipcMain.handle('window:minimize', () => {
      this.mainWindow?.minimize()
    })

    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize()
      } else {
        this.mainWindow?.maximize()
      }
    })

    ipcMain.handle('window:close', () => {
      this.mainWindow?.close()
    })
  }

  async initialize(): Promise<void> {
    // Handle app events
    app.whenReady().then(() => {
      this.setupIPC()
      this.createWindow()
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.createWindow()
      }
    })

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.on('new-window', (navigationEvent) => {
        navigationEvent.preventDefault()
      })

      contents.setWindowOpenHandler(() => {
        return { action: 'deny' }
      })
    })
  }
}

// Initialize the main process
const mainProcess = new MainProcess()
mainProcess.initialize().catch(console.error)
