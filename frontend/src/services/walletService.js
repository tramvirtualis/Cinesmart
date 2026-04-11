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
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message = error.response.data?.message || error.response.data?.error || 'Có lỗi xảy ra';
      return Promise.reject(new Error(message));
    }
    if (error.request) {
      return Promise.reject(new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'));
    }
    return Promise.reject(new Error(error.message || 'Có lỗi xảy ra'));
  }
);

export const walletService = {
  getWallet: async () => {
    const res = await axiosInstance.get('/wallet/me');
    if (res.data.success) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Không thể tải thông tin ví');
  },

  getTransactions: async () => {
    const res = await axiosInstance.get('/wallet/me/transactions');
    if (res.data.success) {
      return res.data.data || [];
    }
    throw new Error(res.data.message || 'Không thể tải lịch sử giao dịch');
  },

  topUp: async ({ amount, note }) => {
    const res = await axiosInstance.post('/wallet/me/top-up', { amount, note });
    if (res.data.success) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Nạp ví thất bại');
  },
};

export const walletPinService = {
  /**
   * Lấy trạng thái PIN (có PIN hay chưa, có bị lock không)
   */
  getPinStatus: async () => {
    const res = await axiosInstance.get('/wallet/pin/status');
    if (res.data.success) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Không thể tải trạng thái PIN');
  },

  /**
   * Tạo mã PIN mới
   */
  createPin: async ({ pin, confirmPin }) => {
    const res = await axiosInstance.post('/wallet/pin/create', { pin, confirmPin });
    if (res.data.success) {
      return res.data;
    }
    throw new Error(res.data.message || 'Tạo mã PIN thất bại');
  },

  /**
   * Cập nhật mã PIN
   */
  updatePin: async ({ currentPin, newPin, confirmPin }) => {
    const res = await axiosInstance.put('/wallet/pin/update', { currentPin, newPin, confirmPin });
    if (res.data.success) {
      return res.data;
    }
    throw new Error(res.data.message || 'Đổi mã PIN thất bại');
  },

  /**
   * Xác thực mã PIN (dùng cho các giao dịch quan trọng)
   */
  verifyPin: async ({ pin }) => {
    const res = await axiosInstance.post('/wallet/pin/verify', { pin });
    if (res.data.success) {
      return res.data.valid;
    }
    throw new Error(res.data.message || 'Xác thực mã PIN thất bại');
  },

  /**
   * Gửi OTP để quên mã PIN
   */
  sendForgotPinOtp: async (email) => {
    const res = await axiosInstance.post('/wallet/pin/forgot/send-otp', { email });
    if (res.data.success) {
      return { success: true, message: res.data.message };
    }
    throw new Error(res.data.message || 'Gửi OTP thất bại');
  },

  /**
   * Đặt lại mã PIN sau khi xác thực OTP
   */
  resetPinWithOtp: async ({ email, otp, newPin, confirmPin }) => {
    const res = await axiosInstance.post('/wallet/pin/forgot/reset', {
      email,
      otp,
      newPin,
      confirmPin
    });
    if (res.data.success) {
      return { success: true, message: res.data.message };
    }
    throw new Error(res.data.message || 'Đặt lại mã PIN thất bại');
  },
};

