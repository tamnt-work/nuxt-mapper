export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  css: ['~/assets/styles/main.scss'],
  compatibilityDate: '2024-11-01',

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  dataMapper: {
    watch: false,
    fixEslint: true,
  },
})
