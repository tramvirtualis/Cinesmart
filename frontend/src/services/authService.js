import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Tạo axios instance với cấu hình mặc định
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Quan trọng: cho phép gửi và nhận cookies/session
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const authService = {
  /**
   * Gửi OTP đến email (cho đăng ký)
   * @param {string} email - Email người dùng
   * @returns {Promise<Object>} Response từ server
   */
  sendOtp: async (email) => {
    try {
      const response = await axiosInstance.post('/auth/send-otp', { email });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể gửi OTP',
      };
    }
  },

  /**
   * Đăng ký tài khoản mới
   * @param {Object} formData - Dữ liệu đăng ký
   * @returns {Promise<Object>} Response từ server
   */
  register: async (formData) => {
    try {
      const response = await axiosInstance.post('/auth/register', formData);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Đăng ký thất bại',
      };
    }
  },

  /**
   * Đăng nhập
   * @param {string} username - Tên đăng nhập
   * @param {string} password - Mật khẩu
   * @returns {Promise<Object>} Response từ server
   */
  login: async (username, password) => {
    try {
      const response = await axiosInstance.post('/auth/login', { username, password });
      const userData = response.data;
      
      // Debug: Log response để kiểm tra
      console.log('Login API response:', userData);
      console.log('Role from response:', userData.role);
      
      // Response thành công sẽ là object user + token
      const { token, role } = userData;
  
      // Lưu JWT token vào localStorage
      if (token) {
        localStorage.setItem('jwt', token);
      }
      localStorage.setItem('user', JSON.stringify(userData));
  
      // Không redirect ở đây, để component xử lý redirect
      // Service chỉ nên trả về data, không nên xử lý navigation
      
      return {
        success: true,
        data: userData, // trả toàn bộ object user + token
      };
    } catch (error) {
      // Nếu backend trả về lỗi với message
      let message = 'Tên đăng nhập hoặc mật khẩu không đúng';
      if (error.response && error.response.data && error.response.data.message) {
        const backendMessage = error.response.data.message;
        // Nếu message là tiếng Anh, chuyển sang tiếng Việt
        if (backendMessage === 'Invalid username or password') {
          message = 'Tên đăng nhập hoặc mật khẩu không đúng';
        } else {
          message = backendMessage;
        }
      } else if (error.message) {
        // Nếu error.message là tiếng Anh, chuyển sang tiếng Việt
        if (error.message === 'Invalid username or password' || error.message.includes('Invalid')) {
          message = 'Tên đăng nhập hoặc mật khẩu không đúng';
        } else {
          message = error.message;
        }
      }
  
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Đăng nhập bằng Google OAuth
   * @param {string} code - Authorization code trả về từ Google
   * @returns {Promise<Object>} Response từ server
   */
  loginWithGoogle: async (code) => {
    try {
      const response = await axiosInstance.post('/auth/google-login', { code });
      const userData = response.data;

      if (userData?.token) {
        localStorage.setItem('jwt', userData.token);
      }
      localStorage.setItem('user', JSON.stringify(userData));

      return {
        success: true,
        data: userData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Đăng nhập Google thất bại',
      };
    }
  },

  // ============= FORGOT PASSWORD APIs =============

  /**
   * Gửi OTP để đặt lại mật khẩu
   * @param {string} email - Email người dùng
   * @returns {Promise<Object>} Response từ server
   */
  sendForgotPasswordOtp: async (email) => {
    try {
      const response = await axiosInstance.post('/auth/forgot-password/send-otp', { email });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Mã OTP đã được gửi đến email của bạn',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể gửi OTP',
      };
    }
  },

  /**
   * Gửi lại OTP
   * @param {string} email - Email người dùng
   * @returns {Promise<Object>} Response từ server
   */
  resendForgotPasswordOtp: async (email) => {
    try {
      const response = await axiosInstance.post('/auth/forgot-password/resend-otp', { email });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Mã OTP mới đã được gửi',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể gửi lại OTP',
      };
    }
  },

  /**
   * Xác thực OTP
   * @param {string} email - Email người dùng
   * @param {string} otp - Mã OTP 6 chữ số
   * @returns {Promise<Object>} Response từ server (bao gồm token)
   */
  verifyForgotPasswordOtp: async (email, otp) => {
    try {
      const response = await axiosInstance.post('/auth/forgot-password/verify-otp', { email, otp });
      
      return {
        success: true,
        data: response.data,
        token: response.data.token,
        email: response.data.email,
        message: response.data.message || 'Xác thực OTP thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Mã OTP không đúng hoặc đã hết hạn',
      };
    }
  },

  /**
   * Đặt lại mật khẩu
   * @param {string} token - Token từ verify OTP
   * @param {string} newPassword - Mật khẩu mới
   * @returns {Promise<Object>} Response từ server
   */
  resetPassword: async (token, newPassword) => {
    try {
      const response = await axiosInstance.post('/auth/forgot-password/reset-password', { 
        token, 
        newPassword 
      });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Đặt lại mật khẩu thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể đặt lại mật khẩu',
      };
    }
  },

  /**
   * Kiểm tra thời gian còn lại của OTP
   * @returns {Promise<Object>} Response từ server
   */
  getOtpRemainingTime: async () => {
    try {
      const response = await axiosInstance.get('/auth/forgot-password/otp-remaining-time');
      
      return {
        success: true,
        remainingSeconds: response.data.remainingSeconds || 0,
      };
    } catch (error) {
      return {
        success: false,
        remainingSeconds: 0,
      };
    }
  },
};

export default authService;