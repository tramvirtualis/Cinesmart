import React, { useState, useEffect } from 'react';
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

// Thêm interceptor để tự động thêm token vào header
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

const PasswordManagement = () => {
  const [hasPassword, setHasPassword] = useState(null);
  const [loadingPasswordCheck, setLoadingPasswordCheck] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Detect user role and set API base path
  const getPasswordApiBase = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const role = user.role;
        if (role === 'ADMIN') {
          return '/admin/password';
        } else if (role === 'MANAGER') {
          return '/manager/password';
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    // Default to customer
    return '/customer/password';
  };

  // Load password status on mount
  useEffect(() => {
    const loadPasswordStatus = async () => {
      setLoadingPasswordCheck(true);
      setPasswordMessage({ type: '', text: '' });
      try {
        const apiBase = getPasswordApiBase();
        const res = await axiosInstance.get(`${apiBase}/check`);
        if (res.data.success) {
          const hasPwd = res.data.hasPassword;
          const isTrue = hasPwd === true || hasPwd === 'true' || hasPwd === 1;
          setHasPassword(isTrue);
        } else {
          throw new Error(res.data.message || 'Kiểm tra mật khẩu thất bại');
        }
      } catch (error) {
        console.error('Error checking password status:', error);
        setHasPassword(false);
        if (error.response?.status === 403) {
          setPasswordMessage({ type: 'error', text: 'Bạn không có quyền truy cập tài nguyên này' });
        }
      } finally {
        setLoadingPasswordCheck(false);
      }
    };
    
    loadPasswordStatus();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    // Validation regex giống đăng ký
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

    try {
      if (hasPassword === true) {
        // Update password
        if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
          setPasswordMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu không khớp' });
          return;
        }
        if (passwordForm.newPassword.length < 8 || passwordForm.newPassword.length > 32) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải từ 8 đến 32 ký tự' });
          return;
        }
        if (!passwordRegex.test(passwordForm.newPassword)) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số' });
          return;
        }
        if (passwordForm.oldPassword === passwordForm.newPassword) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu cũ' });
          return;
        }
        const apiBase = getPasswordApiBase();
        console.log('Updating password with API base:', apiBase);
        try {
          const res = await axiosInstance.put(`${apiBase}/update`, {
            oldPassword: passwordForm.oldPassword,
            newPassword: passwordForm.newPassword,
            confirmPassword: passwordForm.confirmPassword
          });
          console.log('Update password response:', res.data);
          if (!res.data.success) {
            throw new Error(res.data.message || 'Đổi mật khẩu thất bại');
          }
        } catch (error) {
          console.error('Error updating password:', error);
          console.error('Error response:', error.response?.data);
          throw error;
        }
        setPasswordMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        // Create password
        if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
          setPasswordMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu và xác nhận mật khẩu không khớp' });
          return;
        }
        if (passwordForm.newPassword.length < 8 || passwordForm.newPassword.length > 32) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu phải từ 8 đến 32 ký tự' });
          return;
        }
        if (!passwordRegex.test(passwordForm.newPassword)) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số' });
          return;
        }
        const apiBase = getPasswordApiBase();
        console.log('Creating password with API base:', apiBase);
        try {
          const res = await axiosInstance.post(`${apiBase}/create`, {
            newPassword: passwordForm.newPassword,
            confirmPassword: passwordForm.confirmPassword
          });
          console.log('Create password response:', res.data);
          if (!res.data.success) {
            throw new Error(res.data.message || 'Tạo mật khẩu thất bại');
          }
        } catch (error) {
          console.error('Error creating password:', error);
          console.error('Error response:', error.response?.data);
          throw error;
        }
        setPasswordMessage({ type: 'success', text: 'Tạo mật khẩu thành công!' });
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setHasPassword(true);
      }
    } catch (error) {
      console.error('Password submit error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
      console.error('Error message:', errorMessage);
      setPasswordMessage({ type: 'error', text: errorMessage });
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card__header">
        <h2 className="admin-card__title">Cập nhật mật khẩu</h2>
      </div>
      <div className="admin-card__content">
        {loadingPasswordCheck ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#c9c4c5' }}>
            <div style={{
              display: 'inline-block',
              width: '48px',
              height: '48px',
              border: '4px solid rgba(232, 59, 65, 0.3)',
              borderTop: '4px solid #e83b41',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px'
            }}></div>
            <p style={{ margin: 0 }}>Đang kiểm tra trạng thái mật khẩu...</p>
          </div>
        ) : hasPassword === null ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#c9c4c5' }}>
            <div style={{
              display: 'inline-block',
              width: '48px',
              height: '48px',
              border: '4px solid rgba(232, 59, 65, 0.3)',
              borderTop: '4px solid #e83b41',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px'
            }}></div>
            <p style={{ margin: 0 }}>Đang kiểm tra trạng thái mật khẩu...</p>
          </div>
        ) : (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            {hasPassword === false && (
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(255, 209, 89, 0.1) 0%, rgba(255, 209, 89, 0.05) 100%)',
                border: '1px solid rgba(255, 209, 89, 0.3)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <svg style={{ width: '24px', height: '24px', color: '#ffd159', flexShrink: 0, marginTop: '2px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p style={{ margin: '0 0 8px 0', color: '#ffd159', fontWeight: 600 }}>Bạn chưa có mật khẩu</p>
                    <p style={{ margin: 0, color: '#c9c4c5', fontSize: '14px' }}>
                      Bạn đang đăng nhập bằng tài khoản Google. Tạo mật khẩu để bảo vệ tài khoản tốt hơn và có thể đăng nhập bằng email/mật khẩu.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {passwordMessage.text && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  backgroundColor: passwordMessage.type === 'success' 
                    ? 'rgba(76, 175, 80, 0.2)' 
                    : 'rgba(244, 67, 54, 0.2)',
                  border: `1px solid ${passwordMessage.type === 'success' 
                    ? 'rgba(76, 175, 80, 0.5)' 
                    : 'rgba(244, 67, 54, 0.5)'}`,
                  color: passwordMessage.type === 'success' ? '#4CAF50' : '#f44336'
                }}>
                  {passwordMessage.text}
                </div>
              )}

              {hasPassword === true && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#c9c4c5', fontWeight: 600, fontSize: '14px' }}>
                    Mật khẩu cũ
                  </label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: '#2d2627',
                      border: '1px solid #4a3f41',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                    placeholder="Nhập mật khẩu cũ"
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9c4c5', fontWeight: 600, fontSize: '14px' }}>
                  {hasPassword === true ? 'Mật khẩu mới' : 'Mật khẩu'} <span style={{ color: '#6b6264', fontSize: '12px' }}>(8-32 ký tự, có chữ hoa, chữ thường, số)</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#2d2627',
                    border: '1px solid #4a3f41',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                  placeholder={hasPassword === true ? "Nhập mật khẩu mới (8-32 ký tự, có chữ hoa, chữ thường, số)" : "Nhập mật khẩu (8-32 ký tự, có chữ hoa, chữ thường, số)"}
                  required
                  minLength={8}
                  maxLength={32}
                  pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9c4c5', fontWeight: 600, fontSize: '14px' }}>
                  Xác nhận {hasPassword === true ? 'mật khẩu mới' : 'mật khẩu'}
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#2d2627',
                    border: '1px solid #4a3f41',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                  placeholder={hasPassword === true ? "Nhập lại mật khẩu mới" : "Nhập lại mật khẩu"}
                  required
                  minLength={8}
                  maxLength={32}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{
                    minWidth: '220px',
                    padding: '14px 32px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {hasPassword === true ? 'Đổi mật khẩu' : 'Tạo mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordManagement;

