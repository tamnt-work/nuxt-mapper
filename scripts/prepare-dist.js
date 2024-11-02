import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Create dist directory if it doesn't exist
mkdirSync(join(__dirname, '../dist'), { recursive: true })

// Create package.json for dist directory
const distPackageJson = {
  type: 'module',
  exports: {
    '.': {
      import: './module.mjs',
      require: './module.cjs',
    },
    './cli': './tw.mjs',
  },
}

writeFileSync(
  join(__dirname, '../dist/package.json'),
  JSON.stringify(distPackageJson, null, 2),
)
