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

export const notificationService = {
  /**
   * Lấy tất cả thông báo của user
   */
  getNotifications: async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để tiếp tục',
        };
      }

      const response = await axiosInstance.get('/notifications');
      
      if (response.data && response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        error: 'Không thể lấy danh sách thông báo',
      };
    } catch (error) {
      let errorMessage = 'Không thể lấy danh sách thông báo';
      
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
    }
  },

  /**
   * Lấy số lượng thông báo chưa đọc
   */
  getUnreadCount: async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để tiếp tục',
        };
      }

      const response = await axiosInstance.get('/notifications/unread-count');
      
      if (response.data && response.data.success && response.data.data !== undefined) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        error: 'Không thể lấy số lượng thông báo chưa đọc',
      };
    } catch (error) {
      let errorMessage = 'Không thể lấy số lượng thông báo chưa đọc';
      
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
    }
  },

  /**
   * Đánh dấu thông báo đã đọc
   */
  markAsRead: async (notificationId) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để tiếp tục',
        };
      }

      const response = await axiosInstance.put(`/notifications/${notificationId}/read`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Đánh dấu đã đọc thành công',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Không thể đánh dấu đã đọc',
      };
    } catch (error) {
      let errorMessage = 'Không thể đánh dấu đã đọc';
      
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
    }
  },

  /**
   * Đánh dấu tất cả thông báo đã đọc
   */
  markAllAsRead: async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để tiếp tục',
        };
      }

      const response = await axiosInstance.put('/notifications/read-all');
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Đánh dấu tất cả đã đọc thành công',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Không thể đánh dấu tất cả đã đọc',
      };
    } catch (error) {
      let errorMessage = 'Không thể đánh dấu tất cả đã đọc';
      
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
    }
  },

  /**
   * Trigger notification cho order thành công
   */
  triggerOrderSuccessNotification: async (orderId) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để tiếp tục',
        };
      }

      const response = await axiosInstance.post(`/notifications/trigger-order-success/${orderId}`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Thông báo đã được tạo',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Không thể tạo thông báo',
      };
    } catch (error) {
      let errorMessage = 'Không thể tạo thông báo';
      
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
    }
  },

  /**
   * Xóa thông báo
   */
  deleteNotification: async (notificationId) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để tiếp tục',
        };
      }

      const response = await axiosInstance.delete(`/notifications/${notificationId}`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Xóa thông báo thành công',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Không thể xóa thông báo',
      };
    } catch (error) {
      let errorMessage = 'Không thể xóa thông báo';
      
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
    }
  },
};

