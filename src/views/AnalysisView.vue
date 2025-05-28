<template>
  <n-layout class="layout">
    <!-- 头部导航组件 -->
    <header-component
      :layout-type="layoutType"
      :status-bar="statusBar"
      :is-header-collapsed="isHeaderCollapsed"
      @update:layout-type="changeLayout"
      @close-status-bar="closeStatusBar"
      @open-registration-modal="openRegistrationModal"
      @handle-folder-and-upload="handleFolderAndUpload"
      @toggle-header="toggleHeader"
    />

    <!-- 主体区域：左侧为文件目录列表，右侧为图像展示区域 -->
    <n-layout has-sider class="content-wrapper" :class="{ 'expanded-content': isHeaderCollapsed }">
      <!-- 文件目录组件 -->
      <file-explorer-component
        :file-list="fileList"
        :selected-folder="selectedFolder"
        :expanded-folders="expandedFolders"
        :folder-dzi-files="folderDziFiles"
        :action-menu-visible="actionMenuVisible"
        :file-action-menu-visible="fileActionMenuVisible"
        @update:selected-folder="updateSelectedFolder"
        @update:expanded-folders="updateExpandedFolders"
        @update:folder-dzi-files="updateFolderDziFiles"
        @update:action-menu-visible="updateActionMenuVisible"
        @update:file-action-menu-visible="updateFileActionMenuVisible"
        @fetch-file-list="fetchFileList"
        @toggle-folder="toggleFolder"
        @select-dzi-item="selectDziItem"
        @deleteFolder="deleteFolder"
        @deleteFile="deleteFile"
        @autoDisplayImages="autoDisplayImages"
      />

      <!-- 图像查看器组件 -->
      <viewer-component
        :layout-type="layoutType"
        :selected-viewer-index="selectedViewerIndex"
        :viewers="viewers"
        :viewer-file-names="viewerFileNames"
        @update:selected-viewer-index="updateSelectedViewerIndex"
        @update:viewers="updateViewers"
        @init-viewers="initViewers"
        @update-viewer-dzi-url="updateViewerDziUrl"
        @setup-sync="setupSync"
        @close-image="closeImage"
      />
    </n-layout>

    <!-- 模态框组件 -->
    <modal-component
      :registration-modal-visible="registrationModalVisible"
      :registration-folder-list="registrationFolderList"
      :selected-registration-folder-value="selectedRegistrationFolder"
      :result-modal-visible="resultModalVisible"
      :result-modal-title="resultModalTitle"
      :result-modal-content="resultModalContent"
      @update:registration-modal-visible="updateRegistrationModalVisible"
      @update:selected-registration-folder-value="updateSelectedRegistrationFolder"
      @update:result-modal-visible="updateResultModalVisible"
      @start-registration="startRegistration"
    />
  </n-layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { NLayout } from 'naive-ui'
import { useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useViewerStore } from '@/stores/viewer'
import { fileApi, imageApi } from '@/services/api'

// 导入组件
import HeaderComponent from '@/components/HeaderComponent.vue'
import FileExplorerComponent from '@/components/FileExplorerComponent.vue'
import ViewerComponent from '@/components/ViewerComponent.vue'
import ModalComponent from '@/components/ModalComponent.vue'

const message = useMessage()
const userStore = useUserStore()
const viewerStore = useViewerStore()

// 使用 viewerStore 中的状态和方法
const layoutType = computed(() => viewerStore.layoutType)
const viewers = computed(() => viewerStore.viewers)
const selectedViewerIndex = computed(() => viewerStore.selectedViewerIndex)
const viewerFileNames = computed(() => viewerStore.viewerFileNames)

// 导航栏折叠状态
const isHeaderCollapsed = ref(false)

// 切换导航栏显示/隐藏
const toggleHeader = () => {
  isHeaderCollapsed.value = !isHeaderCollapsed.value
}

const changeLayout = (num) => viewerStore.changeLayout(num)
const initViewers = () => viewerStore.initViewers()
const updateSelectedViewerIndex = (index) => {
  viewerStore.selectedViewerIndex = index
}
const updateViewers = (newViewers) => {
  viewerStore.viewers = newViewers
}
const setupSync = () => viewerStore.setupSync()

