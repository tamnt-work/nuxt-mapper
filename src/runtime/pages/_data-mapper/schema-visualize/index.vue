<template>
  <div class="data-mapper-admin">
    <div class="layout-container">
      <!-- Left side: Model List and Model Creation -->
      <div class="left-panel">
        <div class="panel-content">
          <!-- Models List -->
          <div class="models-list">
            <div class="section-header">
              <h3 class="section-title">
                Models
              </h3>
              <button
                class="custom-button"
                title="Generate All Models"
                @click="generateAllModels"
              >
                ⚡ Execute All
              </button>
            </div>
            <div class="models-grid">
              <div
                v-for="(model, name) in models"
                :key="name"
                class="model-card"
                @click="editModel(name)"
              >
                <div class="model-card-header">
                  <span class="model-name">{{ name }}</span>
                  <div class="model-header-actions">
                    <button
                      class="model-action-button bordered"
                      title="Edit Model"
                      @click.stop="editModel(name)"
                    >
                      ✏️
                    </button>
                    <button
                      class="model-action-button bordered"
                      title="Generate Model"
                      @click.stop="generateSingleModel(name)"
                    >
                      ⚡
                    </button>
                    <button
                      class="remove-button subtle"
                      title="Delete Model"
                      @click.stop="removeModel(name)"
                    >
                      ×
                    </button>
                  </div>
                  <div class="model-stats">
                    <span
                      class="stat-item"
                      title="Number of Fields"
                    >
                      <i class="fas fa-database" />
                      <span class="stat-label">Fields:</span>
                      {{ Object.keys(model.mappings).length }}
                    </span>
                    <span
                      class="stat-item"
                      title="Number of Relationships"
                    >
                      <i class="fas fa-link" />
                      <span class="stat-label">Relations:</span>
                      {{ Object.keys(model.relationships).length }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right side: Schema Diagram -->
      <div class="right-panel">
        <div class="diagram-panel">
          <div class="diagram-header">
            <h2 class="diagram-title">
              Schema Visualizer
            </h2>
            <div class="diagram-controls">
              <!-- Add settings button -->
              <button
                class="action-button"
                @click="toggleSettingsDialog"
              >
                ⚙️ Settings
              </button>
              <button
                class="action-button"
                @click="toggleSchemaView"
              >
                📄 View Schema
              </button>
              <button
                class="action-button"
                @click="toggleLogsView"
              >
                📋 {{ showLogs ? 'Hide Logs' : 'Show Logs' }}
              </button>
              <button
                class="action-button"
                @click="openCreateModelDialog"
              >
                ➕ Create
              </button>
              <button
                class="btn btn-primary"
                @click="saveSchema"
              >
                💾 Save Schema
              </button>
            </div>
          </div>
          <div
            class="diagram-content"
            :class="{ 'with-logs': showLogs }"
          >
            <div class="mermaid-wrapper">
              <div
                ref="mermaidDiv"
                class="mermaid-container"
                :class="{ dragging: isDragging }"
              />
              <!-- Update floating zoom controls -->
              <div class="floating-zoom-controls">
                <button
                  class="floating-zoom-button"
                  title="Zoom In"
                  @click.stop="handleZoomIn"
                >
                  🔍+
                </button>
                <button
                  class="floating-zoom-button"
                  title="Zoom Out"
                  @click.stop="handleZoomOut"
                >
                  🔍-
                </button>
                <button
                  class="floating-zoom-button"
                  title="Reset"
                  @click.stop="handleReset"
                >
                  ↺
                </button>
                <button
                  class="floating-zoom-button"
                  title="Download Diagram"
                  @click.stop="handleDownload"
                >
                  💾
                </button>
              </div>
            </div>

            <!-- Move Log Terminal here -->
            <div
              v-if="showLogs"
              class="log-terminal"
            >
              <div class="log-header">
                <h3 class="log-title">
                  Terminal Output
                </h3>
                <div class="log-controls">
                  <div class="filter-controls">
                    <div class="search-wrapper">
                      <input
                        v-model="filterText"
                        type="text"
                        placeholder="Filter logs..."
                        class="filter-input"
                      >
                      <span
                        v-if="filterText"
                        class="clear-search"
                        @click="filterText = ''"
                      >×</span>
                    </div>
                    <div class="filter-types">
                      <button
                        v-for="(enabled, type) in filterTypes"
                        :key="type"
                        class="filter-type"
                        :class="{ active: enabled }"
                        :title="type.charAt(0).toUpperCase() + type.slice(1)"
                        @click="filterTypes[type] = !filterTypes[type]"
                      >
                        {{ type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️' }}
                      </button>
                    </div>
                  </div>
                  <button
                    class="log-control-button"
                    :disabled="!logs.length"
                    title="Clear logs"
                    @click="clearLogs"
                  >
                    🗑️
                  </button>
                  <button
                    class="log-control-button"
                    title="Close terminal"
                    @click="toggleLogsView"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div
                ref="logsContainer"
                class="log-content"
                :class="{ 'has-logs': logs.length }"
                @scroll="handleScroll"
              >
                <div
                  v-if="logs.length"
                  class="log-entries"
                >
                  <div
                    v-for="(log, index) in filteredLogs"
                    :key="index"
                    class="log-line"
                    :class="{ 'error-log': log.toLowerCase().includes('error') }"
                    v-html="formatLogLine(log)"
                  />
                </div>
                <div
                  v-else
                  class="no-logs"
                >
                  No logs available
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Update Schema Dialog -->
      <div
        v-if="showSchemaView"
        class="dialog-overlay"
        @click="toggleSchemaView"
      >
        <div
          class="dialog-content"
          @click.stop
        >
          <div class="dialog-header">
            <h3 class="dialog-title">
              Schema Definition
            </h3>
            <div class="dialog-actions">
              <!-- Add format selector -->
              <select
                v-model="schemaFormat"
                class="format-select"
              >
                <option value="yaml">
                  YAML (.tw)
                </option>
                <option value="json">
                  JSON
                </option>
              </select>
              <!-- Update copy button -->
              <button
                class="copy-button"
                :class="{ success: showCopySuccess }"
                @click="() => copyToClipboard(getCurrentSchemaContent())"
              >
                <span v-if="showCopySuccess">✓ Copied!</span>
                <span v-else>📋 Copy</span>
              </button>
              <!-- Add download button -->
              <button
                class="download-button"
                @click="downloadSchema"
              >
                💾 Download
              </button>
              <button
                class="close-button"
                @click="toggleSchemaView"
              >
                ×
              </button>
            </div>
          </div>
          <div class="dialog-body">
            <pre
              ref="preElement"
              :class="`language-${schemaFormat}`"
            ><code v-html="getHighlightedCode()" /></pre>
          </div>
        </div>
      </div>

      <!-- Create/Update Model Dialog -->
      <div
        v-if="showCreateModelDialog"
        class="dialog-overlay"
        @click="closeCreateModelDialog"
      >
        <div
          class="dialog-content edit-modal"
          @click.stop
        >
          <div class="dialog-header">
            <h3 class="dialog-title">
              {{ isEditMode ? '✏️ Edit Model' : '➕ Create Model' }}
            </h3>
            <button
              class="close-button"
              @click="closeCreateModelDialog"
            >
              ×
            </button>
          </div>
          <div class="dialog-body">
            <!-- Model Form -->
            <div class="edit-form">
              <div class="form-group">
                <label class="form-label">Model Name</label>
                <div class="input-group">
                  <input
                    v-model="newModel.name"
                    placeholder="Enter model name"
                    class="form-control"
                    :class="{ error: showError && modelError }"
                    @blur="handleModelNameBlur"
                  >
                  <div
                    v-if="showError && modelError"
                    class="error-message"
                  >
                    {{ modelError }}
                  </div>
                </div>
              </div>

              <!-- Fields Section -->
              <div class="form-section">
                <div class="section-header">
                  <h4 class="section-subtitle">
                    📋 Fields
                  </h4>
                  <button
                    class="custom-button"
                    @click="addMapping"
                  >
                    ➕ Add Field
                  </button>
                </div>
                <div class="fields-grid">
                  <div
                    v-for="(field, index) in newModel.fields"
                    :key="`field-${index}`"
                    class="field-card"
                  >
                    <div class="field-card-header">
                      <span class="field-number">Field {{ index + 1 }}</span>
                      <button
                        v-if="field.name !== 'id'"
                        class="remove-button subtle"
                        @click="removeMapping(index)"
                      >
                        ×
                      </button>
                    </div>
                    <div class="field-card-body">
                      <div class="form-field">
                        <label class="form-label">Field Name</label>
                        <input
                          v-model="field.name"
                          placeholder="Enter field name"
                          class="form-input"
                          :class="{ error: showError && !field.name.trim() }"
                        >
                      </div>
                      <div class="form-field">
                        <label class="form-label">Type</label>
                        <select
                          v-model="field.type"
                          class="form-select"
                          :class="{ error: showError && !field.type }"
                        >
                          <option value="string">
                            String
                          </option>
                          <option value="number">
                            Number
                          </option>
                          <option value="boolean">
                            Boolean
                          </option>
                          <option value="date">
                            Date
                          </option>
                          <option value="object">
                            Object
                          </option>
                          <option value="array">
                            Array
                          </option>
                        </select>
                      </div>
                      <div class="form-field">
                        <label class="form-label">Mapping Path</label>
                        <input
                          v-model="field.map"
                          placeholder="Enter mapping path (optional)"
                          class="form-input"
                        >
                      </div>
                      <label class="checkbox-label">
                        <input
                          v-model="field.required"
                          type="checkbox"
                          :disabled="field.name === 'id'"
                        >
                        Required field
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Relationships Section -->
              <div class="form-section">
                <div class="section-header">
                  <h4 class="section-subtitle">
                    🔗 Relationships
                  </h4>
                  <button
                    class="custom-button"
                    @click="addRelationship"
                  >
                    ➕ Add Relationship
                  </button>
                </div>
                <div class="fields-grid">
                  <div
                    v-for="(rel, index) in newModel.relationships"
                    :key="`rel-${index}`"
                    class="field-card"
                  >
                    <div class="field-card-header">
                      <span class="field-number">Relationship {{ index + 1 }}</span>
                      <button
                        class="remove-button subtle"
                        @click="removeRelationship(index)"
                      >
                        ×
                      </button>
                    </div>
                    <div class="field-card-body">
                      <div class="form-field">
                        <label class="form-label">Relationship Name</label>
                        <input
                          v-model="rel.name"
                          placeholder="Enter relationship name"
                          class="form-input"
                          :class="{ error: showError && !rel.name.trim() }"
                        >
                      </div>
                      <div class="form-field">
                        <label class="form-label">Target Model</label>
                        <select
                          v-model="rel.targetModel"
                          class="form-select"
                          :class="{ error: showError && !rel.targetModel }"
                        >
                          <option value="">
                            Select target model
                          </option>
                          <option
                            v-for="modelName in availableTargetModels"
                            :key="modelName"
                            :value="modelName"
                          >
                            {{ modelName }}
                          </option>
                        </select>
                      </div>
                      <div class="form-field">
                        <label class="form-label">Relationship Type</label>
                        <select
                          v-model="rel.type"
                          class="form-select"
                        >
                          <option value="one">
                            One
                          </option>
                          <option value="many">
                            Many
                          </option>
                        </select>
                      </div>
                      <div class="form-field">
                        <label class="form-label">Mapping Path</label>
                        <input
                          v-model="rel.map"
                          placeholder="Enter mapping path (optional)"
                          class="form-input"
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="dialog-footer">
            <button
              class="custom-button"
              @click="closeCreateModelDialog"
            >
              Cancel
            </button>
            <button
              class="execute-button"
              @click="handleSave"
            >
              {{ isEditMode ? 'Save Changes' : 'Create Model' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Add Settings Dialog -->
      <div
        v-if="showSettingsDialog"
        class="dialog-overlay"
        @click="toggleSettingsDialog"
      >
        <div
          class="dialog-content settings-dialog"
          @click.stop
        >
          <div class="dialog-header">
            <h3 class="dialog-title">
              ⚙️ Settings
            </h3>
            <button
              class="close-button"
              @click="toggleSettingsDialog"
            >
              ×
            </button>
          </div>
          <div class="dialog-body">
            <div class="settings-form">
              <div class="form-group">
                <label class="form-label">Schema Folder Path</label>
                <div class="input-group">
                  <input
                    v-model="settings.schemaPath"
                    placeholder="Enter schema folder path"
                    class="form-control"
                  >
                </div>
                <small class="help-text">Path to your schema folder (e.g., /path/to/schema)</small>
              </div>
            </div>
          </div>
          <div class="dialog-footer">
            <button
              class="custom-button"
              @click="toggleSettingsDialog"
            >
              Cancel
            </button>
            <button
              class="execute-button"
              @click="saveSettings"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add notification component at the end of the template, before closing </template> -->
  <div
    v-if="notification.show"
    class="notification"
    :class="notification.type"
  >
    <span class="notification-icon">
      {{ notification.type === 'success' ? '✓' : '⚠️' }}
    </span>
    {{ notification.message }}
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed, watch, onUnmounted, nextTick } from 'vue'
import mermaid from 'mermaid'
import Prism from 'prismjs'
import 'prismjs/themes/prism.css'
import 'prismjs/components/prism-yaml' // for YAML highlighting
import 'prismjs/components/prism-json' // Add JSON highlighting support
import { useSchemaVisual } from '../../../composables/useSchemaVisual'

useHead({
  title: 'Schema Visualizer - Data Mapper',
})

interface Relationship {
  name: string
  targetModel: string
  type: string
  map: string
}

interface Field {
  type: string
  map?: string
  required?: boolean
}

interface ModelRelationship {
  type: string
  map: string
}

interface Model {
  mappings: Record<string, Field>
  relationships: Record<string, ModelRelationship>
}

const models = reactive<Record<string, Model>>({})
const mermaidDiv = ref<HTMLElement | null>(null)
const newModel = reactive({
  name: '',
  fields: [
    {
      name: 'id',
      type: 'string',
      map: 'id',
      required: true,
    },
  ],
  relationships: [] as Relationship[],
})

const availableTargetModels = computed(() => {
  return Object.keys(models).filter(name => name !== newModel.name)
})

const isEditMode = ref(false)
const editingModelName = ref('')

const showSchemaView = ref(false)

// Add type for showCopySuccess and preElement
const showCopySuccess = ref<boolean>(false)
const preElement = ref<HTMLElement | null>(null)

// Add to script setup, with other reactive refs
const modelError = ref('')
const showError = ref(false)

const showEditModal = ref(false)

// Replace the existing handle-related code with:
const {
  isDragging,
  initializeDragBehavior,
  initializeZoomBehavior,
  zoomIn,
  zoomOut,
  onReset,
  downloadDiagram,
} = useSchemaVisual()

function addMapping() {
  newModel.fields.push({
    name: '',
    type: 'string',
    map: '',
    required: false,
  })
}

function removeMapping(index: number) {
  newModel.fields.splice(index, 1)
}

function addRelationship() {
  newModel.relationships.push({
    name: '',
    targetModel: '',
    type: 'one',
    map: '',
  })
}

function removeRelationship(index: number) {
  newModel.relationships.splice(index, 1)
}

function createModel() {
  if (!newModel.name) {
    showModelError('Please enter a model name')
    return
  }

  if (models[newModel.name]) {
    showModelError(`Model "${newModel.name}" already exists. Please choose a different name.`)
    return
  }

  // Clear any existing error
  clearModelError()

  models[newModel.name] = {
    mappings: {},
    relationships: {},
  }

  newModel.fields.forEach((field) => {
    models[newModel.name].mappings[field.name] = {
      type: field.type,
      map: field.map || field.name,
      required: field.required,
    }
  })

  newModel.relationships.forEach((rel) => {
    if (rel.name && rel.targetModel) {
      models[newModel.name].relationships[rel.name] = {
        type: `${rel.targetModel}${rel.type === 'many' ? '[]' : ''}`,
        map: rel.map || `${rel.name}`,
      }
    }
  })

  resetForm()
  generateDiagram()
  showCreateModelDialog.value = false
}

function updateModel() {
  if (!newModel.name) return

  models[editingModelName.value] = {
    mappings: {},
    relationships: {},
  }

  newModel.fields.forEach((field) => {
    models[editingModelName.value].mappings[field.name] = {
      type: field.type,
      map: field.map || field.name,
    }
  })

  newModel.relationships.forEach((rel) => {
    if (rel.name && rel.targetModel) {
      // Simplified relationship type handling
      const type = rel.type === 'many' ? `${rel.targetModel}[]` : rel.targetModel

      models[editingModelName.value].relationships[rel.name] = {
        type,
        map: rel.map || `${newModel.name.toLowerCase()}.${rel.name}`,
      }
    }
  })

  resetForm()
  isEditMode.value = false
  editingModelName.value = ''
  generateDiagram()
  showCreateModelDialog.value = false
}

function editModel(modelName: string) {
  const model = models[modelName]
  if (!model) return

  isEditMode.value = true
  editingModelName.value = modelName

  // Reset and populate the form
  newModel.name = modelName
  newModel.fields = Object.entries(model.mappings).map(([name, field]) => ({
    name,
    type: field.type,
    map: field.map || name,
    required: field.required || name === 'id',
  }))

  newModel.relationships = Object.entries(model.relationships).map(([name, rel]) => {
    // Simplified relationship type detection
    const type = rel.type.includes('[]') ? 'many' : 'one'
    const targetModel = rel.type.replace('[]', '')

    return {
      name,
      targetModel,
      type,
      map: rel.map,
    }
  })

  // Show the dialog
  showCreateModelDialog.value = true
}

function closeEditModal() {
  showEditModal.value = false
  if (!isEditMode.value) {
    resetForm()
  }
}

function validateForm(): boolean {
  showError.value = false
  modelError.value = ''

  // Validate model name
  if (!newModel.name.trim()) {
    showModelError('Model name is required')
    return false
  }

  // Check if model name already exists (only for create mode)
  if (!isEditMode.value && models[newModel.name]) {
    showModelError(`Model "${newModel.name}" already exists`)
    return false
  }

  // Validate model name format
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(newModel.name)) {
    showModelError('Model name must start with a capital letter and contain only letters and numbers')
    return false
  }

  // Validate fields
  for (const field of newModel.fields) {
    if (!field.name.trim()) {
      showModelError('All fields must have a name')
      return false
    }

    // Validate field name format (alphanumeric and underscore only)
    if (!/^[a-z]\w*$/.test(field.name)) {
      showModelError('Field names must start with a lowercase letter and contain only letters, numbers, and underscores')
      return false
    }

    if (!field.type) {
      showModelError('All fields must have a type')
      return false
    }
  }

  // Validate relationships
  for (const rel of newModel.relationships) {
    if (!rel.name.trim()) {
      showModelError('All relationships must have a name')
      return false
    }

    if (!rel.targetModel) {
      showModelError('All relationships must have a target model')
      return false
    }

    // Validate relationship name format
    if (!/^[a-z]\w*$/.test(rel.name)) {
      showModelError('Relationship names must start with a lowercase letter and contain only letters, numbers, and underscores')
      return false
    }
  }

  return true
}

// Update the handleSave function to use validation
function handleSave() {
  clearModelError() // Clear any existing errors first

  if (!validateForm()) {
    return
  }

  if (isEditMode.value) {
    updateModel()
  }
  else {
    createModel()
  }
  closeEditModal()
}

function resetForm() {
  // Reset all form fields to initial state
  newModel.name = ''
  newModel.fields = [
    {
      name: 'id',
      type: 'string',
      map: 'id',
      required: true,
    },
  ]
  newModel.relationships = []

  // Clear any errors
  showError.value = false
  modelError.value = ''

  // Reset edit mode
  isEditMode.value = false
  editingModelName.value = ''
}

async function generateDiagram() {
  let diagramText = `
    %%{init: {'flowchart': {'nodeSpacing': 50, 'rankSpacing': 50}} }%%
    erDiagram
  `

  Object.entries(models).forEach(([modelName, modelData]) => {
    diagramText += `\n      ${modelName} {`

    Object.entries(modelData.mappings).forEach(([fieldName, field]) => {
      const mapping = field.map ? `"→ ${field.map}"` : ''
      diagramText += `\n        ${field.type} ${fieldName} ${mapping}`
    })

    diagramText += '\n      }'
  })

  Object.entries(models).forEach(([modelName, modelData]) => {
    Object.entries(modelData.relationships).forEach(([relName, rel]) => {
      const targetModel = rel.type.replace('[]', '')
      const cardinality = rel.type.includes('[]') ? '||--o{' : '||--||'
      diagramText += `\n      ${modelName} ${cardinality} ${targetModel} : "${relName}"`
    })
  })

  try {
    await mermaid.render('mermaid-diagram', diagramText).then(({ svg }) => {
      if (!mermaidDiv.value) return
      mermaidDiv.value.innerHTML = svg

      // Initialize drag and zoom behaviors after SVG is rendered
      nextTick(() => {
        if (mermaidDiv.value) {
          initializeDragBehavior(mermaidDiv.value as HTMLElement)
          initializeZoomBehavior(mermaidDiv.value as HTMLElement)
        }
      })
    })
  }
  catch (error) {
    console.error('Mermaid rendering error:', error)
  }
}

// Add interface for schema response
interface SchemaResponse {
  projectPath: string
  schemaPath: string
  formPath: string
  schema: Record<string, Model>
}

// Add new function to fetch schema from API
async function fetchSchemaFromApi() {
  try {
    const response = await fetch('/api/_data-mapper/execute')
    const data: SchemaResponse = await response.json()

    if (data.schema) {
      // Update models with fetched schema
      Object.entries(data.schema).forEach(([modelName, modelData]) => {
        models[modelName] = {
          mappings: modelData.mappings || {},
          relationships: modelData.relationships || {},
        }
      })

      // Generate diagram after loading schema
      generateDiagram()
    }
  }
  catch (error) {
    console.error('Failed to fetch schema:', error)
  }
}

function toggleSchemaView(): void {
  showSchemaView.value = !showSchemaView.value
}

function generateSchemaFile(): string {
  let schemaText = '# =============================================================================\n'
  schemaText += '# Schema Definition File\n'
  schemaText += '# =============================================================================\n\n'

  Object.entries(models).forEach(([modelName, modelData]) => {
    schemaText += `# ${modelName} Model\n`
    schemaText += `${modelName}:\n`
    schemaText += '  type: model\n'

    // Mappings
    schemaText += '  mappings:\n'
    Object.entries(modelData.mappings).forEach(([fieldName, field]) => {
      schemaText += `    ${fieldName}:\n`
      schemaText += `      type: ${field.type}\n`
      if (field.map) {
        schemaText += `      map: ${field.map}\n`
      }
      if (field.required) {
        schemaText += '      required: true\n'
      }
    })

    // Relationships
    if (Object.keys(modelData.relationships).length > 0) {
      schemaText += '  relationships:\n'
      Object.entries(modelData.relationships).forEach(([relName, rel]) => {
        schemaText += `    ${relName}:\n`
        schemaText += `      type: ${rel.type}\n`
        schemaText += `      map: ${rel.map}\n`
      })
    }
    schemaText += '\n'
  })

  return schemaText
}

function getHighlightedCode(): string {
  const content = getCurrentSchemaContent()
  return Prism.highlight(
    content,
    schemaFormat.value === 'yaml' ? Prism.languages.yaml : Prism.languages.json,
    schemaFormat.value,
  )
}

// Add proper typing to copyToClipboard function
async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    }
    else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
      }
      finally {
        textArea.remove()
      }
    }

    // Show feedback
    showCopySuccess.value = true
    setTimeout(() => {
      showCopySuccess.value = false
    }, 2000)
  }
  catch (error) {
    console.error('Failed to copy text:', error)
  }
}

