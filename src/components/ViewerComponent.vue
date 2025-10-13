<template>
  <n-layout-content class="content">
    <!-- 标准布局 -->
    <div v-if="!isSpecialLayout" class="viewer-container" :class="getLayoutClass" ref="viewerContainerRef">
      <div 
        v-for="(v, index) in getViewerCount" 
        :key="index"
        class="viewer-wrapper"
        :class="[getViewerClass(index), { 'selected-viewer': selectedViewerIndex === index }]"
        :draggable="hasDzi(index)"
        @click="selectViewer(index)"
        @dragstart="(e) => handleImageDragStart(e, index)"
        style="cursor: grab;"
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
        
        <!-- 扫描信息图叠加显示 -->
        <div 
          v-if="hasDzi(index) && showScanInfo"
          class="scan-info-wrapper"
        >
          <img 
            class="scan-info-image"
            :src="getScanInfoImageUrl(index)"
            alt="扫描信息图"
            @error="handleScanInfoLoadError"
          />
        </div>
        
        <div :id="`osdViewer-${index}`" class="osd-viewer"></div>
        <div v-if="!hasDzi(index)" class="placeholder">
          <div class="empty-state-content">
            <n-icon size="48" class="empty-icon"><file-image-outlined /></n-icon>
            <p class="empty-title">请选择图像文件</p>
            <p class="empty-description">从左侧文件列表中选择要查看的图像</p>
          </div>
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
          :is-sync-annotation="isSyncAnnotation"
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
    
    <!-- 左大右小布局 -->
    <div v-else-if="layoutType === 101" class="viewer-container layout-left-big-right-small" ref="viewerContainerRef">
      <!-- 左侧大图 -->
      <div 
        class="viewer-wrapper big-viewer"
        :class="{ 'selected-viewer': selectedViewerIndex === 0 }"
        :draggable="hasDzi(0)"
        @click="selectViewer(0)"
        @dragstart="(e) => handleImageDragStart(e, 0)"
        style="cursor: grab;"
      >
        <div class="image-title-bar">
          <span class="image-title">{{ viewerFileNames[0] || '未加载图像' }}</span>
        </div>
        
        <div v-if="hasDzi(0)" class="close-image-wrapper" @click.stop="closeImage(0)">
          <n-button class="close-image-btn" circle quaternary type="error" size="small">
            <template #icon><n-icon><close-outlined /></n-icon></template>
          </n-button>
        </div>
        
        <div id="osdViewer-0" class="osd-viewer"></div>
        <div v-if="!hasDzi(0)" class="placeholder">
          <div class="empty-state-content">
            <n-icon size="60" class="empty-icon"><file-image-outlined /></n-icon>
            <p class="empty-title">请选择主图像</p>
            <p class="empty-description">从左侧文件列表中选择要作为主图像查看的文件</p>
          </div>
        </div>
        
        <!-- 扫描信息图叠加显示 - 大图 -->
        <div 
          v-if="hasDzi(0) && showScanInfo" 
          class="scan-info-wrapper"
        >
          <img class="scan-info-image" :src="getScanInfoImageUrl(0)" alt="扫描信息图" @error="handleScanInfoLoadError" />
        </div>
        
        <!-- 其他组件保持不变 -->
      </div>
      
      <!-- 右侧小图容器 -->
      <div class="right-small-container">
        <div 
          v-for="index in 4" 
          :key="index"
          class="viewer-wrapper small-viewer"
          :class="{ 'selected-viewer': selectedViewerIndex === index }"
          :draggable="hasDzi(index)"
          @click="selectViewer(index)"
          @dragstart="(e) => handleImageDragStart(e, index)"
          style="cursor: grab;"
        >
          <div class="image-title-bar">
            <span class="image-title">{{ viewerFileNames[index] || '未加载图像' }}</span>
          </div>
          
          <div v-if="hasDzi(index)" class="close-image-wrapper" @click.stop="closeImage(index)">
            <n-button class="close-image-btn" circle quaternary type="error" size="small">
              <template #icon><n-icon><close-outlined /></n-icon></template>
            </n-button>
          </div>
          
          <div :id="`osdViewer-${index}`" class="osd-viewer"></div>
          <div v-if="!hasDzi(index)" class="placeholder">
            <div class="empty-state-content small">
              <n-icon size="32" class="empty-icon"><file-image-outlined /></n-icon>
              <p class="empty-title">请选择图像</p>
            </div>
          </div>
          
          <!-- 扫描信息图叠加显示 - 小图 -->
          <div v-if="hasDzi(index) && showScanInfo" class="scan-info-wrapper small-scan">
            <img class="scan-info-image" :src="getScanInfoImageUrl(index)" alt="扫描信息图" @error="handleScanInfoLoadError" />
          </div>
          
          <!-- 其他组件保持不变 -->
        </div>
      </div>
    </div>
    
    <!-- 右大左小布局 -->
    <div v-else-if="layoutType === 102" class="viewer-container layout-right-big-left-small" ref="viewerContainerRef">
      <!-- 左侧小图容器 -->
      <div class="left-small-container">
        <div 
          v-for="index in 4" 
          :key="index - 1"
          class="viewer-wrapper small-viewer"
          :class="{ 'selected-viewer': selectedViewerIndex === index - 1 }"
          :draggable="hasDzi(index - 1)"
          @click="selectViewer(index - 1)"
          @dragstart="(e) => handleImageDragStart(e, index - 1)"
          style="cursor: grab;"
        >
          <div class="image-title-bar">
            <span class="image-title">{{ viewerFileNames[index - 1] || '未加载图像' }}</span>
          </div>
          
          <div v-if="hasDzi(index - 1)" class="close-image-wrapper" @click.stop="closeImage(index - 1)">
            <n-button class="close-image-btn" circle quaternary type="error" size="small">
              <template #icon><n-icon><close-outlined /></n-icon></template>
            </n-button>
          </div>
          
          <div :id="`osdViewer-${index - 1}`" class="osd-viewer"></div>
          <div v-if="!hasDzi(index - 1)" class="placeholder">
            <div class="empty-state-content small">
              <n-icon size="32" class="empty-icon"><file-image-outlined /></n-icon>
              <p class="empty-title">请选择图像</p>
            </div>
          </div>
          
          <!-- 扫描信息图叠加显示 - 小图 -->
          <div v-if="hasDzi(index - 1) && showScanInfo" class="scan-info-wrapper small-scan">
            <img class="scan-info-image" :src="getScanInfoImageUrl(index - 1)" alt="扫描信息图" @error="handleScanInfoLoadError" />
          </div>
          
          <!-- 其他组件保持不变 -->
        </div>
      </div>
      
      <!-- 右侧大图 -->
      <div 
        class="viewer-wrapper big-viewer"
        :class="{ 'selected-viewer': selectedViewerIndex === 4 }"
        :draggable="hasDzi(4)"
        @click="selectViewer(4)"
        @dragstart="(e) => handleImageDragStart(e, 4)"
        style="cursor: grab;"
      >
        <div class="image-title-bar">
          <span class="image-title">{{ viewerFileNames[4] || '未加载图像' }}</span>
        </div>
        
        <div v-if="hasDzi(4)" class="close-image-wrapper" @click.stop="closeImage(4)">
          <n-button class="close-image-btn" circle quaternary type="error" size="small">
            <template #icon><n-icon><close-outlined /></n-icon></template>
          </n-button>
        </div>
        
        <div id="osdViewer-4" class="osd-viewer"></div>
        <div v-if="!hasDzi(4)" class="placeholder">
          <div class="empty-state-content">
            <n-icon size="60" class="empty-icon"><file-image-outlined /></n-icon>
            <p class="empty-title">请选择主图像</p>
            <p class="empty-description">从左侧文件列表中选择要作为主图像查看的文件</p>
          </div>
        </div>
        
        <!-- 扫描信息图叠加显示 - 大图 -->
        <div v-if="hasDzi(4) && showScanInfo" class="scan-info-wrapper">
          <img class="scan-info-image" :src="getScanInfoImageUrl(4)" alt="扫描信息图" @error="handleScanInfoLoadError" />
        </div>
        
        <!-- 其他组件保持不变 -->
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
import { EditOutlined, CameraOutlined, CloseOutlined, FileImageOutlined } from '@vicons/antd'
import OpenSeadragon from 'openseadragon'
import { throttle } from '../utils/throttle'
import FabricOverlayCanvas from './FabricOverlayCanvas.vue'
import ImageToolbox from './ImageToolbox.vue'
import { useViewerStore } from '@/stores/viewer'

