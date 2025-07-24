<template>
  <n-layout-sider
    :width="isCollapsed ? 64 : 320"
    :collapsed-width="64"
    :show-trigger="false"
    class="file-sider"
    :style="{ width: isCollapsed ? '64px !important' : '320px !important' }"
  >
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <!-- 添加展开/收起按钮 -->
      <n-tooltip trigger="hover" placement="bottom">
        <template #trigger>
          <n-button circle type="default" size="small" @click="toggleSidebar" class="collapse-btn">
            <n-icon>
              <template v-if="isCollapsed">
                <MenuUnfoldOutlined />
              </template>
              <template v-else>
                <MenuFoldOutlined />
              </template>
            </n-icon>
          </n-button>
        </template>
        {{ isCollapsed ? '展开侧边栏' : '收起侧边栏' }}
      </n-tooltip>
      
      <template v-if="!isCollapsed">
        <n-button circle type="primary" size="small" @click="fetchFileList">
          <n-icon><ReloadOutlined /></n-icon>
        </n-button>
      
      <n-tooltip trigger="hover" placement="bottom">
        <template #trigger>
          <n-button 
            circle 
            :type="isRecording ? 'error' : 'warning'" 
            size="small" 
            @click="toggleRecording" 
            style="margin-left: 8px;"
          >
            <n-icon><VideoCameraOutlined /></n-icon>
          </n-button>
        </template>
        {{ isRecording ? `停止录制 (${formatTime(recordingTime)})` : '开始录制' }}
      </n-tooltip>
      <n-tooltip trigger="hover" placement="bottom">
        <template #trigger>
          <n-button 
            circle 
            type="success" 
            size="small" 
            @click="saveMultiView"
            style="margin-left: 8px;"
          >
            <n-icon><CameraOutlined /></n-icon>
          </n-button>
        </template>
        保存当前视图
      </n-tooltip>
      </template>
    </div>
    
    <!-- 文件列表 -->
    <n-list class="file-list" hoverable v-if="!isCollapsed">
      <!-- 文件列表为空时的占位符 -->
      <div v-if="!fileList || fileList.length === 0" class="empty-explorer">
        <n-icon :component="FolderOpenOutlined" :size="40" />
        <h3>暂无文件夹</h3>
        <p>当前没有可用的文件夹</p>
        <n-button type="primary" size="small" @click="fetchFileList">
          刷新
        </n-button>
      </div>
      
      <n-list-item 
        v-else
        v-for="item in fileList" 
        :key="item.folderName"
        :class="{ 'selected': selectedFolder === item.folderName, 'folder-expanded': expandedFolders[item.folderName] }"
      >
        <!-- 文件夹项 -->
        <div class="folder-item" :data-folder="item.folderName">
          <!-- 文件夹名称 -->
          <div class="folder-name-container">
            <div 
              @click="toggleFolder(item.folderName)" 
              class="folder-name"
              :title="item.folderName"
            >
                {{ item.folderName }}
            </div>
          </div>
        
          <!-- 按钮操作区 -->
          <div class="toggle-actions">
            <!-- 展开/折叠按钮 -->
            <n-button 
              class="toggle-folder-btn" 
              :class="{ 'expanded': expandedFolders[item.folderName] }"
              @click.stop="toggleFolder(item.folderName)"
              quaternary
            >
              <n-icon :component="expandedFolders[item.folderName] ? UpOutlined : DownOutlined" />
            </n-button>
          
            <!-- 更多操作按钮 -->
            <button 
              class="action-menu-btn" 
              @click.stop="toggleActionMenu(item.folderName, 0, $event)"
              :data-folder="item.folderName"
            >
                <n-icon :component="EllipsisOutlined" />
              </button>
              </div>
            </div>
      
        <!-- 二级菜单：显示展开后的文件和子文件夹 -->
        <div v-if="expandedFolders[item.folderName]" class="dzi-file-list">
          <!-- 加载中状态 -->
          <div v-if="loading && loading[item.folderName]" class="loading-state">
            <n-spin size="small" />
            <span>加载中...</span>
          </div>
          <!-- 空文件夹状态 -->
          <div v-else-if="!folderDziFiles[item.folderName] || folderDziFiles[item.folderName].length === 0" class="empty-folder">
            <n-icon :component="InboxOutlined" :size="30" />
            <span>此文件夹为空</span>
            <n-button text type="primary" size="small" @click="$emit('uploadToFolder', item.folderName)">
              <n-icon :component="UploadOutlined" />
              上传文件
            </n-button>
          </div>
          <!-- 文件列表 -->
          <div 
            v-else
            v-for="subItem in folderDziFiles[item.folderName] || []" 
            :key="subItem.name"
            class="dzi-item"
            @click="selectDziItem(item.folderName, subItem)"
          >
            <div 
              class="file-name" 
              :class="getFileClass(subItem.name)"
              :title="subItem.name"
            >
                  {{ subItem.name }}
            </div>
            <button 
              class="action-menu-btn file-action-btn"
              @click.stop="showFileMenu(item.folderName, subItem.name, $event)"
              :data-file="subItem.name"
              :data-folder="item.folderName"
            >
                <n-icon :component="EllipsisOutlined" />
              </button>
              </div>
        </div>
      </n-list-item>
    </n-list>
    
    <!-- 文件夹操作菜单 -->
    <div v-show="activeMenu && !activeMenu.startsWith('file_')" class="folder-action-menu" :style="menuPosition">
      <div class="menu-item" @click="renameFolderModal(activeMenu)">
        <i class="fas fa-edit"></i> 重命名
      </div>
      <div class="menu-item" @click="deleteFolder(activeMenu)">
        <i class="fas fa-trash"></i> 删除
      </div>
      <div class="menu-item" @click="handleAutoDisplayAllImages(activeMenu)">
        <i class="fas fa-eye"></i> 一键展示
      </div>
    </div>
    
    <!-- 文件操作菜单 -->
    <div v-show="activeMenu && activeMenu.startsWith('file_')" class="file-menu" :style="menuPosition">
      <div class="menu-item" @click="$emit('renameFile', activeMenu.split('_')[1], activeMenu.split('_')[2]); activeMenu = ''">
        <i class="fas fa-edit"></i> 重命名
      </div>
      <div class="menu-item" @click="$emit('deleteFile', activeMenu.split('_')[1], activeMenu.split('_')[2]); activeMenu = ''">
        <i class="fas fa-trash"></i> 删除
      </div>
    </div>
  </n-layout-sider>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { 
  NLayoutSider,
  NButton,
  NList,
  NListItem,
  NIcon,
  NTooltip,
  useMessage,
  NSpin
} from 'naive-ui'
import { 
  ReloadOutlined, 
  DownOutlined, 
  UpOutlined, 
  EllipsisOutlined,
  EyeOutlined,
  VideoCameraOutlined,
  CameraOutlined,
  InboxOutlined,
  UploadOutlined,
  FolderOpenOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined
} from '@vicons/antd'
import { useViewerStore } from '@/stores/viewer'
import RecordRTC from 'recordrtc'

