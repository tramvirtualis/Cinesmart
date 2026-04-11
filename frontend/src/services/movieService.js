import axios from 'axios';
import { enumService } from './enumService';

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

export const movieService = {
  /**
   * Lấy tất cả phim
   * @returns {Promise<Object>} Response từ server
   */
  getAllMovies: async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để tiếp tục',
        };
      }

      const response = await axiosInstance.get('/admin/movies');
      
      // Xử lý response data
      let movies = [];
      if (response.data) {
        if (Array.isArray(response.data.data)) {
          movies = response.data.data;
        } else if (Array.isArray(response.data)) {
          movies = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          movies = response.data.data;
        }
      }

      return {
        success: true,
        data: movies,
      };
    } catch (error) {
      let errorMessage = 'Không thể lấy danh sách phim';
      
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          // Xóa token nếu không hợp lệ
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
   * Lấy tất cả phim (Manager)
   * @returns {Promise<Object>} Response từ server
   */
  getAllMoviesManager: async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        return {
          success: false,
          error: 'Vui lòng đăng nhập để tiếp tục',
        };
      }

      const response = await axiosInstance.get('/manager/movies');
      
      // Xử lý response data
      let movies = [];
      if (response.data) {
        if (Array.isArray(response.data.data)) {
          movies = response.data.data;
        } else if (Array.isArray(response.data)) {
          movies = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          movies = response.data.data;
        }
      }

      return {
        success: true,
        data: movies,
      };
    } catch (error) {
      let errorMessage = 'Không thể lấy danh sách phim';
      
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          // Xóa token nếu không hợp lệ
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
   * Lấy phim theo ID (Admin only)
   * @param {number} movieId - ID của phim
   * @returns {Promise<Object>} Response từ server
   */
  getMovieById: async (movieId) => {
    try {
      const response = await axiosInstance.get(`/admin/movies/${movieId}`);
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin phim',
      };
    }
  },

  /**
   * Lấy phim theo ID (Public endpoint, không cần đăng nhập)
   * @param {number} movieId - ID của phim
   * @returns {Promise<Object>} Response từ server
   */
  getPublicMovieById: async (movieId) => {
    try {
      const response = await axiosInstance.get(`/public/movies/${movieId}`);
      // Endpoint public trả về trực tiếp MovieResponseDTO, không có wrapper
      const movie = response.data;
      return {
        success: true,
        data: movie,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin phim',
      };
    }
  },

  /**
   * Lấy tất cả phim (Public endpoint, không cần đăng nhập)
   * @returns {Promise<Object>} Response từ server
   */
  getPublicMovies: async () => {
    try {
      const response = await axiosInstance.get('/public/movies');
      // Endpoint public trả về trực tiếp array, không có wrapper
      const movies = Array.isArray(response.data) ? response.data : [];
      return {
        success: true,
        data: movies,
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
   * Lấy phim theo ID (Public - không cần authentication)
   * @param {number} movieId - ID của phim
   * @returns {Promise<Object>} Response từ server
   */
  getPublicMovieById: async (movieId) => {
    try {
      const response = await axiosInstance.get(`/public/movies/${movieId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin phim',
      };
    }
  },

  /**
   * Tạo phim mới
   * @param {Object} movieData - Dữ liệu phim
   * @returns {Promise<Object>} Response từ server
   */
  createMovie: async (movieData) => {
    try {
      const response = await axiosInstance.post('/admin/movies', movieData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Tạo phim thành công',
      };
    } catch (error) {
      // Backend validation errors được trả về trong error.response.data.message
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo phim';
      return {
        success: false,
        error: errorMessage,
        validationErrors: error.response?.data?.errors || null, // Nếu backend trả về errors object
      };
    }
  },

  /**
   * Cập nhật phim
   * @param {number} movieId - ID của phim
   * @param {Object} movieData - Dữ liệu phim cần cập nhật
   * @returns {Promise<Object>} Response từ server
   */
  updateMovie: async (movieId, movieData) => {
    try {
      const response = await axiosInstance.put(`/admin/movies/${movieId}`, movieData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật phim thành công',
      };
    } catch (error) {
      // Backend validation errors được trả về trong error.response.data.message
      const errorMessage = error.response?.data?.message || error.message || 'Không thể cập nhật phim';
      return {
        success: false,
        error: errorMessage,
        validationErrors: error.response?.data?.errors || null, // Nếu backend trả về errors object
      };
    }
  },

  /**
   * Xóa phim
   * @param {number} movieId - ID của phim
   * @returns {Promise<Object>} Response từ server
   */
  deleteMovie: async (movieId) => {
    try {
      const response = await axiosInstance.delete(`/admin/movies/${movieId}`);
      return {
        success: true,
        message: response.data.message || 'Xóa phim thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể xóa phim',
      };
    }
  },

  // ============ MAPPING FUNCTIONS ============
  // Helper functions to map data between backend and frontend formats

  /**
   * Map age rating from backend format to frontend display format
   * @param {string} ageRating - Backend format (e.g., 'AGE_13_PLUS')
   * @returns {string} Frontend format (e.g., '13+')
   */
  mapAgeRatingFromBackend: (ageRating) => {
    return enumService.mapAgeRatingToDisplay(ageRating);
  },

  /**
   * Map age rating from frontend display format to backend format
   * @param {string} ageRating - Frontend format (e.g., '13+')
   * @returns {string} Backend format (e.g., 'AGE_13_PLUS')
   */
  mapAgeRatingToBackend: (ageRating) => {
    return enumService.mapAgeRatingFromDisplay(ageRating);
  },

  /**
   * Map room type from frontend format to backend format
   * @param {string} roomType - Frontend format (e.g., '2D')
   * @returns {string} Backend format (e.g., 'TYPE_2D')
   */
  mapRoomTypeToBackend: (roomType) => {
    return enumService.mapRoomTypeFromDisplay(roomType);
  },

  /**
   * Map room type from backend format to frontend format
   * @param {string} roomType - Backend format (e.g., 'TYPE_2D')
   * @returns {string} Frontend format (e.g., '2D')
   */
  mapRoomTypeFromBackend: (roomType) => {
    return enumService.mapRoomTypeToDisplay(roomType);
  },

  /**
   * Map formats array from backend format to frontend format
   * @param {Array<string>} formats - Array of backend format room types
   * @returns {Array<string>} Array of frontend format room types
   */
  mapFormatsFromBackend: (formats) => {
    if (!formats || !Array.isArray(formats)) return [];
    return formats.map(f => enumService.mapRoomTypeToDisplay(f));
  },

  /**
   * Map formats array from frontend format to backend format
   * @param {Array<string>} formats - Array of frontend format room types
   * @returns {Array<string>} Array of backend format room types
   */
  mapFormatsToBackend: (formats) => {
    if (!formats || !Array.isArray(formats)) return [];
    return formats.map(f => enumService.mapRoomTypeFromDisplay(f));
  },

  /**
   * Extract formats and languages from movie object
   * Handles both MovieResponseDTO format and direct entity format
   * @param {Object} movie - Movie object from backend
   * @returns {Object} Object with formats and languages arrays
   */
  extractFormatsAndLanguages: (movie) => {
    let formats = [];
    let languages = [];

    // If movie has formats and languages directly from backend (from MovieResponseDTO)
    if (movie.formats || movie.languages) {
      formats = movieService.mapFormatsFromBackend(movie.formats);
      languages = movie.languages || [];
    }
    // If movie has versions (fallback - from entity directly)
    else if (movie.versions && Array.isArray(movie.versions) && movie.versions.length > 0) {
      formats = [...new Set(movie.versions.map(v => enumService.mapRoomTypeToDisplay(v.roomType)))];
      languages = [...new Set(movie.versions.map(v => v.language))];
    }

    return { formats, languages };
  },

  /**
   * Map a single movie from backend format to frontend format
   * @param {Object} movie - Movie object from backend
   * @returns {Object} Movie object in frontend format
   */
  mapMovieFromBackend: (movie) => {
    if (!movie) return null;

    return {
      ...movie,
      ageRating: movieService.mapAgeRatingFromBackend(movie.ageRating),
      formats: movieService.mapFormatsFromBackend(movie.formats),
      languages: movie.languages || []
    };
  },

  /**
   * Map an array of movies from backend format to frontend format
   * @param {Array<Object>} movies - Array of movie objects from backend
   * @returns {Array<Object>} Array of movie objects in frontend format
   */
  mapMoviesFromBackend: (movies) => {
    if (!movies || !Array.isArray(movies)) return [];
    return movies.map(movie => movieService.mapMovieFromBackend(movie));
  },

  /**
   * Map movie data from frontend format to backend format for API request
   * @param {Object} movieData - Movie data in frontend format
   * @returns {Object} Movie data in backend format
   */
  mapMovieToBackend: (movieData) => {
    // Chỉ gửi status nếu là ENDED (đánh dấu thủ công), còn lại để backend tự tính
    const result = {
      ...movieData,
      ageRating: movieService.mapAgeRatingToBackend(movieData.ageRating),
      formats: movieService.mapFormatsToBackend(movieData.formats),
      // languages are already in correct format (VIETSUB, VIETNAMESE, VIETDUB)
      languages: movieData.languages || []
    };
    
    // Chỉ gửi status nếu được set (thường là ENDED)
    if (!movieData.status || movieData.status === '') {
      delete result.status;
    }
    
    return result;
  },
};

export default movieService;

