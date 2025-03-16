<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <router-view></router-view>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { NConfigProvider, NMessageProvider } from 'naive-ui'
const themeOverrides = {
  common: {
    primaryColor: '#e6f7ff',
    primaryColorHover: '#e6f7ff',
    primaryColorPressed: '#e6f7ff',
  },
  Button: {
    color: '#e6f7ff',
    textColor: '#1890ff',
    border: '1px solid #d9d9d9',
    borderRadius: '4px',
    colorPrimary: '#e6f7ff',
    textColorPrimary: '#1890ff',
    borderPrimary: '1px solid #1890ff',
    borderRadiusPrimary: '4px',
    colorHover: '#c7edff',
    textColorHover: '#1890ff',
    borderHover: '1px solid #40a9ff',
    colorHoverPrimary: '#c7edff',
    textColorHoverPrimary: '#1890ff',
    borderHoverPrimary: '1px solid #40a9ff',
    colorPressed: '#e6f7ff',
    textColorPressed: '#1890ff',
    borderPressed: '1px solid #096dd9',
    colorPressedPrimary: '#c7edff',
    textColorPressedPrimary: '#1890ff',
    borderPressedPrimary: '1px solid #096dd9',
    colorFocus: '#e6f7ff',
    textColorFocus: '#1890ff',
    borderFocus: '1px solid #1890ff',
    colorFocusPrimary: '#c7edff',
    textColorFocusPrimary: '#1890ff',
    borderFocusPrimary: '1px solid #1890ff',
    colorDisabled: '#f0faff',
    textColorDisabled: '#d9d9d9',
    borderDisabled: '1px solid #d9d9d9',
    colorDisabledPrimary: '#c7edff',
    textColorDisabledPrimary: '#d9d9d9',
    borderDisabledPrimary: '1px solid #d9d9d9'
  },
  Select: {
    peers: {
      InternalSelection: {
        textColor: '#1890ff'
      }
    }
  }
};

</script>

<style>
body {
  margin: 0;
  padding: 0;
}
</style> 