const viewerStore = useViewerStore()
const message = useMessage()

// 添加loading属性
const props = defineProps({
  fileList: {
    type: Array,
    required: true
  },
  expandedFolders: {
    type: Object,
    required: true
  },
  folderDziFiles: {
    type: Object,
    required: true
  },
  actionMenuVisible: {
    type: Object,
    required: true
  },
  fileActionMenuVisible: {
    type: Object,
    required: true
  },
  selectedFolder: {
    type: String,
    default: ""
  },
  loading: {
    type: Object,
    default: () => ({})
  }
})

// 移除折叠相关事件处理函数
const emit = defineEmits([
  'update:selectedFolder',
  'update:expandedFolders',
  'update:folderDziFiles',
  'update:actionMenuVisible',
  'update:fileActionMenuVisible',
  'fetchFileList', 
  'toggleFolder',
  'selectDziItem',
  'deleteFolder',
  'deleteFile',
  'autoDisplayImages',
  'exportFolder',
  'uploadToFolder',
  'renameFile'
])

// 菜单位置控制
const activeMenu = ref('')
const menuPosition = ref({})

// 录制相关状态
const isRecording = ref(false)
const recordingTime = ref(0)
let timer = null
let recorder = null

// 侧边栏折叠状态
const isCollapsed = ref(false)

