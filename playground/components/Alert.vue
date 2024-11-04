<template>
  <div
    :class="[
      'p-4 mb-4 rounded-lg',
      typeClasses[type],
    ]"
  >
    <slot />
  </div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'info',
  },
})

const typeClasses = {
  info: 'bg-blue-50 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  success: 'bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  warning: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  error: 'bg-red-50 text-red-800 dark:bg-red-900/50 dark:text-red-300',
}
</script>