// 处理关闭图像
const closeImage = (index) => {
  // 检查方法是否存在，若不存在则使用回退逻辑
  if (typeof viewerStore.clearViewerAtIndex === 'function') {
    viewerStore.clearViewerAtIndex(index)
  } else {
    // 回退逻辑：手动清除查看器
    if (viewerStore.viewers[index]) {
      viewerStore.viewers[index].destroy()
      viewerStore.viewers[index] = null
      viewerStore.viewerFileNames[index] = ''
    }
  }
  message.success(`已移除图像`)
}

// 文件目录相关状态
const fileList = ref([])
const selectedFolder = ref("")
const expandedFolders = ref({})
const folderDziFiles = ref({})
const actionMenuVisible = ref({})
const fileActionMenuVisible = ref({})

// 更新函数
const updateSelectedFolder = (value) => { selectedFolder.value = value }
const updateExpandedFolders = (value) => { expandedFolders.value = value }
const updateFolderDziFiles = (value) => { folderDziFiles.value = value }
const updateActionMenuVisible = (value) => { actionMenuVisible.value = value }
const updateFileActionMenuVisible = (value) => { fileActionMenuVisible.value = value }

// 配准相关状态
const registrationModalVisible = ref(false)
const registrationFolderList = ref([])
const selectedRegistrationFolder = ref(null)

// 结果显示相关状态
const resultModalVisible = ref(false)
const resultModalTitle = ref('')
const resultModalContent = ref(null)

// 模态框状态更新函数
const updateRegistrationModalVisible = (value) => { registrationModalVisible.value = value }
const updateSelectedRegistrationFolder = (value) => { selectedRegistrationFolder.value = value }
const updateResultModalVisible = (value) => { resultModalVisible.value = value }

// 状态栏相关状态，由上传和配准共用
const statusBar = ref({
  visible: false,
  folder: "",
  operation: "", // "upload" 或 "register"
  message: "",
  startTime: 0,
  elapsed: 0,
  finished: false,
  error: false
})
let statusTimer = null

// 状态栏相关函数
const startStatusTimer = () => {
  statusTimer = setInterval(() => {
    statusBar.value.elapsed = Math.floor((Date.now() - statusBar.value.startTime) / 1000)
  }, 1000)
}

const stopStatusTimer = () => {
  if (statusTimer) {
    clearInterval(statusTimer)
    statusTimer = null
  }
}

const closeStatusBar = () => {
  statusBar.value.visible = false
  statusBar.value.finished = false
  statusBar.value.error = false
  statusBar.value.elapsed = 0
}

// 文件列表操作
const fetchFileList = async () => {
  try {
    const data = await fileApi.getFolderList()
    fileList.value = data
  } catch (error) {
    message.error(error.message)
  }
}

// 文件夹展开/折叠
const toggleFolder = async (folderName) => {
  if (expandedFolders.value[folderName]) {
    expandedFolders.value[folderName] = false
  } else {
    if (!folderDziFiles.value[folderName]) {
      try {
        const data = await fileApi.getFilesByFolder(folderName)
        folderDziFiles.value[folderName] = data
      } catch (error) {
        message.error(error.message)
      }
    }
    expandedFolders.value[folderName] = true
  }
}

// 选择DZI项
const selectDziItem = (parentFolder, item) => {
  const url = `/api/dzi/processed/${parentFolder}/${item.name}/`
  viewerStore.updateViewerDziUrl(url, item.name)
}

// 更新DZI URL（从视图组件调用）
const updateViewerDziUrl = (url, fileName) => {
  viewerStore.updateViewerDziUrl(url, fileName)
}

// 删除文件夹
const deleteFolder = async (folderName) => {
  if (!confirm(`确定删除文件夹 "${folderName}" 吗？删除后将不可恢复`)) return
  try {
    await fileApi.deleteFolder(folderName)
    message.success(`删除文件夹 "${folderName}" 成功`)
    fileList.value = fileList.value.filter(item => item.folderName !== folderName)
  } catch (error) {
    message.error(error.message)
  }
}

