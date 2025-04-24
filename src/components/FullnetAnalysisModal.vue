<template>
  <n-modal
    :show="visible"
    @update:show="handleVisibleChange"
    class="fullnet-modal"
    preset="card"
    title="Fullnet分析"
    size="huge"
    :mask-closable="false"
  >
    <div class="analysis-container">
      <div class="analysis-controls">
        <h3>文件信息</h3>
        <div class="file-info">
          <p><strong>文件夹：</strong> {{ folderName }}</p>
          <p><strong>文件名：</strong> {{ fileName }}</p>
        </div>
        
        <div class="button-group">
          <n-button type="primary" @click="startAnalysis" :loading="analyzing" :disabled="analyzing">
            开始分析
          </n-button>
        </div>
      </div>

      <div class="results-section">
        <h3>分析结果</h3>
        <div v-if="analyzing" class="loading-container">
          <n-spin size="large" />
          <div class="task-status">
            <p>正在分析中，请稍候...</p>
            <p v-if="currentTaskId">任务ID: {{ currentTaskId }}</p>
            <p v-if="taskStatus">任务状态: {{ taskStatus }}</p>
          </div>
        </div>
        <div v-else-if="analysisResult" class="result-container">
          <div class="image-container">
            <div class="image-wrapper">
              <h4>原始图像</h4>
              <img :src="analysisResult.originalImageUrl" alt="原始图像" class="result-image" @error="handleImageError($event, '原始图像')" />
            </div>
            <div class="image-wrapper" v-if="analysisResult.resultImagePath">
              <h4>分析结果</h4>
              <img :src="analysisResult.resultImagePath" alt="分析结果图像" class="result-image" @error="handleImageError($event, '结果图像')" />
            </div>
            <div class="image-wrapper" v-if="analysisResult.overlayImagePath">
              <h4>叠加显示</h4>
              <img :src="analysisResult.overlayImagePath" alt="叠加结果图像" class="result-image" @error="handleImageError($event, '叠加显示')" />
            </div>
          </div>
          <div class="stats-container">
            <div class="stat-item">
              <n-statistic label="细胞数量">
                {{ analysisResult.parameters?.cellCount || '未知' }}
              </n-statistic>
            </div>
            <div class="stat-item">
              <n-statistic label="细胞面积">
                {{ formatNumber(analysisResult.parameters?.cellArea) }} 像素
              </n-statistic>
            </div>
            <div class="stat-item">
              <n-statistic label="总面积">
                {{ formatNumber(analysisResult.parameters?.totalArea) }} 像素
              </n-statistic>
            </div>
            <div class="stat-item">
              <n-statistic label="细胞占比">
                {{ (analysisResult.parameters?.cellRatio || 0).toFixed(2) }}%
              </n-statistic>
            </div>
            <div class="stat-item">
              <n-statistic label="平均细胞大小">
                {{ formatNumber(analysisResult.parameters?.avgCellSize) }} 像素
              </n-statistic>
            </div>
            <div class="stat-item">
              <n-statistic label="分析时间">
                {{ analysisResult.analysisTime || '未知' }}
              </n-statistic>
            </div>
          </div>
        </div>
        <div v-else class="no-result">
          <p>请点击"开始分析"按钮进行图像分析</p>
        </div>
      </div>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button @click="closeModal">关闭</n-button>
        <n-button type="primary" @click="saveResults" :disabled="!analysisResult">保存结果</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { NSpin, NModal, NButton, NSpace, NStatistic } from 'naive-ui'
import { useMessage } from 'naive-ui'
import { imageApi } from '@/services/api'

// props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  folderName: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: ''
  }
})

// emits
const emit = defineEmits(['update:visible', 'save-results'])

// 消息通知
const message = useMessage()

// 分析状态
const analyzing = ref(false)
const analysisResult = ref(null)
const currentTaskId = ref(null)
const taskStatus = ref(null)
let statusCheckInterval = null

// 关闭模态框
function closeModal() {
  resetState()
  emit('update:visible', false)
}

// 重置状态
function resetState() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
    statusCheckInterval = null
  }
  
  if (!analyzing.value) {
    analysisResult.value = null
    currentTaskId.value = null
    taskStatus.value = null
  }
}

// 处理可见性变化
function handleVisibleChange(newVal) {
  emit('update:visible', newVal)
  if (!newVal) {
    resetState()
  }
}

// 格式化数字
function formatNumber(value) {
  if (value === undefined || value === null) return '未知'
  return Number(value).toLocaleString()
}

