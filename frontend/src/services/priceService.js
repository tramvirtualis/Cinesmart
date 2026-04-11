import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const priceService = {
  /**
   * Lấy tất cả bảng giá (Admin)
   * @returns {Promise<Object>} Response từ server
   */
  getAllPrices: async () => {
    try {
      const response = await axiosInstance.get('/admin/prices');
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy bảng giá thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy bảng giá',
      };
    }
  },

  /**
   * Lưu toàn bộ bảng giá (Admin)
   * @param {Array} pricesList - Danh sách giá cần lưu [{ roomType, seatType, price }]
   * @returns {Promise<Object>} Response từ server
   */
  saveAllPrices: async (pricesList) => {
    try {
      const response = await axiosInstance.put('/admin/prices', { prices: pricesList });
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lưu bảng giá thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lưu bảng giá',
      };
    }
  },
};

export default priceService;

