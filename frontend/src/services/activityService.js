import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Tạo axios instance với cấu hình mặc định
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor để thêm JWT token vào header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý lỗi một cách thống nhất
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const errorMessage = error.response.data?.message || error.response.data?.error || 'Có lỗi xảy ra';
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      return Promise.reject(new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'));
    } else {
      return Promise.reject(new Error(error.message || 'Có lỗi xảy ra'));
    }
  }
);

const extractActivities = (response) => {
  let activities = [];
  if (response?.data) {
    if (response.data.success && Array.isArray(response.data.data)) {
      activities = response.data.data;
    } else if (Array.isArray(response.data)) {
      activities = response.data;
    } else if (Array.isArray(response.data.data)) {
      activities = response.data.data;
    }
  }
  return activities;
};

const ensureToken = () => {
  const token = localStorage.getItem('jwt');
  if (!token) {
    return {
      success: false,
      error: 'Vui lòng đăng nhập để tiếp tục',
    };
  }
  return null;
};

const buildQueryParams = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.username) params.append('username', filters.username);
  if (filters.action) params.append('action', filters.action);
  if (filters.objectType) params.append('objectType', filters.objectType);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.days) params.append('days', filters.days);

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

const handleError = (error, defaultMessage) => {
  let errorMessage = defaultMessage;

  if (error.response) {
    if (error.response.status === 401 || error.response.status === 403) {
      errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      localStorage.removeItem('jwt');
    } else if (error.response.data?.message) {
      errorMessage = error.response.data.message;
    }
  } else if (error.message) {
    errorMessage = error.message;
  }

  return {
    success: false,
    error: errorMessage,
  };
};

export const activityService = {
  /**
   * Admin: Lấy tất cả hoạt động của admin và manager
   * @param {Object} filters - Filters object {username, action, objectType, startDate, endDate, days}
   * @returns {Promise<Object>} Response từ server
   */
  getAllActivities: async (filters = {}) => {
    try {
      const tokenError = ensureToken();
      if (tokenError) return tokenError;

      const response = await axiosInstance.get(`/admin/activities${buildQueryParams(filters)}`);

      return {
        success: true,
        data: extractActivities(response),
      };
    } catch (error) {
      return handleError(error, 'Không thể lấy danh sách hoạt động');
    }
  },

  /**
   * Manager: Lấy hoạt động của chính manager
   */
  getManagerActivities: async (filters = {}) => {
    try {
      const tokenError = ensureToken();
      if (tokenError) return tokenError;

      const response = await axiosInstance.get(`/manager/activities${buildQueryParams(filters)}`);
      return {
        success: true,
        data: extractActivities(response),
      };
    } catch (error) {
      return handleError(error, 'Không thể lấy danh sách hoạt động');
    }
  },

  /**
   * Admin: Xóa một hoạt động theo ID
   * @param {Number} activityId - ID của hoạt động cần xóa
   * @returns {Promise<Object>} Response từ server
   */
  deleteActivity: async (activityId) => {
    try {
      const tokenError = ensureToken();
      if (tokenError) return tokenError;

      const response = await axiosInstance.delete(`/admin/activities/${activityId}`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Xóa hoạt động thành công',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Không thể xóa hoạt động',
      };
    } catch (error) {
      return handleError(error, 'Không thể xóa hoạt động');
    }
  },

  /**
   * Manager: Xóa hoạt động của chính mình
   */
  deleteManagerActivity: async (activityId) => {
    try {
      const tokenError = ensureToken();
      if (tokenError) return tokenError;

      const response = await axiosInstance.delete(`/manager/activities/${activityId}`);
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Xóa hoạt động thành công',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Không thể xóa hoạt động',
      };
    } catch (error) {
      return handleError(error, 'Không thể xóa hoạt động');
    }
  },

};

