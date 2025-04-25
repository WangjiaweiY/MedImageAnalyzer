<template>
  <n-layout class="layout">
    <!-- 头部导航组件 -->
    <header-component
      :layout-type="layoutType"
      :sync-enabled="syncEnabled"
      :status-bar="statusBar"
      @update:layout-type="changeLayout"
      @update:sync-enabled="toggleSync"
      @close-status-bar="closeStatusBar"
      @open-registration-modal="openRegistrationModal"
      @handle-folder-and-upload="handleFolderAndUpload"
    />

    <!-- 主体区域：左侧为文件目录列表，右侧为图像展示区域 -->
    <n-layout has-sider class="content-wrapper">
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
        @IHCanalysis="IHCanalysis"
        @resultFolderIHC="resultFolderIHC"
        @resultFileIHC="resultFileIHC"
        @thresholdAnalysis="thresholdAnalysis"
        @fullnetAnalysis="fullnetAnalysis"
        @resultFolderFullnet="resultFolderFullnet"
        @autoDisplayImages="autoDisplayImages"
      />

      <!-- 图像查看器组件 -->
      <viewer-component
        :layout-type="layoutType"
        :sync-enabled="syncEnabled"
        :selected-viewer-index="selectedViewerIndex"
        :viewers="viewers"
        :viewer-file-names="viewerFileNames"
        @update:selected-viewer-index="updateSelectedViewerIndex"
        @update:viewers="updateViewers"
        @init-viewers="initViewers"
        @update-viewer-dzi-url="updateViewerDziUrl"
        @setup-sync="setupSync"
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

    <!-- 阈值分析模态框组件 -->
    <threshold-analysis-modal
      :visible="thresholdAnalysisVisible"
      :folder-name="thresholdAnalysisFolder"
      :file-name="thresholdAnalysisFile"
      @update:visible="(val) => thresholdAnalysisVisible = val"
      @save-results="saveThresholdResults"
    />

    <!-- Fullnet分析模态框组件 -->
    <fullnet-analysis-modal
      :visible="fullnetAnalysisVisible"
      :folder-name="fullnetAnalysisFolder"
      :file-name="fullnetAnalysisFile"
      @update:visible="(val) => fullnetAnalysisVisible = val"
      @save-results="saveFullnetResults"
    />

    <!-- Fullnet结果查询模态框组件 -->
    <fullnet-results-modal
      :visible="fullnetResultsVisible"
      :folder-name="fullnetResultsFolder"
      @update:visible="(val) => fullnetResultsVisible = val"
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
import ThresholdAnalysisModal from '@/components/ThresholdAnalysisModal.vue'
import FullnetAnalysisModal from '@/components/FullnetAnalysisModal.vue'
import FullnetResultsModal from '@/components/FullnetResultsModal.vue'

const message = useMessage()
const userStore = useUserStore()
const viewerStore = useViewerStore()

// 使用 viewerStore 中的状态和方法
const layoutType = computed(() => viewerStore.layoutType)
const syncEnabled = computed(() => viewerStore.syncEnabled)
const viewers = computed(() => viewerStore.viewers)
const selectedViewerIndex = computed(() => viewerStore.selectedViewerIndex)
const viewerFileNames = computed(() => viewerStore.viewerFileNames)

const changeLayout = (num) => viewerStore.changeLayout(num)
const toggleSync = () => viewerStore.toggleSync()
const initViewers = () => viewerStore.initViewers()
const updateSelectedViewerIndex = (index) => {
  viewerStore.selectedViewerIndex = index
}
const updateViewers = (newViewers) => {
  viewerStore.viewers = newViewers
}
const setupSync = () => viewerStore.setupSync()

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

// 阈值分析相关状态
const thresholdAnalysisVisible = ref(false)
const thresholdAnalysisFolder = ref('')
const thresholdAnalysisFile = ref('')

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

