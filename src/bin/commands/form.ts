import { join, dirname } from 'node:path'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { generateForms, createFormFileIfNotExist } from '../../utils/generator'
import { setupFormsWatcher } from '../../utils/watcher'

export const formCommand = defineCommand({
  meta: {
    name: 'form',
    description: 'Generate forms from form schema files',
  },
  subCommands: {
    init: defineCommand({
      meta: {
        name: 'init',
        description: 'Initialize form.tw file',
      },
      args: {
        schema: {
          type: 'string',
          description: 'Path to create form schema file',
          alias: 's',
        },
      },
      async run({ args }) {
        const mappersDir = typeof args.schema === 'string' ? dirname(args.schema) : './mappers'
        consola.info('Initializing form schema file...')
        createFormFileIfNotExist(mappersDir)
        consola.success('Form schema file created successfully')
      },
    }),
    generate: defineCommand({
      meta: {
        name: 'generate',
        description: 'Generate forms from schema file',
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
          description: 'Path to form schema file',
          alias: 's',
        },
        models: {
          type: 'string',
          description: 'Comma-separated list of model names to generate',
          alias: 'm',
        },
        watch: {
          type: 'boolean',
          description: 'Watch for changes in form schema file',
          default: false,
          alias: 'w',
        },
        i18nPath: {
          type: 'string',
          description: 'Custom import path for i18n',
          alias: 'i',
        },
      },
      async run({ args }) {
        const mappersDir = typeof args.schema === 'string' ? dirname(args.schema) : './mappers'
        const formsPath = typeof args.schema === 'string' ? args.schema : join(mappersDir, 'form.tw')
        const modelNames = typeof args.models === 'string' ? args.models.split(',') : undefined

        try {
          consola.info('Generating forms...')
          await generateForms({
            mappersDir,
            formsPath,
            fixEslint: Boolean(args.fix),
            modelNames,
            i18nImportPath: typeof args.i18nPath === 'string' ? args.i18nPath : undefined,
          })
          consola.success('Generation complete')

          if (args.watch) {
            consola.info('Watching for changes...')
            await setupFormsWatcher({
              mappersDir,
              formsPath,
              fixEslint: Boolean(args.fix),
            })
          }
        }
        catch (error) {
          consola.error('Failed to generate forms:', error)
          process.exit(1)
        }
      },
    }),
  },
})
