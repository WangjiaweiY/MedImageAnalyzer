<template>
  <n-layout-content class="content">
    <div class="viewer-container" :class="`layout-${layoutType}`" ref="viewerContainerRef">
      <div 
        v-for="(v, index) in layoutType" 
        :key="index"
        class="viewer-wrapper"
        @click="selectViewer(index)"
        :class="{ 'selected-viewer': selectedViewerIndex === index }"
      >
        <!-- 添加图像标题栏 -->
        <div class="image-title-bar">
          <span class="image-title">{{ viewerFileNames[index] || '未加载图像' }}</span>
        </div>
        
        <!-- 关闭按钮 - 移至右上角，增加大小和可点击区域 -->
        <div v-if="hasDzi(index)" class="close-image-wrapper" @click.stop="closeImage(index)">
          <n-button 
            class="close-image-btn" 
            circle 
            quaternary 
            type="error" 
            size="small"
          >
            <template #icon>
              <n-icon><close-outlined /></n-icon>
            </template>
          </n-button>
        </div>
        
        <div :id="`osdViewer-${index}`" class="osd-viewer"></div>
        <div v-if="!hasDzi(index)" class="placeholder">
          <n-empty size="large" description="请选择图像文件"></n-empty>
        </div>
        
        <!-- 使用新的FabricOverlayCanvas组件 -->
        <fabric-overlay-canvas
          v-if="hasDzi(index) && viewers[index]"
          :ref="el => annotationCanvasRefs[index] = el"
          :viewer="viewers[index]"
          :tool="currentTool"
          :color="currentColor"
          :line-width="currentLineWidth"
          :annotation-enabled="annotationMode && selectedViewerIndex === index"
          v-model:annotation-data="annotationData[index]"
          @annotation-changed="handleAnnotationChanged(index)"
        />
        
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
  </n-layout-content>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { 
  NLayoutContent, 
  NEmpty,
  NButton,
  NTooltip,
  NIcon,
  useMessage
} from 'naive-ui'
import { EditOutlined, CameraOutlined, CloseOutlined } from '@vicons/antd'
import OpenSeadragon from 'openseadragon'
import { throttle } from '../utils/throttle'
import FabricOverlayCanvas from './FabricOverlayCanvas.vue'
import ImageToolbox from './ImageToolbox.vue'

const message = useMessage()
const viewerContainerRef = ref(null)

const props = defineProps({
  layoutType: {
    type: Number,
    required: true
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
  'setupSync',
  'closeImage'
])

// 标注相关状态
const annotationMode = ref(false);
const currentTool = ref('select');
const currentColor = ref('red');
const currentLineWidth = ref(0.5);
const annotationCanvasRefs = ref([]);
const annotationData = ref([]);

// 关闭图像
const closeImage = (index) => {
  emit('closeImage', index);
}

// 计算属性：检查是否有已加载的图像
const hasLoadedImages = computed(() => {
  return props.viewers.some(viewer => viewer !== null);
});

// 保存多视图为高清图片
const saveMultiView = async () => {
  if (!viewerContainerRef.value) return;
  
  // 显示加载中提示
  message.loading('正在加载html2canvas并生成高清图片，请稍候...', { duration: 0 });
  
  try {
    // 确保html2canvas已加载
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;
    
    // 给浏览器一些时间来更新UI
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 使用html2canvas捕获当前视图
    const canvas = await html2canvas(viewerContainerRef.value, {
      scale: 2, // 提高分辨率，生成更高清的图片
      useCORS: true, // 允许跨域图片
      allowTaint: true, // 允许加载跨域图片
      backgroundColor: '#f5f7f9', // 与背景颜色一致
      logging: false // 关闭日志
    });
    
    // 创建下载链接
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `多视图快照_${dateStr}_${timeStr}.png`;
    
    // 将canvas转换为Blob对象
    canvas.toBlob((blob) => {
      // 关闭加载提示
      message.destroyAll();
      
      if (!blob) {
        message.error('图像生成失败，请重试');
        return;
      }
      
      // 创建下载链接并模拟点击
      const link = document.createElement('a');
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      
      // 释放URL对象
      URL.revokeObjectURL(link.href);
      
      message.success('多视图图片已保存');
    }, 'image/png', 1.0);
  } catch (error) {
    console.error('保存多视图出错:', error);
    message.error('保存失败，请重试');
  } finally {
    message.destroyAll();
  }
};

// 切换标注模式
const toggleAnnotationMode = () => {
  annotationMode.value = !annotationMode.value;
  
  // 标注模式状态由FabricOverlayCanvas组件自动处理
};

// 处理工具切换
const handleToolChanged = (toolInfo) => {
  currentTool.value = toolInfo.tool;
  currentColor.value = toolInfo.color;
  
  // 处理线宽参数
  if (toolInfo.lineWidth !== undefined) {
    currentLineWidth.value = toolInfo.lineWidth;
  }
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

// 选择查看器
const selectViewer = (index) => {
  emit('update:selectedViewerIndex', index)
}

// 监听布局变化，当布局改变时重新初始化查看器
watch(() => props.layoutType, () => {
  emit('initViewers')
  annotationData.value = new Array(props.layoutType).fill('');
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
  position: relative;
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
  display: flex;
  flex-direction: column;
}

.selected-viewer {
  border: 3px solid #1890ff;
}

.placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245,247,249,0.5);
}

.osd-viewer {
  width: 100%;
  flex: 1;
}

.image-title-bar {
  background: #1890ff;
  color: white;
  padding: 2px 10px;
  font-size: 11px;
  text-align: left;
  width: 100%;
  height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.image-title {
  font-weight: bold;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-image-btn {
  height: 24px;
  width: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-image-wrapper {
  position: absolute;
  top: 22px;
  right: 10px;
  z-index: 100;
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.close-image-wrapper:hover {
  background-color: rgba(255, 255, 255, 0.9);
  transform: scale(1.1);
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

.layout-16 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
}

.annotation-toggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 101;
}
</style> 