// 开始分析
async function startAnalysis() {
  if (!props.folderName || !props.fileName) {
    message.warning('请先选择一个文件')
    return
  }

  analyzing.value = true
  message.loading('正在提交Fullnet分析任务...')

  try {
    // 发起Fullnet分析请求
    const result = await imageApi.analyzeFullnet(
      props.folderName,
      props.fileName
    )
    
    // 保存任务ID并开始轮询任务状态
    if (result && result.taskId) {
      currentTaskId.value = result.taskId
      taskStatus.value = result.status
      message.success(`分析任务已提交，任务ID: ${result.taskId}`)
      startTaskStatusCheck()
    } else {
      throw new Error('未获取到有效的任务ID')
    }
  } catch (error) {
    console.error('Fullnet分析错误:', error)
    message.error('分析任务提交失败: ' + error.message)
    analyzing.value = false
  }
}

// 开始轮询任务状态
function startTaskStatusCheck() {
  // 清除之前的定时器
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
  }
  
  // 设置轮询间隔
  statusCheckInterval = setInterval(async () => {
    await checkTaskStatus()
  }, 5000) // 每5秒检查一次
}

// 检查任务状态
async function checkTaskStatus() {
  if (!currentTaskId.value) return
  
  try {
    const response = await imageApi.getFullnetTaskStatus(currentTaskId.value)
    const { task, result } = response
    taskStatus.value = task.status
    console.log('任务状态更新:', response) // 添加日志，查看完整返回数据结构
    
    if (task.status === 'COMPLETED') {
      // 分析完成，获取结果
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
      }
      analyzing.value = false
      
      // 处理并展示结果
      if (result) {
        analysisResult.value = {
          ...result,
          originalImageUrl: `/api/images/${props.folderName}/${props.fileName}`,
          resultImagePath: result.resultImagePath ? `/api/images/${result.resultImagePath}` : null,
          overlayImagePath: result.overlayImagePath ? `/api/images/${result.overlayImagePath}` : null,
          parameters: {
            cellCount: result.cellCount,
            cellArea: result.cellArea,
            totalArea: result.totalArea,
            cellRatio: result.cellRatio,
            avgCellSize: result.avgCellSize,
            analysisTime: result.analysisTime
          }
        }
        
        console.log('设置分析结果数据:', analysisResult.value) // 添加日志，查看处理后的结果数据
        message.success('Fullnet分析完成')
      } else {
        message.warning('任务完成但未获取到结果数据，请尝试重新分析或联系管理员')
      }
    } else if (task.status === 'FAILED') {
      // 分析失败
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
      }
      analyzing.value = false
      message.error(`分析失败: ${task.errorMessage || '未知错误'}`)
    } else {
      // 分析仍在进行中，更新状态信息
      message.info(`任务状态: ${task.status}, ${task.progress || '正在处理中...'}`)
    }
  } catch (error) {
    console.error('查询任务状态错误:', error)
    // 查询出错不要停止轮询，继续尝试
  }
}

// 保存分析结果
function saveResults() {
  if (!analysisResult.value) {
    message.warning('没有可保存的分析结果')
    return
  }
  
  // 发送保存结果的事件
  emit('save-results', {
    ...analysisResult.value,
    folderName: props.folderName,
    fileName: props.fileName
  })

  message.success('分析结果已保存')
  closeModal()
}

// 处理图像加载错误
function handleImageError(event, imageType) {
  console.error(`图像加载错误: ${imageType}`, event)
  message.error(`无法加载${imageType}图像，请检查网络连接或联系管理员`)
}
</script>

<style scoped>
.fullnet-modal {
  width: 90%;
  max-width: 1200px;
}

.analysis-container {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 20px;
  height: 600px;
}

.analysis-controls {
  padding: 16px;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-info {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.results-section {
  padding: 16px;
  overflow: auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.task-status {
  margin-top: 16px;
  text-align: center;
}

.task-status p {
  margin: 8px 0;
}

.result-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.image-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
}

.image-wrapper {
  flex: 1;
  min-width: 300px;
  text-align: center;
}

.image-wrapper h4 {
  margin-bottom: 8px;
}

.result-image {
  max-width: 100%;
  max-height: 250px;
  object-fit: contain;
  border: 1px solid #eee;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 16px;
  background-color: #f9f9f9;
  padding: 16px;
  border-radius: 4px;
}

.stat-item {
  background-color: white;
  padding: 12px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.no-result {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #999;
}
</style> 