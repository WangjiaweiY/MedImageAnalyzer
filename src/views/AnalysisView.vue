<template>
  <n-layout class="layout">
    <!-- 顶部导航栏 -->
    <n-layout-header class="header">
      <div class="header-content">
        <div class="logo">西北大学智能信息处理实验室-医学影像病理图像</div>
        <div class="user-info">
          <n-dropdown :options="userOptions" @select="handleUserAction">
            <n-button text
            class="admin">
              管理员
              <template #icon>
                <n-icon><UserOutlined /></n-icon>
              </template>
            </n-button>
          </n-dropdown>
        </div>
      </div>
    </n-layout-header>

    <n-layout has-sider>
      <!-- 侧边栏 -->
      <n-layout-sider
        bordered
        collapse-mode="width"
        :collapsed-width="64"
        :width="240"
        :collapsed="collapsed"
        show-trigger
        @collapse="collapsed = true"
        @expand="collapsed = false"
      >
        <n-menu
          :collapsed="collapsed"
          :collapsed-width="64"
          :collapsed-icon-size="22"
          :options="menuOptions"
          :value="selectedKey"
          @update:value="handleMenuSelect"
        />
      </n-layout-sider>

      <!-- 主要内容区域 -->
      <n-layout-content class="content">
        <div class="image-container">
          <div class="image-box">
            <h3>原始图像</h3>
            <div 
              class="image-view" 
              @wheel="zoomImage($event, 'original')"
              @mousedown="startDrag($event, 'original')"
            >
              <img 
                :src="originalImage" 
                alt="原始图像" 
                :style="{ transform: `scale(${scale}) translate(${translateXOriginal}px, ${translateYOriginal}px)`, transformOrigin: transformOriginOriginal }"
              >
            </div>
          </div>
          <div class="image-box">
            <h3>分割结果</h3>
            <div 
              class="image-view" 
              @wheel="zoomImage($event, 'segmented')"
              @mousedown="startDrag($event, 'segmented')"
            >
              <img 
                :src="segmentedImage" 
                alt="分割图像" 
                :style="{ transform: `scale(${scale}) translate(${translateXSegmented}px, ${translateYSegmented}px)`, transformOrigin: transformOriginSegmented }"
              >
            </div>
          </div>
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup>
import { ref, h } from 'vue'
import { useRouter } from 'vue-router'
import { 
  NLayout, 
  NLayoutHeader, 
  NLayoutContent, 
  NLayoutSider,
  NMenu,
  NButton,
  NDropdown,
  NIcon
} from 'naive-ui'
import { 
  HomeOutlined, 
  UserOutlined, 
  SettingOutlined,
  FileImageOutlined,
  LogoutOutlined
} from '@vicons/antd'

const router = useRouter()
const collapsed = ref(false)
const selectedKey = ref('image-analysis')

// 图片路径
const originalImage = ref('/imgs/binary_segmentation.png')
const segmentedImage = ref('/imgs/binary_segmentation-mask.png')

// 初始缩放比例设置为 2.5
const scale = ref(2.5)

// 缩放中心
const transformOriginOriginal = ref('center center')
const transformOriginSegmented = ref('center center')

// 平移位置
const translateXOriginal = ref(0)
const translateYOriginal = ref(0)
const translateXSegmented = ref(0)
const translateYSegmented = ref(0)

// 菜单配置
const menuOptions = [
  {
    label: '首页',
    key: 'home',
    icon: renderIcon(HomeOutlined)
  },
  {
    label: '图像分析',
    key: 'image-analysis',
    icon: renderIcon(FileImageOutlined)
  },
  {
    label: '系统设置',
    key: 'settings',
    icon: renderIcon(SettingOutlined)
  }
]

// 用户下拉菜单选项
const userOptions = [
  {
    label: '个人设置',
    key: 'settings',
    icon: renderIcon(SettingOutlined)
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon(LogoutOutlined)
  }
]

// 渲染图标的辅助函数
function renderIcon(icon) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

// 处理用户菜单操作
const handleUserAction = (key) => {
  if (key === 'logout') {
    router.push('/')
  }
}

// 处理侧边栏菜单选择
const handleMenuSelect = (key) => {
  selectedKey.value = key
}

// 图片缩放功能
const zoomImage = (event, type) => {
  event.preventDefault()
  const scaleChange = event.deltaY > 0 ? -0.1 : 0.1
  scale.value = Math.min(Math.max(scale.value + scaleChange, 0.5), 8)

  const rect = event.currentTarget.getBoundingClientRect()
  const offsetX = event.clientX - rect.left
  const offsetY = event.clientY - rect.top
  const originX = (offsetX / rect.width) * 100
  const originY = (offsetY / rect.height) * 100

  if (type === 'original') {
    transformOriginOriginal.value = `${originX}% ${originY}%`
    transformOriginSegmented.value = `${originX}% ${originY}%`
  } else if (type === 'segmented') {
    transformOriginSegmented.value = `${originX}% ${originY}%`
    transformOriginOriginal.value = `${originX}% ${originY}%`
  }
}

// 图片拖动功能
let isDragging = false
let startX, startY

const startDrag = (event, type) => {
  event.preventDefault()
  isDragging = true
  startX = event.clientX
  startY = event.clientY

  const onMouseMove = (e) => {
    if (!isDragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (type === 'original') {
      translateXOriginal.value += dx
      translateYOriginal.value += dy
      translateXSegmented.value += dx
      translateYSegmented.value += dy
    } else if (type === 'segmented') {
      translateXSegmented.value += dx
      translateYSegmented.value += dy
      translateXOriginal.value += dx
      translateYOriginal.value += dy
    }

    startX = e.clientX
    startY = e.clientY
  }

  const onMouseUp = () => {
    isDragging = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
</script>

<style scoped>
.layout {
  height: 100vh;
}

.header {
  height: 64px;
  padding: 0 24px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.header-content {
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 18px;
  font-weight: bold;
}

.content {
  padding: 24px;
  background: #f5f7f9;
}

.image-container {
  display: flex;
  gap: 24px;
  justify-content: center;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.image-box {
  flex: 1;
  max-width: 800px;
}

.image-box h3 {
  text-align: center;
  margin-bottom: 16px;
  color: #333;
  font-size: 16px;
}

.image-view {
  width: 100%;
  height: 600px;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.image-view:active {
  cursor: grabbing;
}

.image-view img {
  transition: transform 0.2s ease, transform-origin 0.2s ease;
}
</style>
  