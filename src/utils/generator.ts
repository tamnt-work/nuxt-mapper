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

interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  email?: boolean
  regex?: string
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
  nullable?: boolean
  url?: boolean
  uuid?: boolean
  cuid?: boolean
  includes?: string
  startsWith?: string
  endsWith?: string
  length?: number
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  int?: boolean
  positive?: boolean
  negative?: boolean
  multipleOf?: number
  finite?: boolean
  safe?: boolean
  nonempty?: boolean
  min_items?: number
  max_items?: number
  custom?: string
  messages?: {
    required?: string
    min?: string
    max?: string
    email?: string
    regex?: string
    url?: string
    uuid?: string
    cuid?: string
    includes?: string
    startsWith?: string
    endsWith?: string
    length?: string
    gt?: string
    gte?: string
    lt?: string
    lte?: string
    int?: string
    positive?: string
    negative?: string
    multipleOf?: string
    finite?: string
    safe?: string
    nonempty?: string
    min_items?: string
    max_items?: string
    type?: string
    [key: string]: string | undefined
  }
  i18n?: {
    [key: string]: string | undefined
  }
  item?: {
    type: string
    properties?: Record<string, ValidationRule>
  }
  properties?: Record<string, ValidationRule>
}

interface Forms {
  [model: string]: ModelForm
}

interface ModelForm {
  [action: string]: Record<string, ValidationRule>
}

