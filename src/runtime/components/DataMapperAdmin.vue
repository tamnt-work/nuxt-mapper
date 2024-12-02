<template>
  <div class="data-mapper-admin">
    <div class="layout-container">
      <!-- Left side: Commands -->
      <div class="commands-section">
        <div
          v-if="projectInfo"
          class="info-panel"
        >
          <h2 class="panel-title">
            🛠️ Data Mapper Tools
          </h2>
          <div class="project-path">
            <span class="info-label">📂 Project Path:</span>
            <div class="path-copy-wrapper">
              <code class="info-value">{{ projectPath }}</code>
              <button
                class="copy-button"
                :title="showCopyFeedback ? 'Copied!' : 'Copy path'"
                @click="() => copyToClipboard(projectPath)"
              >
                {{ showCopyFeedback ? '✓' : '📋' }}
              </button>
            </div>
          </div>
        </div>

        <div class="commands-container">
          <div
            v-for="cmd in commands"
            :key="cmd.command"
            class="command-card"
          >
            <div class="command-header">
              <div class="command-icon">
                {{ cmd.icon }}
              </div>
              <h3 class="command-name">
                {{ cmd.name }}
              </h3>
            </div>
            <p class="command-description">
              {{ cmd.description }}
            </p>
            <div class="command-options">
              <div
                v-if="cmd.requiresInput"
                class="service-tags-input"
              >
                <div class="tags-container">
                  <span
                    v-for="(tag, index) in serviceNameTags"
                    :key="index"
                    class="tag"
                  >
                    {{ tag }}
                    <button
                      class="remove-tag"
                      @click="removeServiceTag(index)"
                    >×</button>
                  </span>
                </div>
                <input
                  type="text"
                  class="service-input"
                  :placeholder="serviceNameTags.length ? '' : cmd.inputPlaceholder"
                  :maxlength="30"
                  :disabled="serviceNameTags.length >= 10"
                  @keydown="handleServiceNameInput"
                >
              </div>
              <label
                v-if="cmd.hasEslintOption"
                class="eslint-option"
              >
                <input
                  v-model="eslintFixOptions[cmd.command]"
                  type="checkbox"
                >
                Auto-fix ESLint issues
              </label>
            </div>
            <div
              v-if="!cmd.command.includes('service')"
              class="schema-section"
            >
              <div class="schema-header">
                <span class="info-label">{{ cmd.requiresFormPath ? '📝 Form Path:' : '📋 Schema Path:' }}</span>
                <button
                  class="custom-button"
                  @click="toggleCustomPath(cmd)"
                >
                  {{ showCustomPaths[cmd.command] ? '✖️ Hide' : '✏️ Edit' }}
                </button>
              </div>
              <div
                v-if="showCustomPaths[cmd.command]"
                class="schema-input-container"
              >
                <input
                  :value="customSchemaPaths[cmd.command]"
                  type="text"
                  class="schema-input"
                  :placeholder="cmd.requiresFormPath ? 'Enter form path' : 'Enter schema path'"
                  @input="(e) => customSchemaPaths[cmd.command] = (e.target as HTMLInputElement).value"
                >
              </div>
              <code
                v-else
                class="info-value"
              >{{ customSchemaPaths[cmd.command] || (cmd.requiresFormPath ? projectInfo?.formPath : projectInfo?.schemaPath) }}</code>
            </div>
            <button
              class="execute-button"
              :class="{ 'is-loading': commandStatus.loadingCommands?.has(cmd.command) }"
              :disabled="commandStatus.loadingCommands?.has(cmd.command) || (cmd.requiresInput && serviceNameTags.length === 0)"
              @click="executeCommand(cmd)"
            >
              <span
                v-if="commandStatus.loadingCommands?.has(cmd.command)"
                class="loader"
              />
              <span v-else>Execute</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right side: Logs Panel -->
      <div class="logs-panel">
        <div class="logs-header">
          <h3 class="logs-title">
            Execution Logs
          </h3>
          <div class="logs-controls">
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
              :disabled="!commandStatus.logs?.length"
              title="Clear logs"
              @click="clearLogs"
            >
              🗑️
            </button>
          </div>
        </div>

        <!-- Update the logs-content div to show logs in reverse order -->
        <div
          ref="logsContainer"
          class="logs-content"
          :class="{ 'has-logs': commandStatus.logs?.length }"
          @scroll="handleScroll"
        >
          <div
            v-if="commandStatus.logs?.length"
            class="command-logs"
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
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface ProjectInfo {
  projectPath: string
  schemaPath: string
  formPath: string
}

interface CommandStatus {
  loading: boolean
  success?: boolean
  message?: string
  id?: string
  logs?: string[]
  loadingCommands?: Set<string>
}