// 获取文件列表
const fetchFileList = () => {
  emit('fetchFileList')
}

// 切换文件夹展开状态
const toggleFolder = (folderName) => {
  emit('toggleFolder', folderName)
}

// 选择文件
const selectDziItem = (folderName, fileName) => {
  emit('selectDziItem', folderName, fileName)
}

// 显示文件夹操作菜单
const toggleActionMenu = (folderName, index, event) => {
  event.stopPropagation() // 阻止事件冒泡
  
  // 如果点击的是当前已显示的菜单，则关闭
  if (activeMenu.value === folderName) {
    activeMenu.value = ''
    return
  }
  
  activeMenu.value = folderName
  
  // 计算菜单位置
  nextTick(() => {
    const rect = event.target.getBoundingClientRect()
    const windowWidth = window.innerWidth
    
    // 计算左侧位置，如果靠右则向左偏移
    let leftPosition = rect.left - 100
    if (leftPosition + 160 > windowWidth) {
      leftPosition = windowWidth - 180
    }
    
    menuPosition.value = {
      top: `${rect.bottom + 5}px`,
      left: `${Math.max(10, leftPosition)}px`
    }
    
    // 确保该文件夹已展开
    if (props.expandedFolders && !props.expandedFolders[folderName]) {
      toggleFolder(folderName)
    }
    
    // 为菜单打开的文件夹添加特殊类
    document.querySelectorAll('.n-list-item').forEach(item => {
      item.classList.remove('menu-active')
    })
    
    if (event.target.closest('.n-list-item')) {
      event.target.closest('.n-list-item').classList.add('menu-active')
    }
  })
}

// 文件菜单相关
const showFileMenu = (folderName, fileName, event) => {
  event.stopPropagation()
  
  // 切换菜单状态：如果当前活动菜单就是这个文件的菜单，则隐藏
  const fileMenuId = `file_${folderName}_${fileName}`
  if (activeMenu.value === fileMenuId) {
    activeMenu.value = ''
    return
  }
  
  activeMenu.value = fileMenuId
  
  // 计算菜单位置
  nextTick(() => {
    const rect = event.target.getBoundingClientRect()
    const windowWidth = window.innerWidth
    
    // 计算左侧位置，如果靠右则向左偏移
    let leftPosition = rect.left - 100
    if (leftPosition + 160 > windowWidth) {
      leftPosition = windowWidth - 180
    }
    
    menuPosition.value = {
      top: `${rect.bottom + 5}px`,
      left: `${Math.max(10, leftPosition)}px`
    }
    
    // 为菜单打开的文件项添加特殊类
    document.querySelectorAll('.dzi-item').forEach(item => {
      item.classList.remove('menu-active')
    })
    
    if (event.target.closest('.dzi-item')) {
      event.target.closest('.dzi-item').classList.add('menu-active')
    }
  })
}

// 文件夹操作
const createNewFolder = (parentFolder) => {
  activeMenu.value = ''
  emit('createNewFolder', parentFolder)
}

const renameFolderModal = (folderName) => {
  activeMenu.value = ''
  emit('renameFolder', folderName)
}

const deleteFolder = (folderName) => {
  activeMenu.value = ''
  emit('deleteFolder', folderName)
}

const exportFolder = (folderName) => {
  activeMenu.value = ''
  emit('exportFolder', folderName)
}

// 一键展示所有图片功能
const handleAutoDisplayAllImages = (folderName) => {
  // 如果传入了具体文件夹名，则使用该文件夹；否则使用已选择的文件夹
  const targetFolder = folderName || props.selectedFolder;
  
  if (!targetFolder) {
    message.warning('请先选择一个文件夹');
    return;
  }
  
  // 确保文件夹展开，以便获取文件列表
  if (!props.expandedFolders[targetFolder]) {
    emit('toggleFolder', targetFolder);
  }
  
  // 获取文件夹中的图片文件
  const files = props.folderDziFiles[targetFolder] || [];
  
  // 直接使用所有文件，不再筛选特定图像格式
  const imageFiles = files;
  
  if (imageFiles.length === 0) {
    message.warning('当前文件夹无可展示的内容');
    return;
  }
  
  console.log(`一键展示文件夹 ${targetFolder} 中的图片`);
  // 发出自动展示事件，传递文件夹名和文件列表
  emit('autoDisplayImages', targetFolder, imageFiles);
}

