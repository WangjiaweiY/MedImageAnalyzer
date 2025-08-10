<template>
  <div class="fabric-overlay-container">
    <!-- 此组件不需要额外的模板，将直接操作OpenSeaDragon的Overlay -->
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { fabric } from 'fabric';
import OpenSeadragon from 'openseadragon';

const props = defineProps({
  // OpenSeaDragon viewer实例
  viewer: {
    type: Object,
    required: true
  },
  // 当前选择的工具
  tool: {
    type: String,
    default: 'select'
  },
  // 绘图颜色
  color: {
    type: String,
    default: 'red'
  },
  // 线宽
  lineWidth: {
    type: Number,
    default: 0.5
  },
  // 是否启用标注功能
  annotationEnabled: {
    type: Boolean,
    default: false
  },
  // 编辑数据，用于恢复已有标注
  annotationData: {
    type: String,
    default: ''
  },
  // 是否启用标注同步
  isSyncAnnotation: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:annotation-data', 'annotation-changed']);

// 引用变量
let overlay = null;
let fabricCanvas = null;
let isDrawing = false;
let currentObject = null;
let drawingStartPoint = { x: 0, y: 0 };
// 新增标识属性，用于记录是否是在同步状态下创建的标注
const SYNC_ATTRIBUTE = 'createdWithSyncEnabled';
// 防止递归调用的标志
let isProcessingSync = false;

// 初始化Fabric.js overlay
const initOverlay = () => {
  if (!props.viewer || !window.OpenSeadragon) return;
  
  // 检查fabricjsOverlay方法是否存在
  if (typeof props.viewer.fabricjsOverlay !== 'function') {
    console.error('fabricjsOverlay方法未找到！请确认openseadragon-fabricjs-overlay.js已正确加载。');
    return;
  }
  
  try {
    // 使用OpenSeaDragon的fabricjsOverlay插件
    overlay = props.viewer.fabricjsOverlay({
      scale: 1000 // 设置一个适当的缩放比例
    });
    
    // 获取fabric canvas
    fabricCanvas = overlay.fabricCanvas();
    
    // 禁用fabric默认选择，因为OSD处理点击事件
    fabricCanvas.selection = false;
    
    // 设置fabric canvas选项，提高交互体验
    fabricCanvas.preserveObjectStacking = true;
    fabricCanvas.stopContextMenu = true;
    fabricCanvas.fireRightClick = true;
    
    // 如果有已保存的标注数据，恢复它
    if (props.annotationData) {
      try {
        fabricCanvas.loadFromJSON(props.annotationData, () => {
          fabricCanvas.renderAll();
        });
      } catch (error) {
        console.error('Error loading annotation data:', error);
      }
    }
    
    // 根据当前标注模式设置交互状态
    updateInteractionMode();
    
    // 绑定事件
    setupEventListeners();
    
    // 添加视图变化时的实时渲染
    props.viewer.addHandler('animation', () => {
      if (overlay) {
        overlay.resize();
        overlay.resizeCanvas();
        fabricCanvas.renderAll();
        
        // 在缩放过程中动态调整线宽
        if (props.tool === 'draw' && fabricCanvas.isDrawingMode) {
          const zoom = props.viewer.viewport.getZoom(true);
          const zoomFactor = Math.max(1, zoom / 2);
          const adjustedLineWidth = props.lineWidth / zoomFactor;
          fabricCanvas.freeDrawingBrush.width = adjustedLineWidth;
        }
      }
    });
    
    // 专门监听缩放事件
    props.viewer.addHandler('zoom', () => {
      // 动态调整线宽
      if (props.annotationEnabled && props.tool === 'draw' && fabricCanvas) {
        const zoom = props.viewer.viewport.getZoom(true);
        const zoomFactor = Math.max(1, zoom / 2);
        const adjustedLineWidth = props.lineWidth / zoomFactor;
        
        if (fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush.width = adjustedLineWidth;
        }
      }
    });
    
    console.log('OpenSeaDragon Fabric.js Overlay初始化成功');
  } catch (error) {
    console.error('初始化OpenSeaDragon Fabric.js Overlay失败:', error);
  }
};

// 更新交互模式
const updateInteractionMode = () => {
  if (!fabricCanvas || !props.viewer) return;
  
  if (props.annotationEnabled) {
    // 启用标注模式 - 禁用OSD鼠标导航
    props.viewer.setMouseNavEnabled(false);
    props.viewer.gestureSettingsMouse.clickToZoom = false;
    
    // 启用fabric对象的可选择性
    fabricCanvas.forEachObject(obj => {
      obj.selectable = true;
      obj.evented = true;
    });
    
    // 如果当前工具是绘制工具，启用绘图模式
    if (props.tool === 'draw') {
      fabricCanvas.isDrawingMode = true;
      
      // 根据缩放级别调整线宽
      const zoom = props.viewer.viewport.getZoom(true);
      const zoomFactor = Math.max(1, zoom / 2); // 缩放因子，高倍时减小线宽
      const adjustedLineWidth = props.lineWidth / zoomFactor;
      
      fabricCanvas.freeDrawingBrush.color = props.color;
      fabricCanvas.freeDrawingBrush.width = adjustedLineWidth;
    } else {
      fabricCanvas.isDrawingMode = false;
    }
  } else {
    // 禁用标注模式 - 启用OSD鼠标导航
    props.viewer.setMouseNavEnabled(true);
    props.viewer.gestureSettingsMouse.clickToZoom = true;
    
    // 禁用fabric对象的可选择性
    fabricCanvas.forEachObject(obj => {
      obj.selectable = false;
      obj.evented = false;
    });
    
    // 确保不在绘图模式
    fabricCanvas.isDrawingMode = false;
  }
};

// 设置事件监听器
const setupEventListeners = () => {
  if (!fabricCanvas) return;
  
  try {
    // 移除旧的事件监听器，避免重复
    fabricCanvas.off('mouse:down', onMouseDown);
    fabricCanvas.off('mouse:move', onMouseMove);
    fabricCanvas.off('mouse:up', onMouseUp);
    
    // 添加新的事件监听器
    fabricCanvas.on('mouse:down', onMouseDown);
    fabricCanvas.on('mouse:move', onMouseMove);
    fabricCanvas.on('mouse:up', onMouseUp);
    
    // 数据变更事件
    fabricCanvas.on('object:added', () => saveAnnotationData());
    fabricCanvas.on('object:modified', () => saveAnnotationData());
    fabricCanvas.on('object:removed', () => saveAnnotationData());
    
    // 防止右键菜单
    fabricCanvas.upperCanvasEl.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    });
    
    console.log('Fabric事件监听器设置成功');
  } catch (error) {
    console.error('设置Fabric事件监听器时出错:', error);
  }
};

