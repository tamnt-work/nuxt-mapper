import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'
import { consola } from 'consola'
import { generateModelAndDTO, generateRequests } from './utils/generator'
import { setupRequestsWatcher, setupSchemaWatcher } from './utils/watcher'

// Module options TypeScript interface definition
export interface ModuleOptions {
  fixEslint: boolean
  watch: boolean
  mappersDir: string
  requestsPath?: string
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
    fixEslint: false,
    watch: false,
    requestsPath: './mappers/request.tw',
  },

  setup(options, nuxt) {
    const mappersDir = join(nuxt.options.rootDir, options.mappersDir)
    const schemaName = 'schema.tw'
    const schemasPath = join(mappersDir, schemaName)
    const requestsPath = join(nuxt.options.rootDir, options.requestsPath!)

    if (!existsSync(mappersDir)) {
      consola.warn(`Mappers directory not found at ${mappersDir}. Run 'npx tw mapper init' to initialize.`)
      return
    }

    // Add hook registration
    nuxt.hook('prepare:types', () => {
      if (process.argv.includes('prepare')) {
        consola.info('Generating models and DTOs from module hook...')
        generateModelAndDTO({
          mappersDir,
          schemaPath: schemasPath,
          fixEslint: options.fixEslint,
        })

        if (existsSync(requestsPath)) {
          consola.info('Generating requests from module hook...')
          generateRequests({
            mappersDir,
            requestsPath,
            fixEslint: options.fixEslint,
          })
        }
      }
    })

    // Watch for schema files in development mode
    if (nuxt.options.dev && options.watch) {
      consola.info('Base schemas directory:', schemasPath)
      setupSchemaWatcher({
        mappersDir,
        schemaPath: schemasPath,
        fixEslint: options.fixEslint,
      })

      setupRequestsWatcher({
        mappersDir,
        requestsPath,
        fixEslint: options.fixEslint,
      })
    }
  },
})
