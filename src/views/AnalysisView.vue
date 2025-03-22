<template>
  <n-layout class="layout">
    <!-- 顶部导航栏 -->
    <n-layout-header class="header">
      <div class="header-content">
        <div class="logo">多免疫组化病理图像智能分析系统</div>
        <div class="controls">
          <n-button-group>
            <n-button 
              v-for="num in [1, 2, 4, 9]" 
              :key="num"
              @click="changeLayout(num)"
              :type="layoutType === num ? 'primary' : 'default'"
            >
              {{ num }}图模式
            </n-button>
          </n-button-group>
          <!-- 同步按钮 -->
          <n-button @click="toggleSync" :type="syncEnabled ? 'primary' : 'default'" class="sync-btn">
            同步：{{ syncEnabled ? '开启' : '关闭' }}
          </n-button>
          <!-- 配准按钮 -->
          <n-button @click="openRegistrationModal" type="primary" class="registration-btn">
            配准
          </n-button>
        </div>

        <!-- 状态栏：显示上传或配准状态，只有 visible 为 true 时显示 -->
        <div class="status-bar" v-if="statusBar.visible">
          <span>
            {{ statusBar.folder }} 
            {{
              statusBar.operation === 'upload'
                ? (statusBar.finished ? '上传完毕' : '正在上传中...')
                : (statusBar.finished ? '配准完毕' : '正在配准中...')
            }}
            ，已用时：{{ statusBar.elapsed }} 秒
          </span>
          <!-- 只有在 finished（成功或失败）后才显示关闭按钮 -->
          <button v-if="statusBar.finished" @click="closeStatusBar" class="close-status-btn">×</button>
        </div>

        <div class="user-info">
          <!-- 上传文件夹 -->
          <div class="folder-upload">
            <label class="folder-upload-label">
              <input type="file" webkitdirectory multiple @change="handleFolderAndUpload" class="folder-input" />
              <span class="folder-upload-button">上传</span>
            </label>
          </div>
          <n-dropdown :options="userOptions" @select="handleUserAction">
            <n-button text class="user-welcome">
              Welcome, {{ username }}
              <n-icon><DownOutlined /></n-icon>
            </n-button>
          </n-dropdown>
        </div>
      </div>
    </n-layout-header>

    <!-- 主体区域：左侧为文件目录列表，右侧为图像展示区域 -->
    <n-layout has-sider class="content-wrapper">
      <!-- 侧边栏：文件目录列表 -->
      <n-layout-sider
        collapsible
        :width="280"
        :collapsed-width="0"
        show-trigger
        class="file-sider"
      >
        <div class="sidebar-header">
          <n-button circle type="primary" size="small" @click="fetchFileList">
            <n-icon><ReloadOutlined /></n-icon>
          </n-button>
        </div>
        <n-list class="file-list" hoverable>
          <n-list-item 
            v-for="item in fileList" 
            :key="item.folderName"
            :class="{ 'selected': selectedFolder === item.folderName }"
          >
            <div class="folder-item">
              <span @click="toggleFolder(item.folderName)" class="folder-name">
                {{ item.folderName }}
              </span>
              <div class="toggle-actions">
                <n-button 
                  size="small" 
                  class="toggle-folder-btn" 
                  @click.stop="toggleFolder(item.folderName)"
                >
                  <n-icon :component="expandedFolders[item.folderName] ? UpOutlined : DownOutlined" />
                </n-button>
                <div class="action-menu-container">
                  <button class="action-menu-btn" @click.stop="toggleActionMenu(item.folderName)">
                    <n-icon :component="EllipsisOutlined" />
                  </button>
                  <div v-if="actionMenuVisible[item.folderName]" class="action-menu-dropdown">
                    <ul>
                      <li @click="deleteFolder(item.folderName)">删除</li>
                      <li @click="resultFolderIHC(item.folderName)">查询分析结果</li>
                      <!-- 预留其它选项 -->
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <!-- 二级菜单：显示展开后的文件和子文件夹 -->
            <div v-if="expandedFolders[item.folderName]" class="dzi-file-list">
              <n-list-item 
                v-for="subItem in folderDziFiles[item.folderName] || []" 
                :key="subItem.name"
                class="dzi-item file-item"
              >
                <span class="file-name" @click="selectDziItem(item.folderName, subItem)">
                  {{ subItem.name }}
                </span>
                <!-- 文件操作菜单按钮 -->
                <div class="file-action-menu-container">
                  <button class="file-action-menu-btn" @click.stop="toggleFileActionMenu(item.folderName, subItem.name)">
                    <n-icon :component="EllipsisOutlined" />
                  </button>
                  <div v-if="fileActionMenuVisible[item.folderName] && fileActionMenuVisible[item.folderName][subItem.name]" class="file-action-menu-dropdown">
                    <ul>
                      <li @click="deleteFile(item.folderName, subItem.name)">删除</li>
                      <li @click="IHCanalysis(item.folderName, subItem.name)">免疫组化分析</li>
                      <li @click="resultFileIHC(item.folderName, subItem.name)">查询分析结果</li>
                      <!-- 预留其它选项 -->
                    </ul>
                  </div>
                </div>
              </n-list-item>
            </div>
          </n-list-item>
        </n-list>
      </n-layout-sider>

      <!-- 展示区域：支持1/2/4/9图模式 -->
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
      </n-layout-content>
    </n-layout>

    <div v-if="registrationModalVisible" class="custom-modal-overlay">
      <div class="custom-modal-box">
        <div class="modal-header">
          <span class="modal-title">选择文件夹进行配准</span>
          <button class="modal-close-btn" @click="registrationModalVisible = false">×</button>
        </div>
        <div class="modal-body">
          <ul class="folder-list">
            <li 
              v-for="folder in registrationFolderList" 
              :key="folder.folderName"
              :class="{ selected: selectedRegistrationFolder === folder.folderName }"
              @click="selectedRegistrationFolder = folder.folderName"
            >
              {{ folder.folderName }}
            </li>
          </ul>
        </div>
        <div class="modal-footer">
          <button class="modal-btn primary" @click="startRegistration" :disabled="!selectedRegistrationFolder">配准</button>
          <button class="modal-btn" @click="registrationModalVisible = false">关闭</button>
        </div>
      </div>
    </div>
  </n-layout>

  <!-- 全局 tooltip，用于显示当前展示框加载的文件名称 -->
  <div
    v-if="tooltip.visible"
    class="file-name-tooltip"
    :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
  >
    {{ tooltip.text }}
  </div>
  <!-- 结果弹窗 -->
  <div v-if="resultModalVisible" class="result-modal-overlay">
    <div class="result-modal-box">
      <div class="result-modal-header">
        <span>{{ resultModalTitle }}</span>
        <button class="result-modal-close-btn" @click="resultModalVisible = false">×</button>
      </div>
      <div class="result-modal-body">
        <!-- 如果结果是数组，则以表格形式展示 -->
        <div v-if="Array.isArray(resultModalContent)">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>文件夹</th>
                <th>图片名称</th>
                <th>正染区域</th>
                <th>总像素</th>
                <th>正染比例</th>
                <th>上传时间</th>
                <th>分析时间</th>
                <th>操作人</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in resultModalContent" :key="index">
                <td>{{ item.id }}</td>
                <td>{{ item.foldername }}</td>
                <td>{{ item.imageName }}</td>
                <td>{{ item.positiveArea }}</td>
                <td>{{ item.totalArea }}</td>
                <td>{{ item.positiveRatio + '%' }}</td>
                <td>{{ item.uploadsDate }}</td>
                <td>{{ item.analysisDate }}</td>
                <td>{{ item.userName }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 如果结果是对象，则展示单个结果 -->
        <div v-else-if="typeof resultModalContent === 'object' && resultModalContent !== null">
          <table>
            <tbody>
              <tr>
                <td>ID</td>
                <td>{{ resultModalContent.id }}</td>
              </tr>
              <tr>
                <td>图片名称</td>
                <td>{{ resultModalContent.imageName }}</td>
              </tr>
              <tr>
                <td>正染区域</td>
                <td>{{ resultModalContent.positiveArea }}</td>
              </tr>
              <tr>
                <td>总像素</td>
                <td>{{ resultModalContent.totalArea }}</td>
              </tr>
              <tr>
                <td>正染比例</td>
                <td>{{ resultModalContent.positiveRatio + '%'}}</td>
              </tr>
              <tr>
                <td>上传时间</td>
                <td>{{ resultModalContent.uploadsDate }}</td>
              </tr>
              <tr>
                <td>分析时间</td>
                <td>{{ resultModalContent.analysisDate }}</td>
              </tr>
              <tr>
                <td>操作人</td>
                <td>{{ resultModalContent.userName }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 否则直接展示文本信息 -->
        <div v-else>
          <p>{{ resultModalContent }}</p>
        </div>
      </div>
    </div>
  </div>

</template>

<script setup>
import { ref, onMounted, nextTick, h, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  NLayout, 
  NLayoutHeader, 
  NLayoutSider,
  NLayoutContent, 
  NButton, 
  NButtonGroup,
  NDropdown, 
  NIcon, 
  NList, 
  NListItem,
  NEmpty,
  useMessage
} from 'naive-ui'
import { UserOutlined, SettingOutlined, LogoutOutlined, ReloadOutlined, DownOutlined, UpOutlined, EllipsisOutlined  } from '@vicons/antd'
import OpenSeadragon from 'openseadragon'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const message = useMessage()

// 布局、文件列表及展示相关变量
const layoutType = ref(1)
const fileList = ref([])
const selectedFolder = ref("")
const selectedViewerIndex = ref(null)
const viewers = ref([])

// 用于记录各展示框加载的文件名称
const viewerFileNames = ref([])

// 全局 tooltip 数据
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  text: ''
})

