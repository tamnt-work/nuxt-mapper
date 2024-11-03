import { join, dirname } from 'node:path'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { generateRequests, createRequestFileIfNotExist } from '../../utils/generator'
import { setupRequestsWatcher } from '../../utils/watcher'

export const requestCommand = defineCommand({
  meta: {
    name: 'request',
    description: 'Generate API requests from request schema files',
  },
  subCommands: {
    init: defineCommand({
      meta: {
        name: 'init',
        description: 'Initialize request.tw file',
      },
      args: {
        schema: {
          type: 'string',
          description: 'Path to create request schema file',
          alias: 's',
        },
      },
      async run({ args }) {
        const mappersDir = typeof args.schema === 'string' ? dirname(args.schema) : './mappers'
        consola.info('Initializing request schema file...')
        createRequestFileIfNotExist(mappersDir)
        consola.success('Request schema file created successfully')
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
      description: 'Path to request schema file',
      alias: 's',
    },
    models: {
      type: 'string',
      description: 'Comma-separated list of model names to generate',
      alias: 'm',
    },
    watch: {
      type: 'boolean',
      description: 'Watch for changes in request schema file',
      default: false,
      alias: 'w',
    },
  },
  async run({ args }) {
    const mappersDir = typeof args.schema === 'string' ? dirname(args.schema) : './mappers'
    const requestsPath = typeof args.schema === 'string' ? args.schema : join(mappersDir, 'request.tw')
    const modelNames = args.models?.split(',')

    consola.info('Generating API requests...')
    await generateRequests({
      mappersDir,
      requestsPath,
      fixEslint: args.fix,
      modelNames,
    })
    consola.success('Generation complete')

    if (args.watch) {
      consola.info('Watching for changes...')
      await setupRequestsWatcher({
        mappersDir,
        requestsPath,
        fixEslint: args.fix,
      })
    }
  },
})
