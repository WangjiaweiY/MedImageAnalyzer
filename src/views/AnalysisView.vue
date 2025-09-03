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
      @toggleStainInfo="toggleStainInfo"
      @open-manual-modal="openManualModal"
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
      :manual-modal-visible="manualModalVisible"
      :processed-folder-list="fileList"
      @update:registration-modal-visible="updateRegistrationModalVisible"
      @update:selected-registration-folder-value="updateSelectedRegistrationFolder"
      @update:upload-modal-visible="updateUploadModalVisible"
      @update:result-modal-visible="updateResultModalVisible"
      @update:manual-modal-visible="updateManualModalVisible"
      @start-registration="startRegistration"
      @handle-file-selection="handleFileSelection"
      @start-upload="startUpload"
      @folder-uploaded="handleFolderUploaded"
      @view-task-result="handleViewTaskResult"
      ref="modalRef"
    />
  </n-layout>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
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

// 导入注册服务
import registrationService from '@/services/registrationService'

const message = useMessage()
const userStore = useUserStore()
const viewerStore = useViewerStore()
const modalRef = ref(null)

// 标注同步状态
const isSyncAnnotation = ref(false)
// 切换标注同步状态
const updateIsSyncAnnotation = (value) => {
  isSyncAnnotation.value = value
}

  // 切换扫描信息图显示状态
  const toggleStainInfo = (value) => {
    viewerStore.toggleScanInfo()
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

// 操作说明相关状态
const manualModalVisible = ref(false)

// 模态框状态更新函数
const updateRegistrationModalVisible = (value) => { registrationModalVisible.value = value }
const updateSelectedRegistrationFolder = (value) => { selectedRegistrationFolder.value = value }
const updateUploadModalVisible = (value) => { uploadModalVisible.value = value }
const updateResultModalVisible = (value) => { resultModalVisible.value = value }
const updateManualModalVisible = (value) => { manualModalVisible.value = value }

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
  
  // 更新查看器（携带folder用于扫描信息图）
  viewerStore.updateViewerDziUrl(url, item.name, parentFolder)
}

