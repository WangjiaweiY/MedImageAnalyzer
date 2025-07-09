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
          <!-- 可配准的文件夹列表 -->
          <div class="registration-folders-list">
            <!-- 已配准/配准中的文件夹 -->
            <div v-if="registeredFolders.length > 0" class="registered-folders">
              <div v-for="(folder, index) in registeredFolders" :key="index" class="registration-folder-item">
                <div class="registration-folder-info">
                  <div class="folder-name">{{ folder.name }}</div>
                </div>
                <div class="registration-progress-wrapper">
                  <div v-if="folder.status === 'processing'" class="registration-progress">
                    <div class="progress-bar">
                      <div class="progress-bar-inner" :style="{ width: `${folder.progress}%` }"></div>
                    </div>
                    <div class="progress-info">
                      <div class="progress-text">{{ folder.progress }}%</div>
                    </div>
                    <div v-if="folder.processedFiles && folder.totalFiles" class="size-info">
                      {{ folder.processedFiles }} / {{ folder.totalFiles }} 文件
                    </div>
                  </div>
                  <div v-else-if="folder.status === 'success'" class="registration-status success">
                    配准成功
                    <button class="delete-btn" @click="removeRegistrationRecord(index)">×</button>
                  </div>
                  <div v-else-if="folder.status === 'error'" class="registration-status error">
                    配准失败
                    <button class="delete-btn" @click="removeRegistrationRecord(index)">×</button>
                  </div>
                </div>
              </div>
            </div>
            
                        <!-- 可选择的文件夹列表 -->
            <ul class="folder-list">
              <li 
                v-for="folder in registrationFolderList" 
                :key="folder.folderName"
                :class="{ selected: selectedRegistrationFolder === folder.folderName }"
                @click="selectRegistrationFolder(folder.folderName)"
              >
                {{ folder.folderName }}
              </li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn primary" @click="startRegistration" :disabled="!selectedRegistrationFolderValue || isCurrentFolderProcessing()">配准</button>
          <button class="modal-btn" @click="closeRegistrationModal">关闭</button>
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
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed, h } from 'vue'
import { useMessage } from 'naive-ui'
import { 
  NModal, 
  NCard, 
  NInput, 
  NButton, 
  NSelect, 
  NEmpty, 
  NDataTable,
  NIcon,
  NDescriptions,
  NDescriptionsItem,
  NTabs,
  NTabPane
} from 'naive-ui'

const props = defineProps({
  registrationModalVisible: {
    type: Boolean,
    default: false
  },
  registrationFolderList: {
    type: Array,
    default: () => []
  },
  selectedRegistrationFolderValue: {
    type: String,
    default: null
  },
  uploadModalVisible: {
    type: Boolean,
    default: false
  },
  uploadProgress: {
    type: Number,
    default: 0
  },
  uploadInProgress: {
    type: Boolean,
    default: false
  },
  registrationProgress: {
    type: Number,
    default: 0
  },
  registrationInProgress: {
    type: Boolean,
    default: false
  },
  resultModalVisible: {
    type: Boolean,
    default: false
  },
  resultModalTitle: {
    type: String,
    default: ''
  },
  resultModalContent: {
    type: [Object, Array, String],
    default: null
  }
})

const emit = defineEmits([
  'update:registrationModalVisible', 
  'update:selectedRegistrationFolderValue',
  'update:uploadModalVisible',
  'update:resultModalVisible',
  'startRegistration',
  'handleFileSelection',
  'startUpload',
  'folderUploaded'
])

// 存储选择的文件和文件夹名
const selectedFiles = ref([])
const folderName = ref('')
const uploadedFolders = ref([])
const registeredFolders = ref([])

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
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.custom-modal-box {
  background: #fff;
  width: 50vw;
  height: 50vh;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #1890ff;
  color: white;
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
}
.modal-close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
}
.modal-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}
.folder-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.folder-list li {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}
.folder-list li:hover,
.folder-list li.selected {
  background-color: #e6f7ff;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  gap: 10px;
  border-top: 1px solid #eee;
}
.modal-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #ddd;
  font-size: 14px;
}
.modal-btn.primary {
  background: #1890ff;
  color: white;
}
.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-container {
  margin-top: 20px;
  padding: 10px;
  background-color: #f0faff;
  border-radius: 4px;
}

.progress-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 5px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-inner {
  height: 100%;
  background-color: #1890ff;
  border-radius: 4px;
  transition: width 0.3s ease-in-out;
}

.upload-section {
  margin-top: 20px;
  text-align: center;
}

.upload-label {
  display: inline-block;
  position: relative;
  cursor: pointer;
  padding: 10px 20px;
  background-color: #1890ff;
  color: white;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.3s ease;
}

.upload-label:hover {
  background-color: #40a9ff;
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: -1;
}

.selected-folder-info {
  margin-top: 10px;
  font-size: 14px;
  color: #555;
}

.upload-modal {
  width: 700px;
  max-width: 90vw;
}

.registration-modal {
  width: 700px;
  max-width: 90vw;
}

.upload-files-list,
.registration-folders-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px 0;
}

.upload-folder-item,
.registration-folder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.upload-folder-info,
.registration-folder-info {
  flex: 1;
}

.folder-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.file-count {
  font-size: 13px;
  color: #666;
}

.upload-progress-wrapper,
.registration-progress-wrapper {
  width: 220px;
  text-align: right;
  display: flex;
  align-items: center;
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
  height: 8px;
  margin-right: 10px;
}

.progress-text {
  width: 40px;
  font-size: 14px;
  color: #1890ff;
}

.progress-info {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.size-info {
  font-size: 12px;
  color: #666;
  margin-left: 10px;
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
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.delete-btn:hover {
  background: #f0f0f0;
  color: #ff4d4f;
}

.no-folders-selected {
  text-align: center;
  color: #999;
  padding: 40px 0;
  font-size: 14px;
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
  padding: 16px;
}

.result-message {
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 4px;
  white-space: pre-line;
}

.result-data {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-image-section {
  text-align: center;
}

.result-image {
  max-width: 100%;
  max-height: 300px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.no-image {
  padding: 40px;
  background-color: #f0f0f0;
  border-radius: 4px;
  color: #888;
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
}

.additional-info {
  margin-top: 20px;
  padding: 10px;
  background-color: #f0faff;
  border-radius: 4px;
}

.no-result {
  padding: 40px 20px;
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
</style> 