// 鼠标按下事件处理
const onMouseDown = (options) => {
  if (!props.annotationEnabled) return;
  
  // 禁用OpenSeaDragon的鼠标事件，以确保绘制时不会移动图像
  if (props.viewer) {
    props.viewer.setMouseNavEnabled(false);
    props.viewer.gestureSettingsMouse.clickToZoom = false;
  }
  
  const pointer = fabricCanvas.getPointer(options.e);
  drawingStartPoint = { x: pointer.x, y: pointer.y };
  
  if (props.tool === 'select') {
    fabricCanvas.isDrawingMode = false;
    return;
  }
  
  // 橡皮擦模式处理
  if (props.tool === 'eraser') {
    // 获取点击位置的对象
    const target = fabricCanvas.findTarget(options.e, false);
    if (target && (target.type === 'path' || target.type === 'text' || target.type === 'rect' || target.type === 'circle')) {
      // 删除被点击的标注对象
      fabricCanvas.remove(target);
      saveAnnotationData();
    }
    return;
  }
  
  isDrawing = true;
  
  switch (props.tool) {
    case 'text':
      const text = prompt('请输入文字：', '文字标注');
      if (text) {
        const textObject = new fabric.Text(text, {
          left: pointer.x,
          top: pointer.y,
          fill: props.color,
          fontFamily: 'Arial',
          fontSize: 16 + props.lineWidth * 4, // 根据线宽调整文字大小
          selectable: true
        });
        fabricCanvas.add(textObject);
        fabricCanvas.setActiveObject(textObject);
        saveAnnotationData();
      }
      break;
      
    case 'draw':
      // 配置绘图模式
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.freeDrawingBrush.color = props.color;
      
      // 线宽处理 - 获取当前缩放级别
      const zoom = props.viewer ? props.viewer.viewport.getZoom(true) : 1;
      const zoomFactor = Math.max(1, zoom / 2); // 缩放因子，高倍时减小线宽
      const adjustedLineWidth = props.lineWidth / zoomFactor;
      
      // 应用调整后的线宽
      fabricCanvas.freeDrawingBrush.width = adjustedLineWidth;
      
      // 移除旧的路径创建监听器，避免重复
      fabricCanvas.off('path:created');
      
      // 添加事件监听，记录绘制的路径是否是在同步状态下创建的
      fabricCanvas.on('path:created', function(e) {
        // 将当前的同步状态记录在绘制对象上
        e.path.set(SYNC_ATTRIBUTE, props.isSyncAnnotation);
      });
      break;
      
    case 'eraser':
      // 橡皮擦模式 - 禁用绘图模式，改为点击删除模式
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = false;
      
      // 设置鼠标样式为橡皮擦
      fabricCanvas.defaultCursor = 'crosshair';
      fabricCanvas.hoverCursor = 'crosshair';
      break;
  }
  
  // 阻止事件冒泡，避免触发OpenSeaDragon事件
  if (options.e && options.e.stopPropagation) {
    options.e.stopPropagation();
    options.e.preventDefault();
  }
};

