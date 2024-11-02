import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'
import { watch } from 'chokidar'
import { consola } from 'consola'
import { parse } from 'yaml'
import { createSchemaFileIfNotExist, generateModelAndDTO } from './utils/generator'

// Module options TypeScript interface definition
export interface ModuleOptions {
  fixEslint: boolean
  watch: boolean
  mappersDir: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'data-mapper',
    configKey: 'dataMapper',
    compatibility: {
      nuxt: '^3.0.0',
    },
    version: '0.0.1',
  },

  defaults: {
    mappersDir: './mappers',
    fixEslint: true,
    watch: true,
  },

  setup(options, nuxt) {
    const mappersDir = join(nuxt.options.rootDir, options.mappersDir)
    const schemaName = 'schema.tw'
    const schemasPath = join(mappersDir, schemaName)

    mkdirSync(mappersDir, { recursive: true })

    // Add hook registration
    nuxt.hook('prepare:types', () => {
      if (process.argv.includes('prepare')) {
        consola.info('Generating models and DTOs from module hook...')
        generateModelAndDTO({
          mappersDir,
          schemaPath: schemasPath,
          fixEslint: options.fixEslint,
        })
      }
    })

    // Watch for schema files in development mode
    if (nuxt.options.dev && options.watch) {
      // Update schema directory path to mappers/schema.tw
      consola.info('Base schemas directory:', schemasPath)

      // Function to extract changed model from schema file
      const getChangedModel = (content: string, previousContent?: string) => {
        const schema = parse(content)
        const previousSchema = previousContent ? parse(previousContent) : {}

        // Find models that have changed
        const changedModels = Object.entries(schema).filter(([
          name, model,
        ]) => {
          return JSON.stringify(model) !== JSON.stringify(previousSchema[name])
        })

        return changedModels
      }

      let previousContent: string | undefined

      try {
        createSchemaFileIfNotExist(mappersDir)
        previousContent = readFileSync(schemasPath, 'utf8')
      }
      catch (error) {
        consola.warn('Could not read initial schema content:', error)
        previousContent = undefined
      }

      const watcher = watch(schemasPath, {
        ignoreInitial: true,
        persistent: true,
        ignored: /(^|[\\/])\../, // ignore dotfiles
        followSymlinks: true,
        depth: 99,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      })

      // Add error handling
      watcher.on('error', (error) => {
        consola.error('Watcher error:', error)
      })

      watcher.on('change', (path) => {
        consola.info(`Schema file changed: ${path}`)
        const content = readFileSync(path, 'utf8')
        const changedModels = getChangedModel(content, previousContent)

        // Generate only changed models
        if (changedModels.length > 0) {
          const changedModelNames = changedModels.map(([name]) => name)
          consola.success(`Regenerating models: ${changedModelNames.join(', ')}`)
          generateModelAndDTO({
            mappersDir: options.mappersDir,
            schemaPath: path,
            fixEslint: options.fixEslint,
            modelNames: changedModelNames,
          })
        }

        previousContent = content
      })
    }
  },
})
