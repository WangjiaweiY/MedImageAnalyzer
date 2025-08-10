<template>
  <n-layout-header class="header" :class="{ 'header-collapsed': isHeaderCollapsed }">
    <div class="header-content">
      <div class="logo">迪英加科技病理阅片系统</div>
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
        <n-divider vertical />
        <n-button-group>
          <n-button 
            @click="changeLayout(101)"
            :type="layoutType === 101 ? 'primary' : 'default'"
            title="左大右小"
          >
            左大右小
          </n-button>
          <n-button 
            @click="changeLayout(102)"
            :type="layoutType === 102 ? 'primary' : 'default'"
            title="右大左小"
          >
            右大左小
          </n-button>
        </n-button-group>
        <!-- 配准按钮 -->
        <n-button @click="openRegistrationModal" type="primary" class="registration-btn">
          配准
        </n-button>
        
        <!-- 添加标注同步开关按钮 -->
        <n-tooltip trigger="hover" placement="bottom">
          <template #trigger>
            <n-button 
              circle 
              :type="isSyncAnnotation ? 'primary' : 'default'"
              @click="toggleSyncAnnotation"
              class="sync-annotation-btn"
            >
              <n-icon><SyncOutlined /></n-icon>
            </n-button>
          </template>
          {{ isSyncAnnotation ? '标注同步：开' : '标注同步：关' }}
        </n-tooltip>
        
        <!-- 添加染色信息显示开关按钮 -->
        <n-tooltip trigger="hover" placement="bottom">
          <template #trigger>
            <n-button 
              circle 
              :type="showStainInfo ? 'primary' : 'default'"
              @click="toggleStainInfo"
              class="stain-info-btn"
            >
              <n-icon><ExperimentOutlined /></n-icon>
            </n-button>
          </template>
          {{ showStainInfo ? '染色信息：显示' : '染色信息：隐藏' }}
        </n-tooltip>
        
        <!-- 分页控制按钮 -->
        <n-space class="pagination-controls" style="margin-left: 10px;">
          <n-tooltip trigger="hover" placement="bottom">
            <template #trigger>
              <n-button 
                circle 
                type="info" 
                size="small" 
                @click="prevPage"
                :disabled="!paginationInfo.hasPrevPage"
              >
                <n-icon><LeftOutlined /></n-icon>
              </n-button>
            </template>
            上一页
          </n-tooltip>
          
          <n-tooltip trigger="hover" placement="bottom">
            <template #trigger>
              <div class="page-info">
                {{ paginationInfo.currentPage }}/{{ paginationInfo.totalPages || 1 }}
              </div>
            </template>
            第 {{ paginationInfo.currentPage }} 页，共 {{ paginationInfo.totalPages || 1 }} 页
          </n-tooltip>
          
          <n-tooltip trigger="hover" placement="bottom">
            <template #trigger>
              <n-button 
                circle 
                type="info" 
                size="small" 
                @click="nextPage"
                :disabled="!paginationInfo.hasNextPage"
              >
                <n-icon><RightOutlined /></n-icon>
              </n-button>
            </template>
            下一页
          </n-tooltip>
        </n-space>
      </div>

      <div class="user-info">
        <!-- 上传文件夹按钮 - 改为打开模态框 -->
        <div class="folder-upload">
          <n-button type="primary" class="upload-btn" @click="openUploadModal">
            上传
          </n-button>
        </div>
        <n-dropdown :options="userOptions" @select="handleUserAction">
          <n-button text class="user-welcome">
            <n-icon class="user-icon"><UserOutlined /></n-icon>
            {{ username }}
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
import { ref, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { 
  NLayoutHeader, 
  NButton,
  NButtonGroup,
  NDropdown,
  NIcon, 
  NDivider,
  NSpace,
  NTooltip,
  useMessage
} from 'naive-ui'
import { DownOutlined, UpOutlined, LeftOutlined, RightOutlined, LogoutOutlined, UserOutlined, SyncOutlined, ExperimentOutlined, QuestionCircleOutlined } from '@vicons/antd'
import { useUserStore } from '@/stores/user'
import { useViewerStore } from '@/stores/viewer'

const props = defineProps({
  layoutType: {
    type: Number,
    required: true
  },
  isHeaderCollapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:layoutType', 
  'openRegistrationModal',
  'handleFolderAndUpload',
  'toggleHeader',
  'openUploadModal',
  'update:isSyncAnnotation',
  'toggleStainInfo',
  'openManualModal'
])

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()
const viewerStore = useViewerStore()
const username = computed(() => userStore.username || 'Guest')

// 标注同步开关
const isSyncAnnotation = ref(false)

// 切换标注同步状态
const toggleSyncAnnotation = () => {
  isSyncAnnotation.value = !isSyncAnnotation.value
  emit('update:isSyncAnnotation', isSyncAnnotation.value)
}

// 染色信息显示开关
const showStainInfo = ref(true)

// 切换染色信息显示状态
const toggleStainInfo = () => {
  showStainInfo.value = !showStainInfo.value
  emit('toggleStainInfo', showStainInfo.value)
}

// 分页相关
const paginationInfo = computed(() => {
  return viewerStore.getPaginationInfo()
})

// 翻页方法
const nextPage = () => {
  if (paginationInfo.value.hasNextPage) {
    viewerStore.nextPage()
  }
}

const prevPage = () => {
  if (paginationInfo.value.hasPrevPage) {
    viewerStore.prevPage()
  }
}

// 用户下拉菜单选项
const userOptions = [
  {
    label: '操作说明',
    key: 'manual',
    icon: () => h(NIcon, null, { default: () => h(QuestionCircleOutlined) })
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
    userStore.clearUserData()
    message.success('已退出登录')
    router.push('/')
  } else if (key === 'manual') {
    emit('openManualModal')
  }
}

const changeLayout = (num) => {
  emit('update:layoutType', num)
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

const openUploadModal = () => {
  emit('openUploadModal')
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
  background: linear-gradient(120deg, #0c63e4 0%, #1890ff 100%);
  color: white;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.header-collapsed {
  height: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-collapsed .header-content {
  opacity: 0;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: opacity 0.25s ease;
}

.logo {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  position: relative;
  display: flex;
  align-items: center;
}

.logo::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 40px;
  height: 2px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 2px;
}

.controls {
  flex: 1;
  margin: 0 40px;
  display: flex;
  align-items: center;
  gap: 12px;
}

:deep(.n-button-group) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

:deep(.n-button-group .n-button) {
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  padding: 0 12px;
  height: 32px;
  transition: all 0.3s ease;
}

:deep(.n-button-group .n-button:hover) {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

:deep(.n-button-group .n-button[type="primary"]) {
  background: rgba(255, 255, 255, 0.85);
  color: #0c63e4;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.registration-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  margin-left: 8px;
  padding: 0 16px;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.registration-btn::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: -100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s;
}

.registration-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.registration-btn:hover::after {
  left: 100%;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.folder-upload {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 600px;
}

.upload-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  transition: all 0.3s ease;
  padding: 0 18px;
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.upload-btn::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: -100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s;
}

.upload-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.upload-btn:hover::after {
  left: 100%;
}

.user-welcome {
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  transition: all 0.3s ease;
}

.user-welcome:hover {
  background: rgba(255, 255, 255, 0.22);
}

.user-icon {
  margin-right: 2px;
  opacity: 0.9;
}

.toggle-header-btn {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(120deg, #0c63e4 0%, #1890ff 100%);
  width: 36px;
  height: 20px;
  border-radius: 0 0 18px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 5;
}

.pagination-controls {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2px 4px;
}

:deep(.pagination-controls .n-button) {
  background: transparent;
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.pagination-controls .n-button:hover) {
  background: rgba(255, 255, 255, 0.2);
}

:deep(.pagination-controls .n-button:disabled) {
  color: rgba(255, 255, 255, 0.4);
  background: transparent;
}

.page-info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 24px;
  font-size: 12px;
  color: white;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 0 8px;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.page-info:hover {
  background-color: rgba(255, 255, 255, 0.25);
}

.toggle-header-btn:hover {
  background: linear-gradient(120deg, #0c63e4 0%, #40a9ff 100%);
  color: white;
}

.sync-annotation-btn {
  margin-left: 10px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  transition: all 0.3s ease;
  color: white;
}

:deep(.n-button.sync-annotation-btn:hover) {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

:deep(.n-button.sync-annotation-btn[type="primary"]) {
  background: rgba(24, 144, 255, 0.8);
  color: white;
}

.stain-info-btn {
  margin-left: 10px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  transition: all 0.3s ease;
  color: white;
}

:deep(.n-button.stain-info-btn:hover) {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

:deep(.n-button.stain-info-btn[type="primary"]) {
  background: rgba(24, 144, 255, 0.8);
  color: white;
}
</style> 