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
          <n-button type="info" @click="showHistoryResults">
            历史结果
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
              <h4>分析结果</h4>
              <img 
                :src="analysisResult.combinedResultImage" 
                alt="分析结果图像" 
                class="result-image" 
                @error="handleImageError($event, '结果图像')" 
              />
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
                {{ analysisResult.parameters?.analysisTime || '未知' }}
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
  
  <!-- 历史分析结果模态框 -->
  <n-modal
    v-model:show="historyModalVisible"
    preset="card"
    title="历史分析结果"
    class="history-modal"
    :mask-closable="true"
  >
    <div v-if="loadingHistory" class="loading-history">
      <n-spin size="medium" />
      <p>加载历史数据中...</p>
    </div>
    <div v-else-if="historyResults && historyResults.length > 0" class="history-container">
      <n-data-table
        :columns="historyColumns"
        :data="historyResults"
        :pagination="{ pageSize: 5 }"
        :row-key="row => row.id"
        @update:checked-row-keys="handleHistoryRowCheck"
        :checked-row-keys="selectedHistoryKeys"
        @row-click="(row) => viewHistoryDetail(row.id)"
        :row-props="() => ({ style: 'cursor: pointer' })"
      />
    </div>
    <div v-else class="no-history">
      <p>没有找到历史分析记录</p>
    </div>
    
    <template #footer>
      <n-space justify="end">
        <n-button @click="historyModalVisible = false">关闭</n-button>
        <n-button 
          type="primary" 
          @click="loadSelectedHistory" 
          :disabled="!selectedHistoryItem"
        >
          加载选中记录
        </n-button>
      </n-space>
    </template>
  </n-modal>

  <!-- 历史分析结果详情模态框 -->
  <n-modal
    v-model:show="detailModalVisible"
    preset="card"
    title="历史分析结果详情"
    class="detail-modal"
    :mask-closable="true"
    :bordered="false"
    :segmented="{
      content: true,
      footer: 'soft'
    }"
  >
    <div v-if="loadingDetail" class="loading-detail">
      <n-spin size="medium" />
      <p>加载详细数据中...</p>
    </div>
    <div v-else-if="detailResult" class="detail-container">
      <div class="detail-image">
        <h3>分析结果图像</h3>
        <div class="image-wrapper">
          <img 
            :src="detailResult.combinedResultImage" 
            alt="分析结果图像" 
            class="result-image" 
            @error="handleImageError($event, '结果图像')" 
          />
        </div>
      </div>
      <div class="detail-stats">
        <h3>分析数据</h3>
        <div class="stats-container detail-stats-grid">
          <div class="stat-item">
            <n-statistic label="细胞数量">
              {{ detailResult.parameters?.cellCount || '未知' }}
            </n-statistic>
          </div>
          <div class="stat-item">
            <n-statistic label="细胞面积">
              {{ formatNumber(detailResult.parameters?.cellArea) }} 像素
            </n-statistic>
          </div>
          <div class="stat-item">
            <n-statistic label="总面积">
              {{ formatNumber(detailResult.parameters?.totalArea) }} 像素
            </n-statistic>
          </div>
          <div class="stat-item">
            <n-statistic label="细胞占比">
              {{ (detailResult.parameters?.cellRatio || 0).toFixed(2) }}%
            </n-statistic>
          </div>
          <div class="stat-item">
            <n-statistic label="平均细胞大小">
              {{ formatNumber(detailResult.parameters?.avgCellSize) }} 像素
            </n-statistic>
          </div>
          <div class="stat-item">
            <n-statistic label="分析时间">
              {{ detailResult.parameters?.analysisTime || '未知' }}
            </n-statistic>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-detail">
      <p>未找到详细分析数据</p>
    </div>
    
    <template #footer>
      <n-space justify="end">
        <n-button @click="detailModalVisible = false">关闭</n-button>
        <n-button 
          type="primary" 
          @click="loadSelectedHistory" 
          :disabled="!detailResult"
        >
          加载到主界面
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import { NSpin, NModal, NButton, NSpace, NStatistic, NDataTable } from 'naive-ui'
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

