import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { defineEventHandler, readBody } from 'h3'
import { broadcastWsMessage } from './ws'

function getProjectInfo() {
  const projectPath = process.cwd()
  const rootPath = resolve(projectPath, '../')
  const defaultSchemaPath = resolve(rootPath, 'mappers/schema.tw')
  const defaultFormPath = resolve(rootPath, 'mappers/form.tw')

  return {
    projectPath: rootPath,
    schemaPath: defaultSchemaPath,
    formPath: defaultFormPath,
  }
}

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    return getProjectInfo()
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('This endpoint is only available in development mode')
  }

  const { command } = await readBody(event)

  if (!command || typeof command !== 'string') {
    throw new Error('Invalid command format')
  }

  const allowedCommands = ['mapper generate', 'service create', 'form generate']
  if (!allowedCommands.some(cmd => command.startsWith(cmd))) {
    throw new Error('Command not allowed')
  }

  try {
    const rootPath = resolve(process.cwd(), '../')
    const fullCommand = `npx tw ${command}`

    broadcastWsMessage('log', `Executing command: ${fullCommand}`)
    broadcastWsMessage('log', `Working directory: ${rootPath}`)

    const child = spawn('npx', ['tw', ...command.split(' ')], {
      cwd: rootPath,
      shell: true,
    })

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          broadcastWsMessage('log', line.trim())
        }
      }
    })

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          broadcastWsMessage('error', line.trim())
        }
      }
    })

    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          broadcastWsMessage('end', { success: true })
          resolve(true)
        }
        else {
          broadcastWsMessage('end', { success: false })
          reject(new Error(`Command failed with code ${code}`))
        }
      })
    })

    return { success: true }
  }
  catch (error: any) {
    broadcastWsMessage('error', error.message)
    broadcastWsMessage('end', { success: false })

    return {
      success: false,
      error: error.message,
    }
  }
})
