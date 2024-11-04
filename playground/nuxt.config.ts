export default defineNuxtConfig({
  modules: ['../src/module', '@nuxt/content', '@nuxtjs/tailwindcss'],
  devtools: { enabled: true },
  content: {
    highlight: {
      theme: 'github-dark',
      preload: ['json', 'js', 'ts', 'yaml', 'markdown', 'bash', 'vue'],
    },
    markdown: {
      toc: {
        depth: 3,
        searchDepth: 3,
      },
    },
  },
  compatibilityDate: '2024-11-01',

  dataMapper: {
    watch: false,
    fixEslint: true,
  },
  tailwindcss: {
    config: {
      darkMode: 'class',
    },
  },
})
