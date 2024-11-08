import { join, dirname } from 'node:path'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { createSchemaFileIfNotExist, generateModelAndDTO } from '../../utils/generator'
import { setupSchemaWatcher } from '../../utils/watcher'

export const dataMapperCommand = defineCommand({
  meta: {
    name: 'data-mapper',
    description: 'Generate models and DTOs from schema files',
  },
  subCommands: {
    init: defineCommand({
      meta: {
        name: 'init',
        description: 'Initialize schema.tw file',
      },
      args: {
        schema: {
          type: 'string',
          description: 'Path to create schema file',
          alias: 's',
        },
      },
      async run({ args }) {
        const mappersDir = typeof args.schema === 'string' ? dirname(args.schema) : './mappers'
        consola.info('Initializing schema file...')
        createSchemaFileIfNotExist(mappersDir)
        consola.success('Schema file created successfully')
      },
    }),
    generate: defineCommand({
      meta: {
        name: 'generate',
        description: 'Generate models and DTOs from schema file',
      },
      args: {
        fix: {
          type: 'boolean',
          description: 'Fix ESLint issues in generated files',
          default: false,
          alias: 'f',
        },
        schema: {
          type: 'string',
          description: 'Path to schema file',
          alias: 's',
        },
        models: {
          type: 'string',
          description: 'Comma-separated list of model names to generate',
          alias: 'm',
        },
        watch: {
          type: 'boolean',
          description: 'Watch for changes in schema file',
          default: false,
          alias: 'w',
        },
      },
      async run({ args }) {
        const mappersDir = typeof args.schema === 'string' ? dirname(args.schema) : './mappers'
        const schemaPath = typeof args.schema === 'string' ? args.schema : join(mappersDir, 'schema.tw')
        const modelNames = typeof args.models === 'string' ? args.models.split(',') : undefined

        try {
          consola.info('Generating models and DTOs...')
          await generateModelAndDTO({
            mappersDir,
            schemaPath,
            fixEslint: Boolean(args.fix),
            modelNames,
          })
          consola.success('Generation complete')

          if (args.watch) {
            consola.info('Watching for changes...')
            await setupSchemaWatcher({
              mappersDir,
              schemaPath,
              fixEslint: Boolean(args.fix),
            })
          }
        }
        catch (error) {
          consola.error('Failed to generate models and DTOs:', error)
          process.exit(1)
        }
      },
    }),
  },
})
