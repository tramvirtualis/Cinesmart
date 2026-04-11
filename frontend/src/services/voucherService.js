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

// Map DiscountType từ frontend sang backend
const mapDiscountTypeToBackend = (type) => {
  // Frontend sử dụng 'AMOUNT' nhưng backend sử dụng 'VALUE'
  if (type === 'AMOUNT') {
    return 'VALUE';
  }
  return type; // PERCENT giữ nguyên
};

// Map DiscountType từ backend sang frontend
const mapDiscountTypeFromBackend = (type) => {
  // Backend sử dụng 'VALUE' nhưng frontend hiển thị 'AMOUNT'
  if (type === 'VALUE') {
    return 'AMOUNT';
  }
  return type; // PERCENT giữ nguyên
};

// Map VoucherScope từ frontend sang backend
const mapVoucherScopeToBackend = (isPublic) => {
  return isPublic ? 'PUBLIC' : 'PRIVATE';
};

// Map VoucherScope từ backend sang frontend
const mapVoucherScopeFromBackend = (scope) => {
  return scope === 'PUBLIC';
};

export const voucherService = {
  mapDiscountTypeFromBackend,
  mapVoucherScopeFromBackend,

  /**
   * Lấy tất cả voucher (Admin only)
   * @param {string} scope - Optional: 'PUBLIC' hoặc 'PRIVATE'
   * @returns {Promise<Object>} Response từ server
   */
  getAllVouchers: async (scope = null) => {
    try {
      const url = scope ? `/admin/vouchers?scope=${scope}` : '/admin/vouchers';
      const response = await axiosInstance.get(url);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy danh sách voucher thành công',
      };
    } catch (error) {
      // Backend validation errors được trả về trong error.response.data.message
      const errorMessage = error.response?.data?.message || error.message || 'Không thể lấy danh sách voucher';
      return {
        success: false,
        error: errorMessage,
        validationErrors: error.response?.data?.errors || null,
      };
    }
  },

  /**
   * Lấy danh sách voucher công khai (Public endpoint, không cần đăng nhập)
   * @returns {Promise<Object>} Response từ server
   */
  getPublicVouchers: async () => {
    try {
      console.log('voucherService: Calling /public/vouchers...');
      const response = await axiosInstance.get('/public/vouchers');
      console.log('voucherService: Response received:', response);
      console.log('voucherService: Response data:', response.data);
      // Endpoint public trả về trực tiếp array, không có wrapper
      const vouchers = Array.isArray(response.data) ? response.data : (response.data.data || []);
      console.log('voucherService: Parsed vouchers:', vouchers.length);
      return {
        success: true,
        data: vouchers,
        message: 'Lấy danh sách voucher thành công',
      };
    } catch (error) {
      console.error('voucherService: Error loading public vouchers:', error);
      console.error('voucherService: Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể lấy danh sách voucher';
      return {
        success: false,
        error: errorMessage,
        data: [],
      };
    }
  },

  /**
   * Lấy voucher theo ID
   * @param {number} voucherId - ID của voucher
   * @returns {Promise<Object>} Response từ server
   */
  getVoucherById: async (voucherId) => {
    try {
      const response = await axiosInstance.get(`/admin/vouchers/${voucherId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Lấy thông tin voucher thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể lấy thông tin voucher';
      return {
        success: false,
        error: errorMessage,
        validationErrors: error.response?.data?.errors || null,
      };
    }
  },

  /**
   * Tạo voucher mới
   * @param {Object} voucherData - Dữ liệu voucher
   * @returns {Promise<Object>} Response từ server
   */
  createVoucher: async (voucherData) => {
    try {
      // Map dữ liệu từ frontend format sang backend format
      const backendData = {
        code: voucherData.code,
        name: voucherData.name,
        description: voucherData.description || null,
        discountType: mapDiscountTypeToBackend(voucherData.discountType),
        discountValue: voucherData.discountValue,
        maxDiscountAmount: voucherData.maxDiscount || null,
        minOrderAmount: voucherData.minOrder || null,
        startDate: voucherData.startDate ? `${voucherData.startDate}T00:00:00` : null,
        endDate: voucherData.endDate ? `${voucherData.endDate}T23:59:59` : null,
        scope: mapVoucherScopeToBackend(voucherData.isPublic),
        image: voucherData.image || null,
      };

      const response = await axiosInstance.post('/admin/vouchers', backendData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Tạo voucher thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo voucher';
      return {
        success: false,
        error: errorMessage,
        validationErrors: error.response?.data?.errors || null,
      };
    }
  },

  /**
   * Cập nhật voucher
   * @param {number} voucherId - ID của voucher
   * @param {Object} voucherData - Dữ liệu voucher cần cập nhật
   * @returns {Promise<Object>} Response từ server
   */
  updateVoucher: async (voucherId, voucherData) => {
    try {
      // Map dữ liệu từ frontend format sang backend format
      const backendData = {};
      
      if (voucherData.code !== undefined) backendData.code = voucherData.code;
      if (voucherData.name !== undefined) backendData.name = voucherData.name;
      if (voucherData.description !== undefined) backendData.description = voucherData.description || null;
      if (voucherData.discountType !== undefined) backendData.discountType = mapDiscountTypeToBackend(voucherData.discountType);
      if (voucherData.discountValue !== undefined) backendData.discountValue = voucherData.discountValue;
      if (voucherData.maxDiscount !== undefined) backendData.maxDiscountAmount = voucherData.maxDiscount || null;
      if (voucherData.minOrder !== undefined) backendData.minOrderAmount = voucherData.minOrder || null;
      if (voucherData.startDate !== undefined) backendData.startDate = voucherData.startDate ? `${voucherData.startDate}T00:00:00` : null;
      if (voucherData.endDate !== undefined) backendData.endDate = voucherData.endDate ? `${voucherData.endDate}T23:59:59` : null;
      if (voucherData.isPublic !== undefined) backendData.scope = mapVoucherScopeToBackend(voucherData.isPublic);
      if (voucherData.image !== undefined) backendData.image = voucherData.image || null;

      const response = await axiosInstance.put(`/admin/vouchers/${voucherId}`, backendData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Cập nhật voucher thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể cập nhật voucher';
      return {
        success: false,
        error: errorMessage,
        validationErrors: error.response?.data?.errors || null,
      };
    }
  },

  /**
   * Xóa voucher
   * @param {number} voucherId - ID của voucher
   * @returns {Promise<Object>} Response từ server
   */
  deleteVoucher: async (voucherId) => {
    try {
      const response = await axiosInstance.delete(`/admin/vouchers/${voucherId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Xóa voucher thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể xóa voucher';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Gán voucher cho khách hàng
   * @param {number} voucherId - ID của voucher
   * @param {number} customerId - ID của khách hàng
   * @returns {Promise<Object>} Response từ server
   */
  assignVoucherToCustomer: async (voucherId, customerId) => {
    try {
      const response = await axiosInstance.post(`/admin/vouchers/${voucherId}/assign/${customerId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Gán voucher cho khách hàng thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể gán voucher';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Bỏ gán voucher khỏi khách hàng
   * @param {number} voucherId - ID của voucher
   * @param {number} customerId - ID của khách hàng
   * @returns {Promise<Object>} Response từ server
   */
  unassignVoucherFromCustomer: async (voucherId, customerId) => {
    try {
      const response = await axiosInstance.delete(`/admin/vouchers/${voucherId}/unassign/${customerId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Bỏ gán voucher khỏi khách hàng thành công',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể bỏ gán voucher';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};

export default voucherService;


