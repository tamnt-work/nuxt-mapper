import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'
import { consola } from 'consola'
import { generateModelAndDTO } from './utils/generator'
import { setupSchemaWatcher } from './utils/watcher'

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
    fixEslint: false,
    watch: false,
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
      consola.info('Base schemas directory:', schemasPath)
      setupSchemaWatcher({
        mappersDir,
        schemaPath: schemasPath,
        fixEslint: options.fixEslint,
      })
    }
  },
})
