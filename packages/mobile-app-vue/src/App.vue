<template>
  <div>
    <nav class="tabs">
      <router-link to="/map">Map</router-link>
      <router-link to="/report">Report</router-link>
      <router-link to="/profile">Profile</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>

<style>
.tabs { display: flex; gap: 1rem; padding: 0.5rem; background: #f5f5f5; }
.tabs a { text-decoration: none; }
</style>