// 鼠标移动事件处理
const onMouseMove = (options) => {
  if (!isDrawing || !currentObject) return;
  
  try {
    // 只有在绘制模式时才需要处理移动事件
    if (props.tool === 'draw') {
      // 自由绘制由Fabric.js自动处理
    }
    
    // 阻止事件冒泡
    if (options.e && options.e.stopPropagation) {
      options.e.stopPropagation();
      options.e.preventDefault();
    }
  } catch (error) {
    console.error('绘制过程中出错:', error);
  }
};

// 鼠标释放事件处理
const onMouseUp = (options) => {
  if (!isDrawing) return;
  
  try {
    // 阻止事件冒泡
    if (options.e && options.e.stopPropagation) {
      options.e.stopPropagation();
      options.e.preventDefault();
    }
  } catch (error) {
    console.error('结束绘制时出错:', error);
  }
  
  isDrawing = false;
  currentObject = null;
  
  // 只在非绘制模式下禁用isDrawingMode
  if (props.tool !== 'draw') {
    fabricCanvas.isDrawingMode = false;
  }
  
  // 重新启用OpenSeaDragon导航，但仅当不在绘制模式时
  if (props.tool !== 'draw' && props.viewer) {
    if (props.annotationEnabled) {
      // 如果仍在标注模式，保持禁用状态
      props.viewer.setMouseNavEnabled(false);
      props.viewer.gestureSettingsMouse.clickToZoom = false;
    } else {
      // 否则恢复导航功能
      props.viewer.setMouseNavEnabled(true);
      props.viewer.gestureSettingsMouse.clickToZoom = true;
    }
  }
  
  // 保存标注数据
  saveAnnotationData();
};

// 保存标注数据
const saveAnnotationData = () => {
  if (!fabricCanvas) return;
  
  // 将同步属性一并保存到JSON中
  const json = fabricCanvas.toJSON(['selectable', 'hasControls', SYNC_ATTRIBUTE]);
  const jsonString = JSON.stringify(json);
  
  emit('update:annotation-data', jsonString);
  emit('annotation-changed');
};

// 清除所有标注
const clearCanvas = () => {
  if (!fabricCanvas) return;
  
  fabricCanvas.clear();
  
  saveAnnotationData();
};

// 监听属性变化
watch(() => props.viewer, (newViewer) => {
  if (newViewer) {
    // 当viewer变更时，重新初始化overlay
    nextTick(() => {
      try {
        // 确保viewer已完全初始化
        if (newViewer.isOpen()) {
          initOverlay();
        } else {
          // 如果viewer尚未打开，等待open事件
          newViewer.addOnceHandler('open', () => {
            initOverlay();
          });
        }
      } catch (error) {
        console.error('初始化FabricOverlay时出错:', error);
      }
    });
  }
}, { immediate: true });

watch(() => props.tool, (newTool) => {
  if (!fabricCanvas || !props.viewer) return;
  
  if (newTool === 'draw') {
    fabricCanvas.isDrawingMode = true;
    
    // 根据缩放级别调整线宽
    const zoom = props.viewer.viewport.getZoom(true);
    const zoomFactor = Math.max(1, zoom / 2);
    const adjustedLineWidth = props.lineWidth / zoomFactor;
    
    // 激活自由绘制
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = props.color;
      fabricCanvas.freeDrawingBrush.width = adjustedLineWidth;
    }
  } else if (newTool === 'eraser') {
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = false;
    fabricCanvas.defaultCursor = 'crosshair';
    fabricCanvas.hoverCursor = 'crosshair';
  } else {
    // 对于select和text工具，禁用绘图模式
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;
    fabricCanvas.defaultCursor = 'default';
    fabricCanvas.hoverCursor = 'move';
  }
}, { immediate: true });

