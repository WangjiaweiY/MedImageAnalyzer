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
        
        <!-- 添加标注画布组件 -->
        <div v-if="hasDzi(index)" :class="{ 'annotation-enabled': annotationMode && selectedViewerIndex === index }">
          <fabric-canvas
            :ref="el => annotationCanvasRefs[index] = el"
            :tool="currentTool"
            :color="currentColor"
            :annotation-enabled="annotationMode && selectedViewerIndex === index"
            v-model:annotation-data="annotationData[index]"
            @annotation-changed="handleAnnotationChanged(index)"
          />
        </div>
        
        <!-- 添加工具箱，只在该查看器被选中且标注模式开启时显示 -->
        <image-toolbox
          v-if="hasDzi(index) && selectedViewerIndex === index && annotationMode"
          @tool-changed="handleToolChanged"
          @clear-annotations="clearAnnotations(index)"
        />
        
        <!-- 添加标注模式切换按钮 -->
        <div v-if="hasDzi(index) && selectedViewerIndex === index" class="annotation-toggle">
          <n-tooltip placement="left">
            <template #trigger>
              <n-button 
                circle 
                :type="annotationMode ? 'primary' : 'default'" 
                @click="toggleAnnotationMode"
              >
                <template #icon>
                  <n-icon><edit-outlined /></n-icon>
                </template>
              </n-button>
            </template>
            <span>{{ annotationMode ? '退出标注模式' : '进入标注模式' }}</span>
          </n-tooltip>
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
import { ref, onMounted, nextTick, watch } from 'vue'
import { 
  NLayoutContent, 
  NEmpty,
  NButton,
  NTooltip,
  NIcon
} from 'naive-ui'
import { EditOutlined } from '@vicons/antd'
import OpenSeadragon from 'openseadragon'
import { throttle } from '../utils/throttle'
import FabricCanvas from './FabricCanvas.vue'
import ImageToolbox from './ImageToolbox.vue'

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

// 标注相关状态
const annotationMode = ref(false);
const currentTool = ref('select');
const currentColor = ref('red');
const annotationCanvasRefs = ref([]);
const annotationData = ref([]);

// 切换标注模式
const toggleAnnotationMode = () => {
  annotationMode.value = !annotationMode.value;
  
  // 处理所有查看器的交互状态
  if (annotationMode.value) {
    // 开启标注模式：禁用所有查看器的交互
    props.viewers.forEach((viewer, index) => {
      if (viewer) {
        viewer.setMouseNavEnabled(false);
        viewer.gestureSettingsMouse.clickToZoom = false;
      }
    });
  } else {
    // 关闭标注模式：启用所有查看器的交互
    props.viewers.forEach((viewer, index) => {
      if (viewer) {
        viewer.setMouseNavEnabled(true);
        viewer.gestureSettingsMouse.clickToZoom = true;
      }
    });
  }
};

// 处理工具切换
const handleToolChanged = (toolInfo) => {
  currentTool.value = toolInfo.tool;
  currentColor.value = toolInfo.color;
};

// 清除标注
const clearAnnotations = (index) => {
  const canvas = annotationCanvasRefs.value[index];
  if (canvas) {
    canvas.clearCanvas();
  }
};

// 处理标注变化
const handleAnnotationChanged = (index) => {
  // 可以在这里添加保存标注数据的逻辑
  console.log(`标注已更改: 查看器 ${index}`);
};

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
  annotationData.value = new Array(props.layoutType).fill('');
})

// 监听所选查看器变化
watch(() => props.selectedViewerIndex, (newIndex, oldIndex) => {
  // 如果启用了标注模式，根据所选查看器更新OSD的交互状态
  if (annotationMode.value) {
    if (oldIndex !== null && props.viewers[oldIndex]) {
      props.viewers[oldIndex].setMouseNavEnabled(true);
      props.viewers[oldIndex].gestureSettingsMouse.clickToZoom = true;
    }
    
    if (newIndex !== null && props.viewers[newIndex]) {
      props.viewers[newIndex].setMouseNavEnabled(false);
      props.viewers[newIndex].gestureSettingsMouse.clickToZoom = false;
    }
  }
})

// 初始化
onMounted(() => {
  nextTick(() => {
    emit('initViewers')
    annotationData.value = new Array(props.layoutType).fill('');
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

.annotation-toggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 101;
}

.annotation-enabled {
  pointer-events: auto;
}
</style> 