const projectInfo = ref<ProjectInfo>()
const customSchemaPaths = ref<Record<string, string>>({})
const showCustomPaths = ref<Record<string, boolean>>({})
const eslintFixOptions = ref<Record<string, boolean>>({})
const projectPath = ref('')
const ws = ref<WebSocket | null>(null)
const isConnected = ref(false)
const serviceNameTags = ref<string[]>([])
const maxLogLines = ref(100)

// Add this ref for the logs container
const logsContainer = ref<HTMLElement | null>(null)

// Add this ref to control auto-scrolling behavior
const shouldAutoScroll = ref(true)

// Add this near the top of the script section with other refs
const commandStatus = ref<CommandStatus>({
  loading: false,
  logs: [],
  loadingCommands: new Set<string>(),
})

// Add this ref for copy feedback
const showCopyFeedback = ref(false)

// Add these refs
const filterText = ref('')
const filterTypes = ref({
  error: true,
  warning: true,
  success: true,
  info: true,
})

// Add this computed property
const filteredLogs = computed(() => {
  if (!commandStatus.value.logs) return []

  return commandStatus.value.logs
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
        || log.toLowerCase().includes('created')
      )) return false
      if (!filterTypes.value.info && /^(?:ℹ|ℹ️)\s/.test(log)) return false

      return true
    })
    .slice(-maxLogLines.value)
})

const commands = [
  {
    name: 'Generate Mapper',
    command: 'mapper generate',
    icon: '📄',
    description: 'Generate mapper using schema.tw',
    hasEslintOption: true,
  },
  {
    name: 'Generate Service',
    command: 'service create',
    icon: '⚡',
    requiresInput: true,
    inputPlaceholder: 'Type service name and press Enter',
    description: 'Create new service(s) with specified names',
  },
  {
    name: 'Generate Form',
    command: 'form generate',
    icon: '📝',
    requiresFormPath: true,
    description: 'Generate form using form.tw',
    hasEslintOption: true,
  },
]

async function fetchProjectInfo() {
  try {
    const response = await fetch('/api/_data-mapper/execute')
    projectInfo.value = await response.json()
    projectPath.value = projectInfo.value?.projectPath || ''
    customSchemaPaths.value = projectInfo.value?.schemaPath || {}
    eslintFixOptions.value = projectInfo.value?.eslintFixOptions || {}
  }
  catch (error) {
    console.error('Failed to fetch project info:', error)
  }
}

// Initialize WebSocket connection
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
          if (!commandStatus.value.logs)
            commandStatus.value.logs = []
          commandStatus.value.logs.push(message.data)
          break

        case 'error':
          if (!commandStatus.value.logs)
            commandStatus.value.logs = []
          commandStatus.value.logs.push(`Error: ${message.data}`)
          break

        case 'end':
          if (commandStatus.value.id) {
            commandStatus.value.loadingCommands?.delete(commandStatus.value.id)

            // Clear service tags if service creation was successful
            if (commandStatus.value.id === 'service create' && message.data.success) {
              serviceNameTags.value = []
            }
          }
          commandStatus.value.loading = commandStatus.value.loadingCommands?.size > 0
          commandStatus.value.success = message.data.success

          // Remove loading message if command was successful
          if (message.data.success && commandStatus.value.logs) {
            commandStatus.value.logs = commandStatus.value.logs.filter(
              log => !log.includes('⏳ Executing command...'),
            )
          }
          break
      }
    }
    catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }
}

