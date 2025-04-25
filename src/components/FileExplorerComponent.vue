<template>
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
      <n-tooltip trigger="hover" placement="bottom">
        <template #trigger>
          <n-button circle type="info" size="small" @click="handleAutoDisplayAllImages" style="margin-left: 8px;">
            <n-icon><EyeOutlined /></n-icon>
          </n-button>
        </template>
        一键展示图片
      </n-tooltip>
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
          <div class="toggle-actions">
            <n-button 
              size="small" 
              class="toggle-folder-btn" 
              @click.stop="toggleFolder(item.folderName)"
            >
              <n-icon :component="expandedFolders[item.folderName] ? UpOutlined : DownOutlined" />
            </n-button>
            <div class="action-menu-container">
              <button class="action-menu-btn" @click.stop="toggleActionMenu(item.folderName)">
                <n-icon :component="EllipsisOutlined" />
              </button>
              <div v-if="actionMenuVisible[item.folderName]" class="action-menu-dropdown">
                <ul>
                  <li @click="handleFolderMenuAction(() => deleteFolder(item.folderName))">删除</li>
                  <li @click="handleFolderMenuAction(() => resultFolderIHC(item.folderName))">
                    查询免疫组化分析结果
                  </li>
                  <li @click="handleFolderMenuAction(() => resultFolderFullnet(item.folderName))">
                    查询Fullnet分析结果
                  </li>
                  <li @click="handleFolderMenuAction(() => autoDisplayImages(item.folderName))">
                    一键展示
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <!-- 二级菜单：显示展开后的文件和子文件夹 -->
        <div v-if="expandedFolders[item.folderName]" class="dzi-file-list">
          <n-list-item 
            v-for="subItem in folderDziFiles[item.folderName] || []" 
            :key="subItem.name"
            class="dzi-item file-item"
          >
            <span class="file-name" @click="selectDziItem(item.folderName, subItem)">
              {{ subItem.name }}
            </span>
            <!-- 文件操作菜单按钮 -->
            <div class="file-action-menu-container">
              <button class="file-action-menu-btn" @click.stop="toggleFileActionMenu(item.folderName, subItem.name)">
                <n-icon :component="EllipsisOutlined" />
              </button>
              <div v-if="fileActionMenuVisible[item.folderName] && fileActionMenuVisible[item.folderName][subItem.name]" class="file-action-menu-dropdown">
                <ul>
                  <li @click="handleFileMenuAction(item.folderName, subItem.name, () => deleteFile(item.folderName, subItem.name))">删除</li>
                  <li @click="handleFileMenuAction(item.folderName, subItem.name, () => IHCanalysis(item.folderName, subItem.name))">
                    免疫组化分析
                  </li>
                  <li @click="handleFileMenuAction(item.folderName, subItem.name, () => thresholdAnalysis(item.folderName, subItem.name))">
                    阈值分析
                  </li>
                  <li @click="handleFileMenuAction(item.folderName, subItem.name, () => fullnetAnalysis(item.folderName, subItem.name))">
                    Fullnet分析
                  </li>
                  <li @click="handleFileMenuAction(item.folderName, subItem.name, () => resultFileIHC(item.folderName, subItem.name))">
                    查询分析结果
                  </li>
                </ul>
              </div>
            </div>
          </n-list-item>
        </div>
      </n-list-item>
    </n-list>
  </n-layout-sider>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, onUnmounted } from 'vue'
import { 
  NLayoutSider,
  NButton,
  NIcon,
  NList,
  NListItem,
  useMessage,
  NSpin,
  NTooltip
} from 'naive-ui'
import { 
  ReloadOutlined, 
  DownOutlined, 
  UpOutlined, 
  EllipsisOutlined,
  EyeOutlined
} from '@vicons/antd'

const props = defineProps({
  fileList: {
    type: Array,
    required: true
  },
  selectedFolder: {
    type: String,
    default: ""
  },
  expandedFolders: {
    type: Object,
    required: true
  },
  folderDziFiles: {
    type: Object,
    required: true
  },
  actionMenuVisible: {
    type: Object,
    required: true
  },
  fileActionMenuVisible: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'update:selectedFolder',
  'update:expandedFolders',
  'update:folderDziFiles',
  'update:actionMenuVisible',
  'update:fileActionMenuVisible',
  'fetchFileList', 
  'toggleFolder',
  'selectDziItem',
  'deleteFolder',
  'deleteFile',
  'IHCanalysis',
  'resultFolderIHC',
  'resultFileIHC',
  'thresholdAnalysis',
  'fullnetAnalysis',
  'resultFolderFullnet',
  'autoDisplayImages'
])

