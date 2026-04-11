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

export const favoriteService = {
  /**
   * Lấy danh sách phim yêu thích của user
   * @returns {Promise<Object>} Response từ server
   */
  getFavoriteMovies: async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để xem phim yêu thích',
          data: [],
        };
      }

      console.log('favoriteService: Fetching favorite movies...');
      console.log('favoriteService: Token:', token ? token.substring(0, 20) + '...' : 'missing');
      const response = await axiosInstance.get('/customer/favorites');
      console.log('favoriteService: Response:', response);
      console.log('favoriteService: Response data:', response.data);
      
      // Handle different response formats
      let movies = [];
      if (response.data) {
        if (response.data.success && response.data.data) {
          // Format: { success: true, data: [...] }
          movies = Array.isArray(response.data.data) ? response.data.data : [];
        } else if (Array.isArray(response.data)) {
          // Format: [...]
          movies = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Format: { data: [...] }
          movies = response.data.data;
        }
      }
      
      console.log('favoriteService: Extracted movies:', movies);
      
      return {
        success: true,
        data: movies,
      };
    } catch (error) {
      console.error('favoriteService: Error getting favorite movies:', error);
      console.error('favoriteService: Error response:', error.response);
      console.error('favoriteService: Error response data:', error.response?.data);
      console.error('favoriteService: Error message:', error.message);
      
      let errorMessage = 'Không thể lấy danh sách phim yêu thích';
      
      if (error.response) {
        console.error('favoriteService: Response status:', error.response.status);
        console.error('favoriteService: Response headers:', error.response.headers);
        console.error('favoriteService: Response data:', error.response.data);
        console.error('favoriteService: Full error response:', error.response);
        
        if (error.response.status === 401 || error.response.status === 403) {
          // Lấy message từ response body nếu có
          if (error.response.data && error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data && error.response.data.error) {
            errorMessage = error.response.data.error;
          } else {
            errorMessage = error.response.status === 401 
              ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
              : 'Bạn không có quyền truy cập tài nguyên này. Vui lòng đăng nhập lại.';
          }
          
          localStorage.removeItem('jwt');
          localStorage.removeItem('user');
          
          // Redirect to login page if in browser (delay để user có thể thấy error message)
          if (typeof window !== 'undefined') {
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
        } else if (error.response.data) {
          if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        data: [],
      };
    }
  },

  /**
   * Thêm phim vào danh sách yêu thích
   * @param {number} movieId - ID của phim
   * @returns {Promise<Object>} Response từ server
   */
  addFavorite: async (movieId) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để thêm phim yêu thích',
        };
      }

      console.log('favoriteService: Adding favorite movie:', movieId);
      const response = await axiosInstance.post(`/customer/favorites/${movieId}`);
      console.log('favoriteService: Add favorite result:', response.data);

      return {
        success: true,
        message: response.data?.message || 'Thêm phim vào yêu thích thành công',
        data: response.data?.data,
      };
    } catch (error) {
      console.error('favoriteService: Error adding favorite:', error);
      console.error('favoriteService: Error response:', error.response?.data);
      
      let errorMessage = 'Không thể thêm phim vào yêu thích';
      
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
   * Xóa phim khỏi danh sách yêu thích
   * @param {number} movieId - ID của phim
   * @returns {Promise<Object>} Response từ server
   */
  removeFavorite: async (movieId) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để xóa phim yêu thích',
        };
      }

      console.log('favoriteService: Removing favorite movie:', movieId);
      const response = await axiosInstance.delete(`/customer/favorites/${movieId}`);
      console.log('favoriteService: Remove favorite result:', response.data);

      return {
        success: true,
        message: response.data?.message || 'Xóa phim khỏi yêu thích thành công',
      };
    } catch (error) {
      console.error('favoriteService: Error removing favorite:', error);
      console.error('favoriteService: Error response:', error.response?.data);
      
      let errorMessage = 'Không thể xóa phim khỏi yêu thích';
      
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
   * Kiểm tra phim có trong danh sách yêu thích chưa
   * @param {number} movieId - ID của phim
   * @returns {Promise<Object>} Response từ server với hasFavorite boolean
   */
  checkFavorite: async (movieId) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          hasFavorite: false,
          error: 'Vui lòng đăng nhập để kiểm tra phim yêu thích',
        };
      }

      const response = await axiosInstance.get(`/customer/favorites/${movieId}/check`);
      const hasFavorite = response.data?.hasFavorite || false;
      
      return {
        success: true,
        hasFavorite: hasFavorite,
      };
    } catch (error) {
      console.error('favoriteService: Error checking favorite:', error);
      console.error('favoriteService: Error response:', error.response?.data);
      
      // Nếu lỗi 401/403, coi như chưa yêu thích
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          hasFavorite: false,
          error: 'Phiên đăng nhập đã hết hạn',
        };
      }

      return {
        success: false,
        hasFavorite: false,
        error: error.message || 'Không thể kiểm tra phim yêu thích',
      };
    }
  },
};

export default favoriteService;

