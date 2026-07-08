import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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

// Interceptor để xử lý lỗi
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        'Có lỗi xảy ra';
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      return Promise.reject(
        new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.')
      );
    } else {
      return Promise.reject(new Error(error.message || 'Có lỗi xảy ra'));
    }
  }
);

export const userService = {
  /**
   * Lấy danh sách tất cả users với filter
   * @param {Object} filters - Object chứa các filter: searchTerm, role, status, province
   * @returns {Promise<Object>} Response từ server
   */
 getAllUsers: async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.searchTerm) {
      params.append('searchTerm', filters.searchTerm);
    }
    if (filters.role) {
      params.append('role', filters.role);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      params.append('status', filters.status);
    }
    if (filters.province) {
      params.append('province', filters.province);
    }
    
    const response = await axiosInstance.get(`/admin/users?${params.toString()}`);
    
    const rawData = response.data.data || [];
    
    // 🔧 Loại bỏ duplicate và sắp xếp
    const uniqueData = Array.from(
      new Map(rawData.map(user => [user.userId, user])).values()
    ).sort((a, b) => a.userId - b.userId);
    
    console.log(`✅ Loaded ${uniqueData.length} users (removed ${rawData.length - uniqueData.length} duplicates)`);
    
    return {
      success: true,
      data: uniqueData,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Không thể lấy danh sách người dùng',
    };
  }
},

  /**
   * Tạo tài khoản staff (Admin hoặc Manager)
   * @param {Object} staffData - Dữ liệu staff: username, password, email, phone, addressDescription, addressProvince, status, role, cinemaComplexId
   * @returns {Promise<Object>} Response từ server
   */
  createStaff: async (staffData) => {
    try {
      const response = await axiosInstance.post('/admin/users', staffData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Tạo tài khoản thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể tạo tài khoản',
      };
    }
  },

  /**
   * Toggle status của user (chặn/bỏ chặn)
   * @param {Number} userId - ID của user
   * @returns {Promise<Object>} Response từ server
   */
  toggleUserStatus: async (userId) => {
    try {
      const response = await axiosInstance.put(`/admin/users/${userId}/status`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Cập nhật trạng thái thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể cập nhật trạng thái',
      };
    }
  },
};

export default userService;

