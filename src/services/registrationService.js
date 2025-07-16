import api from './api';

/**
 * 配准任务服务
 */
const registrationService = {
  /**
   * 提交配准任务
   * @param {String} folder - 文件夹名称
   * @returns {Promise} - 返回包含taskId的Promise
   */
  submitTask(folder) {
    // 根据API文档，folder参数应作为查询参数传递
    return api.post(`/svs/submit?folder=${encodeURIComponent(folder)}`, null);
  },

  /**
   * 获取任务进度
   * @param {String} taskId - 任务ID
   * @returns {Promise} - 返回包含任务进度信息的Promise
   */
  getTaskProgress(taskId) {
    return api.get(`/svs/progress/${taskId}`);
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