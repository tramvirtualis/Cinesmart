import React, { useState, useEffect } from 'react';
import { voucherService } from '../../services/voucherService';
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

// Voucher Assign Modal Component
function VoucherAssignModal({ user, vouchers, onClose, onSave }) {
  const [newSelectedIds, setNewSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alreadyAssignedIds, setAlreadyAssignedIds] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);

  // Load vouchers đã gán cho user này từ backend
  useEffect(() => {
    const loadUserVouchers = async () => {
      setLoadingAssigned(true);
      try {
        // Gọi API admin để lấy vouchers của user này (endpoint mới trong CustomerController)
        const response = await axiosInstance.get(`/customer/${user.userId}/vouchers`);
        const userVouchers = response.data?.data || response.data || [];
        
        // Lấy danh sách voucher IDs đã được gán cho user này
        const assignedIds = userVouchers.map(v => v.voucherId || v.voucher?.voucherId).filter(Boolean);
        setAlreadyAssignedIds(assignedIds);
      } catch (error) {
        console.error('Error loading user vouchers:', error);
        // Nếu không load được, fallback về cách cũ (từ props)
        const fallbackIds = vouchers?.filter(v => v.isPublic === false && v.assignedUserIds?.includes(user.userId)).map(v => v.voucherId) || [];
        setAlreadyAssignedIds(fallbackIds);
      } finally {
        setLoadingAssigned(false);
      }
    };

    if (user?.userId) {
      loadUserVouchers();
    }
  }, [user?.userId, vouchers]);

  // Filter voucher riêng tư và chưa hết hạn
  const now = new Date();
  const privateVouchers = vouchers?.filter(v => {
    if (v.isPublic === true) return false; // Chỉ lấy voucher riêng tư
    
    // Kiểm tra chưa hết hạn
    if (v.endDate) {
      const endDate = new Date(v.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      if (now > endDate) return false; // Đã hết hạn
    }
    
    return true;
  }) || [];

  const handleToggle = (voucherId) => {
    // Cannot uncheck already assigned vouchers
    if (alreadyAssignedIds.includes(voucherId)) {
      return;
    }
    setNewSelectedIds(prev => {
      if (prev.includes(voucherId)) {
        return prev.filter(id => id !== voucherId);
      } else {
        return [...prev, voucherId];
      }
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Gán các voucher mới được chọn
      for (const voucherId of newSelectedIds) {
        const result = await voucherService.assignVoucherToCustomer(voucherId, user.userId);
        if (!result.success) {
          throw new Error(result.error || 'Không thể gán voucher');
        }
      }

      // Cập nhật state vouchers
      const updatedVouchers = vouchers.map(v => {
        if (!v.isPublic && newSelectedIds.includes(v.voucherId)) {
          const currentIds = v.assignedUserIds || [];
          return { ...v, assignedUserIds: [...currentIds, user.userId] };
        }
        return v;
      });

      onSave(updatedVouchers);
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi gán voucher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="movie-modal-overlay" onClick={onClose}>
      <div className="movie-modal" onClick={(e) => e.stopPropagation()}>
        <div className="movie-modal__header">
          <h2>Gán voucher riêng tư cho {user.username}</h2>
          <button className="movie-modal__close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="movie-modal__content">
          {loadingAssigned ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.5)' }}>
              <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.2)', borderTop: '4px solid #e83b41', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ marginTop: '16px' }}>Đang tải danh sách voucher...</p>
            </div>
          ) : privateVouchers.length > 0 ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: 12, background: 'rgba(20, 15, 16, 0.5)' }}>
              {privateVouchers.map(voucher => {
                const isAlreadyAssigned = alreadyAssignedIds.includes(voucher.voucherId);
                const isSelected = isAlreadyAssigned || newSelectedIds.includes(voucher.voucherId);
                return (
                  <label 
                    key={voucher.voucherId} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12, 
                      padding: '12px 0', 
                      cursor: isAlreadyAssigned ? 'not-allowed' : 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      opacity: isAlreadyAssigned ? 0.7 : 1
                    }}
                    onClick={(e) => {
                      if (isAlreadyAssigned) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isAlreadyAssigned}
                      onChange={() => handleToggle(voucher.voucherId)}
                      style={{ cursor: isAlreadyAssigned ? 'not-allowed' : 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {voucher.name}
                        {isAlreadyAssigned && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', background: '#4caf50', borderRadius: 4, color: '#fff' }}>
                            Đã gán
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                        Mã: {voucher.code} • {voucher.discountType === 'PERCENT' ? `Giảm ${voucher.discountValue}%` : `Giảm ${new Intl.NumberFormat('vi-VN').format(voucher.discountValue)}đ`}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.5)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16, opacity: 0.5 }}>
                <path d="M20 7h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <path d="M12 12v6M9 15h6"/>
              </svg>
              <p>Chưa có voucher riêng tư nào</p>
            </div>
          )}
        </div>
        <div className="movie-modal__footer">
          <button className="btn btn--ghost" onClick={onClose} disabled={loading}>Hủy</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={newSelectedIds.length === 0 || loading}>
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoucherAssignModal;