const message = useMessage()
const viewerContainerRef = ref(null)
const viewerStore = useViewerStore() // 使用ViewerStore
// 注: 标注同步开关状态通过props传入

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
  },
  isSyncAnnotation: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:selectedViewerIndex',
  'update:viewers',
  'initViewers',
  'updateViewerDziUrl',
  'setupSync',
  'closeImage',
  'update:isSyncAnnotation'
])

// 标注相关状态
const annotationMode = ref(false);
const currentTool = ref('select');
const currentColor = ref('red');
const currentLineWidth = ref(0.5);
const annotationCanvasRefs = ref([]);
const annotationData = ref([]);

// 扫描信息图相关
const showScanInfo = computed(() => viewerStore.showScanInfo);
const getScanInfoImageUrl = (index) => {
  const folder = viewerStore.viewerFolderNames[index] || ''
  const name = viewerStore.viewerFileNames[index] || ''
  if (!folder || !name) return ''
  // 假设扫描信息图由后端提供：/api/dzi/scan-info/{folder}/{file}.png
  return `/api/dzi/scan-info/${encodeURIComponent(folder)}/${encodeURIComponent(name)}.png`
}
const handleScanInfoLoadError = (e) => {
  // 隐藏无法加载的占位图，避免破图
  if (e && e.target) e.target.style.display = 'none'
}

