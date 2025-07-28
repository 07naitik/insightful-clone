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
      titleBarStyle: 'default', // Use default titlebar
      frame: true, // Keep window frame
      transparent: false,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
      title: 'Insightful Time Tracker',
      icon: join(__dirname, '../public/icon.png'),
      webPreferences: {
        nodeIntegration: false, // Security: disable node integration
        contextIsolation: true, // Security: enable context isolation
        preload: join(__dirname, 'preload.js'), // Load preload script
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false
      }
    })

    // Load the app
    if (isDev) {
      await this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools()
    } else {
      await this.mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }

    // Show window immediately (don't wait for ready-to-show)
    this.mainWindow.show()
    console.log('✅ Window should now be visible')
    
    // Also handle ready-to-show as backup
    this.mainWindow.once('ready-to-show', () => {
      console.log('✅ Ready-to-show event fired')
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
    // Token Management with WSL-compatible fallback
    ipcMain.handle('auth:store-token', async (_, token: string) => {
      try {
        await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, token)
        return { success: true }
      } catch (error: any) {
        // Silent fallback to file storage for WSL compatibility (no console.error)
        try {
          fs.writeFileSync(TOKEN_FILE, token, 'utf8')
          return { success: true }
        } catch (fileError: any) {
          return { success: false, error: 'Failed to store token securely' }
        }
      }
    })

    ipcMain.handle('auth:get-token', async () => {
      try {
        const token = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT)
        if (token) {
          return { success: true, token }
        }
        return { success: false, error: 'No token found' }
      } catch (error: any) {
        // Silent fallback to file storage for WSL compatibility
        try {
          if (fs.existsSync(TOKEN_FILE)) {
            const token = fs.readFileSync(TOKEN_FILE, 'utf8')
            return { success: true, token }
          }
          return { success: false, error: 'No token found' }
        } catch (fileError: any) {
          return { success: false, error: 'Failed to retrieve token' }
        }
      }
    })

    ipcMain.handle('auth:remove-token', async () => {
      try {
        await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT)
        return { success: true }
      } catch (error: any) {
        // Silent fallback for WSL - try to remove file
        try {
          if (fs.existsSync(TOKEN_FILE)) {
            fs.unlinkSync(TOKEN_FILE)
          }
          return { success: true }
        } catch (fileError: any) {
          return { success: false, error: 'Failed to remove token' }
        }
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

    // Screenshot Capture with WSL/Windows fallback
    ipcMain.handle('screenshot:capture', async () => {
      try {
        console.log('Starting screenshot capture...')
        
        // First, try WSL-compatible Windows PowerShell method
        const isWSL = process.platform === 'linux' && process.env.WSL_DISTRO_NAME
        console.log('Detected WSL environment:', !!isWSL)
        
        // For WSL: Use Windows PowerShell to take screenshot
        if (isWSL) {
          return await captureScreenshotWithPowerShell()
        }
        
        // For non-WSL: Use standard Electron desktopCapturer
        return await captureScreenshotWithElectron()
        
      } catch (error) {
        console.error('Failed to capture screenshot:', error)
        return {
          success: false,
          error: error.message,
          permission: false
        }
      }
    })
    
    // WSL-compatible Windows PowerShell screenshot function
    async function captureScreenshotWithPowerShell(): Promise<any> {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)
      
      try {
        console.log('Using Windows PowerShell screenshot method for WSL')
        
        // Create temporary paths
        const timestamp = Date.now()
        const tempPath = `/tmp/screenshot_${timestamp}.png`
        const scriptPath = `/tmp/screenshot_${timestamp}.ps1`
        const windowsImagePath = `C:\\temp\\screenshot_${timestamp}.png`
        const windowsScriptPath = `C:\\temp\\screenshot_${timestamp}.ps1`
        
        // Ensure temp directories exist
        await execAsync('mkdir -p /tmp')
        await execAsync('powershell.exe -Command "New-Item -ItemType Directory -Force -Path C:\\temp"')
        
        // Create PowerShell script content
        const psScriptContent = `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
\$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
\$bitmap = New-Object System.Drawing.Bitmap \$bounds.Width, \$bounds.Height
\$graphics = [System.Drawing.Graphics]::FromImage(\$bitmap)
\$graphics.CopyFromScreen(\$bounds.Location, [System.Drawing.Point]::Empty, \$bounds.Size)
\$bitmap.Save('${windowsImagePath}', [System.Drawing.Imaging.ImageFormat]::Png)
\$graphics.Dispose()
\$bitmap.Dispose()
Write-Host "Screenshot saved to ${windowsImagePath}"`
        
        // Write PowerShell script file
        console.log('Creating PowerShell script file...')
        require('fs').writeFileSync(scriptPath, psScriptContent, 'utf8')
        
        // Copy script to Windows temp directory
        await execAsync(`cp "${scriptPath}" "/mnt/c/temp/screenshot_${timestamp}.ps1"`)
        
        // Execute PowerShell script file
        console.log('Executing PowerShell script file...')
        console.log('Script path:', windowsScriptPath)
        const result = await execAsync(`powershell.exe -ExecutionPolicy Bypass -File "${windowsScriptPath}"`)
        console.log('PowerShell output:', result.stdout)
        
        // Copy screenshot back to WSL temp directory
        console.log('Copying screenshot back to WSL...')
        await execAsync(`cp "/mnt/c/temp/screenshot_${timestamp}.png" "${tempPath}"`)
        
        // Read the captured image
        console.log('Reading captured screenshot file...')
        const imageBuffer = require('fs').readFileSync(tempPath)
        const base64 = imageBuffer.toString('base64')
        
        // Clean up temp files
        require('fs').unlinkSync(tempPath)
        require('fs').unlinkSync(scriptPath)
        await execAsync(`powershell.exe -Command "Remove-Item '${windowsImagePath}' -Force -ErrorAction SilentlyContinue"`)
        await execAsync(`powershell.exe -Command "Remove-Item '${windowsScriptPath}' -Force -ErrorAction SilentlyContinue"`)
        
        console.log('Screenshot captured successfully with PowerShell')
        console.log('- Buffer size:', imageBuffer.length, 'bytes')
        console.log('- Base64 length:', base64.length)
        
        return {
          success: true,
          data: base64,
          timestamp: new Date().toISOString(),
          permission: true,
          source: 'Windows PowerShell (WSL)',
          method: 'powershell'
        }
        
      } catch (error) {
        console.error('PowerShell screenshot failed:', error)
        console.log('Falling back to Electron desktopCapturer...')
        return await captureScreenshotWithElectron()
      }
    }
    
    // Standard Electron desktopCapturer function
    async function captureScreenshotWithElectron(): Promise<any> {
      const { desktopCapturer } = await import('electron')
      
      console.log('Using Electron desktopCapturer method')
      
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
      
      console.log('Screenshot captured successfully with Electron')
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
        size: bestSource.thumbnail.getSize(),
        method: 'electron'
      }
    }

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
