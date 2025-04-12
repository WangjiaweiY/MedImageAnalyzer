<template>
  <n-layout-content class="content">
    <div class="viewer-container" :class="`layout-${layoutType}`">
      <div 
        v-for="(v, index) in layoutType" 
        :key="index"
        class="viewer-wrapper"
        @mouseenter="handleMouseEnter(index, $event)"
        @mousemove="handleMouseMove(index, $event)"
        @mouseleave="handleMouseLeave(index)"
        @click="selectViewer(index)"
        :class="{ 'selected-viewer': selectedViewerIndex === index }"
      >
        <div :id="`osdViewer-${index}`" class="osd-viewer"></div>
        <div v-if="!hasDzi(index)" class="placeholder">
          <n-empty size="large" description="请选择图像文件"></n-empty>
        </div>
      </div>
    </div>

    <!-- 全局 tooltip，用于显示当前展示框加载的文件名称 -->
    <div
      v-if="tooltip.visible"
      class="file-name-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      {{ tooltip.text }}
    </div>
  </n-layout-content>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, defineProps, defineEmits } from 'vue'
import { 
  NLayoutContent, 
  NEmpty
} from 'naive-ui'
import OpenSeadragon from 'openseadragon'
import { throttle } from '../utils/throttle'

const props = defineProps({
  layoutType: {
    type: Number,
    required: true
  },
  syncEnabled: {
    type: Boolean,
    default: true
  },
  selectedViewerIndex: {
    type: Number,
    default: null
  },
  viewers: {
    type: Array,
    required: true
  },
  viewerFileNames: {
    type: Array,
    required: true
  }
})

const emit = defineEmits([
  'update:selectedViewerIndex',
  'update:viewers',
  'initViewers',
  'updateViewerDziUrl',
  'setupSync'
])

// 全局 tooltip 数据
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  text: ''
})

// 检查某个索引的查看器是否有加载的图像
const hasDzi = (index) => {
  return props.viewers[index] !== null
}

// 鼠标事件处理函数
const handleMouseEnter = (index, event) => {
  if (props.viewerFileNames[index]) {
    tooltip.value.text = props.viewerFileNames[index]
    tooltip.value.visible = true
  }
}

const handleMouseMove = throttle((index, event) => {
  tooltip.value.x = event.clientX + 10
  tooltip.value.y = event.clientY + 10
}, 30)

const handleMouseLeave = (index) => {
  tooltip.value.visible = false
}

// 选择查看器
const selectViewer = (index) => {
  emit('update:selectedViewerIndex', index)
}

// 监听布局变化，当布局改变时重新初始化查看器
watch(() => props.layoutType, () => {
  emit('initViewers')
})

onMounted(() => {
  nextTick(() => {
    emit('initViewers')
  })
})
</script>

<style scoped>
.content {
  flex: 1;
  padding: 20px;
  background: #f5f7f9;
}

.viewer-container {
  height: 100%;
  display: grid;
  gap: 20px;
}

.viewer-wrapper {
  position: relative;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
}

.selected-viewer {
  border: 3px solid #1890ff;
}

.placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245,247,249,0.5);
}

.osd-viewer {
  width: 100%;
  height: 100%;
}

.layout-1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.layout-2 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: 1fr;
}

.layout-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.layout-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.file-name-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
}
</style> 