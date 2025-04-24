<template>
  <n-modal
    :show="visible"
    @update:show="handleVisibleChange"
    class="fullnet-results-modal"
    preset="card"
    title="Fullnet分析结果"
    size="huge"
    :mask-closable="false"
  >
    <div class="results-container">
      <div class="results-filter" v-if="!folderName">
        <h3>所有分析结果</h3>
        <n-input
          v-model:value="searchText"
          placeholder="搜索文件名..."
          clearable
          @clear="clearSearch"
        >
          <template #prefix>
            <n-icon><SearchOutlined /></n-icon>
          </template>
        </n-input>
      </div>
      <div class="results-filter" v-else>
        <h3>{{ folderName }}文件夹的分析结果</h3>
      </div>

      <div class="results-list-container">
        <div v-if="loading" class="loading-container">
          <n-spin size="large" />
          <p>加载中...</p>
        </div>
        <div v-else-if="!filteredResults.length" class="no-results">
          <p>暂无分析结果</p>
        </div>
        <div v-else class="results-list">
          <n-data-table
            :columns="columns"
            :data="filteredResults"
            :pagination="{ pageSize: 10 }"
            :bordered="false"
            striped
          />
        </div>
      </div>

      <div v-if="selectedResult" class="selected-result">
        <h3>选中的分析结果</h3>
        <div class="result-details">
          <div class="image-gallery">
            <div class="image-item">
              <h4>分析结果图像</h4>
              <img 
                :src="getImagePath(selectedResult.resultImagePath)" 
                alt="分析结果图像" 
                class="result-image" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button @click="closeModal">关闭</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch, h, onMounted } from 'vue'
import { NModal, NButton, NSpace, NSpin, NStatistic, NDataTable, NInput, NIcon, NImage, NTag } from 'naive-ui'
import { useMessage } from 'naive-ui'
import { imageApi } from '@/services/api'
import { SearchOutlined } from '@vicons/antd'

// props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  folderName: {
    type: String,
    default: ''
  }
})

// emits
const emit = defineEmits(['update:visible'])

// 消息通知
const message = useMessage()

// 状态
const loading = ref(false)
const searchText = ref('')
const allResults = ref([])
const selectedResult = ref(null)

// 表格列定义
const columns = [
  {
    title: '文件名',
    key: 'filename',
    sorter: 'default',
    render: (row) => h('div', { style: { cursor: 'pointer' } }, row.filename)
  },
  {
    title: '细胞数量',
    key: 'cellCount',
    sorter: (a, b) => (a.cellCount || 0) - (b.cellCount || 0)
  },
  {
    title: '细胞占比',
    key: 'cellRatio',
    render: (row) => h('div', {}, `${(row.cellRatio || 0).toFixed(2)}%`),
    sorter: (a, b) => (a.cellRatio || 0) - (b.cellRatio || 0)
  },
  {
    title: '分析时间',
    key: 'analysisTime',
    sorter: (a, b) => new Date(a.analysisTime || 0) - new Date(b.analysisTime || 0)
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) => h(
      NButton,
      { size: 'small', onClick: () => selectResult(row) },
      { default: () => '查看详情' }
    )
  }
]

// 格式化数字
function formatNumber(value) {
  if (value === undefined || value === null) return '未知'
  return Number(value).toLocaleString()
}

// 处理可见性变化
function handleVisibleChange(newVal) {
  emit('update:visible', newVal)
  if (newVal) {
    fetchResults()
  } else {
    resetState()
  }
}

// 重置状态
function resetState() {
  selectedResult.value = null
  searchText.value = ''
}

// 关闭模态框
function closeModal() {
  emit('update:visible', false)
}

// 清除搜索
function clearSearch() {
  searchText.value = ''
}

// 获取图像路径
function getImagePath(path) {
  if (!path) return ''
  return `/api/fullnet/images/${path}`
}

// 选择结果
function selectResult(result) {
  selectedResult.value = result
}

// 过滤后的结果
const filteredResults = computed(() => {
  if (!searchText.value) return allResults.value
  
  const search = searchText.value.toLowerCase()
  return allResults.value.filter(item => 
    item.filename.toLowerCase().includes(search)
  )
})

// 获取Fullnet分析结果
async function fetchResults() {
  loading.value = true
  
  try {
    let results
    if (props.folderName) {
      // 获取指定文件夹的分析结果
      const folderResults = await imageApi.getAllFullnetResults()
      results = folderResults.filter(item => 
        item.filename.startsWith(props.folderName + '/')
      )
    } else {
      // 获取所有分析结果
      results = await imageApi.getAllFullnetResults()
    }
    
    allResults.value = results
    
    if (results.length > 0) {
      message.success(`成功加载 ${results.length} 条分析记录`)
    } else {
      message.info('暂无分析记录')
    }
  } catch (error) {
    console.error('获取分析结果失败:', error)
    message.error('获取分析结果失败: ' + error.message)
    allResults.value = []
  } finally {
    loading.value = false
  }
}

// 监听props.visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    fetchResults()
  }
})

// 组件挂载时，如果visible为true，则加载数据
onMounted(() => {
  if (props.visible) {
    fetchResults()
  }
})
</script>

<style scoped>
.fullnet-results-modal {
  width: 90%;
  max-width: 1200px;
}

.results-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 700px;
  overflow: hidden;
}

.results-filter {
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-list-container {
  flex: 1;
  overflow: auto;
  min-height: 200px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.no-results {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #999;
}

.selected-result {
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.result-details {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.image-gallery {
  display: flex;
  gap: 16px;
  overflow-x: auto;
}

.image-item {
  flex: 0 0 auto;
  width: 300px;
  text-align: center;
}

.result-image {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  border: 1px solid #eee;
  background-color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.stat-item {
  background-color: white;
  padding: 12px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
</style> 