// 删除文件
const deleteFile = async (folderName, fileName) => {
  if (!confirm(`确定删除文件 "${fileName}" 吗？`)) return
  try {
    await fileApi.deleteFile(folderName, fileName)
    message.success(`删除文件 "${fileName}" 成功`)
    if (folderDziFiles.value[folderName]) {
      folderDziFiles.value[folderName] = folderDziFiles.value[folderName].filter(item => item.name !== fileName)
    }
  } catch (error) {
    message.error(error.message)
  } finally {
    if (fileActionMenuVisible.value[folderName]) {
      fileActionMenuVisible.value[folderName][fileName] = false
    }
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
  
  // 从第一个文件中提取文件夹名称
  let folderName = ""
  const firstFilePath = selectedFolderFiles.value[0].webkitRelativePath
  if (firstFilePath && firstFilePath.indexOf("/") !== -1) {
    folderName = firstFilePath.substring(0, firstFilePath.indexOf("/"))
  }
  
  // 初始化状态栏（上传）
  statusBar.value = {
    visible: true,
    folder: folderName,
    operation: "upload",
    message: "正在上传中...",
    startTime: Date.now(),
    elapsed: 0,
    finished: false,
    error: false
  }
  startStatusTimer()
  
  const formData = new FormData()
  selectedFolderFiles.value.forEach(file => {
    formData.append('files', file, file.webkitRelativePath)
  })
  
  try {
    await fileApi.uploadFolder(formData)
    statusBar.value.message = "上传完毕"
    statusBar.value.finished = true
    stopStatusTimer()
    message.success("文件夹上传成功")
  } catch (error) {
    statusBar.value.message = "上传失败"
    statusBar.value.finished = true
    statusBar.value.error = true
    stopStatusTimer()
    message.error(error.message)
  }
}

// 配准相关函数
const openRegistrationModal = async () => {
  registrationModalVisible.value = true
  selectedRegistrationFolder.value = null
  
  try {
    const result = await imageApi.getRegistrationFolderList()
    registrationFolderList.value = result
  } catch (error) {
    message.error(error.message)
    registrationFolderList.value = []
  }
}

// 开始配准，调用后端接口启动配准流程
const startRegistration = async () => {
  if (!selectedRegistrationFolder.value) {
    message.warning("请选择一个文件夹")
    return
  }
  
  // 初始化状态栏（配准）
  statusBar.value = {
    visible: true,
    folder: selectedRegistrationFolder.value,
    operation: "register",
    message: "正在配准中...",
    startTime: Date.now(),
    elapsed: 0,
    finished: false,
    error: false
  }
  startStatusTimer()

  try {
    await imageApi.startRegistration(selectedRegistrationFolder.value, userStore.username)
    statusBar.value.message = "配准完毕"
    statusBar.value.finished = true
    stopStatusTimer()
    message.success("图像配准成功")
    registrationModalVisible.value = false
  } catch (error) {
    statusBar.value.message = "配准失败"
    statusBar.value.finished = true
    statusBar.value.error = true
    stopStatusTimer()
    message.error(error.message)
  }
}

// 一键展示图片
const autoDisplayImages = (folderName, files) => {
  console.log(`接收到一键展示请求: ${folderName}，文件数量: ${files.length}`)
  
  if (files.length === 0) {
    message.warning('没有可展示的图片')
    return
  }
  
  // 根据当前布局选择要展示的图片数量
  const currentLayout = layoutType.value
  const maxImages = currentLayout // 布局模式与要展示的图片数量相同
  
  // 选取最多maxImages张图片
  const imagesToDisplay = files.slice(0, maxImages)
  
  // 重置所有查看器
  initViewers()
  
  // 为每个查看器加载图片
  imagesToDisplay.forEach((file, index) => {
    if (index < maxImages) {
      const url = `/api/dzi/processed/${folderName}/${file.name}/`
      // 使用viewerStore更新每个查看器
      viewerStore.updateViewerAtIndex(index, url, file.name)
    }
  })
  
  message.success(`已自动展示${folderName}文件夹中的${imagesToDisplay.length}张图片`)
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

.content-wrapper {
  flex: 1;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  height: calc(100vh - 64px);
}

.expanded-content {
  height: calc(100vh - 10px);
}
</style>
  