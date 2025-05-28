<template>
  <n-layout-header class="header" :class="{ 'header-collapsed': isHeaderCollapsed }">
    <div class="header-content">
      <div class="logo">多免疫组化病理图像智能分析系统</div>
      <div class="controls">
        <n-button-group>
          <n-button 
            v-for="num in [1, 2, 4, 9, 16]" 
            :key="num"
            @click="changeLayout(num)"
            :type="layoutType === num ? 'primary' : 'default'"
          >
            {{ num }}图模式
          </n-button>
        </n-button-group>
        <!-- 配准按钮 -->
        <n-button @click="openRegistrationModal" type="primary" class="registration-btn">
          配准
        </n-button>
      </div>

      <!-- 状态栏：显示上传或配准状态，只有 visible 为 true 时显示 -->
      <div class="status-bar" v-if="statusBar.visible">
        <span>
          {{ statusBar.operation === 'ihc' ? '文件' : '文件夹' }}{{ statusBar.folder }}
          {{
            statusBar.operation === 'upload'
              ? (statusBar.finished ? '上传完毕' : '正在上传中...')
              : statusBar.operation === 'register'
                ? (statusBar.finished ? '配准完毕' : '正在配准中...')
                : (statusBar.finished ? '分析完毕' : '正在分析中...')
          }}
          ，已用时：{{ statusBar.elapsed }} 秒
        </span>
        <!-- 只有在 finished（成功或失败）后才显示关闭按钮 -->
        <button v-if="statusBar.finished" @click="closeStatusBar" class="close-status-btn">×</button>
      </div>

      <div class="user-info">
        <!-- 上传文件夹 -->
        <div class="folder-upload">
          <label class="folder-upload-label">
            <input type="file" webkitdirectory multiple @change="handleFolderAndUpload" class="folder-input" />
            <span class="folder-upload-button">上传</span>
          </label>
        </div>
        <n-dropdown :options="userOptions" @select="handleUserAction">
          <n-button text class="user-welcome">
            Welcome, {{ username }}
            <n-icon><DownOutlined /></n-icon>
          </n-button>
        </n-dropdown>
      </div>
    </div>
    <!-- 隐藏/显示按钮 -->
    <div class="toggle-header-btn" @click="toggleHeader">
      <n-icon>
        <DownOutlined v-if="isHeaderCollapsed" />
        <UpOutlined v-else />
      </n-icon>
    </div>
  </n-layout-header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  NLayoutHeader, 
  NButton,
  NButtonGroup,
  NDropdown,
  NIcon, 
} from 'naive-ui'
import { DownOutlined, UpOutlined } from '@vicons/antd'
import { useUserStore } from '@/stores/user'
import { useMessage } from 'naive-ui'

const props = defineProps({
  layoutType: {
    type: Number,
    required: true
  },
  statusBar: {
    type: Object,
    required: true
  },
  isHeaderCollapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:layoutType', 
  'closeStatusBar', 
  'openRegistrationModal',
  'handleFolderAndUpload',
  'toggleHeader'
])

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()
const username = computed(() => userStore.username || 'Guest')

// 用户下拉菜单选项
const userOptions = [
  {
    label: '个人设置',
    key: 'settings',
    icon: () => h(NIcon, null, { default: () => h(SettingOutlined) })
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: () => h(NIcon, null, { default: () => h(LogoutOutlined) })
  }
]

// 处理用户菜单操作
const handleUserAction = (key) => {
  if (key === 'logout') {
    router.push('/')
  }
}

const changeLayout = (num) => {
  emit('update:layoutType', num)
}

const closeStatusBar = () => {
  emit('closeStatusBar')
}

const openRegistrationModal = () => {
  emit('openRegistrationModal')
}

const handleFolderAndUpload = (event) => {
  emit('handleFolderAndUpload', event)
}

const toggleHeader = () => {
  emit('toggleHeader')
}

const showScreenRecorder = ref(false)

const openScreenRecorder = () => {
  showScreenRecorder.value = true
}
</script>

<style scoped>
.header {
  height: 64px;
  padding: 0 24px;
  background: #1890ff;
  color: white;
  position: relative;
  transition: height 0.3s ease;
}

.header-collapsed {
  height: 10px;
  overflow: hidden;
}

.header-collapsed .header-content {
  opacity: 0;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: opacity 0.2s ease;
}

.logo {
  font-size: 18px;
  font-weight: 600;
}

.controls {
  flex: 1;
  margin: 0 40px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-bar {
  background: #fff;
  color: #333;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-right: 280px;
}

.close-status-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
}

.folder-upload {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 600px;
}

.folder-upload-label {
  position: relative;
  display: inline-block;
  cursor: pointer;
  background-color: #f0faff;
  padding: 8px 16px;
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-weight: 500;
  flex: 1;
  text-align: center;
  max-width: 300px;
  margin-right: 150px;
}

.folder-upload-label:hover {
  background-color: #c7edff;
}

.folder-input {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.folder-upload-button {
  pointer-events: none;
}

.screen-recorder-button {
  margin-right: 16px;
}

.toggle-header-btn {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #1890ff;
  width: 30px;
  height: 20px;
  border-radius: 0 0 15px 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.toggle-header-btn:hover {
  background: #40a9ff;
}
</style> 