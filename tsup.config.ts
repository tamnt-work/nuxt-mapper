import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/bin/tw.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node16',
  platform: 'node',
  external: [
    'events',
    'fs',
    'path',
    'util',
    'assert',
    'stream',
    'chokidar',
    /node_modules/,
  ],
  outExtension: () => ({
    js: `.mjs`,
  }),
  async onSuccess() {
    // Using node's fs/promises to copy files
    const { cp } = await import('node:fs/promises')
    await cp('src/bin/templates', 'dist/templates', { recursive: true })
  },
})