// 关闭图像
const closeImage = (index) => {
  emit('closeImage', index);
}

// 处理图片拖动到新窗口
const handleImageDragStart = (event, index) => {
  // 如果该位置没有图片，阻止拖动
  if (!hasDzi(index)) {
    event.preventDefault()
    return
  }
  
  // 获取当前图片信息
  const fileName = viewerStore.viewerFileNames[index]
  const folderName = viewerStore.viewerFolderNames[index]
  
  if (!fileName) {
    event.preventDefault()
    return
  }
  
  // 构建新窗口的URL参数（单图模式）
  const params = new URLSearchParams({
    mode: 'single',
    folder: folderName,
    file: fileName,
    layout: 1  // 单图模式
  })
  
  const newWindowUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`
  
  // 设置拖动数据
  event.dataTransfer.effectAllowed = 'link'
  event.dataTransfer.setData('text/uri-list', newWindowUrl)
  event.dataTransfer.setData('text/plain', newWindowUrl)
  
  // 存储图片信息到 localStorage
  const dragData = {
    type: 'single',
    folder: folderName,
    file: fileName,
    layout: 1,
    timestamp: Date.now()
  }
  localStorage.setItem('drag_open_data', JSON.stringify(dragData))
  
  // 拖动后打开新窗口
  setTimeout(() => {
    window.open(newWindowUrl, '_blank')
  }, 100)
}

// 获取布局类名
const getLayoutClass = computed(() => {
  if (props.layoutType === 101) {
    return 'layout-left-big-right-small';
  } else if (props.layoutType === 102) {
    return 'layout-right-big-left-small';
  } else {
    return `layout-${props.layoutType}`;
  }
});

// 检查是否使用特殊布局
const isSpecialLayout = computed(() => {
  return props.layoutType === 101 || props.layoutType === 102;
});

// 获取查看器数量
const getViewerCount = computed(() => {
  if (props.layoutType === 101 || props.layoutType === 102) {
    return 5; // 这两种布局都有5个查看器
  } else {
    return props.layoutType;
  }
});

// 获取查看器类名
const getViewerClass = (index) => {
  if (props.layoutType === 101) {
    return index === 0 ? 'big-viewer' : 'small-viewer';
  } else if (props.layoutType === 102) {
    return index === 4 ? 'big-viewer' : 'small-viewer';
  }
  return '';
};

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
    
    // 创建临时样式表强制隐藏所有OpenSeadragon控件
    const tempStyle = document.createElement('style');
    tempStyle.innerHTML = `
      .openseadragon-container .openseadragon-controls,
      .openseadragon-container .openseadragon-navigator,
      .openseadragon-container button,
      .openseadragon-container .zoomIn,
      .openseadragon-container .zoomOut,
      .openseadragon-container .home,
      .openseadragon-container .full-page,
      .openseadragon-container div[class^="osd"],
      .openseadragon-container .navigator,
      .openseadragon-canvas + div {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(tempStyle);
    
    // 临时隐藏所有图像标题栏
    const titleBars = viewerContainerRef.value.querySelectorAll('.image-title-bar');
    const closeBtns = viewerContainerRef.value.querySelectorAll('.close-image-wrapper');
    const placeholders = viewerContainerRef.value.querySelectorAll('.placeholder .empty-state-content');
    const annotationToggles = viewerContainerRef.value.querySelectorAll('.annotation-toggle');
    
    // OpenSeadragon导航控件
    const osdControls = document.querySelectorAll('.openseadragon-controls, .openseadragon-container div[class^="osd"]');
    const osdNavControls = document.querySelectorAll('.navigator, .openseadragon-navigator');
    const osdButtons = document.querySelectorAll('.openseadragon-container button, .openseadragon-container .openseadragon-container button');
    const osdZoomIcons = document.querySelectorAll('.openseadragon-container div.zoomIn, .openseadragon-container div.zoomOut, .openseadragon-container div.home, .openseadragon-container div.full-page');
    
    // 被选中的查看器框
    const selectedViewers = viewerContainerRef.value.querySelectorAll('.selected-viewer');
    
    // 存储原始显示状态和样式
    const titleBarsDisplay = [];
    const closeBtnsDisplay = [];
    const placeholdersHTML = [];
    const annotationTogglesDisplay = [];
    const osdControlsDisplay = [];
    const osdNavControlsDisplay = [];
    const osdButtonsDisplay = [];
    const selectedViewersBorder = [];
    const selectedViewersBoxShadow = [];
    
    // 隐藏标题栏
    titleBars.forEach((bar, index) => {
      titleBarsDisplay[index] = bar.style.display;
      bar.style.display = 'none';
    });
    
    // 隐藏关闭按钮
    closeBtns.forEach((btn, index) => {
      closeBtnsDisplay[index] = btn.style.display;
      btn.style.display = 'none';
    });
    
    // 简化占位内容
    placeholders.forEach((placeholder, index) => {
      placeholdersHTML[index] = placeholder.innerHTML;
      placeholder.innerHTML = '';
    });
    
    // 隐藏标注按钮
    annotationToggles.forEach((toggle, index) => {
      annotationTogglesDisplay[index] = toggle.style.display;
      toggle.style.display = 'none';
    });
    
    // 隐藏OpenSeadragon控件
    osdControls.forEach((control, index) => {
      osdControlsDisplay[index] = control.style.display;
      control.style.display = 'none';
    });
    
    osdNavControls.forEach((control, index) => {
      osdNavControlsDisplay[index] = control.style.display;
      control.style.display = 'none';
    });
    
    osdButtons.forEach((button, index) => {
      osdButtonsDisplay[index] = button.style.display;
      button.style.display = 'none';
    });
    
    // 移除选中框的高亮效果
    selectedViewers.forEach((viewer, index) => {
      selectedViewersBorder[index] = viewer.style.boxShadow;
      selectedViewersBoxShadow[index] = viewer.style.border;
      
      // 移除选择高亮
      viewer.style.boxShadow = 'none';
      viewer.style.border = '1px solid rgba(0, 0, 0, 0.03)';
      viewer.classList.remove('selected-viewer'); // 临时移除类
    });
    
    // 获取所有查看器框
    const viewerWrappers = viewerContainerRef.value.querySelectorAll('.viewer-wrapper');
    const wrapperBackgrounds = [];
    
    // 统一背景色为白色，增强纯净感
    viewerWrappers.forEach((wrapper, index) => {
      wrapperBackgrounds[index] = wrapper.style.background;
      wrapper.style.background = 'white';
    });
    
    // 确保页面上的所有OpenSeadragon控件已经隐藏
    // 给浏览器一些时间来更新UI
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 使用html2canvas捕获当前视图
    const canvas = await html2canvas(viewerContainerRef.value, {
      scale: 2, // 提高分辨率，生成更高清的图片
      useCORS: true, // 允许跨域图片
      allowTaint: true, // 允许加载跨域图片
      backgroundColor: '#ffffff', // 纯白色背景
      logging: false, // 关闭日志
      removeContainer: true, // 临时移除容器
      ignoreElements: (element) => {
        // 忽略所有控件类元素
        return element.classList && (
          element.classList.contains('openseadragon-controls') ||
          element.classList.contains('openseadragon-navigator') ||
          element.classList.contains('annotation-toggle') ||
          element.classList.contains('close-image-wrapper') ||
          element.classList.contains('image-title-bar') ||
          element.tagName === 'BUTTON'
        );
      }
    });
    
    // 移除临时样式表
    document.head.removeChild(tempStyle);
    
    // 恢复标题栏显示
    titleBars.forEach((bar, index) => {
      bar.style.display = titleBarsDisplay[index];
    });
    
    // 恢复关闭按钮显示
    closeBtns.forEach((btn, index) => {
      btn.style.display = closeBtnsDisplay[index];
    });
    
    // 恢复占位内容
    placeholders.forEach((placeholder, index) => {
      placeholder.innerHTML = placeholdersHTML[index];
    });
    
    // 恢复标注按钮显示
    annotationToggles.forEach((toggle, index) => {
      toggle.style.display = annotationTogglesDisplay[index];
    });
    
    // 恢复OpenSeadragon控件
    osdControls.forEach((control, index) => {
      control.style.display = osdControlsDisplay[index];
    });
    
    osdNavControls.forEach((control, index) => {
      control.style.display = osdNavControlsDisplay[index];
    });
    
    osdButtons.forEach((button, index) => {
      button.style.display = osdButtonsDisplay[index];
    });
    
    // 恢复选中框的高亮效果
    selectedViewers.forEach((viewer, index) => {
      viewer.style.boxShadow = selectedViewersBorder[index];
      viewer.style.border = selectedViewersBoxShadow[index];
      viewer.classList.add('selected-viewer'); // 恢复类
    });
    
    // 恢复查看器框背景
    viewerWrappers.forEach((wrapper, index) => {
      wrapper.style.background = wrapperBackgrounds[index];
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
      
      message.success('纯图像已保存');
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
  
  // 处理橡皮擦大小参数（虽然现在橡皮擦不使用这个参数，但保留接口）
  if (toolInfo.eraserSize !== undefined) {
    // 目前橡皮擦使用点击删除方式，不需要大小参数
    // 但可以保留这个接口以备将来使用
    console.log('橡皮擦大小:', toolInfo.eraserSize);
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
  
  // 在标注同步开启时，绘制和橡皮擦操作都应该同步到其他查看器
  if (props.isSyncAnnotation && (currentTool.value === 'draw' || currentTool.value === 'eraser')) {
    syncAnnotationToOtherViewers(index);
  }
};

// 同步标注到其他查看器
const syncAnnotationToOtherViewers = (sourceIndex) => {
  if (!annotationData.value[sourceIndex]) return;
  
  try {
    const sourceData = JSON.parse(annotationData.value[sourceIndex]);
    
    // 过滤出只有同步状态下创建的标注
    const syncOnlyData = {
      ...sourceData,
      objects: sourceData.objects ? sourceData.objects.filter(obj => {
        // 只同步在同步状态下创建的对象（路径类型且有同步标记）
        return obj.type === 'path' && obj.createdWithSyncEnabled === true;
      }) : []
    };
    
    const syncDataString = JSON.stringify(syncOnlyData);
    
    // 将过滤后的标注数据同步到其他已加载图像的查看器
    props.viewers.forEach((viewer, targetIndex) => {
      if (targetIndex !== sourceIndex && viewer !== null) {
        annotationData.value[targetIndex] = syncDataString;
      }
    });
  } catch (error) {
    console.error('同步标注数据时出错:', error);
  }
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
  background: linear-gradient(135deg, #f7f9fc 0%, #edf1f7 100%);
  padding: 20px;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.viewer-container {
  display: grid;
  gap: 16px;
  height: 100%;
  overflow: hidden;
}

/* 修复展示框的样式问题 */
.viewer-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.03);
  min-height: 200px; /* 确保最小高度 */
}

.viewer-wrapper:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
}

.selected-viewer {
  box-shadow: 0 0 0 2px #1890ff, 0 6px 20px rgba(24, 144, 255, 0.25) !important;
  z-index: 5; /* 确保选中的视图在上层 */
}

.placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white; /* 统一背景色 */
  position: absolute;
  top: 32px; /* 标题栏高度 */
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.osd-viewer {
  width: 100%;
  flex: 1;
  position: relative;
  z-index: 1;
}

.image-title-bar {
  background: linear-gradient(90deg, rgba(24, 144, 255, 0.9) 0%, rgba(9, 109, 217, 0.9) 100%);
  color: white;
  padding: 8px 15px;
  font-size: 13px;
  text-align: left;
  width: 100%;
  height: 32px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(5px);
}

.image-title {
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  letter-spacing: 0.3px;
}

.close-image-btn {
  height: 28px;
  width: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-image-wrapper {
  position: absolute;
  top: 40px;
  right: 15px;
  z-index: 100;
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  opacity: 0.85;
}

.close-image-wrapper:hover {
  background-color: #ffffff;
  transform: scale(1.15) translateY(-2px);
  opacity: 1;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

/* 标准布局样式 */
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

/* 进一步改进多图模式和空状态 */
.layout-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  max-height: 100%; /* 确保不会溢出父容器 */
}

.layout-16 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  max-height: 100%; /* 确保不会溢出父容器 */
}

/* 确保多图模式下每个查看器都有合适的最小高度 */
.layout-9 .viewer-wrapper,
.layout-16 .viewer-wrapper {
  min-height: 140px;
}

/* 在多图模式下简化空状态显示 */
.layout-9 .empty-description,
.layout-16 .empty-description {
  display: none; /* 隐藏描述文本，节省空间 */
}

.layout-9 .empty-icon,
.layout-16 .empty-icon {
  margin-bottom: 8px; /* 减少图标下方间距 */
  font-size: 24px;
}

.layout-9 .empty-title,
.layout-16 .empty-title {
  font-size: 13px;
  margin-bottom: 0;
}

/* 强化选中效果 */
.viewer-wrapper.selected-viewer {
  z-index: 10 !important; /* 确保在最上层 */
  transform: translateY(-2px); /* 轻微上浮效果 */
  box-shadow: 0 0 0 2px #1890ff, 0 8px 24px rgba(24, 144, 255, 0.35) !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.viewer-wrapper.selected-viewer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 0 2px #1890ff;
  pointer-events: none;
  z-index: 100;
}

/* 增强小查看器的空状态显示 */
.small .empty-state-content {
  padding: 10px;
}

.small .empty-icon {
  margin-bottom: 8px;
  font-size: 20px;
}

/* 确保标题栏在所有模式下的一致性 */
.image-title-bar {
  background: linear-gradient(90deg, rgba(24, 144, 255, 0.9) 0%, rgba(9, 109, 217, 0.9) 100%);
  box-sizing: border-box;
}

/* 添加上传提示图标 */
.empty-state-content::after {
  content: '';
  position: absolute;
  bottom: 15px;
  right: 15px;
  width: 24px;
  height: 24px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%231890ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 4v12"/></svg>') no-repeat center center;
  opacity: 0.5;
  transition: all 0.3s ease;
  pointer-events: none;
}

.empty-state-content:hover::after {
  opacity: 0.8;
  transform: translateY(-2px);
}

/* 移除多余样式 */
.layout-9 .empty-state-content::after,
.layout-16 .empty-state-content::after,
.small .empty-state-content::after {
  display: none; /* 在空间有限的情况下不显示额外图标 */
}

.small-viewer {
  min-height: 120px;
}

.small-viewer .image-title-bar {
  font-size: 11px;
  height: 26px;
  padding: 3px 10px;
}

.small-viewer .close-image-wrapper {
  top: 35px;
  right: 8px;
}

.small-viewer .close-image-btn {
  height: 24px;
  width: 24px;
}

.big-viewer {
  height: 100%;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
}

.big-viewer .image-title-bar {
  height: 36px;
  font-size: 14px;
  padding: 8px 16px;
}

.right-small-container, .left-small-container {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(4, 1fr);
  gap: 16px;
  height: 100%;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
}

.right-small-container::-webkit-scrollbar, 
.left-small-container::-webkit-scrollbar {
  width: 4px;
}

.right-small-container::-webkit-scrollbar-thumb, 
.left-small-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.right-small-container::-webkit-scrollbar-thumb:hover, 
.left-small-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.layout-left-big-right-small, .layout-right-big-left-small {
  height: 100%;
}

:deep(.n-empty) {
  font-size: 14px;
  color: #8c9bab;
}

:deep(.n-empty .n-empty__description) {
  font-size: 13px;
  color: #8c9bab;
}

/* 优化空白状态样式 */
.empty-state-content {
  text-align: center;
  padding: 20px;
  color: #8c9bab;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: white; /* 统一背景色 */
  border-radius: 0;
  transition: all 0.3s ease;
}

.empty-state-content:hover {
  background: #f9fafc; /* 减轻色差 */
  box-shadow: none; /* 移除内阴影 */
}

.empty-icon {
  color: #1890ff;
  opacity: 0.6;
  margin-bottom: 16px;
  filter: drop-shadow(0 3px 8px rgba(24, 144, 255, 0.25));
  transition: all 0.3s ease;
}

.empty-state-content:hover .empty-icon {
  transform: scale(1.05);
  opacity: 0.8;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a2b4b;
}

.empty-description {
  font-size: 14px;
  line-height: 1.5;
  max-width: 200px;
  color: #5e6c84;
  margin: 0 auto; /* 居中 */
}

/* 小型查看器的空状态样式 */
.small .empty-state-content {
  padding: 15px;
}

.small .empty-icon {
  margin-bottom: 10px;
  font-size: 24px;
}

.small .empty-title {
  font-size: 14px;
  margin-bottom: 4px;
}

.small .empty-description {
  font-size: 12px;
  max-width: 150px;
}

/* 确保大查看器和小查看器的标题栏高度正确 */
.small-viewer .placeholder {
  top: 26px; /* 小型查看器的标题栏高度 */
}

.big-viewer .placeholder {
  top: 36px; /* 大型查看器的标题栏高度 */
}

/* 恢复特殊布局样式 */
/* 左大右小布局 */
.layout-left-big-right-small {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 1fr;
  gap: 20px;
  height: 100%;
}

.layout-left-big-right-small .big-viewer {
  grid-column: 1;
  grid-row: 1;
  min-height: 100%;
}

.layout-left-big-right-small .small-viewer {
  height: auto;
}

/* 右侧小图区域容器 */
.layout-left-big-right-small .right-small-container {
  grid-column: 2;
  grid-row: 1;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(4, 1fr);
  gap: 16px;
  height: 100%;
  padding-right: 5px;
  overflow-y: auto;
  scrollbar-width: thin;
}

/* 右大左小布局 */
.layout-right-big-left-small {
  display: grid;
  grid-template-columns: 1fr 2fr;
  grid-template-rows: 1fr;
  gap: 20px;
  height: 100%;
}

.layout-right-big-left-small .big-viewer {
  grid-column: 2;
  grid-row: 1;
  min-height: 100%;
}

.layout-right-big-left-small .small-viewer {
  height: auto;
}

/* 左侧小图区域容器 */
.layout-right-big-left-small .left-small-container {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(4, 1fr);
  gap: 16px;
  height: 100%;
  padding-right: 5px;
  overflow-y: auto;
  scrollbar-width: thin;
}

/* 恢复标注切换按钮样式 */
.annotation-toggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 101;
}

:deep(.annotation-toggle .n-button) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  border: none;
}

:deep(.annotation-toggle .n-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
}

:deep(.annotation-toggle .n-button[type="primary"]) {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

/* 进一步优化特殊布局的空状态显示 */
.layout-left-big-right-small .big-viewer .empty-state-content,
.layout-right-big-left-small .big-viewer .empty-state-content {
  padding: 30px;
}

.layout-left-big-right-small .big-viewer .empty-icon,
.layout-right-big-left-small .big-viewer .empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

/* 修复小视图容器滚动 */
.right-small-container, .left-small-container {
  -webkit-overflow-scrolling: touch; /* 添加iOS滚动惯性 */
}

/* 修复多图模式下图像容器溢出问题 */
.viewer-container {
  max-height: 100%;
  overflow-y: hidden;
}

/* 扫描信息图样式 */
.scan-info-wrapper {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 50;
  pointer-events: none;
  /* 宽度随查看器容器自适应：不小于200px，不大于480px，默认取容器宽度的28% */
  width: clamp(200px, 28%, 480px);
}

.scan-info-image {
  /* 图片宽度占满其父容器，等比缩放 */
  width: 100%;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
}

/* 小图尺寸优化：直接控制外层容器宽度 */
.small-scan {
  /* 宽度在 140px 到 360px，默认取容器宽度的35% */
  width: clamp(140px, 35%, 360px);
}

</style> 