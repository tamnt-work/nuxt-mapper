<template>
  <div class="flex min-h-screen bg-white dark:bg-gray-900">
    <!-- Mobile Menu Button -->
    <button
      class="lg:hidden fixed top-4 left-4 z-20 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      @click="isMobileMenuOpen = !isMobileMenuOpen"
    >
      <span class="text-gray-600 dark:text-gray-300">
        {{ isMobileMenuOpen ? '✕' : '☰' }}
      </span>
    </button>

    <!-- Sidebar Navigation -->
    <aside
      class="fixed inset-y-0 w-72 border-r border-gray-200 dark:border-gray-800 overflow-y-auto transition-transform duration-300 lg:translate-x-0 bg-white dark:bg-gray-900"
      :class="[isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full']"
    >
      <div class="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800">
        <div class="flex justify-between items-center">
          <NuxtLink
            to="/"
            class="flex items-center space-x-3"
          >
            <span class="text-xl font-bold text-gray-900 dark:text-white">Documentation</span>
          </NuxtLink>
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="toggleDarkMode"
          >
            <span
              v-if="isDark"
              class="text-yellow-500"
            >🌙</span>
            <span
              v-else
              class="text-yellow-500"
            >☀️</span>
          </button>
        </div>
      </div>

      <nav class="p-4">
        <ContentNavigation v-slot="{ navigation }">
          <div class="space-y-3">
            <div
              v-for="link in navigation"
              :key="link._path"
            >
              <!-- Parent link -->
              <NuxtLink
                :to="link._path"
                class="block py-2 px-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                :class="{ 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white': $route.path === link._path }"
              >
                {{ link.title }}
              </NuxtLink>

              <!-- Child links -->
              <div
                v-if="link.children"
                class="ml-4 mt-2 space-y-2"
              >
                <NuxtLink
                  v-for="child in link.children"
                  :key="child._path"
                  :to="child._path"
                  class="block py-1.5 px-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                  :class="{ 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white': $route.path === child._path }"
                >
                  {{ child.title }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </ContentNavigation>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 lg:ml-72">
      <div class="max-w-4xl mx-auto px-4 sm:px-8 py-12">
        <article class="prose dark:prose-invert max-w-none">
          <slot />
        </article>
      </div>
    </main>
  </div>
</template>

<script setup>
const isDark = ref(false)
const isMobileMenuOpen = ref(false)

// Check initial dark mode preference
onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
})

// Toggle dark mode
const toggleDarkMode = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark')
  localStorage.setItem('dark-mode', isDark.value ? 'dark' : 'light')
}

// Initialize dark mode based on user preference
onMounted(() => {
  const darkMode = localStorage.getItem('dark-mode')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  if (darkMode === 'dark' || (!darkMode && prefersDark)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
})
</script>
