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

// Map RoomType từ frontend sang backend
const mapRoomTypeToBackend = (roomType) => {
  const mapping = {
    '2D': 'TYPE_2D',
    '3D': 'TYPE_3D',
    'DELUXE': 'DELUXE'
  };
  return mapping[roomType] || roomType;
};

// Map RoomType từ backend sang frontend
const mapRoomTypeFromBackend = (roomType) => {
  const mapping = {
    'TYPE_2D': '2D',
    'TYPE_3D': '3D',
    'DELUXE': 'DELUXE'
  };
  return mapping[roomType] || roomType;
};


const mapRoomFromBackend = (room) => ({
  roomId: room.roomId,
  roomName: room.roomName,
  roomType: mapRoomTypeFromBackend(room.roomType),
  hasPanorama: room.hasPanorama,
  rows: room.rows,
  cols: room.cols,
  seats: (room.seats || []).map((seat) => ({
    seatId: seat.seatId,
    type: seat.type,
    row: seat.seatRow,
    column: seat.seatColumn,
  })),
});

export const isPanoramaEnabled = (room) => {
  return room?.hasPanorama === true;
};

export const cinemaRoomService = {
  /**
   * Tạo phòng chiếu mới (Admin)
   * @param {Object} roomData - Dữ liệu phòng chiếu { roomName, roomType, cinemaComplexId, rows, cols }
   * @returns {Promise<Object>} Response từ server
   */
  createCinemaRoom: async (roomData) => {
    try {
      const payload = {
        roomName: roomData.roomName,
        roomType: mapRoomTypeToBackend(roomData.roomType),
        hasPanorama: roomData.hasPanorama,
        cinemaComplexId: roomData.cinemaComplexId,
        rows: roomData.rows,
        cols: roomData.cols,
        emptyCells: roomData.emptyCells || [],
      };
      
      const response = await axiosInstance.post('/admin/cinema-rooms', payload);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Tạo phòng chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể tạo phòng chiếu',
      };
    }
  },

  /**
   * Lấy danh sách phòng chiếu theo cụm rạp (Admin)
   * @param {number} complexId - ID của cụm rạp
   * @returns {Promise<Object>} Response từ server
   */
  getRoomsByComplexId: async (complexId) => {
    try {
      const response = await axiosInstance.get(`/admin/cinema-rooms/complex/${complexId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy danh sách phòng chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách phòng chiếu',
      };
    }
  },

  /**
   * Lấy thông tin phòng chiếu theo ID (Admin)
   * @param {number} roomId - ID của phòng chiếu
   * @returns {Promise<Object>} Response từ server
   */
  getRoomById: async (roomId) => {
    try {
      const response = await axiosInstance.get(`/admin/cinema-rooms/${roomId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy thông tin phòng chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin phòng chiếu',
      };
    }
  },

  /**
   * Cập nhật phòng chiếu (Admin)
   * @param {number} roomId - ID của phòng chiếu
   * @param {Object} roomData - Dữ liệu phòng chiếu cần cập nhật
   * @returns {Promise<Object>} Response từ server
   */
  updateCinemaRoom: async (roomId, roomData) => {
    try {
      const payload = {
        roomName: roomData.roomName,
        roomType: mapRoomTypeToBackend(roomData.roomType),
        hasPanorama: roomData.hasPanorama,
        cinemaComplexId: roomData.cinemaComplexId,
        rows: roomData.rows,
        cols: roomData.cols,
        emptyCells: roomData.emptyCells || [],
        resetLayout: roomData.resetLayout === true,
      };
      
      const response = await axiosInstance.put(`/admin/cinema-rooms/${roomId}`, payload);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật phòng chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể cập nhật phòng chiếu',
      };
    }
  },

  /**
   * Xóa phòng chiếu (Admin)
   * @param {number} roomId - ID của phòng chiếu
   * @returns {Promise<Object>} Response từ server
   */
  deleteCinemaRoom: async (roomId) => {
    try {
      const response = await axiosInstance.delete(`/admin/cinema-rooms/${roomId}`);
      return {
        success: true,
        message: response.data.message || 'Xóa phòng chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể xóa phòng chiếu',
      };
    }
  },

  // ============ MANAGER METHODS ============

  /**
   * Tạo phòng chiếu mới (Manager)
   * @param {Object} roomData - Dữ liệu phòng chiếu { roomName, roomType, cinemaComplexId, rows, cols }
   * @returns {Promise<Object>} Response từ server
   */
  createCinemaRoomManager: async (roomData) => {
    try {
      const payload = {
        roomName: roomData.roomName,
        roomType: mapRoomTypeToBackend(roomData.roomType),
        hasPanorama: roomData.hasPanorama,
        cinemaComplexId: roomData.cinemaComplexId,
        rows: roomData.rows,
        cols: roomData.cols,
        emptyCells: roomData.emptyCells || [],
      };
      
      const response = await axiosInstance.post('/manager/cinema-rooms', payload);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Tạo phòng chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể tạo phòng chiếu',
      };
    }
  },

  /**
   * Lấy danh sách phòng chiếu theo cụm rạp (Manager)
   * @param {number} complexId - ID của cụm rạp
   * @returns {Promise<Object>} Response từ server
   */
  getRoomsByComplexIdManager: async (complexId) => {
    try {
      const response = await axiosInstance.get(`/manager/cinema-rooms/complex/${complexId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy danh sách phòng chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách phòng chiếu',
      };
    }
  },

  /**
   * Cập nhật phòng chiếu (Manager)
   * @param {number} roomId - ID của phòng chiếu
   * @param {Object} roomData - Dữ liệu phòng chiếu cần cập nhật
   * @returns {Promise<Object>} Response từ server
   */
  updateCinemaRoomManager: async (roomId, roomData) => {
    try {
      const payload = {
        roomName: roomData.roomName,
        roomType: mapRoomTypeToBackend(roomData.roomType),
        hasPanorama: roomData.hasPanorama,
        cinemaComplexId: roomData.cinemaComplexId,
        rows: roomData.rows,
        cols: roomData.cols,
        emptyCells: roomData.emptyCells || [],
        resetLayout: roomData.resetLayout === true,
      };
      
      const response = await axiosInstance.put(`/manager/cinema-rooms/${roomId}`, payload);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật phòng chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể cập nhật phòng chiếu',
      };
    }
  },

  /**
   * Xóa phòng chiếu (Manager)
   * @param {number} roomId - ID của phòng chiếu
   * @returns {Promise<Object>} Response từ server
   */
  deleteCinemaRoomManager: async (roomId) => {
    try {
      const response = await axiosInstance.delete(`/manager/cinema-rooms/${roomId}`);
      return {
        success: true,
        message: response.data.message || 'Xóa phòng chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể xóa phòng chiếu',
      };
    }
  },

  /**
   * Cập nhật loại ghế (Admin)
   * @param {number} seatId - ID của ghế
   * @param {string} seatType - Loại ghế mới ('NORMAL', 'VIP', 'COUPLE')
   * @returns {Promise<Object>} Response từ server
   */
  updateSeatType: async (seatId, seatType) => {
    try {
      const response = await axiosInstance.put(`/admin/seats/${seatId}`, {
        type: seatType
      });
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật loại ghế thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể cập nhật loại ghế',
      };
    }
  },

  deleteSeat: async (seatId) => {
    try {
      await axiosInstance.delete(`/admin/seats/${seatId}`);
      return { success: true, message: 'Đã xóa ghế' };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể xóa ghế',
      };
    }
  },

  addSeat: async (roomId, payload) => {
    try {
      const body = {
        seatRow: payload.seatRow,
        seatColumn: payload.seatColumn,
        gridRows: payload.gridRows,
        gridCols: payload.gridCols,
        type: payload.type || 'NORMAL',
      };
      const response = await axiosInstance.post(`/admin/cinema-rooms/${roomId}/seats`, body);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Đã thêm ghế',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể thêm ghế',
      };
    }
  },

  /**
   * Cập nhật loại ghế (Manager)
   * @param {number} seatId - ID của ghế
   * @param {string} seatType - Loại ghế mới ('NORMAL', 'VIP', 'COUPLE')
   * @returns {Promise<Object>} Response từ server
   */
  updateSeatTypeManager: async (seatId, seatType) => {
    try {
      const response = await axiosInstance.put(`/manager/seats/${seatId}`, {
        type: seatType
      });
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật loại ghế thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể cập nhật loại ghế',
      };
    }
  },

  deleteSeatManager: async (seatId) => {
    try {
      await axiosInstance.delete(`/manager/seats/${seatId}`);
      return { success: true, message: 'Đã xóa ghế' };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể xóa ghế',
      };
    }
  },

  /**
   * @param {number} roomId
   * @param {{ seatRow: string, seatColumn: number, gridRows: number, gridCols: number, type?: string }} payload
   */
  addSeatManager: async (roomId, payload) => {
    try {
      const body = {
        seatRow: payload.seatRow,
        seatColumn: payload.seatColumn,
        gridRows: payload.gridRows,
        gridCols: payload.gridCols,
        type: payload.type || 'NORMAL',
      };
      const response = await axiosInstance.post(`/manager/cinema-rooms/${roomId}/seats`, body);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Đã thêm ghế',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể thêm ghế',
      };
    }
  },

  /**
   * Kiểm tra xem phòng chiếu có đặt chỗ hay không (Admin)
   * @param {number} roomId - ID của phòng chiếu
   * @returns {Promise<Object>} Response từ server { hasBookings: boolean }
   */
  checkRoomHasBookings: async (roomId) => {
    try {
      const response = await axiosInstance.get(`/admin/cinema-rooms/${roomId}/has-bookings`);
      return {
        success: true,
        hasBookings: response.data.hasBookings || false,
      };
    } catch (error) {
      return {
        success: false,
        hasBookings: false,
        error: error.message || 'Không thể kiểm tra đặt chỗ',
      };
    }
  },

  /**
   * Kiểm tra xem phòng chiếu có đặt chỗ hay không (Manager)
   * @param {number} roomId - ID của phòng chiếu
   * @returns {Promise<Object>} Response từ server { hasBookings: boolean }
   */
  checkRoomHasBookingsManager: async (roomId) => {
    try {
      const response = await axiosInstance.get(`/manager/cinema-rooms/${roomId}/has-bookings`);
      return {
        success: true,
        hasBookings: response.data.hasBookings || false,
      };
    } catch (error) {
      return {
        success: false,
        hasBookings: false,
        error: error.message || 'Không thể kiểm tra đặt chỗ',
      };
    }
  },

  /**
   * Lấy thông tin phòng chiếu với ghế (public - không cần đăng nhập)
   * @param {number} roomId - ID của phòng chiếu
   * @returns {Promise<Object>} Response từ server
   */
  getPublicRoomById: async (roomId) => {
    try {
      const response = await axiosInstance.get(`/public/cinema-rooms/${roomId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy thông tin phòng chiếu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin phòng chiếu',
      };
    }
  },

  // Helper để map RoomType / PanoramaType
  mapRoomTypeToBackend,
  mapRoomTypeFromBackend,
  mapRoomFromBackend,
};

export default cinemaRoomService;

