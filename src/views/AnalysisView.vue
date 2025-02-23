<template>
  <n-layout class="layout">
    <!-- 顶部导航栏 -->
    <n-layout-header class="header">
      <div class="header-content">
        <div class="logo">多免疫组化病理图像智能分析系统</div>
        <div class="controls">
          <n-button-group>
            <n-button 
              v-for="num in [1, 2, 4, 9]" 
              :key="num"
              @click="changeLayout(num)"
              :type="layoutType === num ? 'primary' : 'default'"
            >
              {{ num }}图模式
            </n-button>
          </n-button-group>
        </div>
        <div class="user-info">
          <n-upload
            action="http://localhost:8080/api/dzi/upload"
            :show-file-list="false"
            accept=".zip"
            @progress="handleProgress"
            @finish="handleUploadSuccess"
            @error="handleUploadError"
          >
            <n-button type="primary" class="upload-btn">
              上传ZIP文件
            </n-button>
          </n-upload>
          <n-dropdown :options="userOptions" @select="handleUserAction">
            <n-button text class="admin">
              管理员
              <n-icon><UserOutlined /></n-icon>
            </n-button>
          </n-dropdown>
        </div>
      </div>
    </n-layout-header>

    <!-- 主体区域：左侧为文件目录列表，右侧为图像展示区域 -->
    <n-layout has-sider class="content-wrapper">
      <!-- 侧边栏：文件目录列表 -->
      <n-layout-sider
        collapsible
        :width="280"
        :collapsed-width="0"
        show-trigger
        class="file-sider"
      >
        <n-list class="file-list" hoverable clickable>
          <n-list-item 
            v-for="item in fileList" 
            :key="item.folderName"
            @click="selectFolder(item)"
            :class="{ 'selected': selectedFolder === item.folderName }"
          >
            <n-thing
              :title="item.folderName"
              :description="item.time || '未知时间'"
            />
          </n-list-item>
        </n-list>
      </n-layout-sider>

      <!-- 展示区域：支持1/2/4/9图模式 -->
      <n-layout-content class="content">
        <div class="viewer-container" :class="`layout-${layoutType}`">
          <div 
            v-for="(v, index) in layoutType" 
            :key="index"
            class="viewer-wrapper"
            @click="selectViewer(index)"
            :class="{ 'selected-viewer': selectedViewerIndex === index }"
          >
            <div :id="`osdViewer-${index}`" class="osd-viewer"></div>
            <div v-if="!hasDzi(index)" class="placeholder">
              <n-empty size="large" description="请选择图像文件"></n-empty>
            </div>
          </div>
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { 
  NLayout, 
  NLayoutHeader, 
  NLayoutSider,
  NLayoutContent, 
  NButton, 
  NButtonGroup,
  NDropdown, 
  NIcon, 
  NUpload, 
  NList, 
  NListItem,
  NThing,
  NEmpty,
  useMessage
} from 'naive-ui'
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@vicons/antd'
import OpenSeadragon from 'openseadragon'
import { h } from 'vue'

const router = useRouter()
const message = useMessage()

// 布局、文件列表、展示相关响应式变量
const layoutType = ref(1) // 当前布局模式：1,2,4,9
const fileList = ref([])  // 文件目录列表
const selectedFolder = ref("") // 选中的文件夹（目录名称）
const selectedViewerIndex = ref(null) // 当前选中的展示框索引（0-indexed）
const viewers = ref([])  // 保存每个 OpenSeadragon 实例
const uploadStatus = ref("") // 上传状态反馈信息

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

// 切换布局模式
const changeLayout = (num) => {
  layoutType.value = num
  // 重置选中状态
  selectedViewerIndex.value = null
  // 销毁所有旧的查看器实例
  viewers.value.forEach(v => v && v.destroy())
  viewers.value = []
  // 重新初始化查看器（如果已选择图像，则更新对应的展示）
  if (selectedFolder.value) initViewers()
}