const message = useMessage()

// 添加分析中状态管理
const analyzingFiles = ref({})
const loadingResults = ref({})

// 刷新文件列表
const fetchFileList = () => {
  emit('fetchFileList')
}

// 切换文件夹展开状态
const toggleFolder = (folderName) => {
  emit('toggleFolder', folderName)
}

// 选择文件
const selectDziItem = (folderName, item) => {
  emit('selectDziItem', folderName, item)
}

// 切换文件夹操作菜单
const toggleActionMenu = (folderName) => {
  const newActionMenuVisible = { ...props.actionMenuVisible }
  newActionMenuVisible[folderName] = !newActionMenuVisible[folderName]
  emit('update:actionMenuVisible', newActionMenuVisible)
}

// 切换文件操作菜单
const toggleFileActionMenu = (folderName, fileName) => {
  const newFileActionMenuVisible = { ...props.fileActionMenuVisible }
  if (!newFileActionMenuVisible[folderName]) {
    newFileActionMenuVisible[folderName] = {}
  }
  newFileActionMenuVisible[folderName][fileName] = !newFileActionMenuVisible[folderName][fileName]
  emit('update:fileActionMenuVisible', newFileActionMenuVisible)
}

// 删除文件夹
const deleteFolder = (folderName) => {
  emit('deleteFolder', folderName)
}

// 删除文件
const deleteFile = (folderName, fileName) => {
  emit('deleteFile', folderName, fileName)
}

// 免疫组化分析
const IHCanalysis = (folderName, fileName) => {
  // 设置分析中状态
  if (!analyzingFiles.value[folderName]) {
    analyzingFiles.value[folderName] = {}
  }
  analyzingFiles.value[folderName][fileName] = true
  
  console.log(`开始分析: ${folderName}/${fileName}`)
  emit('IHCanalysis', folderName, fileName)
}

// 阈值分析
const thresholdAnalysis = (folderName, fileName) => {
  console.log(`开始阈值分析: ${folderName}/${fileName}`)
  emit('thresholdAnalysis', folderName, fileName)
}

// 查询文件夹分析结果
const resultFolderIHC = (folderName) => {
  // 设置加载状态
  loadingResults.value[folderName] = true
  
  console.log(`查询文件夹分析结果: ${folderName}`)
  emit('resultFolderIHC', folderName)
  
  // 自动清除加载状态
  setTimeout(() => {
    loadingResults.value[folderName] = false
  }, 5000)
}

// 查询文件分析结果
const resultFileIHC = (folderName, fileName) => {
  // 设置加载状态
  if (!loadingResults.value[folderName]) {
    loadingResults.value[folderName] = {}
  }
  loadingResults.value[folderName][fileName] = true
  
  console.log(`查询文件分析结果: ${folderName}/${fileName}`)
  emit('resultFileIHC', folderName, fileName)
  
  // 自动清除加载状态
  setTimeout(() => {
    if (loadingResults.value[folderName]) {
      loadingResults.value[folderName][fileName] = false
    }
  }, 5000)
}

// Fullnet分析
const fullnetAnalysis = (folderName, fileName) => {
  console.log(`开始Fullnet分析: ${folderName}/${fileName}`)
  emit('fullnetAnalysis', folderName, fileName)
}

// 查询Fullnet分析结果
const resultFolderFullnet = (folderName) => {
  console.log(`查询Fullnet分析结果: ${folderName}`)
  emit('resultFolderFullnet', folderName)
}

// 一键展示功能
const autoDisplayImages = (folderName) => {
  // 确保文件夹展开，以便获取文件列表
  if (!props.expandedFolders[folderName]) {
    emit('toggleFolder', folderName)
  }
  
  // 获取文件夹中的图片文件
  const files = props.folderDziFiles[folderName] || []
  
  if (files.length === 0) {
    message.warning('当前文件夹无可展示的图片')
    return
  }
  
  console.log(`一键展示文件夹 ${folderName} 中的图片`)
  // 发出自动展示事件，传递文件夹名和文件列表
  emit('autoDisplayImages', folderName, files)
}