// 自定义配准弹出框相关变量
const registrationModalVisible = ref(false)
const registrationFolderList = ref([])  // 接口返回的数据数组，每项为 { folderName, fileNames }
const selectedRegistrationFolder = ref(null)

// 管理侧边栏展开状态与子文件列表
const expandedFolders = ref({})
const folderDziFiles = ref({})

// 新增用于记录每个文件夹操作菜单显示状态的对象
const actionMenuVisible = ref({})

const userStore = useUserStore()
const username = computed(() => userStore.username || 'Guest')

// 切换操作菜单的显示状态
const toggleActionMenu = (folderName) => {
  actionMenuVisible.value[folderName] = !actionMenuVisible.value[folderName]
}

const deleteFolder = async (folderName) => {
  if (!confirm(`确定删除文件夹 "${folderName}" 吗？删除后将不可恢复`)) return;
  try {
    const res = await fetch(`/api/dzi/deleteFolder/${folderName}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      message.success(`删除文件夹 "${folderName}" 成功`);
      // 删除成功后从一级菜单中移除该文件夹
      fileList.value = fileList.value.filter(item => item.folderName !== folderName);
    } else {
      message.error(`删除文件夹 "${folderName}" 失败`);
    }
  } catch (error) {
    console.error("删除文件夹错误", error);
    message.error("删除文件夹过程中出现错误");
  }
}

const fileActionMenuVisible = ref({})

// 切换文件项操作菜单显示状态
const toggleFileActionMenu = (folderName, fileName) => {
  if (!fileActionMenuVisible.value[folderName]) {
    fileActionMenuVisible.value[folderName] = {}
  }
  fileActionMenuVisible.value[folderName][fileName] = !fileActionMenuVisible.value[folderName][fileName]
}

// 删除文件的逻辑
const deleteFile = async (folderName, fileName) => {
  if (!confirm(`确定删除文件 "${fileName}" 吗？`)) return
  try {
    const res = await fetch(`/api/dzi/delete/${folderName}/${fileName}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      message.success(`删除文件 "${fileName}" 成功`)
      // 删除成功后从当前文件列表中移除该文件
      if (folderDziFiles.value[folderName]) {
        folderDziFiles.value[folderName] = folderDziFiles.value[folderName].filter(item => item.name !== fileName)
      }
    } else {
      message.error(`删除文件失败`)
    }
  } catch (error) {
    console.error("删除文件错误", error)
    message.error("删除过程中出现错误")
  } finally {
    if (fileActionMenuVisible.value[folderName]) {
      fileActionMenuVisible.value[folderName][fileName] = false
    }
  }
}

