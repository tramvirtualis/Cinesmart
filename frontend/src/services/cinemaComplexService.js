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

export const cinemaComplexService = {
  /**
   * Lấy tất cả cụm rạp (Public - không cần authentication)
   * @returns {Promise<Object>} Response từ server
   */
  getAllCinemaComplexes: async () => {
    try {
      const response = await axiosInstance.get('/public/cinema-complexes');
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy danh sách cụm rạp thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách cụm rạp',
      };
    }
  },

  /**
   * Lấy tất cả cụm rạp (Admin - cần authentication)
   * @returns {Promise<Object>} Response từ server
   */
  getAllCinemaComplexesAdmin: async () => {
    try {
      const response = await axiosInstance.get('/admin/cinema-complexes');
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy danh sách cụm rạp thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách cụm rạp',
      };
    }
  },

  /**
   * Lấy cụm rạp theo ID (Public - không cần authentication)
   * @param {number} complexId - ID của cụm rạp
   * @returns {Promise<Object>} Response từ server
   */
  getPublicCinemaComplexById: async (complexId) => {
    try {
      const response = await axiosInstance.get(`/public/cinema-complexes/${complexId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin cụm rạp',
      };
    }
  },

  /**
   * Lấy danh sách phim của cụm rạp (Public - không cần authentication)
   * @param {number} complexId - ID của cụm rạp
   * @returns {Promise<Object>} Response từ server
   */
  getComplexMoviesPublic: async (complexId) => {
    try {
      const response = await axiosInstance.get(`/public/cinema-complexes/${complexId}/movies`);
      return {
        success: true,
        data: response.data.data || [],
        message: response.data.message || 'Lấy danh sách phim thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách phim',
        data: [],
      };
    }
  },

  /**
   * Lấy cụm rạp theo ID (Admin - cần authentication)
   * @param {number} complexId - ID của cụm rạp
   * @returns {Promise<Object>} Response từ server
   */
  getCinemaComplexById: async (complexId) => {
    try {
      const response = await axiosInstance.get(`/admin/cinema-complexes/${complexId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy thông tin cụm rạp thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin cụm rạp',
      };
    }
  },

  /**
   * Tạo cụm rạp mới
   * @param {Object} cinemaComplexData - Dữ liệu cụm rạp { name, addressDescription, addressProvince }
   * @returns {Promise<Object>} Response từ server
   */
  createCinemaComplex: async (cinemaComplexData) => {
    try {
      const response = await axiosInstance.post('/admin/cinema-complexes', cinemaComplexData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Tạo cụm rạp thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể tạo cụm rạp',
      };
    }
  },

  /**
   * Cập nhật cụm rạp
   * @param {number} complexId - ID của cụm rạp
   * @param {Object} cinemaComplexData - Dữ liệu cụm rạp cần cập nhật
   * @returns {Promise<Object>} Response từ server
   */
  updateCinemaComplex: async (complexId, cinemaComplexData) => {
    try {
      const response = await axiosInstance.put(
        `/admin/cinema-complexes/${complexId}`,
        cinemaComplexData
      );
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật cụm rạp thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể cập nhật cụm rạp',
      };
    }
  },

  /**
   * Xóa cụm rạp
   * @param {number} complexId - ID của cụm rạp
   * @returns {Promise<Object>} Response từ server
   */
  deleteCinemaComplex: async (complexId) => {
    try {
      const response = await axiosInstance.delete(`/admin/cinema-complexes/${complexId}`);
      return {
        success: true,
        message: response.data.message || 'Xóa cụm rạp thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể xóa cụm rạp',
      };
    }
  },

  /**
   * Lấy cụm rạp của manager (chỉ cụm rạp mà manager đó quản lý)
   * @returns {Promise<Object>} Response từ server
   */
  getManagerCinemaComplex: async () => {
    try {
      console.log('=== FRONTEND SERVICE: Calling /manager/cinema-complex ===');
      const response = await axiosInstance.get('/manager/cinema-complex');
      
      console.log('=== FRONTEND SERVICE: Raw API response ===');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
      console.log('response.data type:', typeof response.data);
      console.log('response.data keys:', Object.keys(response.data || {}));
      
      const responseData = response.data;
      
      // Kiểm tra cấu trúc response
      if (!responseData) {
        console.error('✗ Response data is null or undefined');
        return {
          success: false,
          error: 'Response data is null',
          data: [],
        };
      }
      
      // Lấy data từ response
      let data = responseData.data;
      console.log('responseData.data:', data);
      console.log('responseData.data type:', typeof data);
      console.log('responseData.data isArray:', Array.isArray(data));
      
      // Xử lý data
      if (data === null || data === undefined) {
        console.log('⚠ Data is null/undefined, setting to empty array');
        data = [];
      } else if (!Array.isArray(data)) {
        console.log('⚠ Data is not array, checking if it has complexId...');
        if (data && typeof data === 'object' && data.complexId) {
          console.log('✓ Data is single object, converting to array');
          data = [data];
        } else {
          console.log('✗ Data is not a valid object, setting to empty array');
          data = [];
        }
      } else if (Array.isArray(data) && data.length === 0) {
        console.log('⚠ Data is empty array');
      } else {
        console.log('✓ Data is array with', data.length, 'item(s)');
      }
      
      const result = {
        success: responseData.success !== false,
        data: data,
        message: responseData.message || 'Lấy thông tin cụm rạp thành công',
      };
      
      console.log('=== FRONTEND SERVICE: Final result ===');
      console.log('Result:', JSON.stringify(result, null, 2));
      console.log('Result.data length:', Array.isArray(result.data) ? result.data.length : 'not array');
      
      return result;
    } catch (error) {
      console.error('=== FRONTEND SERVICE: Error ===');
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin cụm rạp',
        data: [],
      };
    }
  },

  // ============ MANAGER MOVIE METHODS ============

  /**
   * Lấy danh sách phim của cụm rạp (Manager)
   * @param {number} complexId - ID của cụm rạp
   * @returns {Promise<Object>} Response từ server
   */
  getComplexMoviesManager: async (complexId) => {
    try {
      const response = await axiosInstance.get(`/manager/cinema-complex/${complexId}/movies`);
      return {
        success: true,
        data: response.data.data || [],
        message: response.data.message || 'Lấy danh sách phim thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách phim',
        data: [],
      };
    }
  },

  /**
   * Thêm phim vào cụm rạp (Manager)
   * @param {number} complexId - ID của cụm rạp
   * @param {number} movieId - ID của phim
   * @returns {Promise<Object>} Response từ server
   */
  addMovieToComplexManager: async (complexId, movieId) => {
    try {
      const response = await axiosInstance.post(`/manager/cinema-complex/${complexId}/movies/${movieId}`);
      return {
        success: true,
        message: response.data.message || 'Thêm phim vào cụm rạp thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể thêm phim vào cụm rạp',
      };
    }
  },

  /**
   * Xóa phim khỏi cụm rạp (Manager)
   * @param {number} complexId - ID của cụm rạp
   * @param {number} movieId - ID của phim
   * @returns {Promise<Object>} Response từ server
   */
  removeMovieFromComplexManager: async (complexId, movieId) => {
    try {
      const response = await axiosInstance.delete(`/manager/cinema-complex/${complexId}/movies/${movieId}`);
      return {
        success: true,
        message: response.data.message || 'Xóa phim khỏi cụm rạp thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể xóa phim khỏi cụm rạp',
      };
    }
  },
};

export default cinemaComplexService;

