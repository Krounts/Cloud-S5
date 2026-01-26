<template>
  <div id="map" style="height: 100vh; width: 100%"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import L from 'leaflet'

onMounted(() => {
  const map = L.map('map').setView([-18.8792, 47.5079], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
})
</script>