// Modify executeCommand to use WebSocket when available
async function executeCommand(cmd: typeof commands[0]) {
  const existingLogs = commandStatus.value.logs || []

  // Initialize loadingCommands if it doesn't exist
  if (!commandStatus.value.loadingCommands) {
    commandStatus.value.loadingCommands = new Set()
  }

  // Add the command to loadingCommands
  commandStatus.value.loadingCommands.add(cmd.command)

  commandStatus.value = {
    ...commandStatus.value,
    loading: true,
    id: cmd.command,
    logs: [
      ...existingLogs,
      '⏳ Executing command...',
    ],
    // Preserve the loadingCommands Set
    loadingCommands: commandStatus.value.loadingCommands,
  }

  try {
    let finalCommand = cmd.command

    if (cmd.requiresInput && serviceNameTags.value.length > 0) {
      finalCommand += ` -n ${serviceNameTags.value.join(',')}`
    }

    if (cmd.requiresFormPath) {
      finalCommand += ` --schema=${customSchemaPaths.value[cmd.command] || projectInfo.value?.formPath}`
    }
    else if (!cmd.requiresFormPath && !cmd.command.includes('service')) {
      finalCommand += ` --schema=${customSchemaPaths.value[cmd.command] || projectInfo.value?.schemaPath}`
    }

    if (cmd.hasEslintOption && eslintFixOptions.value[cmd.command]) {
      finalCommand += ' --fix'
    }

    const response = await fetch('/api/_data-mapper/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command: finalCommand }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Don't wait for response data since we'll get it through WebSocket
  }
  catch (error: any) {
    // Make sure we preserve the loadingCommands Set here too
    commandStatus.value = {
      ...commandStatus.value,
      loading: false,
      success: false,
      logs: [...(commandStatus.value.logs || []), `❌ Error: ${error.message}`],
      loadingCommands: commandStatus.value.loadingCommands,
    }
    commandStatus.value.loadingCommands.delete(cmd.command)
  }
}

function toggleCustomPath(cmd: typeof commands[0]) {
  showCustomPaths.value[cmd.command] = !showCustomPaths.value[cmd.command]

  // Initialize or update the path when showing edit mode
  if (showCustomPaths.value[cmd.command]) {
    const defaultPath = cmd.requiresFormPath ? projectInfo.value?.formPath : projectInfo.value?.schemaPath
    customSchemaPaths.value = {
      ...customSchemaPaths.value,
      [cmd.command]: customSchemaPaths.value[cmd.command] || defaultPath || '',
    }
  }
}

// Initialize WebSocket on component mount
onMounted(() => {
  fetchProjectInfo()
  initWebSocket()
})

// Clean up WebSocket on component unmount
onUnmounted(() => {
  if (ws.value) {
    ws.value.close()
  }
})

// Add this method in the <script setup> section
function formatLogLine(log: string) {
  // Add loading indicator formatting with spinner
  log = log.replace(
    /^(⏳\sExecuting command\.\.\.)/g,
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

  // Highlight errors (already handled by error-log class, but can be enhanced)
  log = log.replace(/(error|failed|failure):/gi, '<span class="error">$1:</span>')

  // Highlight consola icons (✔, ℹ, ⚠, ✖)
  log = log.replace(/^([✔ℹ⚠✖]\s)/g, '<span class="icon">$1</span>')

  return log
}

function handleServiceNameInput(event: KeyboardEvent) {
  const input = event.target as HTMLInputElement
  const value = input.value.trim()

  if (event.key === 'Enter' && value) {
    // Split by comma and filter out empty strings
    const newTags = value.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '')

    // Add new tags while respecting the 10-tag limit
    for (const tag of newTags) {
      if (serviceNameTags.value.length < 10) {
        serviceNameTags.value.push(tag)
      }
    }
    input.value = ''
  }
  else if (event.key === 'Backspace' && !value && serviceNameTags.value.length > 0) {
    serviceNameTags.value.pop()
  }
}

function removeServiceTag(index: number) {
  serviceNameTags.value.splice(index, 1)
}

function clearLogs() {
  if (commandStatus.value.logs)
    commandStatus.value.logs = []
}

// Modify the watch to handle scrolling with delay
watch(() => commandStatus.value.logs, (newLogs) => {
  if (!newLogs) return

  // Add delay before scrolling
  setTimeout(() => {
    if (logsContainer.value && shouldAutoScroll.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  }, 250)
}, { deep: true })

// Add scroll event handler
function handleScroll(event: Event) {
  const container = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = container

  // Consider user at bottom if within 50px of bottom
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
  shouldAutoScroll.value = isAtBottom
}

// Modify the copyToClipboard function
async function copyToClipboard(text: string) {
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
    showCopyFeedback.value = true
    setTimeout(() => {
      showCopyFeedback.value = false
    }, 2000)
  }
  catch (error) {
    console.error('Failed to copy text:', error)
  }
}
</script>

<style scoped>
.data-mapper-admin {
  height: 100vh;
}

.info-panel {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.1);
  margin-bottom: 2rem;
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-weight: 500;
  color: #4b5563;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-value {
  font-size: 0.875rem;
  background-color: #f9fafb;
  padding: 0.75rem;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #374151;
  word-break: break-all;
}

.schema-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.schema-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.custom-button {
  font-size: 0.875rem;
  color: #00DC82;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.custom-button:hover {
  background-color: #ecfdf5;
}

.schema-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.schema-input:focus {
  outline: none;
  border-color: #00DC82;
  box-shadow: 0 0 0 2px rgba(0, 220, 130, 0.1);
}

.commands-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.command-card {
  display: flex;
  flex-direction: column;
  min-height: 280px;
  padding: 1.5rem;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.command-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.command-icon {
  font-size: 2rem;
}

.command-info {
  text-align: center;
}

.command-name {
  font-size: 1rem;
  font-weight: 500;
  color: #1f2937;
  margin: 0;
}

.execute-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  background-color: #00DC82;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  margin-top: auto;
}

.execute-button.is-loading {
  background-color: #86efac;
  cursor: not-allowed;
}

