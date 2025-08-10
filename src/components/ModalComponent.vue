<template>
  <div>
    <!-- 配准模态框 -->
    <div v-if="registrationModalVisible" class="custom-modal-overlay">
      <div class="custom-modal-box registration-modal">
        <div class="modal-header">
          <span class="modal-title">选择文件夹进行配准</span>
          <button class="modal-close-btn" @click="closeRegistrationModal">×</button>
        </div>
        <div class="modal-body">
          <!-- 任务进度展示 - 只在有当前任务时显示 -->
          <registration-progress 
            v-if="currentTask && (currentTask.status === 'pending' || currentTask.status === 'processing')"
            :task="currentTask"
            @refresh="refreshTaskProgress"
            @view-result="viewTaskResult"
            class="registration-progress-component"
          >
            <template #close-button>
              <button class="close-details-btn" @click="closeTaskDetails">×</button>
            </template>
          </registration-progress>
          
          <!-- 历史任务视图 - 只在历史任务视图激活时显示 -->
          <div v-if="showHistoryTasks && recentTasks.length > 0" class="recent-tasks">
            <div class="section-title">
              <span>历史任务</span>
              <n-button text size="small" @click="loadUserTasks">
                <n-icon><reload-outlined /></n-icon> 刷新
              </n-button>
            </div>
            <n-list bordered size="small">
              <n-list-item v-for="(task, index) in recentTasks" :key="task.taskId">
                <n-thing :title="task.folder" :description="`状态: ${getStatusText(task.status)}`">
                  <template #header-extra>
                    <n-tag :type="getStatusTagType(task.status)" size="small">
                      {{ task.progress }}%
                    </n-tag>
                  </template>
                  <template #description>
                    <div class="task-description">
                      <span>{{ task.message }}</span>
                      <span>{{ formatTime(task.lastUpdated) }}</span>
                    </div>
                  </template>
                  <template #footer>
                    <n-space>
                      <n-button size="tiny" @click="loadTaskDetails(task)">查看详情</n-button>
                      <n-button 
                        v-if="task.status === 'completed'" 
                        size="tiny" 
                        type="primary"
                        @click="viewTaskResult(task)"
                      >
                        查看结果
                      </n-button>
                    </n-space>
                  </template>
                </n-thing>
              </n-list-item>
            </n-list>
            <div class="button-row">
              <n-button @click="toggleHistoryTasks(false)" size="small">返回</n-button>
            </div>
          </div>
          
          <!-- 可选择的文件夹列表 - 在非历史任务视图时显示 -->
          <div v-if="!showHistoryTasks">
            <div class="section-title">可配准文件夹</div>
            <ul class="folder-list">
              <li 
                v-for="folder in registrationFolderList" 
                :key="folder.folderName"
                :class="{ 
                  selected: selectedRegistrationFolder === folder.folderName,
                  'already-registered': isFolderAlreadyRegistered(folder.folderName),
                  disabled: isFolderAlreadyRegistered(folder.folderName)
                }"
                @click="selectRegistrationFolder(folder.folderName)"
              >
                <span class="folder-name">{{ folder.folderName }}</span>
                <span v-if="isFolderAlreadyRegistered(folder.folderName)" class="status-tag">已配准</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <div v-if="!showHistoryTasks">
            <n-button 
              type="primary"
              @click="startRegistration" 
              :disabled="!selectedRegistrationFolderValue || isRegistrationTaskInProgress || isFolderAlreadyRegistered(selectedRegistrationFolderValue)"
            >
              {{ isFolderAlreadyRegistered(selectedRegistrationFolderValue) ? '已配准' : '开始配准' }}
            </n-button>
            <n-button 
              type="primary"
              @click="toggleHistoryTasks(true)"
            >
              历史任务
            </n-button>
          </div>
          <!-- 历史任务视图不需要额外的按钮 -->
        </div>
      </div>
    </div>
    
    <!-- 上传模态框 -->
    <div v-if="uploadModalVisible" class="custom-modal-overlay">
      <div class="custom-modal-box upload-modal">
        <div class="modal-header">
          <span class="modal-title">上传文件夹</span>
          <button class="modal-close-btn" @click="closeUploadModal">×</button>
        </div>
        <div class="modal-body">
          <!-- 已选择的文件夹列表 -->
          <div class="upload-files-list">
            <template v-if="uploadedFolders.length > 0">
              <div v-for="(folder, index) in uploadedFolders" :key="index" class="upload-folder-item">
                <div class="upload-folder-info">
                  <div class="folder-name">{{ folder.name }}</div>
                  <div class="file-count">{{ folder.fileCount }}个文件</div>
                </div>
                <div class="upload-progress-wrapper">
                  <div v-if="folder.status === 'uploading'" class="upload-progress">
                    <div class="progress-bar">
                      <div class="progress-bar-inner" :style="{ width: `${folder.progress}%` }"></div>
                    </div>
                    <div class="progress-info">
                      <div class="progress-text">{{ folder.progress }}%</div>
                    </div>
                    <div v-if="folder.formattedUploadedSize" class="size-info">
                      {{ folder.formattedUploadedSize }} / {{ folder.formattedTotalSize }}
                    </div>
                  </div>
                  <div v-else-if="folder.status === 'success'" class="upload-status success">
                    上传成功
                    <button class="delete-btn" @click="removeUploadedFolder(index)">×</button>
                  </div>
                  <div v-else-if="folder.status === 'error'" class="upload-status error">
                    上传失败
                    <button class="delete-btn" @click="removeUploadedFolder(index)">×</button>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="no-folders-selected">
              请选择文件夹进行上传
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="footer-left">
            <label class="upload-label">
              <input type="file" webkitdirectory multiple @change="handleFileSelection" class="file-input" />
              <span class="upload-button">选择文件夹</span>
            </label>
          </div>
          <div class="footer-right">
            <button class="modal-btn" @click="closeUploadModal">关闭</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果模态框 - 优化结果展示 -->
    <n-modal
      :show="resultModalVisible"
      @update:show="updateResultModalVisible"
      :title="resultModalTitle"
      preset="dialog"
      :style="{ width: '800px' }"
    >
      <div class="result-content">
        <!-- 当结果未找到或出错时显示 -->
        <div v-if="typeof resultModalContent === 'string'" class="result-message">
          {{ resultModalContent }}
        </div>
        
        <!-- 当结果为对象时，显示结构化内容 -->
        <div v-else-if="resultModalContent && typeof resultModalContent === 'object'" class="result-data">
          <!-- 如果是文件夹分析结果(结果是数组)，以表格形式展示所有图片数据 -->
          <div v-if="Array.isArray(resultModalContent)" class="folder-analysis-results">
            <h3>文件夹分析汇总</h3>
            
            <!-- 分析数据表格 -->
            <n-data-table
              :columns="folderAnalysisColumns"
              :data="resultModalContent"
              :bordered="true"
              :single-line="false"
              size="small"
            />
            
            <!-- 平均值统计表格 -->
            <div class="average-stats">
              <h3>数据统计</h3>
              <n-data-table
                :columns="averageColumns"
                :data="calculateAverageStats(resultModalContent)"
                :bordered="true"
                :single-line="false"
                size="small"
              />
            </div>
          </div>
          
          <!-- 单图片分析结果展示 -->
          <div v-else>
            <!-- 图像分析结果 -->
            <div class="result-image-section">
              <!-- 如果有图像URL，显示图像 -->
              <img v-if="resultModalContent.imageUrl" :src="resultModalContent.imageUrl" class="result-image" />
              <div v-else class="no-image">
                <n-empty description="暂无结果图像" />
              </div>
            </div>
            
            <!-- 文件信息和分析数据表格 -->
            <div class="result-table-section">
              <h3>分析数据</h3>
              <n-data-table
                :columns="analysisColumns"
                :data="formatAnalysisData(resultModalContent)"
                :bordered="true"
                :single-line="false"
                size="small"
              />
              
              <!-- 补充信息 -->
              <div class="additional-info" v-if="resultModalContent.notes">
                <h3>备注信息</h3>
                <p>{{ resultModalContent.notes }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 当结果为null时显示 -->
        <div v-else class="no-result">
          <n-empty description="暂无分析结果" />
        </div>
      </div>
      
      <template #action>
        <n-button @click="closeResultModal">关闭</n-button>
        <n-button v-if="canExportResult" type="primary" @click="exportResult">导出结果</n-button>
      </template>
    </n-modal>

    <!-- 操作说明PDF模态框 -->
    <div v-if="manualModalVisible" class="custom-modal-overlay">
      <div class="custom-modal-box manual-modal">
        <div class="modal-header">
          <span class="modal-title">操作说明书</span>
          <button class="modal-close-btn" @click="closeManualModal">×</button>
        </div>
        <div class="modal-body manual-body">
          <div class="pdf-container">
            <iframe 
              src="/specification.pdf" 
              type="application/pdf"
              class="pdf-viewer"
              frameborder="0"
            ></iframe>
          </div>
          <div class="pdf-fallback">
            <p>如果PDF无法正常显示，请 <a href="/specification.pdf" target="_blank" download="操作说明书.pdf">点击此处下载</a></p>
          </div>
        </div>
        <div class="modal-footer">
          <div class="footer-right">
            <a href="/specification.pdf" target="_blank" download="操作说明书.pdf" class="modal-btn">下载PDF</a>
            <button class="modal-btn" @click="closeManualModal">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { 
  NModal, 
  NDataTable, 
  NEmpty, 
  NSpace, 
  NButton, 
  NIcon, 
  NList, 
  NListItem, 
  NThing, 
  NTag 
} from 'naive-ui'
import { 
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@vicons/antd'
import { useUserStore } from '@/stores/user'
import { imageApi } from '@/services/api'
import RegistrationProgress from './RegistrationProgress.vue'
import registrationService from '../services/registrationService'

const props = defineProps({
  registrationModalVisible: {
    type: Boolean,
    required: true
  },
  registrationFolderList: {
    type: Array,
    required: true
  },
  selectedRegistrationFolderValue: {
    type: String,
    default: null
  },
  uploadModalVisible: {
    type: Boolean,
    required: false,
    default: false
  },
  resultModalVisible: {
    type: Boolean,
    required: false,
    default: false
  },
  manualModalVisible: {
    type: Boolean,
    required: false,
    default: false
  },
  processedFolderList: {
    type: Array,
    required: false,
    default: () => []
  },
  registrationProgress: {
    type: Number,
    default: 0
  },
  registrationInProgress: {
    type: Boolean,
    default: false
  },
  resultData: {
    type: [Object, Array],
    default: () => ({})
  },
  resultModalTitle: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'update:registrationModalVisible', 
  'update:selectedRegistrationFolderValue',
  'update:uploadModalVisible',
  'update:resultModalVisible',
  'update:manualModalVisible',
  'startRegistration',
  'handleFileSelection',
  'startUpload',
  'folderUploaded',
  'view-task-result'
])

// 存储选择的文件和文件夹名
const selectedFiles = ref([])
const folderName = ref('')
const uploadedFolders = ref([])
const registeredFolders = ref([])

// 配准任务相关
const currentTask = ref(null)
const recentTasks = ref([])
const isTaskInProgress = computed(() => 
  props.registrationInProgress || 
  (currentTask.value && (currentTask.value.status === 'pending' || currentTask.value.status === 'processing'))
)

// 检查是否有配准任务正在进行中（使用registrationService的全局状态）
const isRegistrationTaskInProgress = computed(() => {
  return isTaskInProgress.value || registrationService.isTaskInProgress();
})

// 添加历史任务显示状态控制
const showHistoryTasks = ref(false)

// 切换历史任务显示状态
const toggleHistoryTasks = (show) => {
  showHistoryTasks.value = show
  if (show) {
    loadUserTasks() // 加载历史任务数据
  }
}

// 格式化日期时间
const formatTime = (timeString) => {
  if (!timeString) return '无';
  try {
    const date = new Date(timeString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch (err) {
    return timeString;
  }
};

// 获取状态文本
const getStatusText = (status) => {
  switch(status) {
    case 'pending': return '等待中';
    case 'processing': return '处理中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return '未知状态';
  }
};

// 获取状态标签类型
const getStatusTagType = (status) => {
  switch(status) {
    case 'pending': return 'default';
    case 'processing': return 'info';
    case 'completed': return 'success';
    case 'failed': return 'error';
    default: return 'default';
  }
};

// 加载用户所有任务
const loadUserTasks = async () => {
  try {
    const response = await registrationService.getUserTasks();
    if (response && response.code === 1 && response.data) {
      // 按最后更新时间排序，最新的在前面
      recentTasks.value = response.data
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
        .slice(0, 5); // 只显示最近5条
    }
  } catch (error) {
    console.error('加载任务列表失败:', error);
  }
};

// 加载任务详情
const loadTaskDetails = async (task) => {
  try {
    const response = await registrationService.getTaskProgress(task.taskId);
    if (response && response.code === 1 && response.data) {
      currentTask.value = response.data;
      // 保存到localStorage以便下次打开应用时恢复
      registrationService.saveTaskToLocalStorage(response.data.folder, response.data);
    }
  } catch (error) {
    console.error('加载任务详情失败:', error);
  }
};

// 关闭任务详情
const closeTaskDetails = () => {
  currentTask.value = null;
};

// 刷新当前任务进度
const refreshTaskProgress = async () => {
  if (!currentTask.value || !currentTask.value.taskId) return;
  
  try {
    const response = await registrationService.getTaskProgress(currentTask.value.taskId);
    if (response && response.code === 1 && response.data) {
      currentTask.value = response.data;
      // 更新本地存储
      if (currentTask.value.folder) {
        registrationService.saveTaskToLocalStorage(currentTask.value.folder, currentTask.value);
      }
    }
  } catch (error) {
    console.error('刷新任务进度失败:', error);
  }
};

// 查看任务结果
const viewTaskResult = (task) => {
  if (task.status === 'completed') {
    // 这里添加查看结果的逻辑
    emit('view-task-result', task);
  }
};

// 模态框打开时加载用户任务（如果有当前配准任务）
watch(() => props.registrationModalVisible, async (newValue) => {
  if (newValue) {
    // 重置历史任务视图状态
    showHistoryTasks.value = false
    
    // 检查localStorage是否有保存的任务
    if (props.selectedRegistrationFolderValue) {
      const savedTask = registrationService.getTaskFromLocalStorage(props.selectedRegistrationFolderValue);
      if (savedTask && savedTask.taskId) {
        try {
          const response = await registrationService.getTaskProgress(savedTask.taskId);
          if (response && response.code === 1 && response.data) {
            currentTask.value = response.data;
          }
        } catch (error) {
          console.error('加载保存的任务失败:', error);
        }
      }
    }
  }
});

// 处理文件选择
const handleFileSelection = (event) => {
  selectedFiles.value = Array.from(event.target.files)
  
  // 提取文件夹名称
  if (selectedFiles.value.length > 0) {
    const firstFilePath = selectedFiles.value[0].webkitRelativePath
    if (firstFilePath && firstFilePath.indexOf("/") !== -1) {
      folderName.value = firstFilePath.substring(0, firstFilePath.indexOf("/"))
      
      // 添加到上传队列
      const newFolder = {
        name: folderName.value,
        fileCount: selectedFiles.value.length,
        files: selectedFiles.value,
        status: 'uploading',
        progress: 0
      }
      
      uploadedFolders.value.push(newFolder)
      
      // 自动开始上传
      startUploadFolder(uploadedFolders.value.length - 1)
    }
  }
  
  emit('handleFileSelection', event)
}

  // 开始上传指定索引的文件夹
const startUploadFolder = async (index) => {
  const folder = uploadedFolders.value[index]
  if (!folder || folder.status !== 'uploading') return
  
  const formData = new FormData()
  const userStore = useUserStore()
  
  // 计算总文件大小用于进度计算
  let totalSize = 0
  folder.files.forEach(file => {
    formData.append('files', file, file.webkitRelativePath)
    totalSize += file.size
  })
  
  // 添加总大小信息到文件夹对象
  uploadedFolders.value[index].totalSize = totalSize
  uploadedFolders.value[index].formattedTotalSize = formatFileSize(totalSize)
  
  try {
    // 使用XMLHttpRequest来监听上传进度
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      // 监听上传进度 - 基于已上传文件大小
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const uploadedBytes = event.loaded
          const progress = Math.round((uploadedBytes / totalSize) * 100)
          
          // 更新进度信息
          uploadedFolders.value[index].progress = progress
          uploadedFolders.value[index].uploadedBytes = uploadedBytes
          uploadedFolders.value[index].formattedUploadedSize = formatFileSize(uploadedBytes)
        }
      })
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response)
        } else {
          reject(new Error(`HTTP error! Status: ${xhr.status}`))
        }
      })
      
      xhr.addEventListener('error', () => reject(new Error('上传失败')))
      
      xhr.open('POST', '/api/svs/upload')
      
      // 添加JWT认证头
      if (userStore.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${userStore.token}`)
      }
      
      xhr.send(formData)
    })
    
    // 上传成功
    uploadedFolders.value[index].status = 'success'
    uploadedFolders.value[index].progress = 100
    uploadedFolders.value[index].uploadedBytes = totalSize
    uploadedFolders.value[index].formattedUploadedSize = uploadedFolders.value[index].formattedTotalSize
    emit('folderUploaded', folder.name)
    
  } catch (error) {
    uploadedFolders.value[index].status = 'error'
    message.error(`文件夹 ${folder.name} 上传失败: ${error.message}`)
  }
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 删除已上传的文件夹
const removeUploadedFolder = (index) => {
  uploadedFolders.value.splice(index, 1)
}

// 开始上传
const startUpload = () => {
  if (selectedFiles.value.length === 0) {
    message.warning('请先选择一个文件夹')
    return
  }
  
  emit('startUpload', selectedFiles.value)
}

// 关闭上传模态框
const closeUploadModal = () => {
  emit('update:uploadModalVisible', false)
  // 只清空当前选择的文件，保留上传历史
  selectedFiles.value = []
  folderName.value = ''
}

const message = useMessage()

const closeRegistrationModal = () => {
  emit('update:registrationModalVisible', false)
}

const selectRegistrationFolder = (folderName) => {
  emit('update:selectedRegistrationFolderValue', folderName)
}

// 检查当前选中的文件夹是否正在处理
const isCurrentFolderProcessing = () => {
  return registeredFolders.value.some(folder => 
    folder.name === props.selectedRegistrationFolderValue && folder.status === 'processing'
  )
}

// 删除配准记录（成功或失败的都可以删除）
const removeRegistrationRecord = (index) => {
  if (registeredFolders.value[index] && 
      (registeredFolders.value[index].status === 'error' || 
       registeredFolders.value[index].status === 'success')) {
    // 直接从数组中删除该元素
    registeredFolders.value.splice(index, 1)
  }
}

// 配准文件夹
const startRegistration = () => {
  if (!props.selectedRegistrationFolderValue) {
    message.warning('请选择一个文件夹')
    return
  }
  
  // 检查文件夹是否已经配准
  if (isFolderAlreadyRegistered(props.selectedRegistrationFolderValue)) {
    message.warning('该文件夹已经配准完成，无需重复配准')
    return
  }
  
  // 检查文件夹是否已在处理中
  if (isCurrentFolderProcessing()) {
    message.warning('该文件夹正在配准中')
    return
  }
  
  // 添加到配准队列
  const folderExists = registeredFolders.value.find(f => f.name === props.selectedRegistrationFolderValue)
  if (!folderExists) {
    registeredFolders.value.push({
      name: props.selectedRegistrationFolderValue,
      status: 'processing',
      progress: 0
    })
  } else if (folderExists.status !== 'processing') {
    folderExists.status = 'processing'
    folderExists.progress = 0
  }
  
  // 触发配准操作
  emit('startRegistration', props.selectedRegistrationFolderValue)
}

const closeResultModal = () => {
  emit('update:resultModalVisible', false)
}

// 关闭操作说明模态框
const closeManualModal = () => {
  emit('update:manualModalVisible', false)
}

// 检查文件夹是否已经配准
const isFolderAlreadyRegistered = (folderName) => {
  // 如果文件夹在已处理的文件夹列表中，说明已经配准
  return props.processedFolderList.some(folder => folder.folderName === folderName)
}

// 更新配准进度
const updateRegistrationProgress = (folderName, progress, processedFiles, totalFiles) => {
  const folder = registeredFolders.value.find(f => f.name === folderName)
  if (folder && folder.status === 'processing') {
    folder.progress = progress
    
    // 如果提供了文件计数信息，也更新这些信息
    if (processedFiles !== undefined && totalFiles !== undefined) {
      folder.processedFiles = processedFiles
      folder.totalFiles = totalFiles
    }
  }
}

// 设置配准成功状态
const setRegistrationSuccess = (folderName) => {
  const folder = registeredFolders.value.find(f => f.name === folderName)
  if (folder) {
    folder.status = 'success'
    folder.progress = 100
  }
}

// 设置配准失败状态
const setRegistrationError = (folderName) => {
  const folder = registeredFolders.value.find(f => f.name === folderName)
  if (folder) {
    folder.status = 'error'
  }
}

// 向父组件暴露更新方法
defineExpose({
  updateRegistrationProgress,
  setRegistrationSuccess,
  setRegistrationError
})

// 检查是否可以导出结果
const canExportResult = computed(() => {
  return props.resultModalContent && typeof props.resultModalContent === 'object'
})

// 处理模态框显示状态更新
const updateResultModalVisible = (value) => {
  emit('update:resultModalVisible', value)
}

// 导出分析结果
const exportResult = () => {
  if (!props.resultModalContent) {
    message.warning('没有可导出的结果数据')
    return
  }
  
  try {
    // 从标题中提取信息
    const titleInfo = props.resultModalTitle || '分析结果'
    let exportFileName = 'analysis_results'
    
    // 从标题中提取文件夹名或文件名
    if (titleInfo.includes('【') && titleInfo.includes('】')) {
      const nameMatch = titleInfo.match(/【(.+?)】/)
      if (nameMatch && nameMatch[1]) {
        exportFileName = nameMatch[1]
      }
    }
    
    // 由于exportUtils已删除，显示暂不支持导出的消息
    message.info('导出功能暂不可用，已移除相关功能')
  } catch (error) {
    console.error('导出结果失败:', error)
    message.error(`导出失败: ${error.message}`)
  }
}

// 格式化分析数据以适配表格
const formatAnalysisData = (data) => {
  if (!data) return []
  
  // 将对象转换为表格行数据
  const formattedData = []
  
  // 需要排除的字段
  const excludedFields = ['imageUrl', 'notes', 'id', 'thumbnailPath', 'result_image'];
  
  // 处理核心分析数据
  if (data.analysis) {
    Object.entries(data.analysis).forEach(([key, value]) => {
      formattedData.push({
        key,
        name: formatMetricName(key),
        value: formatMetricValue(value),
        unit: getMetricUnit(key)
      })
    })
  } else {
    // 如果没有专门的analysis字段，尝试直接处理主对象
    Object.entries(data).forEach(([key, value]) => {
      // 跳过图像URL、id、thumbnail和备注等非分析数据
      if (!excludedFields.includes(key) && !Array.isArray(value) && typeof value !== 'object') {
        formattedData.push({
          key,
          name: formatMetricName(key),
          value: formatMetricValue(value),
          unit: getMetricUnit(key)
        })
      }
    })
  }
  
  return formattedData
}

// 格式化指标名称
const formatMetricName = (key) => {
  const nameMap = {
    // 分析数据相关指标
    positiveRate: '阳性率',
    positiveRatio: '阳性率',
    positiveArea: '阳性区域',
    negativeArea: '阴性区域',
    totalArea: '总区域',
    intensity: '染色强度',
    density: '染色密度',
    h_score: 'H评分',
    
    // 文件信息相关字段
    folderName: '文件夹',
    imageName: '图片名称',
    uploadsDate: '上传时间',
    analysisDate: '分析时间',
    userName: '操作人'
  }
  
  return nameMap[key] || key
}

// 格式化指标值
const formatMetricValue = (value) => {
  // 如果是数字，保留两位小数
  if (typeof value === 'number') {
    return value.toFixed(2)
  }
  return value
}

// 获取指标单位
const getMetricUnit = (key) => {
  const unitMap = {
    positiveRate: '%',
    positiveArea: 'μm²',
    negativeArea: 'μm²',
    totalArea: 'μm²',
    intensity: '',
    density: '/μm²',
    h_score: '',
    // 可以根据需要添加更多映射
  }
  
  return unitMap[key] || ''
}

// 表格列定义
const analysisColumns = [
  {
    title: '参数',
    key: 'name',
  },
  {
    title: '数值',
    key: 'value',
  },
  {
    title: '单位',
    key: 'unit',
  }
]

// 文件夹分析结果表格列定义
const folderAnalysisColumns = [
  {
    title: '图片名称',
    key: 'imageName',
    width: 180,
  },
  {
    title: '阳性率(%)',
    key: 'positiveRatio',
    width: 120,
    sorter: (a, b) => Number(a.positiveRatio) - Number(b.positiveRatio),
    render(row) {
      return h('div', {
        style: {
          color: Number(row.positiveRatio) > 50 ? '#f5222d' : '#1890ff'
        }
      }, row.positiveRatio !== undefined ? Number(row.positiveRatio).toFixed(2) : '-')
    }
  },
  {
    title: '阳性区域(μm²)',
    key: 'positiveArea',
    width: 150,
    sorter: (a, b) => Number(a.positiveArea) - Number(b.positiveArea),
    render(row) {
      return h('div', {}, row.positiveArea ? Number(row.positiveArea).toFixed(2) : '-')
    }
  },
  {
    title: '总区域(μm²)',
    key: 'totalArea',
    width: 150,
    sorter: (a, b) => Number(a.totalArea) - Number(b.totalArea),
    render(row) {
      return h('div', {}, row.totalArea ? Number(row.totalArea).toFixed(2) : '-')
    }
  },
  {
    title: '分析时间',
    key: 'analysisDate',
    width: 180,
  },
  {
    title: '操作人',
    key: 'userName',
    width: 120,
  }
]

// 平均值统计表格列定义
const averageColumns = [
  {
    title: '统计类型',
    key: 'type',
    width: 100,
  },
  {
    title: '图片数量',
    key: 'count',
    width: 100,
  },
  {
    title: '平均阳性率(%)',
    key: 'avgPositiveRate',
    width: 150,
    render(row) {
      return h('div', {
        style: {
          fontWeight: 'bold',
          color: Number(row.avgPositiveRate) > 50 ? '#f5222d' : '#1890ff'
        }
      }, row.avgPositiveRate.toFixed(2))
    }
  },
  {
    title: '平均阳性区域(μm²)',
    key: 'avgPositiveArea',
    width: 180,
  },
  {
    title: '平均总区域(μm²)',
    key: 'avgTotalArea',
    width: 180,
  }
]

// 计算平均值统计数据
const calculateAverageStats = (data) => {
  if (!Array.isArray(data) || data.length === 0) return []
  
  // 打印数据结构以便调试
  console.log('文件夹分析数据示例:', data[0])
  
  // 提取数值型数据并计算平均值
  const count = data.length
  let totalPositiveRatio = 0
  let totalPositiveArea = 0
  let totalArea = 0
  let validPositiveRatioCount = 0
  let validPositiveAreaCount = 0
  let validTotalAreaCount = 0
  
  data.forEach(item => {
    // 阳性率
    if (item.positiveRatio !== undefined && !isNaN(Number(item.positiveRatio))) {
      totalPositiveRatio += Number(item.positiveRatio)
      validPositiveRatioCount++
    }
    
    // 阳性区域
    if (item.positiveArea !== undefined && !isNaN(Number(item.positiveArea))) {
      totalPositiveArea += Number(item.positiveArea)
      validPositiveAreaCount++
    }
    
    // 总区域
    if (item.totalArea !== undefined && !isNaN(Number(item.totalArea))) {
      totalArea += Number(item.totalArea)
      validTotalAreaCount++
    }
  })
  
  return [
    {
      type: '平均值',
      count,
      avgPositiveRate: validPositiveRatioCount > 0 ? totalPositiveRatio / validPositiveRatioCount : 0,
      avgPositiveArea: validPositiveAreaCount > 0 ? totalPositiveArea / validPositiveAreaCount : 0,
      avgTotalArea: validTotalAreaCount > 0 ? totalArea / validTotalAreaCount : 0
    }
  ]
}
</script>

<style scoped>
.custom-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.custom-modal-box {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.18), 0 8px 20px rgba(0, 0, 0, 0.15);
  width: 700px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-appear 0.35s cubic-bezier(0.3, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(-30px) scale(0.92); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  background: linear-gradient(120deg, #0a5bbe 0%, #1890ff 100%);
  color: white;
  position: relative;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  position: relative;
  flex: 1;
}

.modal-close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 22px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  margin-left: 10px;
  outline: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.modal-body {
  flex: 1;
  padding: 28px;
  overflow-y: auto;
  background: linear-gradient(135deg, #f9fafc 0%, #f0f2f5 100%);
}

.folder-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  max-height: 300px;
  overflow-y: auto;
}

.folder-list li {
  padding: 14px 18px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  position: relative;
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #1a2b4b;
}

.folder-list li:before {
  content: '';
  width: 18px;
  height: 18px;
  margin-right: 10px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="%231890ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>') no-repeat center center;
}

.folder-list li:hover {
  background-color: #f0f7ff;
  color: #1890ff;
  transform: translateX(4px);
}

.folder-list li.selected {
  background: linear-gradient(90deg, #e6f7ff 0%, #f0f7ff 100%);
  border-left: 3px solid #1890ff;
  color: #1890ff;
  font-weight: 500;
  padding-left: 20px;
}

.folder-list li.already-registered {
  background: #f6f6f6;
  color: #999;
  cursor: not-allowed;
  opacity: 0.7;
}

.folder-list li.already-registered:hover {
  background: #f6f6f6;
  color: #999;
  transform: none;
}

.folder-list li.disabled {
  pointer-events: none;
}

.folder-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.folder-name {
  flex: 1;
}

.status-tag {
  background: #52c41a;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
  font-weight: 500;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 18px 24px;
  gap: 15px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(5px);
}

.modal-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.25s ease;
  color: #333;
  outline: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.modal-btn:hover {
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.modal-btn.primary {
  background: linear-gradient(120deg, #1890ff 0%, #096dd9 100%);
  color: white;
  box-shadow: 0 3px 8px rgba(24, 144, 255, 0.25);
}

.modal-btn.primary:hover {
  background: linear-gradient(120deg, #40a9ff 0%, #1890ff 100%);
  box-shadow: 0 5px 15px rgba(24, 144, 255, 0.35);
  transform: translateY(-2px) scale(1.02);
}

.modal-btn.secondary {
  background: linear-gradient(120deg, #52c41a 0%, #389e0d 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(82, 196, 26, 0.2);
  margin-left: 8px;
}

.modal-btn.secondary:hover {
  background: linear-gradient(120deg, #73d13d 0%, #52c41a 100%);
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.progress-container {
  margin-top: 20px;
  padding: 16px;
  background-color: #f0faff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(24, 144, 255, 0.1);
}

.progress-title {
  font-size: 15px;
  font-weight: 500;
  color: #1890ff;
  margin-bottom: 12px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: rgba(0, 0, 0, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 4px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.upload-section {
  margin-top: 24px;
  text-align: center;
}

.upload-label {
  display: inline-block;
  position: relative;
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.upload-button {
  padding: 10px 20px;
  display: inline-block;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: white;
  border-radius: 8px;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 3px 12px rgba(24, 144, 255, 0.25);
}

.upload-button::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: -100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s;
}

.upload-label:hover .upload-button {
  background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(24, 144, 255, 0.35);
}

.upload-label:hover .upload-button::after {
  left: 100%;
}

.upload-modal,
.registration-modal {
  width: 700px;
  max-width: 90vw;
}

.upload-files-list,
.registration-folders-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 5px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
}

.upload-folder-item,
.registration-folder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.upload-folder-item:hover,
.registration-folder-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.upload-folder-info,
.registration-folder-info {
  flex: 1;
}

.folder-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 6px;
  color: #1a2b4b;
}

.file-count {
  font-size: 13px;
  color: #8c9bab;
  display: flex;
  align-items: center;
}

.file-count:before {
  content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 6px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%238c9bab" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>') no-repeat center center;
}

.upload-progress-wrapper,
.registration-progress-wrapper {
  width: 220px;
  text-align: right;
}

.upload-progress,
.registration-progress {
  width: 100%;
  display: flex;
  align-items: center;
}

.upload-progress .progress-bar,
.registration-progress .progress-bar {
  flex: 1;
  height: 6px;
  margin-right: 12px;
}

.progress-text {
  width: 40px;
  font-size: 14px;
  color: #1890ff;
  font-weight: 500;
}

.progress-info {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.size-info {
  font-size: 12px;
  color: #8c9bab;
  margin-left: 10px;
  white-space: nowrap;
}

.upload-status,
.registration-status {
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
}

.upload-status.success,
.registration-status.success {
  color: #52c41a;
}

.upload-status.error,
.registration-status.error {
  color: #ff4d4f;
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
  margin-left: 8px;
  color: #8c9bab;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #ff4d4f;
  transform: scale(1.1);
}

.no-folders-selected {
  text-align: center;
  color: #8c9bab;
  padding: 60px 0;
  font-size: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin: 20px 0;
}

.no-folders-selected:before {
  content: '';
  display: block;
  width: 48px;
  height: 48px;
  margin: 0 auto 10px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%238c9bab" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>') no-repeat center center;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  display: flex;
  align-items: center;
}

.footer-right {
  display: flex;
  gap: 10px;
}

.result-content {
  max-height: 600px;
  overflow-y: auto;
  padding: 24px;
  background: #f9fafc;
}

.result-message {
  padding: 24px;
  background-color: white;
  border-radius: 8px;
  white-space: pre-line;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.result-data {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.result-image-section {
  text-align: center;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.result-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.no-image {
  padding: 40px;
  background-color: #f9fafc;
  border-radius: 8px;
  color: #8c9bab;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.no-image p {
  margin-top: 10px;
}

.result-table-section {
  margin-top: 20px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.additional-info {
  margin-top: 20px;
  padding: 16px;
  background-color: #f0faff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(24, 144, 255, 0.1);
}

.no-result {
  padding: 60px 20px;
  text-align: center;
}

.folder-analysis-results {
  margin-top: 20px;
}

.average-stats {
  margin-top: 20px;
}

.no-image-icon {
  font-size: 48px;
  color: #ccc;
  margin-bottom: 10px;
}

/* 添加配准进度组件样式 */
.registration-progress-component {
  margin-bottom: 24px;
  position: relative;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

/* 标题样式 */
.section-title {
  font-weight: 600;
  margin: 16px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #1a2b4b;
}

/* 历史任务列表样式 */
.recent-tasks {
  margin-bottom: 24px;
}

.task-description {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #8c9bab;
}

/* 按钮行样式 */
.button-row {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.close-details-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #8c9bab;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-details-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #666;
  transform: scale(1.1);
}

/* Naive UI 组件样式覆盖 */
:deep(.n-list) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:deep(.n-list-item) {
  padding: 12px 16px;
  transition: all 0.2s ease;
}

:deep(.n-list-item:hover) {
  background: #f0f7ff;
}

:deep(.n-data-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:deep(.n-button) {
  transition: all 0.2s ease;
}

:deep(.n-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
}

/* 操作说明PDF弹窗样式 */
.manual-modal {
  width: 90vw;
  max-width: 1200px;
  height: 90vh;
  max-height: 800px;
}

.manual-body {
  padding: 0;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pdf-container {
  flex: 1;
  position: relative;
  background: white;
  border-radius: 8px;
  margin: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pdf-viewer {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.pdf-fallback {
  padding: 16px;
  text-align: center;
  color: #666;
  font-size: 14px;
  background: #fff;
  margin: 0 16px 16px;
  border-radius: 8px;
  border: 1px solid #e1e1e1;
}

.pdf-fallback a {
  color: #1890ff;
  text-decoration: none;
  font-weight: 500;
}

.pdf-fallback a:hover {
  text-decoration: underline;
}

.modal-btn[href] {
  text-decoration: none;
  display: inline-block;
}
</style> 