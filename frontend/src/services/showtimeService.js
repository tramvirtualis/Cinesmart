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

// Map Language từ frontend sang backend enum
// Backend enum: VIETSUB, VIETNAMESE, VIETDUB
const mapLanguageToBackend = (language) => {
  const mapping = {
    'Phụ đề': 'VIETSUB',
    'Lồng tiếng': 'VIETDUB',
    'Tiếng Việt': 'VIETNAMESE',
    'VIETSUB': 'VIETSUB',
    'VIETDUB': 'VIETDUB',
    'VIETNAMESE': 'VIETNAMESE',
    // Support old format if any
    'VIETNAMESE_DUB': 'VIETDUB',
  };
  return mapping[language] || language;
};

// Map RoomType từ frontend sang backend enum
const mapRoomTypeToBackend = (roomType) => {
  const mapping = {
    '2D': 'TYPE_2D',
    '3D': 'TYPE_3D',
    'DELUXE': 'DELUXE',
  };
  return mapping[roomType] || roomType;
};

// Map Language từ backend sang frontend
const mapLanguageFromBackend = (language) => {
  const mapping = {
    'VIETSUB': 'Phụ đề',
    'VIETDUB': 'Lồng tiếng',
    'VIETNAMESE': 'Tiếng Việt',
  };
  return mapping[language] || language;
};

// Map RoomType từ backend sang frontend
const mapRoomTypeFromBackend = (roomType) => {
  const mapping = {
    'TYPE_2D': '2D',
    'TYPE_3D': '3D',
    'DELUXE': 'DELUXE',
  };
  return mapping[roomType] || roomType;
};

const showtimeService = {
  /**
   * Lấy showtime theo ID (Public)
   * @param {number} showtimeId - ID của showtime
   * @returns {Promise<Object>} Response từ server
   */
  getShowtimeById: async (showtimeId) => {
    try {
      const response = await axiosInstance.get(`/public/showtimes/${showtimeId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('[showtimeService] Error getting showtime by ID:', error);
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin suất chiếu',
      };
    }
  },

  /**
   * Lấy danh sách lịch chiếu theo roomId (Manager)
   * @param {number} roomId - ID của phòng chiếu
   * @returns {Promise<Object>} Response từ server
   */
  getShowtimesByRoomId: async (roomId) => {
    try {
      const response = await axiosInstance.get(`/manager/showtimes/room/${roomId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy danh sách lịch chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách lịch chiếu',
      };
    }
  },

  /**
   * Lấy danh sách lịch chiếu theo roomId (Admin)
   * @param {number} roomId - ID của phòng chiếu
   * @returns {Promise<Object>} Response từ server
   */
  getShowtimesByRoomIdAdmin: async (roomId) => {
    try {
      const response = await axiosInstance.get(`/admin/showtimes/room/${roomId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy danh sách lịch chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách lịch chiếu',
      };
    }
  },

  /**
   * Tạo lịch chiếu mới (Manager)
   * @param {Object} showtimeData - Dữ liệu lịch chiếu { cinemaRoomId, movieId, language, roomType, startTime, endTime }
   * @returns {Promise<Object>} Response từ server
   */
  createShowtime: async (showtimeData) => {
    try {
      const payload = {
        cinemaRoomId: showtimeData.cinemaRoomId,
        movieId: showtimeData.movieId,
        language: mapLanguageToBackend(showtimeData.language),
        roomType: mapRoomTypeToBackend(showtimeData.roomType),
        startTime: showtimeData.startTime, // Format: "2025-11-15T19:30:00"
        endTime: showtimeData.endTime, // Format: "2025-11-15T22:00:00"
      };

      const response = await axiosInstance.post('/manager/showtimes', payload);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Tạo lịch chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể tạo lịch chiếu',
      };
    }
  },

  /**
   * Cập nhật lịch chiếu (Manager)
   * @param {number} showtimeId - ID của lịch chiếu
   * @param {Object} showtimeData - Dữ liệu lịch chiếu cần cập nhật
   * @returns {Promise<Object>} Response từ server
   */
  updateShowtime: async (showtimeId, showtimeData) => {
    try {
      const payload = {
        movieId: showtimeData.movieId,
        language: mapLanguageToBackend(showtimeData.language),
        roomType: mapRoomTypeToBackend(showtimeData.roomType),
        startTime: showtimeData.startTime,
        endTime: showtimeData.endTime,
      };

      const response = await axiosInstance.put(`/manager/showtimes/${showtimeId}`, payload);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật lịch chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể cập nhật lịch chiếu',
      };
    }
  },

  /**
   * Xóa lịch chiếu (Manager)
   * @param {number} showtimeId - ID của lịch chiếu
   * @returns {Promise<Object>} Response từ server
   */
  deleteShowtime: async (showtimeId) => {
    try {
      const response = await axiosInstance.delete(`/manager/showtimes/${showtimeId}`);
      return {
        success: true,
        message: response.data.message || 'Xóa lịch chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể xóa lịch chiếu',
      };
    }
  },

  /**
   * Lấy showtimes public theo movieId, province và date (không cần đăng nhập)
   * @param {number} movieId - ID của phim
   * @param {string} province - Tỉnh/thành phố (optional)
   * @param {string} date - Ngày (format: YYYY-MM-DD)
   * @returns {Promise<Object>} Response từ server
   */
  getPublicShowtimes: async (movieId, province, date) => {
    try {
      const params = new URLSearchParams({
        movieId: movieId.toString(),
        date: date
      });
      if (province) {
        params.append('province', province);
      }

      const url = `/public/showtimes?${params.toString()}`;
      const response = await axiosInstance.get(url);
      const data = response.data.data || response.data || [];
      
      return {
        success: true,
        data: data,
        message: response.data.message || 'Lấy danh sách lịch chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách lịch chiếu',
        data: [],
      };
    }
  },

  /**
   * Lấy danh sách ghế đã đặt cho showtime (public - không cần đăng nhập)
   * @param {number} showtimeId - ID của lịch chiếu
   * @returns {Promise<Object>} Response từ server
   */
  getBookedSeats: async (showtimeId) => {
    try {
      const response = await axiosInstance.get(`/public/showtimes/${showtimeId}/booked-seats`);
      return {
        success: true,
        data: response.data.data || response.data || [],
        message: response.data.message || 'Lấy danh sách ghế đã đặt thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách ghế đã đặt',
        data: [],
      };
    }
  },

  // Export mapping functions for use in components
  mapLanguageToBackend,
  mapLanguageFromBackend,
  mapRoomTypeToBackend,
  mapRoomTypeFromBackend,
};

export default showtimeService;