watch(() => props.color, (newColor) => {
  if (!fabricCanvas) return;
  
  if (props.tool === 'draw' && fabricCanvas.freeDrawingBrush) {
    fabricCanvas.freeDrawingBrush.color = newColor;
  }
});

watch(() => props.lineWidth, (newLineWidth) => {
  if (!fabricCanvas || !props.viewer) return;
  
  // 根据缩放级别调整线宽/橡皮擦大小
  const zoom = props.viewer.viewport.getZoom(true);
  const zoomFactor = Math.max(1, zoom / 2);
  const adjustedWidth = newLineWidth / zoomFactor;
  
  if (props.tool === 'draw' && fabricCanvas.freeDrawingBrush) {
    fabricCanvas.freeDrawingBrush.width = adjustedWidth;
  }
});

watch(() => props.annotationEnabled, () => {
  updateInteractionMode();
});

watch(() => props.annotationData, (newData, oldData) => {
  if (!fabricCanvas || !newData || isProcessingSync) return;
  
  try {
    const parsedData = JSON.parse(newData);
    const oldParsedData = oldData ? JSON.parse(oldData) : null;
    
    // 如果是从其他查看器同步来的数据，且确实是同步操作触发的变化
    const isFromSync = oldParsedData && parsedData.objects && oldParsedData.objects && 
        parsedData.objects.length !== oldParsedData.objects.length &&
        // 确保新数据中只包含同步标注（避免本地添加非同步对象时触发）
        parsedData.objects.every(obj => obj.type !== 'path' || obj[SYNC_ATTRIBUTE] === true);
    
    if (isFromSync) {
      // 设置同步处理标志，防止递归调用
      isProcessingSync = true;
      
      // 保存当前画布上的非同步对象（包括文本和非同步状态下创建的路径）
      const nonSyncObjects = [];
      fabricCanvas.getObjects().forEach(obj => {
        // 保留所有不是同步标注的对象
        if (obj.type === 'text' || obj.type === 'rect' || obj.type === 'circle' || 
            (obj.type === 'path' && obj[SYNC_ATTRIBUTE] !== true)) {
          nonSyncObjects.push(obj.toObject(['selectable', 'hasControls', SYNC_ATTRIBUTE]));
        }
      });
      
      // 清空画布并加载新的同步数据
      fabricCanvas.clear();
      
      // 加载同步数据（只包含同步状态下创建的路径）
      fabricCanvas.loadFromJSON(newData, () => {
        // 重新添加非同步对象
        if (nonSyncObjects.length > 0) {
          fabric.util.enlivenObjects(nonSyncObjects, (objects) => {
            objects.forEach(obj => {
              fabricCanvas.add(obj);
            });
            fabricCanvas.renderAll();
            // 清除同步处理标志
            isProcessingSync = false;
          });
        } else {
          fabricCanvas.renderAll();
          // 清除同步处理标志
          isProcessingSync = false;
        }
      });
    } else {
      // 正常加载数据（通常是本地操作或初始化）
      fabricCanvas.loadFromJSON(newData, () => {
        fabricCanvas.renderAll();
      });
    }
  } catch (error) {
    console.error('Error loading annotation data:', error);
  }
});

watch(() => props.lineWidth, (newWidth) => {
  if (!fabricCanvas || !props.viewer) return;
  
  if (props.tool === 'draw' && fabricCanvas.freeDrawingBrush) {
    // 根据缩放级别调整线宽
    const zoom = props.viewer.viewport.getZoom(true);
    const zoomFactor = Math.max(1, zoom / 2);
    const adjustedLineWidth = newWidth / zoomFactor;
    
    fabricCanvas.freeDrawingBrush.width = adjustedLineWidth;
  }
});

// 暴露方法给父组件
defineExpose({
  clearCanvas
});

onUnmounted(() => {
  if (fabricCanvas) {
    fabricCanvas.off('mouse:down', onMouseDown);
    fabricCanvas.off('mouse:move', onMouseMove);
    fabricCanvas.off('mouse:up', onMouseUp);
  }
});
</script>

<style scoped>
.fabric-overlay-container {
  /* 不需要额外的样式，因为Overlay会自动添加到OpenSeaDragon容器中 */
}
</style> 