function showModelError(message: string) {
  modelError.value = message
  showError.value = true
  // Keep the error visible
  // setTimeout(() => {
  //   showError.value = false
  // }, 5000)
}

function clearModelError() {
  modelError.value = ''
  showError.value = false
}

// Add new reactive ref for create model dialog
const showCreateModelDialog = ref(false)

function openCreateModelDialog() {
  resetForm()
  showCreateModelDialog.value = true
}

function closeCreateModelDialog() {
  showCreateModelDialog.value = false
  resetForm()
  clearModelError() // Clear errors when closing
}

// Add new function to handle model removal
function removeModel(modelName: string) {
  if (confirm(`Are you sure you want to delete the "${modelName}" model?`)) {
    // Remove all relationships that reference this model
    Object.entries(models).forEach(([name, model]) => {
      const updatedRelationships = Object.entries(model.relationships)
        .filter(([_, rel]) => !rel.type.replace('[]', '').includes(modelName))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

      models[name].relationships = updatedRelationships
    })

    // Delete the model
    delete models[modelName]

    // Regenerate diagram
    generateDiagram()
  }
}

// Add new function to handle model name input
function handleModelNameBlur(event: Event) {
  const input = (event.target as HTMLInputElement).value

  // If already in correct PascalCase format, keep it as is
  if (/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
    return
  }

  // Convert to PascalCase while preserving existing camelCase boundaries
  newModel.name = input
    // First, split on obvious word boundaries
    .split(/[\s\-_]+/)
    // Then, split on camelCase boundaries (preserving existing ones)
    .flatMap(word => word.split(/(?=[A-Z])/))
    // Remove any empty strings
    .filter(word => word.length > 0)
    // Capitalize first letter of each word, lowercase the rest
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    // Join words together
    .join('')
}

