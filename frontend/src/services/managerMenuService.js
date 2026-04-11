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

export const managerMenuService = {
  /**
   * Lấy menu của cinema complex
   * @param {number} complexId - ID của cinema complex
   * @returns {Promise<Object>} Response từ server
   */
  getMenuByComplexId: async (complexId) => {
    try {
      const response = await axiosInstance.get(`/manager/menu/complex/${complexId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy menu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy menu',
      };
    }
  },

  /**
   * Lấy danh sách sản phẩm có sẵn để thêm vào menu
   * @param {number} complexId - ID của cinema complex
   * @returns {Promise<Object>} Response từ server
   */
  getAvailableFoodCombos: async (complexId) => {
    try {
      const response = await axiosInstance.get(`/manager/menu/available/${complexId}`);
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
   * Thêm sản phẩm vào menu
   * @param {number} complexId - ID của cinema complex
   * @param {number} foodComboId - ID của food combo
   * @returns {Promise<Object>} Response từ server
   */
  addFoodComboToMenu: async (complexId, foodComboId) => {
    try {
      const response = await axiosInstance.post(
        `/manager/menu/complex/${complexId}/add/${foodComboId}`
      );
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Thêm sản phẩm vào menu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể thêm sản phẩm vào menu',
      };
    }
  },

  /**
   * Xóa sản phẩm khỏi menu
   * @param {number} complexId - ID của cinema complex
   * @param {number} foodComboId - ID của food combo
   * @returns {Promise<Object>} Response từ server
   */
  removeFoodComboFromMenu: async (complexId, foodComboId) => {
    try {
      const response = await axiosInstance.delete(
        `/manager/menu/complex/${complexId}/remove/${foodComboId}`
      );
      return {
        success: true,
        message: response.data.message || 'Xóa sản phẩm khỏi menu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể xóa sản phẩm khỏi menu',
      };
    }
  },
};

export default managerMenuService;