// 历史分析状态
const historyModalVisible = ref(false)
const loadingHistory = ref(false)
const historyResults = ref([])
const selectedHistoryKeys = ref([])
const selectedHistoryItem = ref(null)

// 历史记录表格列定义
const historyColumns = [
  { 
    type: 'selection',
    width: 50
  },
  {
    title: 'ID',
    key: 'id',
    width: 100
  },
  {
    title: '分析时间',
    key: 'analysisTime',
    width: 180
  },
  {
    title: '细胞数量',
    key: 'cellCount',
    width: 120
  },
  {
    title: '细胞占比',
    key: 'cellRatio',
    width: 120,
    render: (row) => {
      return `${(row.cellRatio || 0).toFixed(4)}%`
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => {
      return h(NSpace, { justify: 'center' }, {
        default: () => [
          h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => viewHistoryDetail(row.id)
          }, { default: () => '查看' }),
          h(NButton, {
            size: 'small',
            type: 'error',
            onClick: () => confirmDeleteHistory(row.id)
          }, { default: () => '删除' })
        ]
      })
    }
  }
]

// 历史分析详情状态
const detailModalVisible = ref(false)
const loadingDetail = ref(false)
const detailResult = ref(null)

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
          combinedResultImage: result.resultImagePath ? `/api/fullnet/images/${result.resultImagePath}` : null,
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

// 显示历史分析结果
async function showHistoryResults() {
  historyModalVisible.value = true
  loadingHistory.value = true
  
  try {
    // 确保使用正确的参数调用API
    const params = {
      folderName: props.folderName,
      fileName: props.fileName
    }
    const results = await imageApi.getFullnetHistoryResults(params)
    if (results && results.length > 0) {
      historyResults.value = results.map(item => ({
        ...item,
        // 格式化日期时间显示
        analysisTime: new Date(item.analysisTime).toLocaleString()
      }))
      message.success(`找到 ${results.length} 条历史分析记录`)
    } else {
      historyResults.value = []
      message.info('没有找到历史分析记录')
    }
  } catch (error) {
    console.error('加载历史分析结果错误:', error)
    message.error('加载历史分析结果失败: ' + error.message)
  } finally {
    loadingHistory.value = false
  }
}

// 处理历史分析结果行选择
function handleHistoryRowCheck(keys) {
  selectedHistoryKeys.value = keys
  
  if (keys.length === 1) {
    // 找到对应的记录
    selectedHistoryItem.value = historyResults.value.find(item => item.id === keys[0])
  } else {
    selectedHistoryItem.value = null
  }
}

// 查看历史分析结果详情
async function viewHistoryDetail(id) {
  if (!id) return
  
  detailModalVisible.value = true
  loadingDetail.value = true
  detailResult.value = null
  
  try {
    const result = await imageApi.getFullnetResultById(id)
    
    if (result) {
      // 处理详细结果数据，确保使用最终图像而非叠加态图像
      detailResult.value = {
        ...result,
        // 使用finalImagePath而不是resultImagePath来避免显示叠加态图像
        combinedResultImage: result.finalImagePath 
          ? `/api/fullnet/images/${result.finalImagePath}` 
          : (result.resultImagePath ? `/api/fullnet/images/${result.resultImagePath}` : null),
        parameters: {
          cellCount: result.cellCount,
          cellArea: result.cellArea,
          totalArea: result.totalArea,
          cellRatio: result.cellRatio,
          avgCellSize: result.avgCellSize,
          analysisTime: new Date(result.analysisTime).toLocaleString()
        }
      }
      
      console.log('详情图像路径:', detailResult.value.combinedResultImage) // 添加日志，检查图像路径
      
      // 记录当前查看的结果ID
      selectedHistoryItem.value = historyResults.value.find(item => item.id === id)
      selectedHistoryKeys.value = [id]
      
      message.success('成功加载详细分析结果')
    } else {
      message.error('加载详细分析结果失败')
    }
  } catch (error) {
    console.error('加载详细分析结果错误:', error)
    message.error('加载详细分析结果失败: ' + error.message)
  } finally {
    loadingDetail.value = false
  }
}