// 免疫组化分析
const IHCanalysis = async (folderName, fileName) => {
  console.log(`开始对文件夹 ${folderName} 中的文件 ${fileName} 进行免疫组化分析`);
  const url = `/api/ihc/analyze?folderName=${encodeURIComponent(folderName)}&fileName=${encodeURIComponent(fileName)}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`请求失败，状态码：${response.status}`);
    }
    const result = await response.json();
    console.log('分析结果：', result);
    return result;
  } catch (error) {
    console.error('分析过程中发生错误：', error);
    throw error;
  }
};


const toggleFolder = async (folderName) => {
  if (expandedFolders.value[folderName]) {
    expandedFolders.value[folderName] = false;
  } else {
    if (!folderDziFiles.value[folderName]) {
      try {
        const res = await fetch(`/api/dzi/list/${folderName}`);
        const data = await res.json();
        folderDziFiles.value[folderName] = data;
      } catch (error) {
        console.error("获取文件夹内容失败:", error);
        message.error("获取文件列表失败");
      }
    }
    expandedFolders.value[folderName] = true;
  }
}

// 选择子项（第二级目录或文件）时，调用 getDziFile 接口加载资源，并记录文件名称
const selectDziItem = (parentFolder, item) => {
  const url = `/api/dzi/processed/${parentFolder}/${item.name}/`;
  updateViewerDziUrl(url, item.name);
}

// 用户下拉菜单选项
const userOptions = [
  {
    label: '个人设置',
    key: 'settings',
    icon: () => h(NIcon, null, { default: () => h(SettingOutlined) })
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: () => h(NIcon, null, { default: () => h(LogoutOutlined) })
  }
]

// 处理用户菜单操作
const handleUserAction = (key) => {
  if (key === 'logout') {
    router.push('/')
  }
}

// 切换布局模式
const changeLayout = (num) => {
  layoutType.value = num
  selectedViewerIndex.value = null
  viewers.value.forEach(v => v && v.destroy())
  viewers.value = []
  viewerFileNames.value = []
  if (selectedFolder.value) initViewers()
}

// 切换同步功能
const syncEnabled = ref(true)
const toggleSync = () => {
  syncEnabled.value = !syncEnabled.value
  message.info(`图像同步已${syncEnabled.value ? '开启' : '关闭'}`)
  if (syncEnabled.value) {
    setupSync()
  }
}

// 状态栏相关状态，由上传和配准共用
const statusBar = ref({
  visible: false,
  folder: "",
  operation: "", // "upload" 或 "register"
  message: "",
  startTime: 0,
  elapsed: 0,
  finished: false,
  error: false
})
let statusTimer = null

const startStatusTimer = () => {
  statusTimer = setInterval(() => {
    statusBar.value.elapsed = Math.floor((Date.now() - statusBar.value.startTime) / 1000)
  }, 1000)
}

const stopStatusTimer = () => {
  if (statusTimer) {
    clearInterval(statusTimer)
    statusTimer = null
  }
}

const closeStatusBar = () => {
  statusBar.value.visible = false
  statusBar.value.finished = false
  statusBar.value.error = false
  statusBar.value.elapsed = 0
}

// 文件夹上传处理
const selectedFolderFiles = ref([])
const handleFolderAndUpload = (event) => {
  selectedFolderFiles.value = Array.from(event.target.files)
  if (selectedFolderFiles.value.length > 0) {
    message.success(`已选择 ${selectedFolderFiles.value.length} 个文件`)
    uploadFolder()
  }
}
const uploadFolder = async () => {
  if (selectedFolderFiles.value.length === 0) {
    message.warning("请先选择一个文件夹")
    return
  }
  // 从第一个文件中提取文件夹名称
  let folderName = ""
  const firstFilePath = selectedFolderFiles.value[0].webkitRelativePath
  if (firstFilePath && firstFilePath.indexOf("/") !== -1) {
    folderName = firstFilePath.substring(0, firstFilePath.indexOf("/"))
  }
  // 初始化状态栏（上传）
  statusBar.value = {
    visible: true,
    folder: folderName,
    operation: "upload",
    message: "正在上传中...",
    startTime: Date.now(),
    elapsed: 0,
    finished: false,
    error: false
  }
  startStatusTimer()
  
  const formData = new FormData()
  selectedFolderFiles.value.forEach(file => {
    formData.append('files', file, file.webkitRelativePath)
  })
  try {
    const response = await fetch("/api/svs/upload", {
      method: 'POST',
      body: formData
    })
    if (response.ok) {
      statusBar.value.message = "上传完毕"
      statusBar.value.finished = true
      stopStatusTimer()
      message.success("文件夹上传成功")
    } else {
      statusBar.value.message = "上传失败"
      statusBar.value.finished = true
      statusBar.value.error = true
      stopStatusTimer()
      message.error("文件夹上传失败")
    }
  } catch (error) {
    console.error("上传错误：", error)
    statusBar.value.message = "上传失败"
    statusBar.value.finished = true
    statusBar.value.error = true
    stopStatusTimer()
    message.error("上传过程中出现错误")
  }
}

// 拉取一级文件夹列表（以日期命名）
const fetchFileList = async () => {
  try {
    const res = await fetch('/api/dzi/list')
    fileList.value = await res.json()
  } catch (error) {
    console.error('获取文件列表失败:', error)
    message.error("获取文件列表失败")
  }
}

// 更新当前选中 viewer 的 DZI URL，同时记录文件名称
const updateViewerDziUrl = (url, fileName) => {
  if (selectedViewerIndex.value === null) {
    message.warning('请先点击一个展示框进行选择')
    return
  }
  if (viewers.value[selectedViewerIndex.value]) {
    viewers.value[selectedViewerIndex.value].destroy()
  }
  viewerFileNames.value[selectedViewerIndex.value] = fileName
  viewers.value[selectedViewerIndex.value] = OpenSeadragon({
    id: `osdViewer-${selectedViewerIndex.value}`,
    prefixUrl: 'http://localhost:8080/openseadragon-bin/images/',
    tileSources: {
      Image: {
        xmlns: "http://schemas.microsoft.com/deepzoom/2008",
        Url: url,
        Overlap: "1",
        TileSize: "254",
        Format: "jpeg",
        Size: { Height: "32893", Width: "46000" }
      }
    },
    gestureSettingsMouse: {
      scrollToZoom: true
    },
    showNavigator: true,
    fullscreen: false
  })
  if (syncEnabled.value) setupSync()
}

// 初始化所有展示框（各个 viewer 默认无内容）
const initViewers = () => {
  viewers.value.forEach(v => v && v.destroy())
  viewers.value = []
  nextTick(() => {
    for (let i = 0; i < layoutType.value; i++) {
      viewers.value.push(null)
    }
  })
}

// 设置同步事件：添加 zoom 和 pan 事件处理器
let isSyncing = false
const setupSync = () => {
  viewers.value.forEach((viewer, idx) => {
    if (viewer && !viewer._syncHandlersBound) {
      viewer.addHandler('zoom', () => {
        if (syncEnabled.value && !isSyncing) {
          isSyncing = true
          const zoom = viewer.viewport.getZoom()
          console.log(`Viewer ${idx} zoom event: zoom=${zoom}`)
          viewers.value.forEach((v) => {
            if (v !== viewer && v) {
              v.viewport.zoomTo(zoom)
            }
          })
          isSyncing = false
        }
      })
      viewer.addHandler('pan', () => {
        if (syncEnabled.value && !isSyncing) {
          isSyncing = true
          const center = viewer.viewport.getCenter()
          console.log(`Viewer ${idx} pan event: center=(${center.x.toFixed(3)}, ${center.y.toFixed(3)})`)
          viewers.value.forEach((v) => {
            if (v !== viewer && v) {
              v.viewport.panTo(center)
            }
          })
          isSyncing = false
        }
      })
      viewer._syncHandlersBound = true
    }
  })
}

// 鼠标事件处理函数，用于 tooltip 显示文件名称
const handleMouseEnter = (index, event) => {
  if (viewerFileNames.value[index]) {
    tooltip.value.text = viewerFileNames.value[index]
    tooltip.value.visible = true
  }
}

const handleMouseMove = (index, event) => {
  tooltip.value.x = event.clientX + 10
  tooltip.value.y = event.clientY + 10
}

const handleMouseLeave = (index) => {
  tooltip.value.visible = false
}

// 点击 viewer-wrapper 选择展示区域
const selectViewer = (index) => {
  selectedViewerIndex.value = index
}

// 判断某个 viewer 是否已加载图像
const hasDzi = (index) => {
  return viewers.value[index] !== null
}

// 打开配准弹出框并调用接口拉取文件夹列表
const openRegistrationModal = async () => {
  registrationModalVisible.value = true
  selectedRegistrationFolder.value = null
  try {
    const res = await fetch("/api/svs/list")
    const result = await res.json()
    registrationFolderList.value = Array.isArray(result) ? result : [result]
  } catch (error) {
    console.error("获取配准文件夹列表失败:", error)
    message.error("获取文件夹列表失败")
    registrationFolderList.value = []
  }
}

// 开始配准，调用后端接口启动配准流程
const startRegistration = async () => {
  if (!selectedRegistrationFolder.value) {
    message.warning("请选择一个文件夹")
    return
  }
  // 初始化状态栏（配准）
  statusBar.value = {
    visible: true,
    folder: selectedRegistrationFolder.value,
    operation: "register",
    message: "正在配准中...",
    startTime: Date.now(),
    elapsed: 0,
    finished: false,
    error: false
  }
  startStatusTimer()

  const username = localStorage.getItem('username') || 'Guest'
  
  try {
    const res = await fetch(`/api/svs/register/${selectedRegistrationFolder.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // 将 username 放入请求体中
      body: JSON.stringify({ username })
    })
    if (res.ok) {
      statusBar.value.message = "配准完毕"
      statusBar.value.finished = true
      stopStatusTimer()
      message.success("图像配准成功")
      registrationModalVisible.value = false
    } else {
      statusBar.value.message = "配准失败"
      statusBar.value.finished = true
      statusBar.value.error = true
      stopStatusTimer()
      message.error("图像配准失败")
    }
  } catch (error) {
    console.error("配准错误：", error)
    statusBar.value.message = "配准失败"
    statusBar.value.finished = true
    statusBar.value.error = true
    stopStatusTimer()
    message.error("图像配准过程中出现错误")
  }
}

