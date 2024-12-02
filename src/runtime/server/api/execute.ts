import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { defineEventHandler, readBody } from 'h3'
import yaml from 'yaml'
import { broadcastWsMessage } from './ws'

interface SchemaModel {
  type: string
  mappings: Record<string, {
    type: string
    map?: string
    required?: boolean
  }>
  relationships?: Record<string, {
    type: string
    map: string
  }>
}

function readSchemaFile(schemaPath: string) {
  try {
    const content = readFileSync(schemaPath, 'utf-8')
    const schema = yaml.parse(content)

    const models: Record<string, any> = {}

    for (const [modelName, modelData] of Object.entries(schema)) {
      const data = modelData as SchemaModel
      if (data.type !== 'model') continue

      models[modelName] = {
        mappings: data.mappings || {},
        relationships: data.relationships || {},
      }
    }

    return models
  }
  catch (error: any) {
    console.error('Error reading schema file:', error)
    return null
  }
}

function getProjectInfo() {
  const projectPath = process.cwd()
  const defaultSchemaPath = resolve(projectPath, 'mappers/schema.tw')
  const defaultFormPath = resolve(projectPath, 'mappers/form.tw')

  return {
    projectPath: projectPath,
    schemaPath: defaultSchemaPath,
    formPath: defaultFormPath,
  }
}

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    const info = getProjectInfo()

    return {
      ...info,
      schema: readSchemaFile(info.schemaPath),
    }
  }

  if (event.method === 'PUT') {
    const { schema } = await readBody(event)
    const info = getProjectInfo()

    try {
      const yamlContent = yaml.stringify(schema, { indent: 2 })

      const finalContent = `# =============================================================================
# Schema Definition File
# =============================================================================
#
# This file defines the data models and their relationships for the application.
# Each model specifies its properties, types, mappings, and relationships with
# other models.
#
# Structure:
# - Each model is defined with its properties and relationships
# - 'type: model' indicates a model definition
# - 'mappings' define the model's properties and their types
# - 'relationships' define connections between models
#
# =============================================================================

${yamlContent}`

      writeFileSync(info.schemaPath, finalContent, 'utf-8')
      return { success: true }
    }
    catch (error: any) {
      console.error('Error saving schema file:', error)
      throw createError({
        statusCode: 500,
        message: `Failed to save schema: ${error.message}`,
      })
    }
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
    const rootPath = resolve(process.cwd(), './')
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
