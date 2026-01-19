<template>
  <RouterView v-slot="slotProps">
    <keep-alive>
      <component :is="slotProps.Component"></component>
    </keep-alive>
  </RouterView>
</template>

<script setup lang="ts">
</script>

<style scoped>
</style>