export const runEslintFix = (mappersDir: string) => {
  try {
    consola.info(`Running ESLint fix on ${mappersDir} folder...`)
    execSync(`npx eslint --fix "${mappersDir}/**/*.ts"`, { stdio: 'inherit' })
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
    if (!existsSync(schemaPath)) {
      consola.error(`Schema file not found at ${schemaPath}. Run 'npx tw mapper init' to create it.`)
      return
    }

    const content = readFileSync(schemaPath, 'utf8')
    const schema: Schema = parse(content)

    if (!schema || typeof schema !== 'object') {
      consola.warn(`Please check the ${schemaPath} file, and define your models.`)
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

export function createFormFileIfNotExist(mappersDir: string) {
  mkdirSync(mappersDir, { recursive: true })
  const formPath = join(mappersDir, 'form.tw')
  if (!existsSync(formPath)) {
    consola.info(`Creating ${formPath}`)
    const formContent = `# =============================================================================
# Form Schema Definition File
# =============================================================================
#
# This file defines the validation rules for forms.
# Each model can have multiple actions with their own validation rules.
#
# Structure:
# ModelName:
#   actionName:
#     fieldName:
#       required: boolean
#       min: number
#       max: number
#       email: boolean
#       regex: string
#       messages:
#         required: string
#         min: string
#         max: string
#         email: string
#         regex: string
#       i18n:
#         required: string
#         min: string
#         max: string
#         email: string
#         regex: string
#
# Example:
# User:
#   create:
#     email:
#       required: true
#       email: true
#       messages:
#         required: "Email is required"
#         email: "Invalid email format"
# =============================================================================

# Add your form validations here
`
    writeFileSync(formPath, formContent)
    consola.info(`Created ${formPath}`)
  }
}

export function generateForms({
  mappersDir,
  formsPath,
  fixEslint,
  modelNames,
}: {
  mappersDir: string
  formsPath: string
  fixEslint?: boolean
  modelNames?: string[]
}) {
  try {
    if (!existsSync(formsPath)) {
      consola.error(`Forms file not found at ${formsPath}. Run 'npx tw form init' to create it.`)
      return
    }

    const content = readFileSync(formsPath, 'utf8')
    const forms: Forms = parse(content)

    if (!forms || typeof forms !== 'object') {
      consola.warn(`Please check the ${formsPath} file, and define your forms.`)
      return
    }

    const formsToProcess = modelNames
      ? Object.entries(forms).filter(([name]) => modelNames.includes(name))
      : Object.entries(forms)

    if (formsToProcess.length === 0) {
      consola.warn('No forms found to process')
      return
    }

    formsToProcess.forEach(([modelName, modelForms]) => {
      const kebabCaseName = modelName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      const modelDir = join(mappersDir, kebabCaseName)
      const formsDir = join(modelDir, 'forms')
      mkdirSync(formsDir, { recursive: true })

      const existingFiles = existsSync(formsDir)
        ? readdirSync(formsDir).filter(file => file.endsWith('.form.ts'))
        : []

      const createdFiles = new Set<string>()
      Object.entries(modelForms).forEach(([action, rules]) => {
        const fileName = `${action}-${kebabCaseName}.form.ts`
        generateFormFile(modelName, action, rules, modelDir)
        createdFiles.add(fileName)
      })

      existingFiles.forEach((file) => {
        if (!createdFiles.has(file)) {
          const filePath = join(formsDir, file)
          rmSync(filePath)
          consola.info(`Removed form file: ${file}`)
        }
      })

      consola.info(`Generated forms for model: ${modelName}`)
    })

    if (fixEslint)
      runEslintFix(mappersDir)
  }
  catch (error) {
    consola.error('Error generating forms:', error)
  }
}

function generateFormFile(
  modelName: string,
  action: string,
  rules: Record<string, ValidationRule>,
  outputDir: string,
) {
  const className = capitalizeFirst(modelName)
  const actionCamelCase = action.charAt(0).toLowerCase() + capitalizeFirst(action).slice(1)
  const actionPascalCase = capitalizeFirst(action)
  const kebabFileName = modelName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

  const hasI18n = Object.values(rules).some(rule => Object.keys(rule.i18n || {}).length > 0)

  const formsDir = join(outputDir, 'forms')
  mkdirSync(formsDir, { recursive: true })

  const content = `import { z } from 'zod'${hasI18n ? '\nimport { t } from \'@/i18n\'' : ''}

export const ${actionCamelCase}${className}Schema = z.object({
  ${Object.entries(rules)
    .map(([field, rule]) => generateZodValidation(field, rule))
    .join(',\n  ')}
})

export type ${actionPascalCase}${className}Form = z.infer<typeof ${actionCamelCase}${className}Schema>
`

  writeFileSync(join(formsDir, `${action}-${kebabFileName}.form.ts`), content.trim())
}

function generateZodValidation(field: string, rule: ValidationRule): string {
  const validations: string[] = []

  // Base type
  switch (rule.type?.toLowerCase()) {
    case 'number':
      validations.push('z.number()')
      break
    case 'boolean':
      validations.push('z.boolean()')
      break
    case 'date':
      validations.push('z.date()')
      break
    case 'array': {
      // Handle array item validation
      if (rule.item?.type) {
        const itemSchema = generateArrayItemSchema(rule.item)
        validations.push(`z.array(${itemSchema})`)
      }
      else {
        validations.push('z.array(z.any())')
      }
      break
    }
    case 'object':
      if (rule.properties) {
        const objectSchema = generateObjectSchema(rule.properties)
        validations.push(`z.object(${objectSchema})`)
      }
      else {
        validations.push('z.object({})')
      }
      break
    default:
      validations.push('z.string()')
  }

  // String specific validations
  if (!rule.type || rule.type === 'string') {
    if (rule.min) {
      const message = getValidationMessage(rule, 'min', { min: rule.min })
      validations.push(`  .min(${rule.min}${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.max) {
      const message = getValidationMessage(rule, 'max', { max: rule.max })
      validations.push(`  .max(${rule.max}${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.length) {
      const message = getValidationMessage(rule, 'length', { length: rule.length })
      validations.push(`  .length(${rule.length}${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.email) {
      const message = getValidationMessage(rule, 'email')
      validations.push(`  .email(${message ? `{ message: ${message} }` : ''})`)
    }

    if (rule.url) {
      const message = getValidationMessage(rule, 'url')
      validations.push(`  .url(${message ? `{ message: ${message} }` : ''})`)
    }

    if (rule.uuid) {
      const message = getValidationMessage(rule, 'uuid')
      validations.push(`  .uuid(${message ? `{ message: ${message} }` : ''})`)
    }

    if (rule.cuid) {
      const message = getValidationMessage(rule, 'cuid')
      validations.push(`  .cuid(${message ? `{ message: ${message} }` : ''})`)
    }

    if (rule.includes) {
      const message = getValidationMessage(rule, 'includes')
      validations.push(`  .includes('${rule.includes}'${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.startsWith) {
      const message = getValidationMessage(rule, 'startsWith')
      validations.push(`  .startsWith('${rule.startsWith}'${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.endsWith) {
      const message = getValidationMessage(rule, 'endsWith')
      validations.push(`  .endsWith('${rule.endsWith}'${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.regex) {
      const message = getValidationMessage(rule, 'regex')
      const escapedRegex = rule.regex.replace(/\\/g, '\\\\')
      validations.push(`  .regex(/${escapedRegex}/${message ? `, { message: ${message} }` : ''})`)
    }
  }

  // Number specific validations
  if (rule.type === 'number') {
    if (rule.gt !== undefined) {
      const message = getValidationMessage(rule, 'gt', { value: rule.gt })
      validations.push(`  .gt(${rule.gt}${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.gte !== undefined) {
      const message = getValidationMessage(rule, 'gte', { value: rule.gte })
      validations.push(`  .gte(${rule.gte}${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.lt !== undefined) {
      const message = getValidationMessage(rule, 'lt', { value: rule.lt })
      validations.push(`  .lt(${rule.lt}${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.lte !== undefined) {
      const message = getValidationMessage(rule, 'lte', { value: rule.lte })
      validations.push(`  .lte(${rule.lte}${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.int) {
      const message = getValidationMessage(rule, 'int')
      validations.push(`  .int(${message ? `{ message: ${message} }` : ''})`)
    }

    if (rule.positive) {
      const message = getValidationMessage(rule, 'positive')
      validations.push(`  .positive(${message ? `{ message: ${message} }` : ''})`)
    }

    if (rule.negative) {
      const message = getValidationMessage(rule, 'negative')
      validations.push(`  .negative(${message ? `{ message: ${message} }` : ''})`)
    }

    if (rule.multipleOf) {
      const message = getValidationMessage(rule, 'multipleOf')
      validations.push(`  .multipleOf(${rule.multipleOf}${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.finite) {
      const message = getValidationMessage(rule, 'finite')
      validations.push(`  .finite(${message ? `{ message: ${message} }` : ''})`)
    }

    if (rule.safe) {
      const message = getValidationMessage(rule, 'safe')
      validations.push(`  .safe(${message ? `{ message: ${message} }` : ''})`)
    }
  }

  // Array specific validations
  if (rule.type === 'array') {
    if (rule.nonempty) {
      const message = getValidationMessage(rule, 'nonempty')
      validations.push(`  .nonempty(${message ? `{ message: ${message} }` : ''})`)
    }

    if (rule.min_items) {
      const message = getValidationMessage(rule, 'min_items', { min: rule.min_items })
      validations.push(`  .min(${rule.min_items}${message ? `, { message: ${message} }` : ''})`)
    }

    if (rule.max_items) {
      const message = getValidationMessage(rule, 'max_items', { max: rule.max_items })
      validations.push(`  .max(${rule.max_items}${message ? `, { message: ${message} }` : ''})`)
    }
  }

  // Custom validation
  if (rule.custom) {
    validations.push(`  .refine(${rule.custom})`)
  }

  // Nullable
  if (rule.nullable) {
    validations.push('  .nullable()')
  }

  // Required/Optional status
  if (!rule.required) {
    validations.push('  .optional()')
  }
  else {
    const message = getValidationMessage(rule, 'required')
    if (rule.type === 'string') {
      validations.push(`  .min(1${message ? `, { message: ${message} }` : ''})`)
    }
  }

  return `${field}: ${validations.join('\n')}`
}

function getValidationMessage(
  rule: ValidationRule,
  key: string,
  params: Record<string, any> = {},
): string | undefined {
  if (rule.i18n?.[key]) {
    const paramsString = Object.entries(params)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    return `t('${rule.i18n[key]}'${paramsString ? `, { ${paramsString} }` : ''})`
  }

  if (rule.messages?.[key]) {
    let message = rule.messages[key] || ''
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value.toString())
    })
    return `"${message}"`
  }

  return undefined
}

function generateArrayItemSchema(item: { type: string, properties?: Record<string, ValidationRule> }): string {
  switch (item.type.toLowerCase()) {
    case 'object':
      if (item.properties) {
        return `z.object({
          ${Object.entries(item.properties)
            .map(([key, rule]) => `${key}: ${generateZodValidation(key, rule).split(': ')[1]}`)
            .join(',\n          ')}
        })`
      }
      return 'z.object({})'
    case 'string':
      return 'z.string()'
    case 'number':
      return 'z.number()'
    case 'boolean':
      return 'z.boolean()'
    default:
      return 'z.any()'
  }
}

function generateObjectSchema(properties: Record<string, ValidationRule>): string {
  return `{
    ${Object.entries(properties)
      .map(([key, rule]) => `${key}: ${generateZodValidation(key, rule).split(': ')[1]}`)
      .join(',\n    ')}
  }`
}
