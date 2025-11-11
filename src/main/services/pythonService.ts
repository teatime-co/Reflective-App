import { spawn, ChildProcess, exec } from 'child_process'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import axios from 'axios'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class PythonService {
  private process: ChildProcess | null = null
  private port: number = 8765
  private isReady: boolean = false
  private baseUrl: string = ''

  constructor(port: number = 8765) {
    this.port = port
    this.baseUrl = `http://127.0.0.1:${this.port}`
  }

  private async killProcessOnPort(port: number): Promise<void> {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`)
      const pids = stdout.trim().split('\n').filter(pid => pid.length > 0)

      if (pids.length > 0) {
        console.log(`[PythonService] Found ${pids.length} process(es) on port ${port}, killing: ${pids.join(', ')}`)

        for (const pid of pids) {
          try {
            await execAsync(`kill -9 ${pid}`)
            console.log(`[PythonService] Killed process ${pid}`)
          } catch (error) {
            console.log(`[PythonService] Process ${pid} already terminated`)
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.log(`[PythonService] No process found on port ${port} (this is normal)`)
    }
  }

  private findPythonSource(): { python: string; script: string; cwd: string } | null {
    const appPath = app.getAppPath()
    const venvPython = path.join(appPath, 'python-service', 'venv', 'bin', 'python')
    const script = path.join(appPath, 'python-service', 'embedding_server.py')
    const cwd = path.join(appPath, 'python-service')

    if (fs.existsSync(venvPython) && fs.existsSync(script)) {
      console.log(`[PythonService] Found Python source: venv=${venvPython}, script=${script}`)
      return { python: venvPython, script, cwd }
    }

    return null
  }

  private findPythonExecutable(): string {
    const possibilities = [
      path.join(process.resourcesPath, 'python', 'embedding_server'),
      path.join(app.getAppPath(), 'resources', 'python', 'embedding_server'),
      path.join(__dirname, '..', '..', 'resources', 'python', 'embedding_server'),
    ]

    for (const execPath of possibilities) {
      if (fs.existsSync(execPath)) {
        console.log(`[PythonService] Found Python executable at: ${execPath}`)
        return execPath
      }
    }

    throw new Error(`[PythonService] Could not find Python executable. Checked: ${possibilities.join(', ')}`)
  }

  async start(): Promise<void> {
    if (this.process) {
      console.log('[PythonService] Python service already running')
      return
    }

    console.log(`[PythonService] Cleaning up any orphaned processes on port ${this.port}...`)
    await this.killProcessOnPort(this.port)

    const isDevelopment = process.env.NODE_ENV === 'development'
    const pythonSource = isDevelopment ? this.findPythonSource() : null

    let execPath: string
    let args: string[] = []
    let cwd: string | undefined
    const env = {
      ...process.env,
      PORT: this.port.toString(),
      PYTHONUNBUFFERED: '1',
    }

    if (pythonSource) {
      console.log(`[PythonService] Using Python source (development mode)`)
      execPath = pythonSource.python
      args = [pythonSource.script]
      cwd = pythonSource.cwd
      env.SENTENCE_TRANSFORMERS_HOME = path.join(pythonSource.cwd, 'models')
      console.log(`[PythonService] Python: ${execPath}`)
      console.log(`[PythonService] Script: ${pythonSource.script}`)
      console.log(`[PythonService] Working directory: ${cwd}`)
      console.log(`[PythonService] Models: ${env.SENTENCE_TRANSFORMERS_HOME}`)
    } else {
      console.log(`[PythonService] Using Python binary (production mode)`)
      execPath = this.findPythonExecutable()
    }

    console.log(`[PythonService] Starting Python service on port ${this.port}...`)

    this.process = spawn(execPath, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd,
    })

    this.process.stdout?.on('data', (data) => {
      console.log(`[PythonService stdout] ${data.toString().trim()}`)
    })

    this.process.stderr?.on('data', (data) => {
      console.error(`[PythonService stderr] ${data.toString().trim()}`)
    })

    this.process.on('error', (error) => {
      console.error('[PythonService] Failed to start Python service:', error)
      this.process = null
      this.isReady = false
    })

    this.process.on('exit', (code, signal) => {
      console.log(`[PythonService] Python service exited with code ${code} and signal ${signal}`)
      this.process = null
      this.isReady = false
    })

    await this.waitForReady()
  }

  private async waitForReady(maxAttempts: number = 30, delayMs: number = 1000): Promise<void> {
    console.log('[PythonService] Waiting for Python service to be ready...')

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${this.baseUrl}/health`, { timeout: 2000 })

        if (response.data.status === 'healthy' && response.data.model_loaded) {
          console.log(`[PythonService] Python service is ready after ${attempt} attempts`)
          this.isReady = true
          return
        }
      } catch (error) {
        console.log(`[PythonService] Health check attempt ${attempt}/${maxAttempts} failed, retrying...`)
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    throw new Error('[PythonService] Python service failed to become ready within timeout period')
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return
    }

    console.log('[PythonService] Stopping Python service...')

    return new Promise((resolve) => {
      if (!this.process) {
        resolve()
        return
      }

      const timeout = setTimeout(() => {
        console.log('[PythonService] Force killing Python service (timeout)')
        this.process?.kill('SIGKILL')
        resolve()
      }, 5000)

      this.process.once('exit', () => {
        clearTimeout(timeout)
        console.log('[PythonService] Python service stopped successfully')
        this.process = null
        this.isReady = false
        resolve()
      })

      this.process.kill('SIGTERM')
    })
  }

  async embed(text: string): Promise<number[]> {
    if (!this.isReady) {
      throw new Error('Python service is not ready')
    }

    try {
      const response = await axios.post(`${this.baseUrl}/embed`, { text }, { timeout: 10000 })
      return response.data.embedding
    } catch (error) {
      console.error('[PythonService] Error generating embedding:', error)
      throw error
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isReady) {
      throw new Error('Python service is not ready')
    }

    try {
      const response = await axios.post(`${this.baseUrl}/embed_batch`, { texts }, { timeout: 30000 })
      return response.data.embeddings
    } catch (error) {
      console.error('[PythonService] Error generating batch embeddings:', error)
      throw error
    }
  }

  isServiceReady(): boolean {
    return this.isReady
  }
}

export let pythonService: PythonService | null = null

export function initPythonService(port: number = 8765): PythonService {
  pythonService = new PythonService(port)
  return pythonService
}