// 新增用于结果弹窗的状态
const resultModalVisible = ref(false)
const resultModalTitle = ref('')
const resultModalContent = ref(null)

// 查询指定文件夹下所有图片的免疫组化结果
const resultFolderIHC = async (folderName) => {
  try {
    const res = await fetch(`/api/ihc/resultfolder?folderName=${encodeURIComponent(folderName)}`)
    if (res.ok) {
      const data = await res.json()
      console.log(data)
      resultModalTitle.value = `免疫组化分析结果 - 文件夹【${folderName}】`
      resultModalContent.value = data
    } else if (res.status === 404) {
      resultModalTitle.value = `免疫组化分析结果 - 文件夹【${folderName}】`
      resultModalContent.value = '未找到分析结果'
    } else {
      resultModalTitle.value = `免疫组化分析结果 - 文件夹【${folderName}】`
      resultModalContent.value = `查询失败，状态码：${res.status}`
    }
  } catch (error) {
    console.error('查询文件夹分析结果出错：', error)
    resultModalTitle.value = `免疫组化分析结果 - 文件夹【${folderName}】`
    resultModalContent.value = '查询过程中出现错误'
  } finally {
    resultModalVisible.value = true
  }
}

// 查询单个图片的免疫组化结果
const resultFileIHC = async (folderName, fileName) => {
  try {
    const res = await fetch(`/api/ihc/result?folderName=${encodeURIComponent(folderName)}&fileName=${encodeURIComponent(fileName)}`)
    if (res.ok) {
      const data = await res.json()
      resultModalTitle.value = `免疫组化分析结果 - 图片【${fileName}】`
      resultModalContent.value = data
      console.log(data)
    } else if (res.status === 404) {
      resultModalTitle.value = `免疫组化分析结果 - 图片【${fileName}】`
      resultModalContent.value = '未找到分析结果'
    } else {
      resultModalTitle.value = `免疫组化分析结果 - 图片【${fileName}】`
      resultModalContent.value = `查询失败，状态码：${res.status}`
    }
  } catch (error) {
    console.error('查询图片分析结果出错：', error)
    resultModalTitle.value = `免疫组化分析结果 - 图片【${fileName}】`
    resultModalContent.value = '查询过程中出现错误'
  } finally {
    resultModalVisible.value = true
  }
}