// 免疫组化分析
const IHCanalysis = async (folderName, fileName) => {
  try {
    // 显示分析开始的提示
    message.loading(`正在开始对 ${fileName} 进行免疫组化分析...`, {duration: 3000})
    
    // 显示状态栏提示
    statusBar.value = {
      visible: true,
      folder: fileName,
      operation: "ihc",
      message: `正在分析中...`,
      startTime: Date.now(),
      elapsed: 0,
      finished: false,
      error: false
    }
    startStatusTimer()
    
    await imageApi.analyzeIHC(folderName, fileName)
    
    // 分析开始后更新状态
    statusBar.value.message = "分析已提交，正在后台处理"
    message.success('免疫组化分析已开始处理，完成后可查看结果')
    
    // 自动查询结果准备情况
    checkAnalysisStatus(folderName, fileName)
  } catch (error) {
    statusBar.value.message = "分析失败"
    statusBar.value.finished = true
    statusBar.value.error = true
    stopStatusTimer()
    message.error(error.message)
  }
}

// 定期检查分析状态
const checkAnalysisStatus = (folderName, fileName) => {
  const checkInterval = setInterval(async () => {
    try {
      const data = await imageApi.getFileAnalysisResult(folderName, fileName)
      if (data !== null) {
        // 找到结果，分析已完成
        clearInterval(checkInterval)
        statusBar.value.message = "分析完毕"
        statusBar.value.finished = true
        stopStatusTimer()
        message.success(`${fileName} 的免疫组化分析已完成`)
        
        // 弹出结果窗口
        resultModalTitle.value = `免疫组化分析结果 - 图片【${fileName}】`
        resultModalContent.value = data
        resultModalVisible.value = true
      }
      // 如果结果为null，继续等待
    } catch (error) {
      console.error('检查分析状态出错:', error)
      // 出错时不停止检查，继续尝试
    }
  }, 10000) // 每10秒检查一次
  
  // 设置最大检查时间，避免无限期等待
  setTimeout(() => {
    clearInterval(checkInterval)
    if (!statusBar.value.finished) {
      statusBar.value.message = "分析仍在处理中，可稍后查询结果"
      statusBar.value.finished = true
      stopStatusTimer()
    }
  }, 5 * 60 * 1000) // 最多等待5分钟
}

// 查询指定文件夹下所有图片的免疫组化结果
const resultFolderIHC = async (folderName) => {
  message.loading(`正在查询文件夹 ${folderName} 的分析结果...`)
  
  try {
    const data = await imageApi.getFolderAnalysisResult(folderName)
    console.log('文件夹分析API返回数据:', data) // 添加日志输出
    
    resultModalTitle.value = `免疫组化分析结果 - 文件夹【${folderName}】`
    if (data === null) {
      resultModalContent.value = '未找到分析结果，请先进行分析或等待分析完成'
      message.warning(`未找到文件夹 ${folderName} 的分析结果`)
    } else {
      resultModalContent.value = data
      message.success(`已获取文件夹 ${folderName} 的分析结果`)
    }
  } catch (error) {
    console.error('查询文件夹分析结果出错:', error) // 添加错误日志
    resultModalTitle.value = `免疫组化分析结果 - 文件夹【${folderName}】`
    resultModalContent.value = `查询结果出错: ${error.message}`
    message.error(`查询文件夹 ${folderName} 的分析结果失败`)
  } finally {
    resultModalVisible.value = true
  }
}

// 查询单个图片的免疫组化结果
const resultFileIHC = async (folderName, fileName) => {
  console.log(`AnalysisView接收到查询请求: ${folderName}/${fileName}`)
  message.loading(`正在查询图片 ${fileName} 的分析结果...`)
  
  try {
    const data = await imageApi.getFileAnalysisResult(folderName, fileName)
    console.log('API返回数据:', data) // 日志记录API返回
    
    resultModalTitle.value = `免疫组化分析结果 - 图片【${fileName}】`
    if (data === null) {
      resultModalContent.value = '未找到分析结果，请先进行分析或等待分析完成'
      message.warning(`未找到图片 ${fileName} 的分析结果`)
    } else {
      resultModalContent.value = data
      message.success(`已获取图片 ${fileName} 的分析结果`)
    }
  } catch (error) {
    console.error('API调用失败:', error)
    resultModalTitle.value = `免疫组化分析结果 - 图片【${fileName}】`
    resultModalContent.value = `查询结果出错: ${error.message}`
    message.error(`查询图片 ${fileName} 的分析结果失败`)
  } finally {
    resultModalVisible.value = true
  }
}

