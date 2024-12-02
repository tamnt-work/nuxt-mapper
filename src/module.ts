import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule, addServerHandler, createResolver, addComponent } from '@nuxt/kit'
import { consola } from 'consola'
import { generateModelAndDTO, generateForms } from './utils/generator'
import { setupFormsWatcher, setupSchemaWatcher } from './utils/watcher'

// Module options TypeScript interface definition
export interface ModuleOptions {
  fixEslint: boolean
  watch: boolean
  mappersDir: string
  formsPath?: string
  i18nImportPath?: string
  adminPath: string
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
    formsPath: './mappers/form.tw',
    i18nImportPath: '@/utils/i18n',
    adminPath: '/_data-mapper',
  },

  setup(options, nuxt) {
    const mappersDir = join(nuxt.options.rootDir, options.mappersDir)
    const schemaName = 'schema.tw'
    const schemasPath = join(mappersDir, schemaName)
    const formsPath = join(nuxt.options.rootDir, options.formsPath!)
    const { resolve } = createResolver(import.meta.url)

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

        if (existsSync(formsPath)) {
          consola.info('Generating forms from module hook...')
          generateForms({
            mappersDir,
            formsPath,
            fixEslint: options.fixEslint,
          })
        }
      }
    })

    // Watch for schema files in development mode
    if (nuxt.options.dev && options.watch) {
      const port = nuxt.options.devServer.port
      console.log(`  ➜ \x1B[36mData Mapper Admin:\x1B[0m \x1B[32mhttp://localhost:${port}${options.adminPath}\x1B[0m`)

      consola.info('Base schemas directory:', schemasPath)
      setupSchemaWatcher({
        mappersDir,
        schemaPath: schemasPath,
        fixEslint: options.fixEslint,
      })

      setupFormsWatcher({
        mappersDir,
        formsPath,
        fixEslint: options.fixEslint,
      })
    }

    // Add admin page only in development mode
    if (nuxt.options.dev) {
      // Register the admin page component
      addComponent({
        name: 'DataMapperAdmin',
        filePath: resolve('./runtime/components/DataMapperAdmin.vue'),
      })

      // Add server API handler for executing commands
      addServerHandler({
        route: '/api/_data-mapper/execute',
        handler: resolve('./runtime/server/api/execute'),
      })

      // Add WebSocket server handler
      addServerHandler({
        route: '/ws/_data-mapper',
        handler: resolve('./runtime/server/api/ws'),
      })

      // Add the admin page
      nuxt.hook('pages:extend', (pages) => {
        pages.push({
          name: 'data-mapper-admin',
          path: options.adminPath,
          file: resolve('./runtime/pages/_data-mapper/index.vue'),
        })

        pages.push({
          name: 'data-mapper-schema-visualize',
          path: `${options.adminPath}/schema-visualize`,
          file: resolve('./runtime/pages/_data-mapper/schema-visualize/index.vue'),
        })
      })
    }

    // Add this to the module setup function before adding handlers
    nuxt.options.nitro = nuxt.options.nitro || {};
    (nuxt.options.nitro as any).websocket = true
  },
})
