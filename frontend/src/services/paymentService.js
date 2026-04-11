import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Thêm token vào header nếu có
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('PaymentService: Added Authorization header for', config.url);
    } else {
      console.warn('PaymentService: No JWT token found in localStorage for', config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Axios interceptor error:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    
    if (error.response) {
      const message = error.response.data?.message || error.response.data?.error || 'Có lỗi xảy ra';
      // Giữ nguyên error object để có thể access error.response trong catch block
      const customError = new Error(message);
      customError.response = error.response;
      customError.status = error.response.status;
      return Promise.reject(customError);
    }
    if (error.request) {
      return Promise.reject(new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'));
    }
    return Promise.reject(new Error(error.message || 'Có lỗi xảy ra'));
  }
);

export const paymentService = {
  /**
   * Tạo payment URL cho ZaloPay
   * @param {number} amount - Số tiền (VND)
   * @param {string} description - Mô tả đơn hàng
   * @param {string} orderId - ID đơn hàng
   * @param {Object} bookingInfo - Thông tin booking (optional)
   * @returns {Promise<Object>} Response từ server
   */
  createZaloPayOrder: async (amount, description, orderId, bookingInfo = null) => {
    try {
      const response = await axiosInstance.post('/payment/zalopay/create', {
        amount,
        description,
        orderId,
        bookingInfo
      });
      // Backend đã trả về {success: true, data: {...}}, không cần wrap thêm
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Không thể tạo đơn hàng thanh toán',
        data: null
      };
    }
  },

  /**
   * Hoàn tất đơn hàng sau khi thanh toán thành công
   * @param {string} appTransId - Transaction ID từ ZaloPay
   * @returns {Promise<Object>} Response từ server
   */
  completeZaloPayOrder: async (appTransId) => {
    try {
      const response = await axiosInstance.post(`/payment/zalopay/complete?appTransId=${encodeURIComponent(appTransId)}`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Không thể hoàn tất đơn hàng',
        data: null
      };
    }
  },

  /**
   * Kiểm tra trạng thái thanh toán ZaloPay
   * @param {string} appTransId - Transaction ID từ ZaloPay
   * @returns {Promise<Object>} Response từ server
   */
  checkPaymentStatus: async (appTransId) => {
    try {
      const response = await axiosInstance.get(`/payment/zalopay/status/${appTransId}`);
      return {
        success: response.data?.success,
        message: response.data?.message,
        data: response.data?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Không thể kiểm tra trạng thái thanh toán',
        data: null
      };
    }
  },

  /**
   * Tạo payment URL cho MoMo
   * @param {Object} payload - Payload chứa amount, voucherId, orderDescription
   * @returns {Promise<Object>} Response từ server
   */
  createMomoPayment: async (payload) => {
    try {
      const response = await axiosInstance.post('/payment/momo/create', payload);
      return {
        success: response.data?.success,
        message: response.data?.message,
        data: response.data?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Không thể tạo đơn hàng thanh toán MoMo',
        data: null
      };
    }
  },

  /**
   * Lấy thông tin đơn hàng theo transaction reference
   * @param {string} txnRef - Transaction reference
   * @returns {Promise<Object>} Response từ server
   */
  getOrderByTxnRef: async (txnRef) => {
    try {
      const response = await axiosInstance.get(`/payment/orders/${txnRef}`);
      return {
        success: response.data?.success,
        message: response.data?.message,
        data: response.data?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Không thể lấy thông tin đơn hàng',
        data: null
      };
    }
  },

  /**
   * Gửi email xác nhận đặt vé (fallback nếu callback/IPN không được gọi)
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} Response từ server
   */
  sendBookingConfirmationEmail: async (orderId) => {
    try {
      const response = await axiosInstance.post(`/payment/orders/${orderId}/send-confirmation-email`);
      return {
        success: response.data?.success,
        message: response.data?.message,
        data: response.data?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Không thể gửi email xác nhận',
        data: null
      };
    }
  },

  /**
   * Thanh toán bằng ví Cinesmart
   * @param {Object} payload - Payload chứa amount, voucherId, orderDescription, showtimeId, seatIds, foodCombos
   * @returns {Promise<Object>} Response từ server
   */
  createWalletPayment: async (payload) => {
    try {
      const token = localStorage.getItem('jwt');
      console.log('Calling /payment/wallet/create with payload:', payload);
      console.log('JWT token present:', !!token);
      if (token) {
        console.log('JWT token (first 20 chars):', token.substring(0, 20) + '...');
      }
      const response = await axiosInstance.post('/payment/wallet/create', payload);
      console.log('Wallet payment API response:', response.data);
      return {
        success: response.data?.success,
        message: response.data?.message,
        data: response.data?.data,
      };
    } catch (error) {
      console.error('Wallet payment API error:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error));
      console.error('Error status:', error.status || error.response?.status);
      console.error('Error response:', error.response?.data || error.response);
      console.error('Error headers:', error.response?.headers);
      
      let errorMessage = 'Không thể thanh toán bằng ví Cinesmart';
      
      if (error.response) {
        errorMessage = error.response.data?.message || 
                      error.response.data?.error || 
                      error.message || 
                      errorMessage;
      } else if (error.status) {
        if (error.status === 403) {
          errorMessage = 'Bạn không có quyền truy cập. Vui lòng đăng nhập lại.';
        } else if (error.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else {
          errorMessage = error.message || errorMessage;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      return {
        success: false,
        message: errorMessage,
        data: null
      };
    }
  },
};

// Export default để tương thích với code cũ
export default paymentService;
