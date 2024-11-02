import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    {
      input: './src/module',
      name: 'module',
    },
  ],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      target: 'node18',
    },
    output: {
      exports: 'named',
    },
  },
  externals: [
    '@nuxt/kit',
    '@nuxt/schema',
    'citty',
    'chokidar',
    'consola',
    'yaml',
    'node:*',
  ],
})
