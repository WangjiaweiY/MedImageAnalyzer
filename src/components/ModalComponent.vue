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

    <!-- 结果弹窗 -->
    <div v-if="resultModalVisible" class="result-modal-overlay">
      <div class="result-modal-box">
        <div class="result-modal-header">
          <span>{{ resultModalTitle }}</span>
          <button class="result-modal-close-btn" @click="closeResultModal">×</button>
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
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { useMessage } from 'naive-ui'

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