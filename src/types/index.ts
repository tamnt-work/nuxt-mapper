// Add a new types file for better organization

export interface SchemaField {
  type: string
  map?: string
  required?: boolean
}

export interface SchemaRelationship {
  type: string
  map: string
}

export interface SchemaValidator {
  min?: number
  max?: number
  required?: boolean
  email?: boolean
  regex?: string
}

export interface SchemaModel {
  type: string
  mappings: Record<string, SchemaField>
  relationships?: Record<string, SchemaRelationship>
  validators?: Record<string, SchemaValidator>
}

export interface Schema {
  [key: string]: SchemaModel
}
