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

export const bannerService = {
  /**
   * Lấy tất cả banner (Admin only)
   * @returns {Promise<Object>} Response từ server
   */
  getAllBanners: async () => {
    try {
      const response = await axiosInstance.get('/admin/banners');
      return {
        success: true,
        data: response.data.data || response.data || [],
        message: response.data.message || 'Lấy danh sách banner thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể lấy danh sách banner';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Lấy banner theo ID (Admin only)
   * @param {number} bannerId - ID của banner
   * @returns {Promise<Object>} Response từ server
   */
  getBannerById: async (bannerId) => {
    try {
      const response = await axiosInstance.get(`/admin/banners/${bannerId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy thông tin banner thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể lấy thông tin banner';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Tạo banner mới (Admin only)
   * @param {Object} bannerData - Dữ liệu banner
   * @returns {Promise<Object>} Response từ server
   */
  createBanner: async (bannerData) => {
    try {
      const response = await axiosInstance.post('/admin/banners', bannerData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Tạo banner thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo banner';
      return {
        success: false,
        error: errorMessage,
        validationErrors: error.response?.data?.errors || null,
      };
    }
  },

  /**
   * Cập nhật banner (Admin only)
   * @param {number} bannerId - ID của banner
   * @param {Object} bannerData - Dữ liệu banner cập nhật
   * @returns {Promise<Object>} Response từ server
   */
  updateBanner: async (bannerId, bannerData) => {
    try {
      const response = await axiosInstance.put(`/admin/banners/${bannerId}`, bannerData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật banner thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể cập nhật banner';
      return {
        success: false,
        error: errorMessage,
        validationErrors: error.response?.data?.errors || null,
      };
    }
  },

  /**
   * Xóa banner (Admin only)
   * @param {number} bannerId - ID của banner
   * @returns {Promise<Object>} Response từ server
   */
  deleteBanner: async (bannerId) => {
    try {
      const response = await axiosInstance.delete(`/admin/banners/${bannerId}`);
      return {
        success: true,
        message: response.data.message || 'Xóa banner thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể xóa banner';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Lấy tất cả banner công khai (Public)
   * @returns {Promise<Object>} Response từ server
   */
  getPublicBanners: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/banners`);
      return {
        success: true,
        data: Array.isArray(response.data) ? response.data : [],
      };
    } catch (error) {
      console.error('Error fetching public banners:', error);
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách banner',
        data: [],
      };
    }
  },

  /**
   * Toggle active status của banner (Admin only)
   * @param {number} bannerId - ID của banner
   * @returns {Promise<Object>} Response từ server
   */
  toggleBannerActive: async (bannerId) => {
    try {
      const response = await axiosInstance.put(`/admin/banners/${bannerId}/toggle-active`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật trạng thái banner thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể cập nhật trạng thái banner';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};

export default bannerService;