// 更新DZI URL（从视图组件调用）
const updateViewerDziUrl = (url, fileName, folderName = '') => {
  viewerStore.updateViewerDziUrl(url, fileName, folderName)
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

// 打开操作说明模态框
const openManualModal = () => {
  manualModalVisible.value = true
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

// 开始配准过程
const startRegistration = async () => {
  try {
    if (!selectedRegistrationFolder.value) {
      message.error("请选择一个文件夹进行配准")
      return
    }

    // 检查是否已有配准任务在进行中
    if (registrationService.isTaskInProgress()) {
      message.warning("已有配准任务正在进行中，请等待当前任务完成")
      return
    }

    // 显示进度中的状态
    registrationInProgress.value = true
    registrationProgress.value = 0
    
    // 调用配准API - 注意这里不需要手动设置isTaskInProgress，submitTask方法内部会设置
    const response = await registrationService.submitTask(selectedRegistrationFolder.value)
    
    // 根据API文档解析响应
    if (response && response.code === 1 && response.data) {
      const taskData = response.data
      message.success(`配准任务已提交，任务ID: ${taskData.taskId}`)
      
      // 保存任务信息到本地存储，便于下次恢复
      registrationService.saveTaskToLocalStorage(selectedRegistrationFolder.value, {
        taskId: taskData.taskId,
        folder: selectedRegistrationFolder.value,
        status: 'pending',
        progress: 0,
        message: taskData.message || '任务已提交，等待处理',
        startTime: new Date().toISOString()
      })
      
      // 关闭配准对话框，因为任务进度会通过任务列表展示
      registrationModalVisible.value = false
      
      // 等待一段时间后刷新文件列表，以显示配准后的文件
      setTimeout(() => {
        fetchFileList()
      }, 10000) // 等待10秒后刷新
    } else {
      throw new Error(response?.msg || "未获取到有效的任务ID")
    }
  } catch (error) {
    console.error("配准失败:", error)
    message.error(`配准失败: ${error.message || "未知错误"}`)
    registrationInProgress.value = false
    
    // 重置配准任务进行状态
    registrationService.setTaskInProgress(false)
  }
}

// 查看配准结果
const handleViewTaskResult = (task) => {
  if (task && task.folder) {
    // 更新选中的文件夹为配准结果文件夹
    selectedFolder.value = task.folder
    
    // 展开该文件夹
    if (!expandedFolders.value[task.folder]) {
      toggleFolder(task.folder)
    }
    
    // 关闭配准对话框
    registrationModalVisible.value = false
    
    // 可选：刷新文件列表以确保看到最新结果
    fetchFileList()
  }
}

// 一键展示图片
const autoDisplayImages = (folderName, files) => {
  console.log(`接收到一键展示请求: ${folderName}，文件数量: ${files.length}`)
  
  if (files.length === 0) {
    message.warning('没有可展示的图片')
    return
  }
  
  // 准备图像文件数组，包含URL、名称与所属文件夹（用于扫描信息图）
  const imageFiles = files.map(file => ({
    url: `/api/dzi/processed/${folderName}/${file.name}/`,
    name: file.name,
    folder: folderName
  }))
  
  // 设置所有可用的图像文件到store中
  viewerStore.setAllImageFiles(imageFiles)
  
  // 获取分页信息并显示第一页
  viewerStore.displayImagesByPage(1)
  
  // 不再获取染色信息
}

// 处理文件夹上传成功后的回调
const handleFolderUploaded = (folderName) => {
  fetchFileList()
  
  // 设置一个标记，用于在配准完成后自动展示
  if (folderName) {
    localStorage.setItem('auto_display_folder', folderName)
  }
}

// 处理配准完成后的自动展示
const handleAutoDisplayAfterRegistration = async (folderName) => {
  try {
    // 展开该文件夹
    if (!expandedFolders.value[folderName]) {
      await toggleFolder(folderName)
    }
    
    // 设置为选中文件夹
    selectedFolder.value = folderName
    
    // 获取文件夹中的文件
    const files = folderDziFiles.value[folderName]
    if (files && files.length > 0) {
      // 自动展示该文件夹的图片
      autoDisplayImages(folderName, files)
      
      // 显示成功提示
      message.success(`配准完成！已自动加载文件夹「${folderName}」的图像`)
    } else {
      message.info(`配准完成！文件夹「${folderName}」已展开，请选择要查看的图像`)
    }
  } catch (error) {
    console.error('自动展示配准结果失败:', error)
    message.error('配准完成，但自动展示失败，请手动选择查看')
  }
}

// 检查活跃配准任务的状态
const checkActiveRegistrationTask = async () => {
  try {
    // 获取所有本地存储的任务
    const allTasks = registrationService.getAllLocalTasks()
    
    // 查找可能正在进行中的任务
    let activeTasks = []
    for (const folder in allTasks) {
      const task = allTasks[folder]
      if (task.status === 'pending' || task.status === 'processing') {
        // 如果找到正在进行中的任务，检查其状态
        activeTasks.push(task)
      }
    }
    
    // 如果有活跃任务，获取最新状态
    if (activeTasks.length > 0) {
      for (const task of activeTasks) {
        try {
          const response = await registrationService.getTaskProgress(task.taskId)
          if (response && response.code === 1 && response.data) {
            // 更新本地任务状态
            registrationService.updateTaskProgress(task.taskId, response.data)
            
            // 如果任务已完成或失败，更新状态
            const status = response.data.status
            if (status === 'completed' || status === 'failed' || status === 'error') {
              // 重置全局任务状态
              registrationService.setTaskInProgress(false)
              // 重置本地UI状态
              if (task.folder === selectedRegistrationFolder.value) {
                registrationInProgress.value = false
              }
              
              // 如果任务完成，刷新文件列表并检查是否需要自动展示
              if (status === 'completed') {
                fetchFileList()
                
                // 检查是否需要自动展示刚配准完成的文件夹
                const autoDisplayFolder = localStorage.getItem('auto_display_folder')
                if (autoDisplayFolder && autoDisplayFolder === task.folder) {
                  // 延迟一点时间确保文件列表已刷新
                  setTimeout(() => {
                    handleAutoDisplayAfterRegistration(autoDisplayFolder)
                  }, 2000)
                  
                  // 清除标记
                  localStorage.removeItem('auto_display_folder')
                }
              }
            }
          }
        } catch (error) {
          console.error(`检查任务 ${task.taskId} 状态失败:`, error)
        }
      }
    }
  } catch (error) {
    console.error("检查活跃任务失败:", error)
  }
}

// 定义一个变量来存储定时器ID
let activeTaskCheckTimer = null

// 在组件挂载时，设置定期检查任务状态
onMounted(() => {
  // 初始化操作
  fetchFileList()
  initViewers()
  
  // 立即检查一次活跃任务
  checkActiveRegistrationTask()
  
  // 设置定时器，每30秒检查一次活跃任务
  activeTaskCheckTimer = setInterval(checkActiveRegistrationTask, 30000)
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (activeTaskCheckTimer) {
    clearInterval(activeTaskCheckTimer)
    activeTaskCheckTimer = null
  }
})
</script>

<style scoped>
.layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f9fc 0%, #eef3f9 100%);
}

.content-wrapper {
  flex: 1;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  height: calc(100vh - 64px);
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, #f9fafc 0%, #f5f7f9 100%);
  border-radius: 12px 12px 0 0;
  margin-top: 4px;
}

.expanded-content {
  height: calc(100vh - 10px);
}

:deep(.n-layout-sider) {
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  z-index: 10;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0 0 0 12px;
  overflow: hidden;
}

:deep(.n-layout-sider:hover) {
  box-shadow: 0 0 25px rgba(0, 0, 0, 0.14);
}

:deep(.n-layout-sider-collapsed-bar) {
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 70px;
  border-radius: 0 8px 8px 0;
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
  z-index: 9;
  background: linear-gradient(90deg, #f0f2f5 0%, #e6f7ff 100%);
  border-left: none;
}

:deep(.n-layout-sider-collapsed-bar:hover) {
  box-shadow: 5px 0 15px rgba(0, 0, 0, 0.18);
  background: linear-gradient(90deg, #f0f2f5 0%, #bae7ff 100%);
}

:deep(.n-layout-sider-collapsed-bar .n-layout-toggle-button) {
  margin-top: -6px;
  transition: all 0.2s ease;
}

:deep(.n-layout-sider-collapsed-bar:hover .n-layout-toggle-button) {
  transform: scale(1.15);
  color: #1890ff;
}

:deep(.n-layout-content) {
  z-index: 5;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  border-radius: 0 0 12px 0;
}

/* 增强滚动条样式 */
:deep(::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(::-webkit-scrollbar-thumb) {
  background: rgba(24, 144, 255, 0.2);
  border-radius: 6px;
}

:deep(::-webkit-scrollbar-thumb:hover) {
  background: rgba(24, 144, 255, 0.4);
}

:deep(::-webkit-scrollbar-track) {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
}
</style>
  