.execute-button:hover:not(.is-loading):not(:disabled) {
  background-color: #00c074;
  transform: translateY(-1px);
}

.execute-button:active:not(.is-loading):not(:disabled) {
  transform: translateY(0);
}

.execute-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loader {
  width: 1rem;
  height: 1rem;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status-message {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 1rem;
  border-radius: 6px;
  animation: slideIn 0.3s ease-out;
  z-index: 1000;
}

.status-success {
  background-color: #00DC82;
  color: white;
}

.status-error {
  background-color: #EF4444;
  color: white;
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

@media (max-width: 1400px) {
  .layout-container {
    grid-template-columns: 1fr 400px;
  }
}

.service-input {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.875rem;
}

.service-input:focus {
  outline: none;
  border-color: #00DC82;
  box-shadow: 0 0 0 2px rgba(0, 220, 130, 0.1);
}

.command-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.command-description {
  flex-grow: 0;
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0.5rem 0 1rem;
  text-align: center;
}

.command-options {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

.eslint-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
  cursor: pointer;
}

.eslint-option input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
}

.eslint-option input[type="checkbox"]:checked {
  background-color: #00DC82;
  border-color: #00DC82;
}

.project-path {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  width: 100%;
}

.path-copy-wrapper {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
}

.info-value {
  font-size: 0.875rem;
  background-color: #f9fafb;
  padding: 0.75rem;
  border-radius: 6px 0 0 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #374151;
  word-break: break-all;
  flex: 1;
}

.copy-button {
  background-color: #f9fafb;
  border: none;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 0 6px 6px 0;
  transition: all 0.2s ease;
  border-left: 1px solid #e5e7eb;
}

.copy-button:hover {
  background-color: #f3f4f6;
}

.command-logs {
  margin: 1rem 0;
  padding: 0.75rem;
  background-color: #1f2937;
  border-radius: 6px;
  max-height: calc(100vh - 130px);
  font-family: monospace;
}

.log-line {
  color: #e5e7eb;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.layout-container {
  display: grid;
  grid-template-columns: 1fr 500px;
  gap: 0;
  height: 100vh;
  max-width: 2000px;
  margin: 0 auto;
}

.commands-section {
  overflow-y: auto;
  padding: 1.5rem;
}

.logs-panel {
  background-color: #ffffff;
  border-radius: 0;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.logs-title {
  padding: 1rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}

.logs-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background-color: #1f2937;
  margin: 1rem;
  border-radius: 6px;
  color: #e5e7eb;
}

.logs-content.has-logs {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.no-logs {
  color: #9ca3af;
  text-align: center;
  padding: 2rem;
}

.command-logs {
  margin: 0;
  padding: 0;
}

.log-line {
  padding: 0.25rem 0;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-log {
  color: #ef4444;
}

@media (max-width: 1024px) {
  .layout-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .logs-panel {
    height: 400px;
  }

  .data-mapper-admin {
    padding: 0;
  }
}

.log-line :deep(.command) { color: #00DC82; }
.log-line :deep(.path) { color: #60a5fa; }
.log-line :deep(.success) { color: #34d399; }
.log-line :deep(.warning) { color: #fbbf24; }
.log-line :deep(.error) { color: #ef4444; }
.log-line :deep(.icon) {
  color: #00DC82;
  font-weight: bold;
}

.service-tags-input {
  width: 100%;
  min-height: 42px;
  padding: 0.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.service-tags-input:focus-within {
  border-color: #00DC82;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag {
  background-color: #e5e7eb;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.remove-tag {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  color: #6b7280;
}

.remove-tag:hover {
  color: #ef4444;
}

.service-input {
  border: none;
  padding: 0.25rem;
  flex: 1;
  min-width: 120px;
  outline: none;
  display: inline-block;
}

.service-input:focus {
  box-shadow: none;
  outline: none;
}

.log-settings-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #6b7280;
}

.log-settings-button:hover {
  color: #00DC82;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.logs-controls {
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
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.filter-input:focus {
  outline: none;
  border-color: #00DC82;
  box-shadow: 0 0 0 2px rgba(0, 220, 130, 0.1);
}

.clear-search {
  position: absolute;
  right: 0.375rem;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: #6b7280;
  font-size: 1rem;
  padding: 0.125rem;
}

.clear-search:hover {
  color: #374151;
}

.filter-types {
  display: flex;
  gap: 0.25rem;
}

.filter-type {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  opacity: 0.5;
}

.filter-type:hover {
  background-color: #f3f4f6;
}

.filter-type.active {
  opacity: 1;
  border-color: #00DC82;
  background-color: #ecfdf5;
}

.log-control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.log-control-button:hover:not(:disabled) {
  background-color: #f3f4f6;
}

.log-control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.logs-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.log-line :deep(.loading) {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #60a5fa;  /* Light blue color for loading state */
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
