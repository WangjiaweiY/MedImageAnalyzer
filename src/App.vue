<template>
  <n-config-provider>
    <n-message-provider>
      <router-view></router-view>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { NConfigProvider, NMessageProvider } from 'naive-ui'
</script>

<style>
body {
  margin: 0;
  padding: 0;
}
</style> 