// 录制功能
const startRecordingProcess = async () => {
  try {
    // 1. 拿屏幕视频流（只要 video，不要 audio）
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1920, height: 1080, frameRate: 30 }
    })
    // 2. 拿麦克风音频流
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: true
    })
    // 3. 合并轨道
    const mixedStream = new MediaStream([
      ...screenStream.getVideoTracks(),
      ...micStream.getAudioTracks()
    ])

    // 4. 创建 RecordRTC
    recorder = new RecordRTC(mixedStream, {
      type: 'video',
      mimeType: 'video/webm; codecs=vp8,opus',  // 用 WebM+VP8+Opus
      // 下面这两个参数保证 1080p 下画面清晰
      videoBitsPerSecond: 3_000_000,  // 3Mbps
      audioBitsPerSecond: 128_000,    // 128kbps
      frameRate: 30,
      disableLogs: true
    })

    // 5. 开始录制
    await recorder.startRecording()
    isRecording.value = true
    recordingTime.value = 0

    // 计时器（可选）
    timer = setInterval(() => {
      recordingTime.value++
    }, 1000)

    message.success('✅ 录制已开始')

    // 当用户主动停止屏幕分享时，也自动触发结束
    screenStream.getVideoTracks()[0].onended = stopRecordingProcess

  } catch (err) {
    console.error(err)
    message.error('无法开始录制: ' + err.message)
  }
}

