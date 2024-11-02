import { execSync } from 'node:child_process'
import {
  mkdirSync,
  readFileSync, writeFileSync,
  existsSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { consola } from 'consola'

interface SchemaField {
  type: string
  map?: string
  required?: boolean
}

interface SchemaRelationship {
  type: string
  map: string
}

interface SchemaModel {
  type: string
  mappings: Record<string, SchemaField>
  relationships?: Record<string, SchemaRelationship>
}

interface Schema {
  [key: string]: SchemaModel
}

const runEslintFix = (mappersDir: string) => {
  try {
    consola.info(`Running ESLint fix on ${mappersDir} folder...`)
    execSync(`eslint --fix ${mappersDir}`, { stdio: 'inherit' })
    consola.success('ESLint fix completed successfully')
  }
  catch (error) {
    consola.error('ESLint fix failed:', error)
  }
}

export function createSchemaFileIfNotExist(mappersDir: string) {
  mkdirSync(mappersDir, { recursive: true })
  const schemaPath = join(mappersDir, 'schema.tw')
  if (!existsSync(schemaPath)) {
    consola.info(`Creating ${schemaPath}`)
    const schemaContent = `# =============================================================================
# Schema Definition File
# =============================================================================
#
# This file defines the data models and their relationships for the application.
# Each model specifies its properties, types, mappings, and relationships with
# other models.
#
# Structure:
# - Each model is defined with its properties and relationships
# - 'type: model' indicates a model definition
# - 'mappings' define the model's properties and their types
# - 'relationships' define connections between models
#
# =============================================================================

# Add your models here
`
    writeFileSync(schemaPath, schemaContent)
    consola.info(`Created ${schemaPath}`)
  }
}

export function generateModelAndDTO({
  mappersDir,
  schemaPath,
  fixEslint,
  modelNames,
}: {
  mappersDir: string
  schemaPath: string
  fixEslint?: boolean
  modelNames?: string[]
}) {
  try {
    createSchemaFileIfNotExist(mappersDir)

    const content = readFileSync(schemaPath, 'utf8')
    const schema: Schema = parse(content)

    if (!schema || typeof schema !== 'object') {
      consola.warn(`Please check the ${mappersDir}/schema.tw file, and define your models.`)
      return
    }

    const modelsToProcess = modelNames
      ? Object.entries(schema).filter(([name]) => modelNames.includes(name))
      : Object.entries(schema)

    if (modelsToProcess.length === 0) {
      consola.warn('No models found in schema to process')
      return
    }

    // Add validation for relationship models
    modelsToProcess.forEach(([
      name, definition,
    ]) => {
      if (definition.type === 'model' && definition.relationships) {
        Object.entries(definition.relationships).forEach(([
          field, rel,
        ]) => {
          const relationType = rel.type.endsWith('[]') ? rel.type.slice(0, -2) : rel.type

          if (!schema[relationType]) {
            consola.error(`Error in model "${name}": Referenced model "${relationType}" in relationship "${field}" does not exist in schema`)
            throw new Error(`Referenced model "${relationType}" does not exist in schema`)
          }
        })
      }
    })

    // Get existing model directories
    const existingModelDirs = readdirSync(mappersDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name !== 'node_modules')
      .map(dirent => dirent.name)

    // Get current model names in kebab case
    const currentModelNames = Object.keys(schema).map(name =>
      name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
    )

    // Remove directories for non-existent models
    existingModelDirs.forEach((dir) => {
      if (!currentModelNames.includes(dir)) {
        const dirPath = join(mappersDir, dir)
        rmSync(dirPath, {
          recursive: true,
          force: true,
        })
        consola.info(`Removed directory for non-existent model: ${dir}`)
      }
    })

    modelsToProcess.forEach(([
      name, definition,
    ]) => {
      if (definition.type === 'model') {
        const kebabCaseName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
        const modelDir = join(mappersDir, kebabCaseName)
        mkdirSync(modelDir, { recursive: true })

        generateModelFile(name, definition, modelDir)
        generateDTOFile(name, definition, modelDir)
        consola.info(`Generated files for model: ${name}`)
      }
    })

    if (fixEslint) {
      runEslintFix(mappersDir)
    }
  }
  catch (error) {
    consola.error('Error generating files:', error)
  }
}

function generateModelFile(name: string, model: SchemaModel, outputDir: string) {
  const className = capitalizeFirst(name)
  const kebabFileName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

  const imports = Object.values(model.relationships || {})
    .filter((rel) => {
      const relationField = Object.keys(model.relationships || {}).find(
        field => model.relationships![field].type === rel.type,
      )
      return relationField !== undefined
    })
    .map((rel) => {
      const relationType = rel.type.endsWith('[]') ? rel.type.slice(0, -2) : rel.type
      return `import { ${capitalizeFirst(relationType)}Model } from '../${relationType.toLowerCase()}/${relationType.toLowerCase()}.model';`
    })
    .filter((value, index, self) => self.indexOf(value) === index)
    .join('\n')

  const content = `${imports}${imports ? '\n\n' : ''}
export class ${className}Model {
  ${Object.entries(model.mappings)
    .map(([
      field, def,
    ]) => `${field}${def.required ? '!' : '?'}: ${mapType(def.type)};`)
    .join('\n  ')}
  ${Object.entries(model.relationships || {})
    .map(([
      field, def,
    ]) => `${field}?: ${mapRelationType(def.type)};`)
    .join('\n  ')}

  constructor(data: Partial<${className}Model> = {}) {
    Object.assign(this, data);
  }
}

export type ${className}PlainModel = Omit<${className}Model, 'constructor'>;
`
  writeFileSync(join(outputDir, `${kebabFileName}.model.ts`), content.trim())
}

function generateDTOFile(name: string, model: SchemaModel, outputDir: string) {
  const className = capitalizeFirst(name)
  const kebabFileName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

  const imports = [`import { ${className}Model, type ${className}PlainModel } from './${kebabFileName}.model'`]

  if (model.relationships) {
    const relationshipImports = Object.values(model.relationships)
      .map((rel) => {
        const relationType = rel.type.endsWith('[]') ? rel.type.slice(0, -2) : rel.type
        return `import { ${capitalizeFirst(relationType)}DTO } from '../${relationType.toLowerCase()}/${relationType.toLowerCase()}.dto';`
      })
      .filter((value, index, self) => self.indexOf(value) === index)
    imports.push(...relationshipImports)
  }

  const content = `${imports.join('\n')}\n
export class ${className}DTO {
  ${Object.entries(model.mappings)
    .map(([
      field, def,
    ]) => {
      const dtoField = def.map || field

      if (dtoField.includes('.')) {
        const parts = dtoField.split('.')
        return generateNestedField(parts, def.type, def.required)
      }

      return `${dtoField}${def.required ? '!' : '?'}: ${mapType(def.type)};`
    })
    .join('\n  ')}
  ${Object.entries(model.relationships || {})
    .map(([
      field, rel,
    ]) => {
      const relationType = rel.type.endsWith('[]')
        ? `${capitalizeFirst(rel.type.slice(0, -2))}DTO[]`
        : `${capitalizeFirst(rel.type)}DTO`
      return `${field}?: ${relationType};`
    })
    .join('\n  ')}

  constructor(data: Partial<${className}DTO> = {}) {
    Object.assign(this, data);
  }

  toModel(): ${className}Model {
    return new ${className}Model({
      ${Object.entries(model.mappings)
        .map(([
          field, def,
        ]) => {
          const dtoField = def.map || field

          if (dtoField.includes('.')) {
            const parts = dtoField.split('.')
            return `${field}: this.${parts[0]}?.${parts[parts.length - 1]},`
          }

          return `${field}: this.${dtoField},`
        })
        .join('\n      ')}
      ${Object.entries(model.relationships || {})
        .map(([
          field, rel,
        ]) => {
          if (rel.type.endsWith('[]')) {
            return `${field}: this.${field}?.map(e => e.toModel()),`
          }

          return `${field}: this.${field}?.toModel(),`
        })
        .join('\n      ')}
    });
  }

  toPlainModel(): ${className}PlainModel {
    return {
      ${Object.entries(model.mappings)
        .map(([
          field, def,
        ]) => {
          const dtoField = def.map || field

          if (dtoField.includes('.')) {
            const parts = dtoField.split('.')
            return `${field}: this.${parts[0]}?.${parts[parts.length - 1]},`
          }

          return `${field}: this.${dtoField},`
        })
        .join('\n      ')}
      ${Object.entries(model.relationships || {})
        .map(([
          field, rel,
        ]) => {
          if (rel.type.endsWith('[]')) {
            return `${field}: this.${field}?.map(e => e.toPlainModel()),`
          }

          return `${field}: this.${field}?.toPlainModel(),`
        })
        .join('\n      ')}
    };
  }
}
`
  writeFileSync(join(outputDir, `${kebabFileName}.dto.ts`), content.trim())
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function mapType(type: string): string {
  if (!type) return 'any'

  switch (type.toLowerCase()) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'date':
      return 'Date'
    case 'boolean':
      return 'boolean'
    default:
      return 'any'
  }
}

function mapRelationType(type: string): string {
  if (type.endsWith('[]')) {
    return `${type.slice(0, -2)}Model[]`
  }

  return `${type}Model`
}

function generateNestedField(parts: string[], type: string, required: boolean | undefined): string {
  const lastPart = parts[parts.length - 1]
  return `${parts[0]}${required ? '!' : '?'}: { ${lastPart}: ${mapType(type)} }`
}