// 加载选中历史分析结果
async function loadSelectedHistory() {
  if (!selectedHistoryItem.value) {
    message.warning('请先选择一条历史记录')
    return
  }
  
  try {
    const resultId = selectedHistoryItem.value.id
    const result = await imageApi.getFullnetResultById(resultId)
    
    if (result) {
      // 加载历史分析结果到当前界面，确保使用最终图像而非叠加态图像
      analysisResult.value = {
        ...result,
        // 使用finalImagePath而不是resultImagePath来避免显示叠加态图像
        combinedResultImage: result.finalImagePath 
          ? `/api/fullnet/images/${result.finalImagePath}` 
          : (result.resultImagePath ? `/api/fullnet/images/${result.resultImagePath}` : null),
        parameters: {
          cellCount: result.cellCount,
          cellArea: result.cellArea,
          totalArea: result.totalArea,
          cellRatio: result.cellRatio,
          avgCellSize: result.avgCellSize,
          analysisTime: result.analysisTime
        }
      }
      
      console.log('加载到主界面的图像路径:', analysisResult.value.combinedResultImage) // 添加日志，检查图像路径
      
      // 关闭模态框
      historyModalVisible.value = false
      detailModalVisible.value = false
      message.success('成功加载历史分析结果')
    } else {
      message.error('加载历史记录失败，未找到结果数据')
    }
  } catch (error) {
    console.error('加载历史分析结果错误:', error)
    message.error('加载历史分析结果失败: ' + error.message)
  }
}

// 确认删除历史记录
function confirmDeleteHistory(id) {
  if (!id) return
  
  // 使用确认对话框
  window.confirm(`确定要删除ID为 ${id} 的历史记录吗？此操作不可恢复`) && deleteHistory(id)
}

// 删除历史分析结果
async function deleteHistory(id) {
  if (!id) return
  
  try {
    await imageApi.deleteFullnetResult(id)
    // 从列表中移除已删除的记录
    historyResults.value = historyResults.value.filter(item => item.id !== id)
    message.success('删除历史记录成功')
    
    // 如果删除的是当前选中的记录，清除选中状态
    if (selectedHistoryItem.value && selectedHistoryItem.value.id === id) {
      selectedHistoryItem.value = null
      selectedHistoryKeys.value = []
    }
  } catch (error) {
    console.error('删除历史分析结果错误:', error)
    message.error('删除历史分析结果失败: ' + error.message)
  }
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
  justify-content: center;
  margin-bottom: 20px;
}

.image-wrapper {
  width: 100%;
  max-width: 800px;
  text-align: center;
}

.image-wrapper h4 {
  margin-bottom: 8px;
}

.result-image {
  width: 100%;
  max-height: 500px;
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

.history-modal {
  width: 90%;
  max-width: 1200px;
}

.loading-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.history-container {
  padding: 16px;
}

.no-history {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #999;
}

.detail-modal {
  width: 92%;
  max-width: 1400px;
  --n-title-font-size: 20px;
}

.loading-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.detail-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 8px 16px 20px;
}

.detail-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 10px;
  width: 100%;
}

.detail-image h3 {
  margin-bottom: 16px;
  font-size: 22px;
  text-align: center;
  font-weight: 600;
  color: #333;
}

.detail-image .image-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.detail-image img {
  max-width: 100%;
  max-height: 700px;
  width: auto;
  height: auto;
  object-fit: contain;
  border: 1px solid #eee;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-radius: 8px;
  background-color: #fafafa;
  padding: 4px;
}

.detail-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 10px;
  width: 100%;
}

.detail-stats h3 {
  margin-bottom: 12px;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.detail-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.no-detail {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: #999;
  font-size: 16px;
}
</style> 