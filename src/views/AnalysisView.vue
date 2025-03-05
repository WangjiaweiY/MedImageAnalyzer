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
          <!-- 同步按钮 -->
          <n-button @click="toggleSync" :type="syncEnabled ? 'primary' : 'default'" class="sync-btn">
            同步：{{ syncEnabled ? '开启' : '关闭' }}
          </n-button>
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
        <div class="sidebar-header">
          <n-button circle type="primary" size="small" @click="fetchFileList">
            <n-icon><ReloadOutlined /></n-icon>
          </n-button>
        </div>
        <n-list class="file-list" hoverable>
          <n-list-item 
            v-for="item in fileList" 
            :key="item.folderName"
            :class="{ 'selected': selectedFolder === item.folderName }"
          >
            <div class="folder-item">
              <span @click="toggleFolder(item.folderName)" class="folder-name">
                {{ item.folderName }}
              </span>
              <n-button size="small" @click.stop="toggleFolder(item.folderName)">
                {{ expandedFolders[item.folderName] ? '收起' : '展开' }}
              </n-button>
            </div>
            <!-- 显示展开后的内容：文件和子文件夹 -->
            <div v-if="expandedFolders[item.folderName]" class="dzi-file-list">
              <n-list-item 
                v-for="subItem in folderDziFiles[item.folderName] || []" 
                :key="subItem.name"
                @click="selectDziItem(item.folderName, subItem)"
                class="dzi-item"
              >
                {{ subItem.name }}
                <span v-if="subItem.directory">(文件夹)</span>
              </n-list-item>
            </div>
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
import { ref, onMounted, nextTick, h } from 'vue'
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
  NList, 
  NListItem,
  NEmpty,
  useMessage
} from 'naive-ui'
import { UserOutlined, SettingOutlined, LogoutOutlined, ReloadOutlined } from '@vicons/antd'
import OpenSeadragon from 'openseadragon'

const router = useRouter()
const message = useMessage()

// 布局、文件列表、展示相关响应式变量
const layoutType = ref(1) // 当前布局模式：1,2,4,9
const fileList = ref([])  // 一级文件夹列表（以日期命名）
const selectedFolder = ref("") // 当前选中的文件夹
const selectedViewerIndex = ref(null) // 当前选中的展示框索引（0-indexed）
const viewers = ref([])  // 保存每个 OpenSeadragon 实例

// 新增：管理侧边栏展开状态与子文件列表
const expandedFolders = ref({})
const folderDziFiles = ref({})

// 切换文件夹展开状态；若未加载子项则调用接口加载
const toggleFolder = async (folderName) => {
  if (expandedFolders.value[folderName]) {
    expandedFolders.value[folderName] = false;
  } else {
    if (!folderDziFiles.value[folderName]) {
      try {
        // 直接使用 folderName 拼接，不进行编码
        const res = await fetch(`http://localhost:8080/api/dzi/list/${folderName}`);
        const data = await res.json();
        folderDziFiles.value[folderName] = data;
      } catch (error) {
        console.error("获取文件夹内容失败:", error);
        message.error("获取文件列表失败");
      }
    }
    expandedFolders.value[folderName] = true;
  }
}

// 选择子项（第二级目录或文件）时，直接调用 getDziFile 接口加载资源
const selectDziItem = (parentFolder, item) => {
  // 直接构造 URL，注意不再递归展开目录，而是直接加载资源
  const url = `http://localhost:8080/api/dzi/processed/${parentFolder}/${item.name}`;
  updateViewerDziUrl(url);
}


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
  selectedViewerIndex.value = null
  viewers.value.forEach(v => v && v.destroy())
  viewers.value = []
  if (selectedFolder.value) initViewers()
}

// 切换同步功能
const syncEnabled = ref(true)
const toggleSync = () => {
  syncEnabled.value = !syncEnabled.value
  message.info(`图像同步已${syncEnabled.value ? '开启' : '关闭'}`)
  if (syncEnabled.value) {
    setupSync()
  }
}

// 文件夹上传处理
const selectedFolderFiles = ref([])
const handleFolderAndUpload = (event) => {
  selectedFolderFiles.value = Array.from(event.target.files)
  if (selectedFolderFiles.value.length > 0) {
    message.success(`已选择 ${selectedFolderFiles.value.length} 个文件`)
    uploadFolder()
  }
}
const uploadFolder = async () => {
  if (selectedFolderFiles.value.length === 0) {
    message.warning("请先选择一个文件夹")
    return
  }
  const formData = new FormData()
  selectedFolderFiles.value.forEach(file => {
    formData.append('files', file, file.webkitRelativePath)
  })
  try {
    const response = await fetch("http://localhost:8080/api/svs/upload", {
      method: 'POST',
      body: formData
    })
    if (response.ok) {
      message.success("文件夹上传成功")
    } else {
      message.error("文件夹上传失败")
    }
  } catch (error) {
    console.error("上传错误：", error)
    message.error("上传过程中出现错误")
  }
}

// 拉取一级文件夹列表（以日期命名）
const fetchFileList = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/dzi/list')
    fileList.value = await res.json()
  } catch (error) {
    console.error('获取文件列表失败:', error)
    message.error("获取文件列表失败")
  }
}

// 更新当前选中 viewer 的 DZI URL
const updateViewerDziUrl = (url) => {
  if (selectedViewerIndex.value === null) {
    message.warning('请先点击一个展示框进行选择')
    return
  }
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
    gestureSettingsMouse: {
      scrollToZoom: true
    },
    showNavigator: true,
    fullscreen: false
  })
  if (syncEnabled.value) setupSync()
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

// 设置同步事件：添加 zoom 和 pan 事件处理器
let isSyncing = false
const setupSync = () => {
  viewers.value.forEach((viewer, idx) => {
    if (viewer && !viewer._syncHandlersBound) {
      viewer.addHandler('zoom', () => {
        if (syncEnabled.value && !isSyncing) {
          isSyncing = true
          const zoom = viewer.viewport.getZoom()
          console.log(`Viewer ${idx} zoom event: zoom=${zoom}`)
          viewers.value.forEach((v, i) => {
            if (v !== viewer && v) {
              v.viewport.zoomTo(zoom)
            }
          })
          isSyncing = false
        }
      })
      viewer.addHandler('pan', () => {
        if (syncEnabled.value && !isSyncing) {
          isSyncing = true
          const center = viewer.viewport.getCenter()
          console.log(`Viewer ${idx} pan event: center=(${center.x.toFixed(3)}, ${center.y.toFixed(3)})`)
          viewers.value.forEach((v, i) => {
            if (v !== viewer && v) {
              v.viewport.panTo(center)
            }
          })
          isSyncing = false
        }
      })
      viewer._syncHandlersBound = true
    }
  })
}

// 点击 viewer-wrapper 选择展示区域
const selectViewer = (index) => {
  selectedViewerIndex.value = index
}

// 判断某个 viewer 是否已加载图像
const hasDzi = (index) => {
  return viewers.value[index] !== null
}

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

.sync-btn {
  margin-left: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
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

.sidebar-header {
  padding: 10px;
  text-align: right;
  border-bottom: 1px solid #e8e8e8;
}

.file-list {
  padding: 12px;
}

.folder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.folder-name {
  cursor: pointer;
  font-weight: bold;
}

.dzi-file-list {
  margin-top: 8px;
  padding-left: 16px;
}

.dzi-item {
  cursor: pointer;
  padding: 4px 0;
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
  background-color: #e6f7ff;
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
</style>
