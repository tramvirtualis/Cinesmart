import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Tạo axios instance với cấu hình mặc định (giống authService)
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Quan trọng: cho phép gửi và nhận cookies/session
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

export const updateCustomerProfile = async (userId, profileData) => {
  try {
    const res = await axiosInstance.put(`/customer/${userId}/profile`, profileData);
    // Backend trả về { success, message, data }
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Cập nhật thất bại');
  } catch (err) {
    throw err;
  }
};

export const uploadAvatar = async (userId, file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await axiosInstance.post(`/customer/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (res.data.success && res.data.data) {
      return res.data.data.avatar;
    }
    throw new Error(res.data.message || 'Upload avatar thất bại');
  } catch (err) {
    throw err;
  }
};

export const deleteAvatar = async (userId) => {
  try {
    const res = await axiosInstance.delete(`/customer/${userId}/avatar`);

    if (res.data.success) {
      return true;
    }
    throw new Error(res.data.message || 'Xóa avatar thất bại');
  } catch (err) {
    throw err;
  }
};

export const getCurrentProfile = async () => {
  try {
    const res = await axiosInstance.get('/customer/profile');
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Lấy thông tin profile thất bại');
  } catch (err) {
    throw err;
  }
};

export const getMyOrders = async () => {
  try {
    const res = await axiosInstance.get('/customer/orders');
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Lấy danh sách đơn hàng thất bại');
  } catch (err) {
    throw err;
  }
};

export const getAllOrdersAdmin = async () => {
  try {
    const res = await axiosInstance.get('/customer/admin/orders');
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Lấy danh sách đơn hàng thất bại');
  } catch (err) {
    throw err;
  }
};

export const getAllOrdersManager = async () => {
  try {
    const res = await axiosInstance.get('/manager/orders');
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Lấy danh sách đơn hàng thất bại');
  } catch (err) {
    throw err;
  }
};

export const getExpenseStatistics = async () => {
  try {
    console.log('Calling expense-statistics API...');
    const res = await axiosInstance.get('/customer/expense-statistics');
    console.log('Expense statistics API response:', res.data);
    if (res.data.success && res.data.data) {
      console.log('Expense statistics data:', res.data.data);
      return res.data.data;
    }
    console.error('API response missing success or data:', res.data);
    throw new Error(res.data.message || 'Lấy thống kê chi tiêu thất bại');
  } catch (err) {
    console.error('Error calling expense-statistics API:', err);
    console.error('Error response:', err.response?.data);
    throw err;
  }
};

export const updateOldOrders = async () => {
  try {
    console.log('Calling update-old-orders API...');
    const res = await axiosInstance.post('/customer/update-old-orders');
    console.log('Update old orders API response:', res.data);
    if (res.data.success && res.data.data) {
      console.log('Update result:', res.data.data);
      return res.data.data;
    }
    throw new Error(res.data.message || 'Cập nhật đơn hàng cũ thất bại');
  } catch (err) {
    console.error('Error calling update-old-orders API:', err);
    throw err;
  }
};

export const checkPassword = async () => {
  try {
    const res = await axiosInstance.get('/customer/password/check');
    if (res.data.success) {
      return res.data.hasPassword;
    }
    throw new Error(res.data.message || 'Kiểm tra mật khẩu thất bại');
  } catch (err) {
    throw err;
  }
};

export const updatePassword = async (oldPassword, newPassword, confirmPassword) => {
  try {
    const res = await axiosInstance.put('/customer/password/update', {
      oldPassword,
      newPassword,
      confirmPassword
    });
    if (res.data.success) {
      return true;
    }
    throw new Error(res.data.message || 'Đổi mật khẩu thất bại');
  } catch (err) {
    throw err;
  }
};

export const createPassword = async (newPassword, confirmPassword) => {
  try {
    const res = await axiosInstance.post('/customer/password/create', {
      newPassword,
      confirmPassword
    });
    if (res.data.success) {
      return true;
    }
    throw new Error(res.data.message || 'Tạo mật khẩu thất bại');
  } catch (err) {
    throw err;
  }
};

export const cancelOrder = async (orderId, reason) => {
  try {
    const res = await axiosInstance.post(`/customer/orders/${orderId}/cancel`, {
      reason,
    });
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Hủy đơn hàng thất bại');
  } catch (err) {
    throw err;
  }
};

export const cancelOrderAdmin = async (orderId, reason) => {
  try {
    const res = await axiosInstance.post(`/customer/admin/orders/${orderId}/cancel`, {
      reason,
    });
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Hủy đơn hàng thất bại');
  } catch (err) {
    throw err;
  }
};