// Add new reactive refs
const schemaFormat = ref<'yaml' | 'json'>('yaml')

// Add new functions
function getCurrentSchemaContent(): string {
  return schemaFormat.value === 'yaml' ? generateSchemaFile() : generateJsonSchema()
}

function generateJsonSchema(): string {
  const schema = Object.entries(models).reduce((acc, [modelName, modelData]) => {
    acc[modelName] = {
      type: 'model',
      mappings: modelData.mappings,
      relationships: modelData.relationships,
    }
    return acc
  }, {} as Record<string, any>)

  return JSON.stringify(schema, null, 2)
}

function downloadSchema() {
  const content = getCurrentSchemaContent()
  const fileName = schemaFormat.value === 'yaml' ? 'schema.tw' : 'schema.json'
  const blob = new Blob([content], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// Add these refs after other refs
const ws = ref<WebSocket | null>(null)
const isConnected = ref(false)

// Add this function after other initialization functions
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws/_data-mapper`

  ws.value = new WebSocket(wsUrl)

  ws.value.onopen = () => {
    isConnected.value = true
    console.log('WebSocket connected')
  }

  ws.value.onclose = () => {
    isConnected.value = false
    console.log('WebSocket disconnected')
    // Attempt to reconnect after 5 seconds
    setTimeout(initWebSocket, 5000)
  }

  ws.value.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  ws.value.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)

      switch (message.type) {
        case 'connected':
          console.log('WebSocket connection established:', message.data)
          break

        case 'log':
          logs.value.push(message.data)
          break

        case 'error':
          logs.value.push(`Error: ${message.data}`)
          break

        case 'end':
          if (message.data.success) {
            showNotification('Model generated successfully!')
          }
          else {
            showNotification('Failed to generate model', 'error')
          }
          break
      }
    }
    catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }
}

// Initialize WebSocket on component mount
onMounted(() => {
  mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
    er: {
      diagramPadding: 20,
      layoutDirection: 'TB',
      minEntityWidth: 100,
      minEntityHeight: 75,
      entityPadding: 15,
      useMaxWidth: true,
    },
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      useMaxWidth: true,
      rankSpacing: 50,
      nodeSpacing: 50,
      diagramPadding: 8,
    },
  })

  // Replace initializeSchemaFromFile with fetchSchemaFromApi
  fetchSchemaFromApi()
  initWebSocket() // Add WebSocket initialization
  loadSettings()
})

// Clean up WebSocket on component unmount
onUnmounted(() => {
  if (ws.value) {
    ws.value.close()
  }
})

// Add save function
async function saveSchema() {
  try {
    const schema = Object.entries(models).reduce((acc, [modelName, modelData]) => {
      acc[modelName] = {
        type: 'model',
        mappings: modelData.mappings,
        relationships: modelData.relationships,
      }
      return acc
    }, {} as Record<string, any>)

    const response = await fetch('/api/_data-mapper/execute', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ schema }),
    })

    if (!response.ok) {
      throw new Error('Failed to save schema')
    }

    showNotification('Schema saved successfully!')
  }
  catch (error) {
    console.error('Error saving schema:', error)
    showNotification('Failed to save schema. Check console for details.', 'error')
  }
}

// Add notification state
const notification = reactive({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error',
})

// Add showNotification function
function showNotification(message: string, type: 'success' | 'error' = 'success') {
  notification.show = true
  notification.message = message
  notification.type = type

  // Auto hide after 3 seconds
  setTimeout(() => {
    notification.show = false
  }, 3000)
}

// Add these refs for log functionality
const logs = ref<string[]>([])
const logsContainer = ref<HTMLElement | null>(null)
const shouldAutoScroll = ref(true)
const filterText = ref('')
const filterTypes = ref({
  error: true,
  warning: true,
  success: true,
  info: true,
})

// Add computed property for filtered logs
const filteredLogs = computed(() => {
  if (!logs.value.length) return []

  return logs.value
    .filter((log) => {
      // Text filter
      if (filterText.value && !log.toLowerCase().includes(filterText.value.toLowerCase())) {
        return false
      }

      // Type filters
      if (!filterTypes.value.error && log.toLowerCase().includes('error')) return false
      if (!filterTypes.value.warning && log.toLowerCase().includes('warning')) return false
      if (!filterTypes.value.success && (
        log.toLowerCase().includes('success')
        || log.includes('✔')
        || log.toLowerCase().includes('completed')
      )) return false
      if (!filterTypes.value.info && log.toLowerCase().includes('info:')) return false

      return true
    })
})

// Add log formatting function
function formatLogLine(log: string) {
  // Add loading indicator formatting with spinner
  log = log.replace(
    /^(⏳\sExecuting\.\.\.)/g,
    '<span class="loading"><span class="spinner"></span> $1</span>',
  )

  // Highlight commands
  log = log.replace(/([a-z-]+\s(?:generate|create))/gi, '<span class="command">$1</span>')

  // Highlight paths
  log = log.replace(/(\/[\w/-]+\.[a-z]+)/g, '<span class="path">$1</span>')

  // Highlight success messages
  log = log.replace(/(success|completed|created)/gi, '<span class="success">$1</span>')

  // Highlight warnings
  log = log.replace(/(warning|warn):/gi, '<span class="warning">$1:</span>')

  // Highlight errors
  log = log.replace(/(error|failed|failure):/gi, '<span class="error">$1:</span>')

  // Highlight icons
  log = log.replace(/^([✔ℹ⚠✖]\s)/g, '<span class="icon">$1</span>')

  return log
}

// Add log management functions
function clearLogs() {
  logs.value = []
}

function handleScroll(event: Event) {
  const container = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = container
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
  shouldAutoScroll.value = isAtBottom
}

// Watch logs for auto-scroll
watch(() => logs.value, () => {
  if (shouldAutoScroll.value && logsContainer.value) {
    setTimeout(() => {
      if (logsContainer.value) {
        logsContainer.value.scrollTop = logsContainer.value.scrollHeight
      }
    }, 100)
  }
}, { deep: true })

// Add new ref for logs visibility
const showLogs = ref(false)

// Add new function to toggle logs
function toggleLogsView() {
  showLogs.value = !showLogs.value
}

// Update the zoom button click handlers
function handleZoomIn() {
  if (mermaidDiv.value) zoomIn(mermaidDiv.value as HTMLElement)
}

function handleZoomOut() {
  if (mermaidDiv.value) zoomOut(mermaidDiv.value as HTMLElement)
}

function handleReset() {
  if (mermaidDiv.value) onReset(mermaidDiv.value as HTMLElement)
}

// ... existing code ...

// Add watch for mermaid diagram updates
watch(() => models, () => {
  nextTick(() => {
    if (mermaidDiv.value) {
      initializeDragBehavior(mermaidDiv.value as HTMLElement)
      initializeZoomBehavior(mermaidDiv.value as HTMLElement)
    }
  })
}, { deep: true })

// Update the click handler in template to use the composable's function
function handleDownload() {
  if (!mermaidDiv.value) return
  try {
    downloadDiagram(mermaidDiv.value as HTMLElement)
  }
  catch (error) {
    console.error('Error downloading diagram:', error)
    showNotification('Failed to download diagram', 'error')
  }
}

// Add new refs for settings
const showSettingsDialog = ref(false)
const settings = reactive({
  schemaPath: '',
})

// Add new functions for settings management
function toggleSettingsDialog() {
  showSettingsDialog.value = !showSettingsDialog.value
}

function loadSettings() {
  // Try to get settings from localStorage first
  const savedSettings = localStorage.getItem('schemaVisualizerSettings')
  if (savedSettings) {
    const parsed = JSON.parse(savedSettings)
    settings.schemaPath = parsed.schemaPath
    return
  }

  // If no localStorage settings, fetch from API
  fetchSettingsFromApi()
}

async function fetchSettingsFromApi() {
  try {
    const response = await fetch('/api/_data-mapper/execute')
    const data = await response.json()
    settings.schemaPath = data.schemaPath || ''

    // Save to localStorage
    saveSettingsToStorage()
  }
  catch (error) {
    console.error('Failed to fetch settings:', error)
  }
}

function saveSettingsToStorage() {
  localStorage.setItem('schemaVisualizerSettings', JSON.stringify({
    schemaPath: settings.schemaPath,
  }))
}

async function saveSettings() {
  try {
    // Save to localStorage
    saveSettingsToStorage()

    showSettingsDialog.value = false
    showNotification('Settings saved successfully!')
  }
  catch (error) {
    console.error('Failed to save settings:', error)
    showNotification('Failed to save settings', 'error')
  }
}

// Add this function in the script section
async function generateModels(modelName?: string) {
  try {
    // Show logs panel when generating
    showLogs.value = true

    // Clear previous logs
    logs.value = []
    logs.value.push('⏳ Saving schema before generation...')

    // Save schema first using existing method
    await saveSchema()

    logs.value.push('✅ Schema saved successfully')
    logs.value.push('⏳ Executing command...')

    // Build command based on whether a specific model is targeted
    const command = `mapper generate${modelName ? ` -m ${modelName}` : ''}${settings.schemaPath ? ` -s ${settings.schemaPath}` : ''}`

    const response = await fetch('/api/_data-mapper/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    })

    if (!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`)
  }
  catch (error: any) {
    console.error('Failed to generate model(s):', error)
    logs.value.push(`❌ Error: ${error.message}`)
    showNotification(
      modelName
        ? `Failed to generate model: ${modelName}`
        : 'Failed to generate models',
      'error',
    )
  }
}