onMounted(() => {
  fetchFileList()
  initViewers()
})
</script>

<style scoped>
.layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  height: 64px;
  padding: 0 24px;
  background: #1890ff;
  color: white;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 18px;
  font-weight: 600;
}

.controls {
  flex: 1;
  margin: 0 40px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sync-btn {
  margin-left: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-bar {
  background: #fff;
  color: #333;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-right: 280px;
}

.close-status-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
}

.content-wrapper {
  flex: 1;
  height: calc(100vh - 64px);
  display: flex;
}

.file-sider {
  background: #fff;
  box-shadow: 2px 0 8px rgba(0,0,0,0.05);
}

.sidebar-header {
  padding: 10px;
  text-align: right;
  border-bottom: 1px solid #e8e8e8;
}

.file-list {
  padding: 12px;
}

.folder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.folder-name {
  cursor: pointer;
  font-weight: bold;
}

.dzi-file-list {
  margin-top: 8px;
  padding-left: 16px;
}

.dzi-item {
  cursor: pointer;
  padding: 4px 0;
}

.selected {
  background: #f0faff;
  border-left: 3px solid #1890ff;
}

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

.folder-upload {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 600px;
}

.folder-upload-label {
  position: relative;
  display: inline-block;
  cursor: pointer;
  background-color: #f0faff;
  padding: 8px 16px;
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-weight: 500;
  flex: 1;
  text-align: center;
  max-width: 300px;
  margin-right: 150px;
}

.folder-upload-label:hover {
  background-color: #c7edff;
}

.folder-input {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.folder-upload-button {
  pointer-events: none;
}

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

.toggle-actions {
  position: relative;
  display: inline-block;
  margin-left: 8px;
}

.action-menu-container {
  position: absolute;
  right: calc(100% + 15px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 999;
}

.action-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 10;
  min-width: 80px;
}

.action-menu-dropdown ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.action-menu-dropdown li {
  padding: 6px 12px;
  cursor: pointer;
}

.action-menu-dropdown li:hover {
  background-color: #f5f5f5;
}

.file-item {
  position: relative;
  display: flex;
  align-items: center;
}

.file-name {
  flex: 1;
  padding-right: 30px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-action-menu-container {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 999;
}

.file-action-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-action-menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 10;
  min-width: 80px;
}

.file-action-menu-dropdown ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.file-action-menu-dropdown li {
  padding: 6px 12px;
  cursor: pointer;
}

.file-action-menu-dropdown li:hover {
  background-color: #f5f5f5;
}

.action-menu-dropdown li,
.file-action-menu-dropdown li {
  white-space: nowrap;
  padding: 6px 12px;
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

.result-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.result-modal-box {
  background: #fff;
  border-radius: 8px;
  width: 60%;
  max-width: 800px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.result-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.result-modal-close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.result-modal-body {
  max-height: 60vh;
  overflow-y: auto;
}

.result-modal-body table {
  width: 100%;
  border-collapse: collapse;
}

.result-modal-body th,
.result-modal-body td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.result-modal-body th {
  background: #f5f5f5;
}

</style>
