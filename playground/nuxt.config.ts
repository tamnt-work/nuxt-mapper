export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },

  compatibilityDate: '2024-11-01',

  dataMapper: {
    watch: true,
    fixEslint: true,
  },
})
