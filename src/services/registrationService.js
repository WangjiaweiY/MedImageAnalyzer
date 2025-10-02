import api from './api';

// 全局状态：是否有配准任务正在进行
let isRegistrationInProgress = false;

/**
 * 配准任务服务
 */
const registrationService = {
  /**
   * 检查是否有配准任务正在进行中
   * @returns {boolean} - 如果有任务在进行中，则返回true
   */
  isTaskInProgress() {
    return isRegistrationInProgress;
  },

  /**
   * 设置配准任务状态
   * @param {boolean} status - 是否有任务正在进行
   */
  setTaskInProgress(status) {
    isRegistrationInProgress = status;
  },

  /**
   * 提交配准任务
   * @param {String} folder - 文件夹名称
   * @returns {Promise} - 返回包含taskId的Promise
   */
  async submitTask(folder, register = true) {
    // 检查是否已有任务在进行中
    if (isRegistrationInProgress) {
      throw new Error('已有配准任务正在进行中，请等待当前任务完成');
    }
    
    try {
      // 设置任务进行中状态
      isRegistrationInProgress = true;
      
      // 提交任务，支持仅转换为DZI（不配准）：register=false
      const response = await api.post(`/svs/submit?folder=${encodeURIComponent(folder)}&register=${register}`, null);
      return response;
    } catch (error) {
      // 如果提交失败，重置状态
      isRegistrationInProgress = false;
      throw error;
    }
  },

  /**
   * 获取任务进度
   * @param {String} taskId - 任务ID
   * @returns {Promise} - 返回包含任务进度信息的Promise
   */
  async getTaskProgress(taskId) {
    try {
      const response = await api.get(`/svs/progress/${taskId}`);
      
      // 如果任务已完成或失败，重置进行中状态
      if (response && response.code === 1 && response.data) {
        const status = response.data.status;
        if (status === 'completed' || status === 'failed' || status === 'error') {
          isRegistrationInProgress = false;
        }
      }
      
      return response;
    } catch (error) {
      // 请求失败时也认为当前没有进行中的任务，向上抛出让调用方处理清理
      isRegistrationInProgress = false;
      throw error;
    }
  },

  /**
   * 获取文件夹最新任务
   * @param {String} folder - 文件夹名称
   * @returns {Promise} - 返回包含最新任务信息的Promise
   */
  getLatestTask(folder) {
    // 更新为正确的API路径
    return api.get(`/svs/latest-task/${encodeURIComponent(folder)}`);
  },

  /**
   * 获取用户任务列表
   * @returns {Promise} - 返回包含任务列表的Promise
   */
  getUserTasks() {
    // 更新为正确的API路径
    return api.get('/svs/user-tasks');
  },
  
  /**
   * 存储任务ID到本地存储
   * @param {String} folder - 文件夹名称
   * @param {Object} taskInfo - 任务信息对象
   */
  saveTaskToLocalStorage(folder, taskInfo) {
    try {
      const tasksStr = localStorage.getItem('registration_tasks') || '{}';
      const tasks = JSON.parse(tasksStr);
      tasks[folder] = {
        ...taskInfo,
        timestamp: new Date().getTime()
      };
      localStorage.setItem('registration_tasks', JSON.stringify(tasks));
    } catch (err) {
      console.error('保存任务到本地存储失败:', err);
    }
  },
  
  /**
   * 从本地存储获取任务信息
   * @param {String} folder - 文件夹名称
   * @returns {Object|null} - 任务信息，如果不存在则返回null
   */
  getTaskFromLocalStorage(folder) {
    try {
      const tasksStr = localStorage.getItem('registration_tasks') || '{}';
      const tasks = JSON.parse(tasksStr);
      return tasks[folder] || null;
    } catch (err) {
      console.error('从本地存储获取任务失败:', err);
      return null;
    }
  },
  
  /**
   * 获取所有本地存储的任务
   * @returns {Object} - 文件夹和任务信息的映射
   */
  getAllLocalTasks() {
    try {
      const tasksStr = localStorage.getItem('registration_tasks') || '{}';
      return JSON.parse(tasksStr);
    } catch (err) {
      console.error('获取本地存储任务失败:', err);
      return {};
    }
  },
  
  /**
   * 清除本地存储的任务
   * @param {String} folder - 文件夹名称，如果不提供则清除所有任务
   */
  clearLocalTask(folder) {
    try {
      if (folder) {
        const tasksStr = localStorage.getItem('registration_tasks') || '{}';
        const tasks = JSON.parse(tasksStr);
        delete tasks[folder];
        localStorage.setItem('registration_tasks', JSON.stringify(tasks));
      } else {
        localStorage.removeItem('registration_tasks');
      }
    } catch (err) {
      console.error('清除本地存储任务失败:', err);
    }
  },

  /**
   * 更新本地存储中的任务进度
   * @param {String} taskId - 任务ID
   * @param {Object} progressInfo - 进度信息
   */
  updateTaskProgress(taskId, progressInfo) {
    try {
      const tasksStr = localStorage.getItem('registration_tasks') || '{}';
      const tasks = JSON.parse(tasksStr);
      
      // 查找包含此taskId的文件夹
      for (const folder in tasks) {
        if (tasks[folder].taskId === taskId) {
          tasks[folder] = {
            ...tasks[folder],
            ...progressInfo,
            lastUpdated: new Date().getTime()
          };
          break;
        }
      }
      
      localStorage.setItem('registration_tasks', JSON.stringify(tasks));
    } catch (err) {
      console.error('更新任务进度失败:', err);
    }
  },
  
  /**
   * 解析API响应
   * @param {Object} response - API响应对象
   * @returns {Object|null} - 解析后的数据或null
   */
  parseResponse(response) {
    if (response && response.code === 1) {
      return response.data;
    }
    return null;
  }
};

export default registrationService; 