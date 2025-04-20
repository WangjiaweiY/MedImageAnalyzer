<template>
  <n-modal
    :show="visible"
    @update:show="handleVisibleChange"
    class="threshold-modal"
    preset="card"
    title="阈值分析"
    size="huge"
    :mask-closable="false"
  >
    <div class="threshold-container">
      <div class="threshold-controls">
        <h3>调整阈值</h3>
        <div class="slider-container">
          <n-slider
            v-model:value="threshold"
            :min="0"
            :max="255"
            :step="1"
            @update:value="handleThresholdChange"
          />
          <n-input-number
            v-model:value="threshold"
            :min="0"
            :max="255"
            :step="1"
            @update:value="handleThresholdChange"
          />
        </div>
        <n-button type="primary" @click="performAnalysis" :loading="loading">
          应用阈值
        </n-button>
      </div>

      <div class="results-section">
        <h3>分析结果</h3>
        <div v-if="loading" class="loading-container">
          <n-spin size="large" />
          <p>正在分析中...</p>
        </div>
        <div v-else-if="currentResult" class="result-container">
          <div class="image-container">
            <img v-if="currentResult" :src="currentResult.imageUrl" alt="处理后的图像" />
            <div v-else class="no-image">
              <p>调整阈值并点击"应用阈值"按钮查看结果</p>
            </div>
          </div>
          <div class="stats-container">
            <n-statistic label="阳性率">
              {{ currentResult.positiveRatio !== undefined ? (currentResult.positiveRatio * 100).toFixed(2) : '0.00' }}%
            </n-statistic>
            <n-space vertical>
              <n-statistic label="阳性面积">
                {{ currentResult.positiveArea !== undefined ? Number(currentResult.positiveArea).toLocaleString() : '0' }} 像素
              </n-statistic>
              <n-statistic label="总面积">
                {{ currentResult.totalArea !== undefined ? Number(currentResult.totalArea).toLocaleString() : '0' }} 像素
              </n-statistic>
              <n-statistic label="阴性面积">
                {{ (currentResult.totalArea !== undefined && currentResult.positiveArea !== undefined) 
                    ? Number(currentResult.totalArea - currentResult.positiveArea).toLocaleString() 
                    : '0' }} 像素
              </n-statistic>
            </n-space>
          </div>
        </div>
        <div v-else class="no-result">
          <p>调整阈值并点击"应用阈值"按钮查看结果</p>
        </div>
      </div>

      <div class="history-section">
        <h3>历史结果</h3>
        <div v-if="analysisHistory.length === 0" class="no-history">
          <p>暂无历史记录</p>
        </div>
        <div v-else class="history-list">
          <div
            v-for="(result, index) in analysisHistory"
            :key="index"
            class="history-item"
            :class="{ active: currentResult && currentResult.threshold === result.threshold }"
            @click="selectHistoryResult(result)"
          >
            <div>阈值: {{ result.threshold }}</div>
            <div>阳性率: {{ result.positiveRatio !== undefined ? (result.positiveRatio * 100).toFixed(2) : '0.00' }}%</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button @click="closeModal">关闭</n-button>
        <n-button type="primary" @click="saveResults">保存结果</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NSpin, NModal, NSlider, NInputNumber, NButton, NSpace, NStatistic } from 'naive-ui'
import { debounce } from '../utils/debounce'
import { useMessage } from 'naive-ui'

// props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  folderName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  }
})

// emits
const emit = defineEmits(['update:visible', 'save-results'])

// 消息通知
const message = useMessage()

// 状态
const threshold = ref(195) // 默认阈值
const loading = ref(false)
const currentResult = ref(null)
const analysisHistory = ref([])

// 防抖处理阈值变化
const handleThresholdChange = debounce(() => {
  performAnalysis()
}, 300)

// 执行阈值分析
async function performAnalysis() {
  if (!props.folderName || !props.fileName) {
    message.error('请先选择一个文件')
    return
  }

  loading.value = true

  try {
    // 使用URL参数方式发送请求
    const queryParams = new URLSearchParams({
      folderName: props.folderName,
      fileName: props.fileName,
      threshold: threshold.value
    }).toString();
    
    const response = await fetch(`/api/ihc/analyze/threshold?${queryParams}`, {
      method: 'POST'
    });

    if (!response.ok) {
      // 尝试获取错误信息
      const errorText = await response.text().catch(() => '未知错误');
      throw new Error(`分析请求失败: ${errorText}`);
    }

    const result = await response.json()
    
    // 添加当前阈值到结果中
    result.threshold = threshold.value
    
    // 格式化数据，确保关键字段存在
    const formattedResult = {
      threshold: threshold.value,
      positiveRatio: result.positiveRatio !== undefined ? result.positiveRatio : 0,
      positiveArea: result.positiveArea !== undefined ? result.positiveArea : 0,
      totalArea: result.totalArea !== undefined ? result.totalArea : 0,
      imageUrl: result.imageUrl || '',
      // 保留其他原始字段
      ...result
    }
    
    currentResult.value = formattedResult
    
    // 检查是否已存在相同阈值的历史记录
    const existingIndex = analysisHistory.value.findIndex(
      record => record.threshold === threshold.value
    )
    
    if (existingIndex >= 0) {
      // 更新现有记录
      analysisHistory.value[existingIndex] = formattedResult
    } else {
      // 添加新记录
      analysisHistory.value.push(formattedResult)
      // 按阈值排序
      analysisHistory.value.sort((a, b) => a.threshold - b.threshold)
    }
    
  } catch (error) {
    console.error('阈值分析错误:', error)
    message.error('阈值分析失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 选择历史结果
function selectHistoryResult(result) {
  threshold.value = result.threshold
  currentResult.value = result
}

// 关闭模态框
function closeModal() {
  emit('update:visible', false)
}

// 保存结果
function saveResults() {
  if (currentResult.value) {
    emit('save-results', currentResult.value)
    message.success('结果已保存')
    closeModal()
  } else {
    message.warning('请先执行分析')
  }
}

// 处理可见性变化
function handleVisibleChange(newVal) {
  emit('update:visible', newVal)
  
  if (newVal) {
    // 打开模态框时，如果没有结果，则执行分析
    if (!currentResult.value) {
      performAnalysis()
    }
  }
}
</script>

<style scoped>
.threshold-modal {
  width: 90%;
  max-width: 1200px;
}

.threshold-container {
  display: grid;
  grid-template-columns: 250px 1fr 250px;
  gap: 20px;
  height: 600px;
}

.threshold-controls {
  padding: 16px;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slider-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.result-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-container {
  width: 100%;
  text-align: center;
}

.image-container img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border: 1px solid #eee;
}

.stats-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.chart-container {
  width: 100%;
  max-width: 250px;
}

.no-result, .no-history {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #999;
}

.history-section {
  padding: 16px;
  border-left: 1px solid #eee;
  overflow: auto;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.history-item {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background-color: #f9f9f9;
}

.history-item.active {
  border-color: #2080f0;
  background-color: rgba(32, 128, 240, 0.1);
}
</style> 