// 上传进度处理
const handleProgress = (e) => {
  // e.progress 代表上传进度，数值 0-100
  uploadStatus.value = `上传中... ${e.progress}%`
}

// 上传成功处理
const handleUploadSuccess = (res) => {
  uploadStatus.value = "上传完成！"
  fetchFileList()
  message.success("上传成功")
}

// 上传错误处理
const handleUploadError = (err) => {
  uploadStatus.value = "上传失败"
  message.error("上传失败")
}

// 拉取文件目录列表
const fetchFileList = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/dzi/list')
    fileList.value = await res.json()
  } catch (error) {
    console.error('获取文件列表失败:', error)
  }
}

// 用户点击某个目录项，选择上传后生成的文件夹
const selectFolder = (item) => {
  selectedFolder.value = item.folderName
  // 构造 DZI描述文件 URL：假设描述文件名称固定为 test.xml
  updateViewerDziUrl(`http://localhost:8080/processed/${item.folderName}/`)
}

// 更新当前选中 viewer 的 DZI URL
const updateViewerDziUrl = (url) => {
  if (selectedViewerIndex.value === null) {
    message.warning('请先点击一个展示框进行选择')
    return
  }
  // 销毁旧的实例
  if (viewers.value[selectedViewerIndex.value]) {
    viewers.value[selectedViewerIndex.value].destroy()
  }
  viewers.value[selectedViewerIndex.value] = OpenSeadragon({
    id: `osdViewer-${selectedViewerIndex.value}`,
    prefixUrl: 'http://localhost:8080/openseadragon-bin/images/',
    tileSources: {
      Image: {
        xmlns: "http://schemas.microsoft.com/deepzoom/2008",
        Url: url,
        Overlap: "1",
        TileSize: "254",
        Format: "jpeg",
        Size: { Height: "32893", Width: "46000" }
      }
    },
    // 开启鼠标滚轮缩放
    gestureSettingsMouse: {
      scrollToZoom: true
    },
    showNavigator: true,
    fullscreen: false
  })
}

// 初始化所有展示框（各个 viewer 默认无内容）
const initViewers = () => {
  viewers.value.forEach(v => v && v.destroy())
  viewers.value = []
  nextTick(() => {
    for (let i = 0; i < layoutType.value; i++) {
      viewers.value.push(null)
    }
  })
}

// 点击 viewer-wrapper 选择展示区域
const selectViewer = (index) => {
  selectedViewerIndex.value = index
}

// 判断某个 viewer 是否有加载图像
const hasDzi = (index) => {
  return viewers.value[index] !== null
}

// 页面加载时拉取文件列表和初始化展示区域
onMounted(() => {
  fetchFileList()
  initViewers()
})
</script>

<style scoped>
.layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  height: 64px;
  padding: 0 24px;
  background: #1890ff;
  color: white;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 18px;
  font-weight: 600;
}

.controls {
  flex: 1;
  margin: 0 40px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.upload-btn {
  margin-right: 15px;
}

.upload-status {
  text-align: center;
  font-size: 16px;
  color: #1890ff;
  margin-top: 10px;
}

.content-wrapper {
  flex: 1;
  height: calc(100vh - 64px);
  display: flex;
}

.file-sider {
  background: #fff;
  box-shadow: 2px 0 8px rgba(0,0,0,0.05);
}

.file-list {
  padding: 12px;
}

.selected {
  background: #f0faff;
  border-left: 3px solid #1890ff;
}

.content {
  flex: 1;
  padding: 20px;
  background: #f5f7f9;
}

.viewer-container {
  height: 100%;
  display: grid;
  gap: 20px;
}

.viewer-wrapper {
  position: relative;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
}

.selected-viewer {
  border: 3px solid #1890ff;
}

.placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245,247,249,0.5);
}

.osd-viewer {
  width: 100%;
  height: 100%;
}

/* 布局样式 */
.layout-1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.layout-2 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: 1fr;
}

.layout-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.layout-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}
</style>
