<template>
  <div>
    <!-- 配准模态框 -->
    <div v-if="registrationModalVisible" class="custom-modal-overlay">
      <div class="custom-modal-box">
        <div class="modal-header">
          <span class="modal-title">选择文件夹进行配准</span>
          <button class="modal-close-btn" @click="closeRegistrationModal">×</button>
        </div>
        <div class="modal-body">
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
        <div class="modal-footer">
          <button class="modal-btn primary" @click="startRegistration" :disabled="!selectedRegistrationFolderValue">配准</button>
          <button class="modal-btn" @click="closeRegistrationModal">关闭</button>
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
  'update:resultModalVisible',
  'startRegistration'
])

const message = useMessage()

const closeRegistrationModal = () => {
  emit('update:registrationModalVisible', false)
}

const selectRegistrationFolder = (folderName) => {
  emit('update:selectedRegistrationFolderValue', folderName)
}

const startRegistration = () => {
  if (!props.selectedRegistrationFolderValue) {
    message.warning('请选择一个文件夹')
    return
  }
  emit('startRegistration')
}

const closeResultModal = () => {
  emit('update:resultModalVisible', false)
}

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
  // 如果结果是对象，则导出为JSON文件
  if (props.resultModalContent && typeof props.resultModalContent === 'object') {
    const dataStr = JSON.stringify(props.resultModalContent, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    
    // 从标题中提取文件名
    let fileName = props.resultModalTitle.replace(/免疫组化分析结果 - (图片|文件夹)【(.+)】/, '$2')
    fileName = `${fileName}_分析结果.json`
    
    // 创建下载链接并触发下载
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', fileName)
    linkElement.click()
    
    message.success('结果已导出')
  } else {
    message.error('没有可导出的结果')
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