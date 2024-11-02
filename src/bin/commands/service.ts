import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import pluralize from 'pluralize'
import { kebabCase, pascalCase } from 'scule'

const require = createRequire(import.meta.url)

// Added utility functions to reduce duplication
const getTemplatePath = (templateName: string) => {
  return process.env.NODE_ENV === 'development'
    ? join(process.cwd(), `dist/templates/${templateName}.template`)
    : require.resolve(`@tw/nuxt-mapper/dist/templates/${templateName}.template`)
}

const generateFile = (templatePath: string, outputPath: string, replacements?: Record<string, string>) => {
  if (!existsSync(templatePath)) {
    consola.error('Template not found:', templatePath)
    process.exit(1)
  }

  try {
    const template = readFileSync(templatePath, 'utf-8')
    const content = replacements
      ? Object.entries(replacements).reduce(
        (acc, [key, value]) => acc.replace(new RegExp(key, 'g'), value),
        template,
      )
      : template

    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, content)
    consola.success(`File generated at ${outputPath}`)
  }
  catch (error) {
    consola.error('Failed to generate file:', error)
    process.exit(1)
  }
}

// Add this helper function near the other utility functions
const updateNuxtConfig = () => {
  const nuxtConfigPath = join(process.cwd(), 'nuxt.config.ts')
  if (!existsSync(nuxtConfigPath)) {
    consola.warn('nuxt.config.ts not found')
    return
  }

  try {
    let content = readFileSync(nuxtConfigPath, 'utf-8')

    // Check if imports.dirs already exists
    if (!content.includes('imports: {') && !content.includes('imports.dirs')) {
      // Add imports configuration
      const defineConfig = 'defineNuxtConfig({'
      const importConfig = `${defineConfig}
  imports: {
    dirs: ['services']
  },`
      content = content.replace(defineConfig, importConfig)
      writeFileSync(nuxtConfigPath, content)
      consola.success('Added services directory to auto-imports configuration')
    }
    else if (content.includes('imports: {') && !content.includes('dirs: [')) {
      // Add dirs array to existing imports
      const importsConfig = 'imports: {'
      const dirsConfig = `imports: {
    dirs: ['services'],`
      content = content.replace(importsConfig, dirsConfig)
      writeFileSync(nuxtConfigPath, content)
      consola.success('Added services directory to auto-imports configuration')
    }
    else if (content.includes('dirs: [') && !content.includes('\'services\'')) {
      // Add services to existing dirs array
      const dirsRegex = /(dirs:\s*\[)([^\]]*)(\])/
      content = content.replace(dirsRegex, (_, start, middle, end) => {
        const services = middle.trim() ? `${middle}, 'services'` : '\'services\''
        return `${start}${services}${end}`
      })
      writeFileSync(nuxtConfigPath, content)
      consola.success('Added services directory to auto-imports configuration')
    }
  }
  catch (error) {
    consola.warn('Failed to update nuxt.config.ts:', error)
  }
}

export const serviceCommand = defineCommand({
  meta: {
    name: 'service',
    description: 'Generate service from template',
  },
  args: {
    subcommand: {
      type: 'positional',
      description: 'Subcommand (init or create)',
      required: true,
    },
    name: {
      type: 'string',
      description: 'Name(s) of the service(s) to generate (comma-separated)',
      required: false,
      alias: 'n',
    },
    output: {
      type: 'string',
      description: 'Output directory (default: ./services)',
      default: './services',
      alias: 'o',
    },
  },
  async run({ args }) {
    const { subcommand, name, output } = args

    // Add helper function to check if initialization is needed
    const isInitialized = () => {
      const apiPath = join(process.cwd(), output, 'api.ts')
      const indexPath = join(process.cwd(), output, 'index.ts')
      return existsSync(apiPath) && existsSync(indexPath)
    }

    // Add helper function to run initialization
    const runInit = () => {
      const apiTemplatePath = getTemplatePath('api')
      const apiOutputPath = join(process.cwd(), output, 'api.ts')
      generateFile(apiTemplatePath, apiOutputPath)

      const indexOutputPath = join(process.cwd(), output, 'index.ts')
      mkdirSync(dirname(indexOutputPath), { recursive: true })
      writeFileSync(indexOutputPath, '')
      consola.success(`Empty index file generated at ${indexOutputPath}`)

      // Add this line to update the Nuxt config
      updateNuxtConfig()
    }

    switch (subcommand) {
      case 'init': {
        runInit()
        break
      }

      case 'create': {
        if (!name) {
          consola.error('Name is required for create command')
          process.exit(1)
        }

        // Auto-run init if files don't exist
        if (!isInitialized()) {
          consola.info('Initializing service files...')
          runInit()
        }

        // Split names by comma and trim whitespace
        const serviceNames = name.split(',').map(n => n.trim())

        for (const serviceName of serviceNames) {
          const templatePath = getTemplatePath('service')
          const outputPath = join(process.cwd(), output, kebabCase(serviceName), 'index.ts')
          const replacements = {
            __PASCAL_CASE__: pascalCase(serviceName),
            __KEBAB_CASE__: kebabCase(serviceName),
            __PLURALIZE__: pluralize(kebabCase(serviceName)),
          }
          generateFile(templatePath, outputPath, replacements)

          // Update index.ts to export the new service
          const indexPath = join(process.cwd(), output, 'index.ts')
          if (existsSync(indexPath)) {
            const content = readFileSync(indexPath, 'utf-8')
            const newExport = `export * from './${kebabCase(serviceName)}'\n`
            if (!content.includes(newExport)) {
              writeFileSync(indexPath, content + newExport)
              consola.success(`Updated ${indexPath} with new export`)
            }
          }
        }
        break
      }

      default:
        consola.error('Invalid subcommand. Use "init" or "create"')
        process.exit(1)
    }
  },
})
