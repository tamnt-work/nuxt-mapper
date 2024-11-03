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
      async run() {
        const mappersDir = './mappers'
        consola.info('Initializing schema file...')
        createSchemaFileIfNotExist(mappersDir)
        consola.success('Schema file created successfully')
      },
    }),
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
    const mappersDir = args.schema ? dirname(args.schema) : './mappers'
    const schemaPath = args.schema || join(mappersDir, 'schema.tw')
    const modelNames = args.models?.split(',')

    consola.info('Generating models and DTOs...')
    await generateModelAndDTO({
      mappersDir,
      schemaPath,
      fixEslint: args.fix,
      modelNames,
    })
    consola.success('Generation complete')

    if (args.watch) {
      consola.info('Watching for changes...')
      await setupSchemaWatcher({
        mappersDir,
        schemaPath,
        fixEslint: args.fix,
      })
    }
  },
})
