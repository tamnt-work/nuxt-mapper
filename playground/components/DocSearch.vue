<template>
  <div class="relative">
    <ContentSearch
      v-model="search"
      class="w-full px-4 py-2 border rounded-lg"
      placeholder="Search documentation..."
    />
    <ul
      v-if="results.length"
      class="absolute w-full mt-2 bg-white border rounded-lg shadow-lg"
    >
      <li
        v-for="result in results"
        :key="result._path"
      >
        <NuxtLink
          :to="result._path"
          class="block px-4 py-2 hover:bg-gray-100"
        >
          {{ result.title }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup>
const search = ref('')
const { results } = await useAsyncData('search', () =>
  queryContent()
    .where({ title: { $contains: search.value } })
    .find(),
)
</script>
