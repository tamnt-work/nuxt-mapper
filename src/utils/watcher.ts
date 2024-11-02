import { readFileSync } from 'node:fs'
import { watch } from 'chokidar'
import { consola } from 'consola'
import { parse } from 'yaml'
import { createSchemaFileIfNotExist, generateModelAndDTO } from './generator'

export async function setupSchemaWatcher({
  mappersDir,
  schemaPath,
  fixEslint,
  onSchemaChange,
}: {
  mappersDir: string
  schemaPath: string
  fixEslint: boolean
  onSchemaChange?: (changedModelNames: string[]) => void
}) {
  let previousContent: string | undefined

  try {
    createSchemaFileIfNotExist(mappersDir)
    previousContent = readFileSync(schemaPath, 'utf8')
  }
  catch (error) {
    consola.warn('Could not read initial schema content:', error)
  }

  const watcher = watch(schemaPath, {
    ignoreInitial: true,
    persistent: true,
    ignored: /(^|[\\/])\../,
    followSymlinks: true,
    depth: 99,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  })

  watcher.on('error', (error) => {
    consola.error('Watcher error:', error)
  })

  watcher.on('change', (path) => {
    consola.info(`Schema file changed: ${path}`)
    const content = readFileSync(path, 'utf8')
    const schema = parse(content)
    const previousSchema = previousContent ? parse(previousContent) : {}

    const changedModels = Object.entries(schema).filter(([name, model]) => {
      return JSON.stringify(model) !== JSON.stringify(previousSchema[name])
    })

    if (changedModels.length > 0) {
      const changedModelNames = changedModels.map(([name]) => name)
      consola.success(`Regenerating models: ${changedModelNames.join(', ')}`)

      if (onSchemaChange) {
        onSchemaChange(changedModelNames)
      }
      else {
        generateModelAndDTO({
          mappersDir,
          schemaPath: path,
          fixEslint,
          modelNames: changedModelNames,
        })
      }
    }

    previousContent = content
  })

  return watcher
}
