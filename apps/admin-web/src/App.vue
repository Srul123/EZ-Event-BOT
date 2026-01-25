<template>
  <div id="app">
    <router-view />
    <NotificationContainer />
  </div>
</template>

<script setup>
import NotificationContainer from './components/common/NotificationContainer.vue'
</script>