// 阈值分析请求
const thresholdAnalysis = (folderName, fileName) => {
  console.log(`接收到阈值分析请求: ${folderName}/${fileName}`)
  
  // 设置阈值分析弹窗的数据
  thresholdAnalysisFolder.value = folderName
  thresholdAnalysisFile.value = fileName
  thresholdAnalysisVisible.value = true
  
  message.info(`正在打开【${fileName}】的阈值分析界面`)
}

// 保存阈值分析结果
const saveThresholdResults = (results) => {
  console.log('保存阈值分析结果:', results)
  message.success(`保存了阈值${results.threshold}的分析结果`)
  
  // 可以将阈值分析结果保存到服务器或进行其他处理
  // ...
  
  // 可以在保存后显示结果模态框
  resultModalTitle.value = `阈值分析结果 - 图片【${results.imageName}】`
  resultModalContent.value = results
  resultModalVisible.value = true
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

// Fullnet分析相关状态
const fullnetAnalysisVisible = ref(false)
const fullnetAnalysisFolder = ref('')
const fullnetAnalysisFile = ref('')

// Fullnet分析相关函数
const saveFullnetResults = (results) => {
  console.log('保存Fullnet分析结果:', results)
  message.success(`保存了Fullnet分析结果`)
  
  try {
    // 将Fullnet分析结果保存到服务器
    imageApi.saveFullnetAnalysisResult(
      results.folderName, 
      results.fileName, 
      results
    ).then(() => {
      console.log('Fullnet分析结果已保存到服务器')
    }).catch(error => {
      console.error('保存Fullnet分析结果失败:', error)
    })
    
    // 在保存后显示结果模态框
    resultModalTitle.value = `Fullnet分析结果 - 图片【${results.fileName}】`
    resultModalContent.value = results
    resultModalVisible.value = true
  } catch (error) {
    console.error('处理Fullnet分析结果出错:', error)
    message.error('保存分析结果失败: ' + error.message)
  }
}

// Fullnet结果查询相关状态
const fullnetResultsVisible = ref(false)
const fullnetResultsFolder = ref('')

// Fullnet结果查询相关函数
const updateFullnetResultsVisible = (value) => { fullnetResultsVisible.value = value }

// Fullnet分析请求
const fullnetAnalysis = (folderName, fileName) => {
  console.log(`接收到Fullnet分析请求: ${folderName}/${fileName}`)
  
  // 设置Fullnet分析弹窗的数据
  fullnetAnalysisFolder.value = folderName
  fullnetAnalysisFile.value = fileName
  fullnetAnalysisVisible.value = true
  
  // 重要: 确保visible状态变更，触发模态框重新打开
  setTimeout(() => {
    if (!fullnetAnalysisVisible.value) {
      fullnetAnalysisVisible.value = true
    }
  }, 100)
  
  message.info(`正在打开【${fileName}】的Fullnet分析界面`)
}

// 查询文件夹Fullnet分析结果
const resultFolderFullnet = (folderName) => {
  console.log(`查询文件夹Fullnet分析结果: ${folderName}`)
  
  // 设置Fullnet结果查询弹窗的数据
  fullnetResultsFolder.value = folderName
  fullnetResultsVisible.value = true
  
  message.info(`正在查询文件夹【${folderName}】的Fullnet分析结果`)
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
  height: calc(100vh - 64px);
  display: flex;
}
</style>
  