// Simplified wrapper functions
async function generateSingleModel(modelName: string) {
  await generateModels(modelName)
}

async function generateAllModels() {
  await generateModels()
}
</script>

<style scoped>
.data-mapper-admin {
  height: 100vh;
  background-color: #f9fafb;
}

.layout-container {
  display: flex;
  height: 100%;
  max-width: 2000px;
  margin: 0 auto;
}

.left-panel {
  flex: 0 0 300px;
  background-color: white;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.panel-content {
  padding: 24px;
}

.info-panel {
  margin-bottom: 24px;
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.model-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.model-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
}

.model-input:focus {
  outline: none;
  border-color: #00DC82;
  box-shadow: 0 0 0 2px rgba(0, 220, 130, 0.1);
}

.fields-section {
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-weight: 600;
  color: #374151;
  font-size: 1rem;
}

.fields-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-input {
  background-color: white;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.field-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.field-name {
  flex: 2;
  min-width: 120px;
}

.field-type-select {
  flex: 1;
  min-width: 100px;
}

.field-mapping {
  flex: 2;
}

.field-name,
.field-type-select,
.field-mapping {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.field-name:focus,
.field-type-select:focus,
.field-mapping:focus {
  outline: none;
  border-color: #00DC82;
  box-shadow: 0 0 0 2px rgba(0, 220, 130, 0.1);
}

.required-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-size: 0.875rem;
  color: #374151;
  padding: 0 8px;
}

.required-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
}

.required-checkbox input[type="checkbox"]:checked {
  background-color: #00DC82;
  border-color: #00DC82;
}

.custom-button {
  padding: 6px 12px;
  color: #00DC82;
  background: white;
  border: 1px solid #00DC82;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.custom-button:hover {
  background-color: #ecfdf5;
}

.remove-button {
  padding: 4px 8px;
  color: #6b7280;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  transition: all 0.2s;
}

.remove-button:hover {
  color: #ef4444;
  background-color: #fee2e2;
}

.right-panel {
  flex: 1;
  overflow: hidden;
  background-color: #f9fafb;
}

.diagram-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.diagram-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background-color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.diagram-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.diagram-content {
  flex: 1;
  padding: 24px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.diagram-content.with-logs {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 24px;
}

.mermaid-wrapper {
  position: relative;
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  height: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  touch-action: none;
  user-select: none;
}

.execute-button {
  padding: 12px 24px;
  background-color: #00DC82;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0;
}

.execute-button:hover {
  background-color: #00c074;
  transform: translateY(-1px);
}

.execute-button:active {
  transform: translateY(0);
}

.update-button {
  background-color: #6366f1;
}

.update-button:hover {
  background-color: #4f46e5;
}

:deep(svg) {
  width: 100% !important;
  height: 100% !important;
  will-change: transform;
  transform-origin: center center;
  transition: none;
}

:deep(svg:active) {
  cursor: grabbing;
}

:deep(.er.entityBox) {
  cursor: default;
  transition: all 0.2s ease;
}

:deep(.er.entityBox:hover) {
  opacity: 1;
  filter: none;
}

:deep(.er.entityLabel) {
  pointer-events: none;
}

/* Add styles for context menu */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 4px 0;
  min-width: 160px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
  transition: background-color 0.2s;
}

.context-menu-item:hover {
  background-color: #f3f4f6;
}

/* Add divider between items */
.context-menu-item + .context-menu-item {
  border-top: 1px solid #e5e7eb;
}

.action-button {
  padding: 8px 16px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
}

.action-button:hover {
  background-color: #e5e7eb;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  /* Keep this lower than floating-zoom-controls */
  z-index: 1000;
}

.dialog-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-button:hover {
  color: #ef4444;
  background-color: #fee2e2;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.dialog-body pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #374151;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.copy-button {
  padding: 6px 12px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
}

.copy-button:hover {
  background-color: #e5e7eb;
}

.copy-button.success {
  background-color: #34d399;
  border-color: #34d399;
  color: white;
}

.dialog-body pre {
  margin: 0;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.dialog-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Update Prism syntax highlighting colors to match VS Code Dark+ theme */
:deep(.token.comment) {
  color: #6A9955; /* Dark+ comment color */
}

:deep(.token.property) {
  color: #07a; /* Dark+ variable color */
}

:deep(.token.string) {
  color: #CE9178; /* Dark+ string color */
}

:deep(.token.number) {
  color: #B5CEA8; /* Dark+ number color */
}

:deep(.token.boolean) {
  color: #569CD6; /* Dark+ keyword color */
}

:deep(.token.punctuation) {
  color: #D4D4D4; /* Dark+ punctuation color */
}

:deep(.token.keyword) {
  color: #56d678; /* Dark+ keyword color */
}

:deep(.token.operator) {
  color: #D4D4D4; /* Dark+ operator color */
}

:deep(.token.function) {
  color: #DCDCAA; /* Dark+ function color */
}

:deep(.token.class-name) {
  color: #4EC9B0; /* Dark+ class color */
}

.input-group {
  position: relative;
  width: 100%;
}

.error-message {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  padding: 8px 12px;
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 6px;
  color: #ef4444;
  font-size: 0.875rem;
  z-index: 10;
  width: 100%;
}

.form-input.error {
  border-color: #ef4444;
}

/* Add styles for zoom controls */
.diagram-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.zoom-button {
  display: none;
}

.edit-modal {
  width: 95%;
  max-width: 1000px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #00DC82;
  box-shadow: 0 0 0 2px rgba(0, 220, 130, 0.1);
}

.form-select {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  background-color: white;
}

.form-section {
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 16px;
}

.section-subtitle {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.field-card {
  background-color: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.field-card-header {
  padding: 8px 12px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-number {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

.field-card-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
  font-size: 0.875rem;
}

.dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.dialog-footer button {
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  margin: 0;
}

.remove-button.subtle {
  color: #9ca3af;
  padding: 2px 6px;
}

.remove-button.subtle:hover {
  color: #ef4444;
  background-color: transparent;
}

.models-list {
  margin-top: 16px;
  background-color: transparent;
  border-radius: 8px;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.model-card {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-color: #00DC82;
}

.model-card-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-name {
  font-weight: 600;
  color: #111827;
  font-size: 1rem;
}

.model-stats {
  display: flex;
  gap: 8px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: #f3f4f6;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
}

.stat-item i {
  color: #00DC82;
  font-size: 0.875rem;
}

.stat-label {
  color: #6b7280;
}

/* Add new styles */
.model-actions {
  display: flex;
  justify-content: flex-end;
}

.model-card-header {
  position: relative;
}

.model-card-header .remove-button {
  position: absolute;
  top: -8px;
  right: -8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.model-card:hover .remove-button {
  opacity: 1;
}

.form-input.error,
.form-select.error {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 4px;
}

/* Add new styles */
.format-select {
  padding: 6px 12px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  height: 32px;
}

.format-select:hover {
  background-color: #e5e7eb;
}

.download-button {
  padding: 6px 12px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
}

.download-button:hover {
  background-color: #e5e7eb;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

/* Add new styles */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.save-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #00DC82;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-button:hover {
  background-color: #00c074;
  transform: translateY(-1px);
}

.save-button:active {
  transform: translateY(0);
}

/* Common Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 32px;
}

.btn-primary {
  background-color: #00DC82;
  color: white;
  border: none;
}

.btn-primary:hover {
  background-color: #00c074;
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.btn-danger {
  background-color: #fee2e2;
  color: #ef4444;
  border: 1px solid #fecaca;
}

.btn-danger:hover {
  background-color: #fecaca;
}

.btn-icon {
  padding: 4px 8px;
  height: 32px;
}

/* Common Form Styles */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-control {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  width: 100%;
}

.form-control:focus {
  outline: none;
  border-color: #00DC82;
  box-shadow: 0 0 0 2px rgba(0, 220, 130, 0.1);
}

.form-control.error {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.form-select {
  composes: form-control;
  appearance: none;
  background-image: url("data:image/svg+xml,...");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 32px;
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
}

.form-checkbox input[type="checkbox"]:checked {
  background-color: #00DC82;
  border-color: #00DC82;
}

/* Card Styles */
.card {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  padding: 12px 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-body {
  padding: 16px;
}

/* Add notification styles */
.notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 1100;
  animation: slideIn 0.3s ease-out;
}

.notification.success {
  background-color: #00DC82;
}

.notification.error {
  background-color: #ef4444;
}

.notification-icon {
  font-size: 1.125rem;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Add these styles */
.log-terminal {
  min-height: 300px;
  max-height: 300px;
  background-color: #1f2937;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #374151;
  border-bottom: 1px solid #4b5563;
}

.log-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #e5e7eb;
  margin: 0;
}

.log-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-wrapper {
  position: relative;
  width: 200px;
}

.filter-input {
  width: 100%;
  padding: 0.375rem 1.75rem 0.375rem 0.625rem;
  border: 1px solid #4b5563;
  border-radius: 4px;
  font-size: 0.875rem;
  background: #1f2937;
  color: #e5e7eb;
}

.filter-input:focus {
  outline: none;
  border-color: #00DC82;
}

.clear-search {
  position: absolute;
  right: 0.375rem;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: #9ca3af;
}

.filter-type {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #4b5563;
  border-radius: 4px;
  background: #1f2937;
  color: #e5e7eb;
  cursor: pointer;
  opacity: 0.5;
}

.filter-type.active {
  opacity: 1;
  border-color: #00DC82;
  background-color: #1f2937;
}

.log-control-button {
  width: 28px;
  height: 28px;
  padding: 0;
  background: #1f2937;
  border: 1px solid #4b5563;
  border-radius: 4px;
  color: #e5e7eb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.2s;
}

.log-control-button:hover {
  background: #374151;
  border-color: #00DC82;
}

.log-control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.log-line {
  color: #e5e7eb;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-line :deep(.command) { color: #00DC82; }
.log-line :deep(.path) { color: #60a5fa; }
.log-line :deep(.success) { color: #34d399; }
.log-line :deep(.warning) { color: #fbbf24; }
.log-line :deep(.error) { color: #ef4444; }
.log-line :deep(.icon) { color: #00DC82; }

.log-line :deep(.loading) {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #60a5fa;
}

.log-line :deep(.spinner) {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #60a5fa;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

.no-logs {
  color: #6b7280;
  text-align: center;
  padding: 2rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.model-actions {
  position: static;
  display: flex;
  gap: 4px;
}

.model-action-button {
  background: none;
  border: none;
  font-size: 1rem;
  padding: 4px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  border-radius: 4px;
  color: #374151;
}

.model-action-button:hover {
  opacity: 1;
  background-color: rgba(0, 220, 130, 0.1);
}

:deep(.er.entityBox) {
  position: relative;
}

.mermaid-container {
  position: relative;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  height: 100%;
  transform: translateZ(0);
  will-change: transform;
  pointer-events: all;
}

/* Add modifiers */
.mermaid-container.dragging {
  cursor: grabbing !important;
}

.mermaid-container.zooming :deep(svg) {
  transition: transform 0.3s ease !important;
}

.mermaid-container.dragging :deep(svg) {
  transition: none !important;
}

/* SVG styles */
.mermaid-container :deep(svg) {
  width: 100% !important;
  height: 100% !important;
  will-change: transform;
  transform-origin: center center;
  transition: transform 0.3s ease;
  z-index: 1;
}

.mermaid-container :deep(svg g) {
  transition: none;
}

/* Ensure SVG elements don't interfere with dragging */
.mermaid-container :deep(.er.entityBox),
.mermaid-container :deep(.er.relationshipLabelBox),
.mermaid-container :deep(.er.relationshipLine) {
  pointer-events: none;
}

/* Allow clicking on the background */
.mermaid-container :deep(.svg-pan-zoom_viewport) {
  pointer-events: all;
}

.floating-zoom-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1001; /* Ensure it's above other elements */
}

.floating-zoom-button {
  width: 32px;
  height: 32px;
  padding: 0;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.floating-zoom-button:hover {
  background-color: #f3f4f6;
  border-color: #00DC82;
  color: #00DC82;
}

/* Hide the original zoom controls */
.zoom-controls {
  display: none;
}

/* Ensure SVG doesn't overlap controls */
:deep(svg) {
  z-index: 1;
}

/* ... existing code ... */

.model-header-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.model-action-button {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid transparent;
  font-size: 1rem;
  padding: 4px;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s ease;
  border-radius: 4px;
  color: #374151;
}

.model-action-button:hover {
  opacity: 1;
  background-color: rgba(0, 220, 130, 0.1);
  border-color: #00DC82;
}

/* Add new styles */
.settings-dialog {
  max-width: 500px;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: #374151;
}

.help-text {
  color: #6b7280;
  font-size: 0.875rem;
}
</style>