const stopRecordingProcess = () => {
  if (!recorder) return;
  // 停掉计时器
  clearInterval(timer);
  timer = null;

  // 直接在 callback 里拿 Blob
  recorder.stopRecording(() => {
    const blob = recorder.getBlob();    // ← 这里才是真正的 Blob
    downloadBlob(blob);
    cleanup();
  });
};

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recording-${new Date().toISOString()}.webm`;
  a.click();
  URL.revokeObjectURL(url);
  message.success('✅ 录制完成，视频已下载');
}

function cleanup() {
  isRecording.value = false;
  recorder = null;
}

const toggleRecording = () => {
  if (isRecording.value) stopRecordingProcess()
  else startRecordingProcess()
}

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 保存多视图为高清图片
const saveMultiView = async () => {
  const viewerContainer = document.querySelector('.viewer-container');
  if (!viewerContainer) return;
  
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
    const titleBars = viewerContainer.querySelectorAll('.image-title-bar');
    const closeBtns = viewerContainer.querySelectorAll('.close-image-wrapper');
    const placeholders = viewerContainer.querySelectorAll('.placeholder .empty-state-content');
    const annotationToggles = viewerContainer.querySelectorAll('.annotation-toggle');
    
    // OpenSeadragon导航控件
    const osdControls = document.querySelectorAll('.openseadragon-container .openseadragon-controls');
    const osdNavControls = document.querySelectorAll('.openseadragon-container .openseadragon-container .openseadragon-navigator');
    const osdButtons = document.querySelectorAll('.openseadragon-container button');
    
    // 被选中的查看器框
    const selectedViewers = viewerContainer.querySelectorAll('.selected-viewer');
    
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
    const viewerWrappers = viewerContainer.querySelectorAll('.viewer-wrapper');
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
    const canvas = await html2canvas(viewerContainer, {
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

// 获取文件类型样式
const getFileClass = (fileName) => {
  if (!fileName) return '';
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  // 图片文件类型
  if (['jpg', 'jpeg', 'png', 'gif', 'tiff', 'tif', 'bmp', 'svg'].includes(extension)) {
    return 'image';
  }
  
  // DZI格式
  if (extension === 'dzi' || fileName.includes('.dzi')) {
    return 'dzi';

  }
  
  return '';
}

// 关闭点击文档时所有菜单
const closeAllMenus = (e) => {
  // 如果点击的不是菜单本身和菜单按钮，则关闭所有菜单
  const isMenuClicked = e.target.closest('.folder-action-menu') || 
                        e.target.closest('.file-menu');
                        
  // 如果是在菜单中点击，也要关闭菜单（执行操作后）
  if (activeMenu.value) {
    activeMenu.value = '';
    document.querySelectorAll('.n-list-item, .dzi-item').forEach(item => {
      item.classList.remove('menu-active');
    });
    
    // 如果是在菜单中点击，阻止事件继续传播，避免重复触发
    if (isMenuClicked) {
      e.stopPropagation();
    }
  }
}

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  // 如果收起，则将宽度设置为collapsed-width，否则设置为width
  const targetWidth = isCollapsed.value ? 64 : 320;
  const targetMinWidth = isCollapsed.value ? 64 : 320;
  const targetFlex = isCollapsed.value ? '0 0 64px !important' : '0 0 320px !important';

  // 使用nextTick确保样式更新
  nextTick(() => {
    const sider = document.querySelector('.file-sider');
    if (sider) {
      sider.style.width = `${targetWidth}px !important`;
      sider.style.minWidth = `${targetMinWidth}px !important`;
      sider.style.flex = targetFlex;
      
      // 添加或移除collapsed类
      if (isCollapsed.value) {
        sider.classList.add('collapsed');
      } else {
        sider.classList.remove('collapsed');
      }
      
      // 触发窗口resize事件，让其他组件可能的布局调整
      window.dispatchEvent(new Event('resize'));
    }
  });
};

// 添加全局点击监听
// 删除不再需要的watch函数

// 移除折叠相关事件处理函数
// 移除handleSidebarCollapse和handleSidebarExpand函数

// 在脚本最后添加onUnmounted钩子
onUnmounted(() => {
  // 移除事件监听器
  document.removeEventListener('click', closeAllMenus)
})

// 组件加载时立即添加全局点击监听器
document.addEventListener('click', closeAllMenus)
</script>

<style scoped>
.file-sider {
  background: #f7f9fc;
  box-shadow: 2px 0 12px rgba(0,0,0,0.08);
  border-right: 1px solid rgba(0,0,0,0.06);
  position: relative;
  z-index: 5;
  transition: all 0.3s ease;
  overflow-x: hidden; /* 防止横向滚动 */
  padding-right: 0; /* 移除右侧内边距 */
}

.sidebar-header {
  padding: 12px 16px;
  text-align: right;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 添加收起按钮样式 */
.collapse-btn {
  margin-right: auto; /* 将按钮推到左侧 */
  background: rgba(24, 144, 255, 0.08) !important;
  color: #1890ff !important;
  transition: all 0.2s ease !important;
}

.collapse-btn:hover {
  background: rgba(24, 144, 255, 0.15) !important;
  box-shadow: 0 2px 5px rgba(24, 144, 255, 0.25) !important;
}

/* 折叠状态下的侧边栏样式 */
:deep(.n-layout-sider.collapsed) {
  width: 64px !important;
  min-width: 64px !important;
  flex: 0 0 64px !important;
}

/* 折叠状态下的侧边栏头部样式 */
:deep(.n-layout-sider.collapsed) .sidebar-header {
  justify-content: center;
  padding: 12px 0;
}

/* 收起状态下文件列表的样式 */
:deep(.n-layout-sider.collapsed) .file-list {
  display: none;
}

/* 修复文件列表容器的样式，使内容有足够空间 */
.file-list {
  padding: 16px 12px 16px 16px; /* 左右内边距调整 */
  width: 100%;
  overflow-y: auto;
  max-height: calc(100vh - 64px);
  scrollbar-width: thin;
  overflow-x: hidden; /* 确保没有横向滚动 */
  box-sizing: border-box;
}

.file-list::-webkit-scrollbar {
  width: 4px;
}

.file-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.file-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* 优化n-list-item列表项布局 */
:deep(.n-list-item) {
  background: #ffffff;
  border-radius: 10px;
  margin-bottom: 12px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible !important;
  border: 1px solid rgba(0,0,0,0.04);
  position: relative;
  z-index: 1;
  padding: 0;
  box-sizing: border-box;
  width: 100%;
  max-width: 310px; /* 确保不会超出侧边栏宽度 */
  margin-left: auto;
  margin-right: auto;
}

:deep(.n-list-item:hover) {
  box-shadow: 0 6px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
  z-index: 5;
}

:deep(.n-list-item.selected) {
  background: rgba(24, 144, 255, 0.05);
  border-left: 4px solid #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
  padding-left: 12px; /* 补偿border-left的宽度 */
}

:deep(.n-list-item.folder-expanded) {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  z-index: 5;
  background: linear-gradient(to right, rgba(24, 144, 255, 0.05), rgba(24, 144, 255, 0.02));
}

/* 菜单显示时提高z-index */
:deep(.n-list-item.menu-active) {
  z-index: 10;
  box-shadow: 0 10px 24px rgba(24, 144, 255, 0.15);
}

.folder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  position: relative;
  padding: 12px 10px 12px 16px; /* 进一步调整右侧内边距 */
  border-radius: 6px;
  transition: all 0.25s ease;
  overflow: hidden; /* 确保内容不会溢出 */
  box-sizing: border-box; /* 确保padding不增加宽度 */
}

.folder-item:hover {
  background-color: rgba(24, 144, 255, 0.05);
}

.folder-name-container {
  flex: 1;
  min-width: 0; /* 确保可以被压缩 */
  padding-right: 8px; /* 减少右侧内边距 */
  overflow: hidden; /* 确保内容不会溢出 */
  max-width: calc(100% - 80px); /* 调整为更合适的宽度 */
}

.folder-name {
  cursor: pointer;
  font-weight: 600;
  width: 100%; /* 使用父容器的宽度 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block; /* 改为块级元素填充容器 */
  color: #1a2b4b;
  padding-left: 5px; /* 减小左侧padding */
  position: relative;
  transition: all 0.2s ease;
  box-sizing: border-box; /* 确保padding不增加宽度 */
  margin-right: 0; /* 移除右侧边距 */
}

/* 添加文件夹展开指示器 */
.folder-expanded .folder-name::after {
  content: '';
  position: absolute;
  right: -15px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background-color: #1890ff;
  border-radius: 50%;
}

/* 按钮操作区 */
.toggle-actions {
  display: flex;
  align-items: center;
  gap: 15px; /* 增加按钮之间的间距 */
  flex-shrink: 0; /* 确保按钮组不被压缩 */
  position: relative;
  z-index: 10;
  min-width: 50px; /* 确保有足够空间 */
  padding-right: 5px; /* 略微调整右侧内边距 */
  margin-left: auto; /* 确保按钮靠右对齐 */
}

/* 调整按钮大小，确保完全显示 */
.toggle-folder-btn {
  border: none !important;
  background: rgba(24, 144, 255, 0.08) !important;
  color: #1890ff !important;
  transition: all 0.2s ease !important;
  width: 32px !important; 
  height: 32px !important; 
  border-radius: 6px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  flex-shrink: 0;
}

.toggle-folder-btn:hover {
  background: rgba(24, 144, 255, 0.15) !important;
  /* 移除这个向下移动的效果 */
  /* transform: translateY(-1px); */
}

.toggle-folder-btn.expanded {
  background: rgba(24, 144, 255, 0.2) !important;
  color: #1890ff !important;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.2);
}

.action-menu-btn {
  background: rgba(0, 0, 0, 0.04);
  border: none;
  cursor: pointer;
  font-size: 16px;
  width: 32px; 
  height: 32px; 
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c9bab;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.action-menu-btn:hover {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
  /* 移除这个向下移动的效果 */
  /* transform: translateY(-1px); */
}

/* 为所有按钮添加更好的悬浮效果，不影响位置 */
.toggle-folder-btn:hover, .action-menu-btn:hover {
  box-shadow: 0 2px 5px rgba(24, 144, 255, 0.25);
}

/* 优化文件项的样式 */
.dzi-item {
  cursor: pointer;
  padding: 10px 8px 10px 14px; /* 右侧减少内边距 */
  transition: all 0.25s ease;
  border-radius: 8px;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  overflow: hidden; /* 确保内容不会溢出 */
  width: 100%; /* 使用全宽 */
  box-sizing: border-box; /* 确保padding不增加宽度 */
}

.dzi-item:hover {
  background: rgba(24, 144, 255, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.dzi-item:last-child {
  margin-bottom: 0;
}

/* 文件项样式修改 - 删除图标并定格文本 */
.file-name {
  flex: 1;
  padding-right: 40px; /* 为右侧操作按钮预留空间 */
  padding-left: 5px; /* 减小左侧内边距，定格与文件夹名对齐 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: calc(100% - 40px); /* 考虑按钮宽度 */
  display: block; /* 改为块级元素 */
  font-size: 14px;
  color: #4a5568;
  transition: all 0.2s ease;
  position: relative;
  box-sizing: border-box; /* 确保padding不增加宽度 */
  max-width: none; /* 覆盖之前的限制 */
  margin-right: 0; /* 移除右侧边距 */
}

/* 文件操作按钮位置调整 */
.file-action-btn {
  opacity: 0.5;
  transition: opacity 0.2s ease;
  position: absolute; /* 绝对定位，不影响文本布局 */
  right: 8px; /* 再调整与父元素右侧的间距 */
  top: 50%; /* 垂直居中 */
  transform: translateY(-50%); /* 垂直居中 */
}

/* 添加一些额外的优化 */
:deep(.n-layout-sider-toggle-button) {
  width: 24px !important;
  height: 40px !important;
  background-color: #f7f9fc !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08) !important;
  border-radius: 0 4px 4px 0 !important;
  z-index: 100 !important; /* 确保始终可见 */
}

/* 增强长名称显示 */
.folder-name {
  position: relative;
  word-break: keep-all; /* 防止单词被截断 */
  user-select: none; /* 防止文本被选中，提高用户体验 */
}

/* 增强视觉分隔 - 这部分样式已合并到上面 */

/* 添加文件图标 */
.file-name::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%234a5568" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>') no-repeat center center;
}

/* 特定文件类型图标 */
.file-name.image::before {
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%234a5568" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>') no-repeat center center;
}

.file-name.dzi::before {
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%231890ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon><line x1="12" y1="22" x2="12" y2="15.5"></line><polyline points="22 8.5 12 15.5 2 8.5"></polyline></svg>') no-repeat center center;
}

/* 文件夹和文件操作菜单样式 */
.folder-action-menu,
.file-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  z-index: 100;
  min-width: 160px;
  animation: fadeIn 0.2s ease-out;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.menu-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-item i {
  font-size: 14px;
  color: #1890ff;
}

.menu-item:hover {
  background-color: rgba(24, 144, 255, 0.05);
  color: #1890ff;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 添加空文件夹样式 */
.empty-folder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  color: #8c9bab;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  min-height: 120px;
}

.empty-folder .n-icon {
  color: #d9e1f2;
  margin-bottom: 8px;
}

.empty-folder span {
  margin-bottom: 12px;
}

/* 加载状态样式 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 12px;
  color: #8c9bab;
}

/* 改进文件列表滚动 */
/* 调整文件项列表容器 */
.dzi-file-list {
  margin-top: 4px;
  padding: 8px 8px 8px 10px; /* 调整左侧内边距 */
  background: #f9fafc;
  border-top: 1px solid rgba(0,0,0,0.04);
  position: relative;
  z-index: 1;
  animation: slideDown 0.3s ease-out;
  max-height: 300px;
  overflow-y: auto;
  overflow-x: hidden; /* 防止横向滚动 */
  scrollbar-width: thin;
  width: 100%; /* 使用全宽 */
  box-sizing: border-box;
}

.dzi-file-list::-webkit-scrollbar {
  width: 4px;
}

.dzi-file-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.dzi-file-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* 添加文件操作效果 */
.dzi-item {
  cursor: pointer;
  padding: 10px 8px 10px 5px; /* 调整左侧内边距与文件夹对齐 */
  transition: all 0.25s ease;
  border-radius: 8px;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  overflow: hidden; /* 确保内容不会溢出 */
  width: 100%; /* 使用全宽 */
  box-sizing: border-box; /* 确保padding不增加宽度 */
}

/* 恢复hover效果 */
.dzi-item:hover {
  background: rgba(24, 144, 255, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

/* 恢复最后一个item的margin */
.dzi-item:last-child {
  margin-bottom: 0;
}

/* 选中文件样式 */
.dzi-item.selected {
  background: rgba(24, 144, 255, 0.1);
  border-left: 3px solid #1890ff;
  padding-left: 5px; /* 保持与其他项左侧对齐 */
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

/* 悬浮时显示操作按钮 */
.file-action-btn {
  opacity: 0.5;
  transition: opacity 0.2s ease;
  position: absolute; /* 绝对定位，不影响文本布局 */
  right: 8px; /* 再调整与父元素右侧的间距 */
  top: 50%; /* 垂直居中 */
  transform: translateY(-50%); /* 垂直居中 */
}

.dzi-item:hover .file-action-btn {
  opacity: 1;
}

/* 空文件列表状态 */
.empty-explorer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  height: 300px;
}

.empty-explorer .n-icon {
  color: #d9e1f2;
  margin-bottom: 16px;
}

.empty-explorer h3 {
  font-size: 16px;
  margin: 0 0 8px 0;
  color: #4a5568;
  font-weight: 600;
}

.empty-explorer p {
  margin: 0 0 20px 0;
  color: #8c9bab;
  font-size: 14px;
}

/* 清理重复样式，保留正确的展开按钮样式 */
/* 删除旧的、重复的收起按钮样式 */
/* 确保收起后展开按钮可见 */
:deep(.n-layout-sider-collapsed .n-layout-toggle-button) {
  display: none !important; /* 隐藏按钮，因为我们不再需要折叠功能 */
}

/* 修复侧边栏CSS，去除收起相关样式 */
:deep(.n-layout-sider) {
  max-width: 320px !important;
  min-width: 320px !important;
  width: 320px !important;
  flex: 0 0 320px !important;
  z-index: 100 !important;
}

/* 补充重要的样式 */
/* 确保收起后展开按钮可见 - 已不需要 */
:deep(.n-layout-sider-collapsed .n-layout-toggle-button) {
  display: none !important; /* 隐藏按钮，因为我们不再需要折叠功能 */
}

:deep(.n-layout-sider-collapsed .n-layout-toggle-bar) {
  display: none !important; /* 隐藏按钮容器 */
}

/* 设置收起状态宽度 - 不再需要 */
:deep(.n-layout-sider-collapsed) {
  width: 320px !important; /* 保持与正常状态一致 */
  min-width: 320px !important;
  overflow: visible !important;
}

/* 删除文件夹图标，使文本靠左 */
.folder-name {
  cursor: pointer;
  font-weight: 600;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  color: #1a2b4b;
  padding-left: 5px; /* 减小左侧padding */
  position: relative;
  transition: all 0.2s ease;
  box-sizing: border-box;
  margin-right: 0;
}

/* 移除文件夹图标 */
.folder-name::before {
  display: none; /* 隐藏图标 */
}

/* 确保侧边栏内容容器正确显示 */
:deep(.n-layout-sider-content) {
  overflow-x: hidden !important; /* 强制隐藏横向滚动条 */
  width: 100%; /* 使用全宽 */
  padding-right: 0; /* 移除右侧内边距，避免重复设置 */
}

/* 改善列表项的缩进和边距 */
:deep(.n-list-item__main) {
  overflow: hidden !important; /* 强制隐藏溢出内容 */
  width: 100%; /* 使用全宽 */
  padding: 0; /* 移除内边距 */
  margin: 0; /* 移除外边距 */
}

/* 当文件项的菜单激活时应用的样式 */
.dzi-item.menu-active {
  z-index: 10;
  box-shadow: 0 3px 10px rgba(24, 144, 255, 0.2);
  background: rgba(24, 144, 255, 0.05);
}

/* 修复文件图标 */
.file-name::before {
  display: none; /* 同样移除文件图标 */
}

/* 确保文件图标不显示 */
.file-name::before, 
.file-name.image::before, 
.file-name.dzi::before {
  display: none !important; /* 强制隐藏所有类型的图标 */
}

</style> 
