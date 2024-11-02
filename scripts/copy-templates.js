import { cp } from 'node:fs/promises'

try {
  await cp('src/bin/templates', 'dist/templates', { recursive: true })
  console.log('Templates copied successfully')
}
catch (error) {
  console.error('Error copying templates:', error)
  process.exit(1)
}
