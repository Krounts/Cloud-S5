<template>
  <div class="container">
    <h2>Report Road Work</h2>
    <form @submit.prevent="submit">
      <input v-model="title" placeholder="Title" />
      <textarea v-model="description" placeholder="Description"></textarea>
      <input v-model.number="area" type="number" placeholder="Area (m²)" />
      <input v-model.number="budget" type="number" placeholder="Budget" />
      <input v-model="company" placeholder="Company" />
      <button type="submit">Submit</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const title = ref('')
const description = ref('')
const area = ref<number | null>(null)
const budget = ref<number | null>(null)
const company = ref('')

const submit = async () => {
  alert('Submit not implemented; wire to API later.')
}
</script>

<style>
.container { padding: 1rem; }
</style>