// 一键展示所有图片功能
const handleAutoDisplayAllImages = () => {
  if (!props.selectedFolder) {
    message.warning('请先选择一个文件夹')
    return
  }
  
  // 确保文件夹展开，以便获取文件列表
  if (!props.expandedFolders[props.selectedFolder]) {
    emit('toggleFolder', props.selectedFolder)
  }
  
  // 获取文件夹中的图片文件
  const files = props.folderDziFiles[props.selectedFolder] || []
  
  // 筛选图像文件（根据扩展名）
  const imageFiles = files.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase()
    return ['png', 'jpg', 'jpeg', 'tif', 'tiff'].includes(ext)
  })
  
  if (imageFiles.length === 0) {
    message.warning('当前文件夹无可展示的图片')
    return
  }
  
  console.log(`一键展示文件夹 ${props.selectedFolder} 中的图片`)
  // 发出自动展示事件，传递文件夹名和文件列表
  emit('autoDisplayImages', props.selectedFolder, imageFiles)
}

// 处理文件夹菜单操作，执行后关闭菜单
const handleFolderMenuAction = (actionFn) => {
  actionFn()
  // 关闭所有文件夹操作菜单
  const newActionMenuVisible = {}
  emit('update:actionMenuVisible', newActionMenuVisible)
}

// 处理文件菜单操作，执行后关闭菜单
const handleFileMenuAction = (folderName, fileName, actionFn) => {
  actionFn()
  // 关闭特定文件的操作菜单
  const newFileActionMenuVisible = { ...props.fileActionMenuVisible }
  if (newFileActionMenuVisible[folderName]) {
    newFileActionMenuVisible[folderName][fileName] = false
    emit('update:fileActionMenuVisible', newFileActionMenuVisible)
  }
}

// 处理文档点击事件，点击外部区域时关闭所有菜单
const handleDocumentClick = (event) => {
  // 检查点击是否发生在菜单按钮或菜单内
  const isActionButton = event.target.closest('.action-menu-btn') || 
                        event.target.closest('.file-action-menu-btn')
  const isActionMenu = event.target.closest('.action-menu-dropdown') || 
                      event.target.closest('.file-action-menu-dropdown')
  
  // 如果点击不在菜单按钮或菜单内，关闭所有菜单
  if (!isActionButton && !isActionMenu) {
    const newActionMenuVisible = {}
    const newFileActionMenuVisible = {}
    emit('update:actionMenuVisible', newActionMenuVisible)
    emit('update:fileActionMenuVisible', newFileActionMenuVisible)
  }
}

// 在组件挂载时添加点击事件监听
onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

// 在组件卸载时移除点击事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
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

.toggle-actions {
  position: relative;
  display: inline-block;
  margin-left: 8px;
}

.action-menu-container {
  position: absolute;
  right: calc(100% + 15px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 999;
}

.action-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 10;
  min-width: 80px;
}

.action-menu-dropdown ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.action-menu-dropdown li {
  padding: 6px 12px;
  cursor: pointer;
}

.action-menu-dropdown li:hover {
  background-color: #f5f5f5;
}

.file-item {
  position: relative;
  display: flex;
  align-items: center;
}

.file-name {
  flex: 1;
  padding-right: 30px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-action-menu-container {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 999;
}

.file-action-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-action-menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 10;
  min-width: 80px;
}

.file-action-menu-dropdown ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.file-action-menu-dropdown li {
  padding: 6px 12px;
  cursor: pointer;
}

.file-action-menu-dropdown li:hover {
  background-color: #f5f5f5;
}

.action-menu-dropdown li,
.file-action-menu-dropdown li {
  white-space: nowrap;
  padding: 6px 12px;
}

.analyzing-indicator {
  margin-left: 8px;
  display: inline-block;
}

.file-item.analyzing {
  background-color: #f0faff;
}

.file-item.analyzing .file-name {
  color: #1890ff;
  font-weight: bold;
}
</style> 