import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cliPath = path.join(__dirname, '../dist/tw.mjs')

const content = fs.readFileSync(cliPath, 'utf8')
fs.writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`)
fs.chmodSync(cliPath, '755') // Make the file executable
