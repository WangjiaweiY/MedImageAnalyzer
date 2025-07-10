<template>
  <n-layout class="layout">
    <!-- 头部导航组件 -->
    <header-component
      :layout-type="layoutType"
      :is-header-collapsed="isHeaderCollapsed"
      :is-sync-annotation="isSyncAnnotation"
      @update:layout-type="changeLayout"
      @update:is-sync-annotation="updateIsSyncAnnotation"
      @open-registration-modal="openRegistrationModal"
      @handle-folder-and-upload="handleFolderAndUpload"
      @toggle-header="toggleHeader"
      @open-upload-modal="openUploadModal"
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
        :is-sync-annotation="isSyncAnnotation"
        @update:selected-viewer-index="updateSelectedViewerIndex"
        @update:viewers="updateViewers"
        @update:is-sync-annotation="updateIsSyncAnnotation"
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
      :upload-modal-visible="uploadModalVisible"
      :upload-progress="uploadProgress"
      :upload-in-progress="uploadInProgress"
      :registration-progress="registrationProgress"
      :registration-in-progress="registrationInProgress"
      :result-modal-visible="resultModalVisible"
      :result-modal-title="resultModalTitle"
      :result-modal-content="resultModalContent"
      @update:registration-modal-visible="updateRegistrationModalVisible"
      @update:selected-registration-folder-value="updateSelectedRegistrationFolder"
      @update:upload-modal-visible="updateUploadModalVisible"
      @update:result-modal-visible="updateResultModalVisible"
      @start-registration="startRegistration"
      @handle-file-selection="handleFileSelection"
      @start-upload="startUpload"
      @folder-uploaded="handleFolderUploaded"
      ref="modalRef"
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
const modalRef = ref(null)

// 标注同步状态
const isSyncAnnotation = ref(false)
const updateIsSyncAnnotation = (value) => {
  isSyncAnnotation.value = value
}

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
const registrationProgress = ref(0)
const registrationInProgress = ref(false)

// 上传相关状态
const uploadModalVisible = ref(false)
const uploadProgress = ref(0)
const uploadInProgress = ref(false)
const selectedFolderFiles = ref([])

// 结果显示相关状态
const resultModalVisible = ref(false)
const resultModalTitle = ref('')
const resultModalContent = ref(null)

// 模态框状态更新函数
const updateRegistrationModalVisible = (value) => { registrationModalVisible.value = value }
const updateSelectedRegistrationFolder = (value) => { selectedRegistrationFolder.value = value }
const updateUploadModalVisible = (value) => { uploadModalVisible.value = value }
const updateResultModalVisible = (value) => { resultModalVisible.value = value }

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

// 打开上传模态框
const openUploadModal = () => {
  uploadModalVisible.value = true;
  uploadProgress.value = 0;
  uploadInProgress.value = false;
  selectedFolderFiles.value = [];
}

// 处理文件选择 - 模态框内部已经处理，这里只需要保留接口
const handleFileSelection = (event) => {
  // 文件选择已在模态框组件内处理
  selectedFolderFiles.value = Array.from(event.target.files)
}

// 文件夹上传处理 - 适配旧的上传方式
const handleFolderAndUpload = (event) => {
  openUploadModal()
  }
  
// 开始上传 - 仅作为接口保留，实际上传逻辑已移至模态框内部
const startUpload = (files) => {
  // 上传逻辑已在模态框组件内处理
}

// 配准相关函数
const openRegistrationModal = async () => {
  registrationModalVisible.value = true
  selectedRegistrationFolder.value = null
  registrationProgress.value = 0
  registrationInProgress.value = false
  
  try {
    const result = await imageApi.getRegistrationFolderList()
    registrationFolderList.value = result
  } catch (error) {
    message.error(error.message)
    registrationFolderList.value = []
  }
}

// 开始配准，调用后端接口启动配准流程并监控进度
const startRegistration = async (folderName) => {
  if (!folderName) {
    message.warning("请选择一个文件夹")
    return
  }
  
  try {
    // 启动配准任务，获取任务ID
    const response = await imageApi.startRegistration(folderName, userStore.username)
    
    // 模拟配准进度（实际项目中应该通过轮询API或WebSocket获取真实进度）
    let currentProgress = 0
    const interval = setInterval(() => {
      // 更新进度
      if (currentProgress < 95) {
        currentProgress += Math.random() * 5 + 1
        if (currentProgress > 95) currentProgress = 95
        
        // 通过ref访问模态框组件方法
        if (modalRef.value) {
          modalRef.value.updateRegistrationProgress(folderName, Math.floor(currentProgress))
        }
      } else {
        clearInterval(interval)
        
        // 模拟最终完成
        setTimeout(() => {
          currentProgress = 100
          
          // 通过ref访问模态框组件方法
          if (modalRef.value) {
            modalRef.value.setRegistrationSuccess(folderName)
          }
          
          message.success(`文件夹 ${folderName} 配准成功`)
          fetchFileList()
        }, 1000)
      }
    }, 500) // 每500ms更新一次进度
    
  } catch (error) {
    // 通过ref访问模态框组件方法
    if (modalRef.value) {
      modalRef.value.setRegistrationError(folderName)
    }
    
    message.error(`配准失败: ${error.message}`)
  }
}

// 一键展示图片
const autoDisplayImages = (folderName, files) => {
  console.log(`接收到一键展示请求: ${folderName}，文件数量: ${files.length}`)
  
  if (files.length === 0) {
    message.warning('没有可展示的图片')
    return
  }
  
  // 准备图像文件数组，包含URL和名称
  const imageFiles = files.map(file => ({
    url: `/api/dzi/processed/${folderName}/${file.name}/`,
    name: file.name
  }))
  
  // 设置所有可用的图像文件到store中
  viewerStore.setAllImageFiles(imageFiles)
  
  // 获取分页信息
  const paginationInfo = viewerStore.getPaginationInfo()
  
}

// 处理文件夹上传成功后的回调
const handleFolderUploaded = (folderName) => {
  fetchFileList()
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
  