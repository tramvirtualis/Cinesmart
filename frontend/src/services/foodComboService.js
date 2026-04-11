import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

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

// Axios instance cho public API (không cần JWT)
const publicAxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const foodComboService = {
  /**
   * Lấy food combos theo cinema complex ID (public - không cần đăng nhập)
   * @param {number} complexId - ID của cinema complex
   * @returns {Promise<Object>} Response từ server
   */
  getFoodCombosByCinemaComplexId: async (complexId) => {
    try {
      const response = await publicAxiosInstance.get(`/public/food-combos/cinema-complex/${complexId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy danh sách sản phẩm thành công',
      };
    } catch (error) {
      console.error('Error fetching food combos by cinema complex:', error);
      return {
        success: false,
        data: [],
        error: error.message || 'Không thể lấy danh sách sản phẩm',
      };
    }
  },

  /**
   * Lấy tất cả food combos
   * @returns {Promise<Object>} Response từ server
   */
  getAllFoodCombos: async () => {
    try {
      const response = await axiosInstance.get('/admin/food-combos');
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy danh sách sản phẩm thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách sản phẩm',
      };
    }
  },

  /**
   * Lấy food combo theo ID
   * @param {number} foodComboId - ID của food combo
   * @returns {Promise<Object>} Response từ server
   */
  getFoodComboById: async (foodComboId) => {
    try {
      const response = await axiosInstance.get(`/admin/food-combos/${foodComboId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy thông tin sản phẩm thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin sản phẩm',
      };
    }
  },

  /**
   * Tạo food combo mới
   * @param {Object} foodComboData - Dữ liệu food combo { name, price, description, image }
   * @returns {Promise<Object>} Response từ server
   */
  createFoodCombo: async (foodComboData) => {
    try {
      const response = await axiosInstance.post('/admin/food-combos', foodComboData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Tạo sản phẩm thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể tạo sản phẩm',
      };
    }
  },

  /**
   * Cập nhật food combo
   * @param {number} foodComboId - ID của food combo
   * @param {Object} foodComboData - Dữ liệu food combo cần cập nhật
   * @returns {Promise<Object>} Response từ server
   */
  updateFoodCombo: async (foodComboId, foodComboData) => {
    try {
      const response = await axiosInstance.put(
        `/admin/food-combos/${foodComboId}`,
        foodComboData
      );
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật sản phẩm thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể cập nhật sản phẩm',
      };
    }
  },

  /**
   * Xóa food combo
   * @param {number} foodComboId - ID của food combo
   * @returns {Promise<Object>} Response từ server
   */
  deleteFoodCombo: async (foodComboId) => {
    try {
      const response = await axiosInstance.delete(`/admin/food-combos/${foodComboId}`);
      return {
        success: true,
        message: response.data.message || 'Xóa sản phẩm thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể xóa sản phẩm',
      };
    }
  },
};

export default foodComboService;

