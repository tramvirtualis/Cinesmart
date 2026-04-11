import React, { useState, useEffect } from 'react';
import { voucherService } from '../../services/voucherService';
import { useEnums } from '../../hooks/useEnums';
import cloudinaryService from '../../services/cloudinaryService';
import ConfirmDeleteModal from '../Common/ConfirmDeleteModal';

// Voucher Management Component
function VoucherManagement({ vouchers: initialVouchersList, users: usersList, onVouchersChange }) {
  const { enums, loading: enumsLoading } = useEnums();
  const [vouchers, setVouchers] = useState(initialVouchersList || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPublic, setFilterPublic] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENT',
    discountValue: '',
    maxDiscount: '',
    minOrder: '',
    startDate: '',
    endDate: '',
    isPublic: true,
    image: '',
    imageFile: null
  });
  const [imagePreview, setImagePreview] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [savingVoucher, setSavingVoucher] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Notification component
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Use mapping functions from voucherService
  const { mapDiscountTypeFromBackend, mapVoucherScopeFromBackend } = voucherService;

  // Load vouchers from API on mount
  useEffect(() => {
    const loadVouchers = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        setError('Vui lòng đăng nhập để tiếp tục');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await voucherService.getAllVouchers();
        if (result.success) {
          // Map vouchers from backend format to frontend format
          const mappedVouchers = (result.data || []).map(voucher => mapVoucherFromBackend(voucher));
          setVouchers(mappedVouchers);
          if (onVouchersChange) {
            onVouchersChange(mappedVouchers);
          }
          // Save to localStorage for Events page
          try {
            localStorage.setItem('adminVouchers', JSON.stringify(mappedVouchers));
          } catch (e) {
            console.error('Failed to save vouchers to localStorage', e);
          }
        } else {
          setError(result.error);
          if (result.error.includes('đăng nhập') || result.error.includes('hết hạn')) {
            setTimeout(() => {
              window.location.href = '/signin';
            }, 2000);
          }
        }
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách voucher');
      } finally {
        setLoading(false);
      }
    };
    loadVouchers();
  }, []); // Only run on mount

  // Sync with parent vouchers when they change (for backward compatibility)
  useEffect(() => {
    if (initialVouchersList && initialVouchersList.length >= 0) {
      // Only sync if we don't have vouchers loaded from API yet
      if (vouchers.length === 0 && initialVouchersList.length > 0) {
        setVouchers(initialVouchersList);
      }
    }
  }, [initialVouchersList]);

  // Map voucher from backend format to frontend format
  const mapVoucherFromBackend = (voucher) => {
    const discountType = mapDiscountTypeFromBackend(voucher.discountType);
    const isPublic = mapVoucherScopeFromBackend(voucher.scope);
    
    // Determine status based on dates (only compare dates, not time)
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const startDate = voucher.startDate ? new Date(voucher.startDate.split('T')[0]) : null;
    const endDate = voucher.endDate ? new Date(voucher.endDate.split('T')[0]) : null;
    
    let status = 'active'; // 'upcoming', 'active', 'expired'
    if (startDate && endDate) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      if (now < startDate) {
        status = 'upcoming'; // Chưa đến ngày bắt đầu
      } else if (now >= startDate && now <= endDate) {
        status = 'active'; // Đang hoạt động
      } else {
        status = 'expired'; // Đã hết hạn
      }
    }
    
    return {
      voucherId: voucher.voucherId,
      code: voucher.code,
      name: voucher.name,
      description: voucher.description || '',
      discountType: discountType,
      discountValue: voucher.discountValue,
      maxDiscount: voucher.maxDiscountAmount || 0,
      minOrder: voucher.minOrderAmount || 0,
      startDate: voucher.startDate ? voucher.startDate.split('T')[0] : '',
      endDate: voucher.endDate ? voucher.endDate.split('T')[0] : '',
      isPublic: isPublic,
      image: voucher.image || '',
      status: status, // 'upcoming', 'active', 'expired'
    };
  };

  const filtered = vouchers.filter(v => {
    const matchesSearch =
      v.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status: '' = all, 'true' = active, 'upcoming' = upcoming, 'expired' = expired
    let matchesStatus = true;
    if (filterStatus !== '') {
      if (filterStatus === 'true') {
        matchesStatus = v.status === 'active';
      } else if (filterStatus === 'upcoming') {
        matchesStatus = v.status === 'upcoming';
      } else if (filterStatus === 'expired') {
        matchesStatus = v.status === 'expired';
      }
    }
    
    const matchesType = !filterType || v.discountType === filterType;
    const matchesPublic = filterPublic === '' ? true : (filterPublic === 'true' ? v.isPublic : !v.isPublic);
    return matchesSearch && matchesStatus && matchesType && matchesPublic;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVouchers = filtered.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterType, filterPublic]);

  // Get status display info
  const getStatusInfo = (status) => {
    switch (status) {
      case 'upcoming':
        return { text: 'Sắp diễn ra', color: '#ff9800' };
      case 'active':
        return { text: 'Hoạt động', color: '#4caf50' };
      case 'expired':
        return { text: 'Đã kết thúc', color: '#9e9e9e' };
      default:
        return { text: 'Hoạt động', color: '#4caf50' };
    }
  };

  const handleAdd = () => {
    setEditingVoucher(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      discountType: 'PERCENT',
      discountValue: '',
      maxDiscount: '',
      minOrder: '',
      startDate: '',
      endDate: '',
      isPublic: true,
      image: '',
      imageFile: null
    });
    setImagePreview('');
    setValidationErrors({});
    setError(null);
    setShowModal(true);
  };

  const handleEdit = (v) => {
    setEditingVoucher(v);
    setFormData({
      code: v.code || '',
      name: v.name || '',
      description: v.description || '',
      discountType: v.discountType || 'PERCENT',
      discountValue: v.discountValue?.toString() || '',
      maxDiscount: v.maxDiscount?.toString() || '',
      minOrder: v.minOrder?.toString() || '',
      startDate: v.startDate || '',
      endDate: v.endDate || '',
      isPublic: v.isPublic !== undefined ? v.isPublic : true,
      image: v.image || '',
      imageFile: null
    });
    setImagePreview(v.image || '');
    setValidationErrors({});
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Basic validation for UX
    const errors = {};
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 10; // Cho phép tối đa 10 năm từ năm hiện tại
    const minYear = currentYear; // Tối thiểu là năm hiện tại
    
    if (!formData.code || formData.code.trim() === '') {
      errors.code = 'Mã voucher không được để trống';
    }
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Tên voucher không được để trống';
    }
    if (!formData.discountValue || Number(formData.discountValue) <= 0) {
      errors.discountValue = 'Giá trị giảm giá phải lớn hơn 0';
    }
    if (!formData.startDate) {
      errors.startDate = 'Ngày bắt đầu không được để trống';
    } else {
      const startYear = new Date(formData.startDate).getFullYear();
      if (startYear < minYear) {
        errors.startDate = `Năm bắt đầu không được nhỏ hơn ${minYear}`;
      } else if (startYear > maxYear) {
        errors.startDate = `Năm bắt đầu không được lớn hơn ${maxYear}`;
      }
    }
    if (!formData.endDate) {
      errors.endDate = 'Ngày kết thúc không được để trống';
    } else {
      const endYear = new Date(formData.endDate).getFullYear();
      if (endYear < minYear) {
        errors.endDate = `Năm kết thúc không được nhỏ hơn ${minYear}`;
      } else if (endYear > maxYear) {
        errors.endDate = `Năm kết thúc không được lớn hơn ${maxYear}`;
      }
    }
    if (formData.startDate && formData.endDate) {
      if (formData.startDate > formData.endDate) {
        errors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setValidationErrors({});
    setSavingVoucher(true);
    setError(null);

    try {
      // Upload image if there's a file (required if editing without existing image or creating new)
      let imageUrl = formData.image;
      if (formData.imageFile) {
        try {
          const uploadResult = await cloudinaryService.uploadSingle(formData.imageFile);
          if (uploadResult.success && uploadResult.url) {
            imageUrl = uploadResult.url;
          } else {
            setError(uploadResult.error || 'Không thể upload ảnh. Vui lòng thử lại.');
            setSavingVoucher(false);
            return;
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          setError(uploadError.message || 'Không thể upload ảnh. Vui lòng thử lại.');
          setSavingVoucher(false);
          return;
        }
      } else if (!editingVoucher && !imageUrl) {
        // Khi tạo mới, có thể không bắt buộc ảnh, nhưng nếu cần thì uncomment dòng dưới
        // errors.image = 'Vui lòng upload ảnh voucher';
      }

      const voucherData = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        minOrder: formData.minOrder ? Number(formData.minOrder) : null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isPublic: formData.isPublic,
        image: imageUrl || null,
      };

      let result;
      if (editingVoucher) {
        result = await voucherService.updateVoucher(editingVoucher.voucherId, voucherData);
      } else {
        result = await voucherService.createVoucher(voucherData);
      }

      if (result.success) {
        // Reload vouchers from API
        const reloadResult = await voucherService.getAllVouchers();
        if (reloadResult.success) {
          const mappedVouchers = (reloadResult.data || []).map(voucher => mapVoucherFromBackend(voucher));
          setVouchers(mappedVouchers);
          if (onVouchersChange) {
            onVouchersChange(mappedVouchers);
          }
          // Save to localStorage
          try {
            localStorage.setItem('adminVouchers', JSON.stringify(mappedVouchers));
          } catch (e) {
            console.error('Failed to save vouchers to localStorage', e);
          }
        }
        setShowModal(false);
        setEditingVoucher(null);
        setImagePreview('');
        setFormData({
          code: '',
          name: '',
          description: '',
          discountType: 'PERCENT',
          discountValue: '',
          maxDiscount: '',
          minOrder: '',
          startDate: '',
          endDate: '',
          isPublic: true,
          image: '',
          imageFile: null
        });
        showNotification(
          editingVoucher ? 'Cập nhật voucher thành công' : 'Tạo voucher thành công',
          'success'
        );
      } else {
        const errorMessage = result.error || 'Có lỗi xảy ra';
        let hasValidationErrors = false;
        
        if (result.validationErrors && typeof result.validationErrors === 'object') {
          setValidationErrors(result.validationErrors);
          hasValidationErrors = Object.keys(result.validationErrors).length > 0;
        } else if (errorMessage.includes(':')) {
          // Try to parse error message if it contains field names
          const parsedErrors = {};
          const errorLines = errorMessage.split('\n');
          errorLines.forEach(line => {
            const match = line.match(/(\w+):\s*(.+)/);
            if (match) {
              parsedErrors[match[1]] = match[2];
            }
          });
          if (Object.keys(parsedErrors).length > 0) {
            setValidationErrors(parsedErrors);
            hasValidationErrors = true;
          }
        }

        if (hasValidationErrors) {
          // Scroll to top of modal
          const modalContent = document.querySelector('.movie-modal__content');
          if (modalContent) {
            modalContent.scrollTop = 0;
          }
        }
        setError(errorMessage);
        showNotification(errorMessage, 'error');
      }
    } catch (err) {
      const errorMsg = err.message || 'Có lỗi xảy ra khi lưu voucher';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setSavingVoucher(false);
    }
  };

  const handleDelete = async (voucherId) => {
    const voucher = vouchers.find(v => v.voucherId === voucherId);
    setDeleteConfirm({ voucherId, name: voucher?.name || 'voucher này' });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setLoading(true);
    const voucherId = deleteConfirm.voucherId;
    try {
      const result = await voucherService.deleteVoucher(voucherId);
      if (result.success) {
        // Optimistic update: Xóa voucher khỏi danh sách ngay lập tức
        const updatedVouchers = vouchers.filter(v => v.voucherId !== voucherId);
        setVouchers(updatedVouchers);
        if (onVouchersChange) {
          onVouchersChange(updatedVouchers);
        }
        // Save to localStorage
        try {
          localStorage.setItem('adminVouchers', JSON.stringify(updatedVouchers));
        } catch (e) {
          console.error('Failed to save vouchers to localStorage', e);
        }
        
        // Đóng modal ngay sau khi cập nhật danh sách
        setDeleteConfirm(null);
        showNotification('Xóa voucher thành công', 'success');
        
        // Reload vouchers from API để đảm bảo đồng bộ (chạy ngầm, không chặn UI)
        try {
          const reloadResult = await voucherService.getAllVouchers();
          if (reloadResult.success) {
            const mappedVouchers = (reloadResult.data || []).map(voucher => mapVoucherFromBackend(voucher));
            setVouchers(mappedVouchers);
            if (onVouchersChange) {
              onVouchersChange(mappedVouchers);
            }
            // Save to localStorage
            try {
              localStorage.setItem('adminVouchers', JSON.stringify(mappedVouchers));
            } catch (e) {
              console.error('Failed to save vouchers to localStorage', e);
            }
          }
        } catch (reloadError) {
          // Nếu reload thất bại, vẫn giữ trạng thái đã xóa (vì xóa đã thành công)
          console.error('Failed to reload vouchers after delete:', reloadError);
        }
      } else {
        setDeleteConfirm(null); // Đóng modal khi xóa thất bại
        setError(result.error);
        showNotification(result.error || 'Không thể xóa voucher', 'error');
      }
    } catch (err) {
      const errorMsg = err.message || 'Không thể xóa voucher';
      setDeleteConfirm(null); // Đóng modal khi có lỗi
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const onUploadImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Kích thước ảnh tối đa 4MB');
      return;
    }
    setFormData(prev => ({ ...prev, imageFile: file, image: '' }));
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const discountBadge = (v) => {
    if (v.discountType === 'PERCENT') return `-${v.discountValue}%`;
    return `-${new Intl.NumberFormat('vi-VN').format(v.discountValue)}đ`;
  };

  return (
    <>
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '16px 20px',
          borderRadius: '12px',
          background: notification.type === 'success'
            ? 'rgba(76, 175, 80, 0.95)'
            : 'rgba(244, 67, 54, 0.95)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '300px',
          maxWidth: '500px',
          animation: 'slideInRight 0.3s ease-out',
          border: `1px solid ${notification.type === 'success' ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)'}`
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {notification.type === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </div>
          <div style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
            {notification.message}
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.8
            }}
            onMouseOver={(e) => e.target.style.opacity = '1'}
            onMouseOut={(e) => e.target.style.opacity = '0.8'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <div className="admin-card">
        {/* Error message */}
        {error && !showModal && (
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #e83b41 0%, #c62828 100%)',
            color: '#fff',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(232, 59, 65, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontWeight: 500, fontSize: '14px' }}>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '4px 10px',
                borderRadius: '6px',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              title="Đóng"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(123, 97, 255, 0.1)',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
            color: '#c9c4c5',
            border: '1px solid rgba(123, 97, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            <span style={{ fontWeight: 500 }}>Đang tải danh sách voucher...</span>
          </div>
        )}

        <div className="admin-card__header">
          <h2 className="admin-card__title">Quản lý voucher</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="movie-search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="movie-search__input" placeholder="Tìm mã hoặc tên voucher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select className="movie-filter" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tất cả loại giảm</option>
              {enums.discountTypes?.map(type => {
                const displayType = type === 'VALUE' ? 'AMOUNT' : type;
                const displayLabel = type === 'PERCENT' ? 'Phần trăm' : 'Số tiền';
                return (
                  <option key={type} value={displayType}>{displayLabel}</option>
                );
              })}
            </select>
            <select className="movie-filter" value={filterPublic} onChange={(e) => setFilterPublic(e.target.value)}>
              <option value="">Tất cả loại</option>
              <option value="true">Công khai</option>
              <option value="false">Riêng tư</option>
            </select>
            <select className="movie-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="true">Hoạt động</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="expired">Đã kết thúc</option>
            </select>
            <button className="btn btn--primary" onClick={handleAdd} disabled={loading || enumsLoading}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tạo voucher
            </button>
          </div>
        </div>
        <div className="admin-card__content">
          {loading ? (
            <div className="movie-empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
                  <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                  <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                </circle>
              </svg>
              <p>Đang tải...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="movie-empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 8h20M2 12h20M2 16h20"/></svg>
              <p>Không có voucher nào</p>
            </div>
          ) : (
            <div className="movie-grid">
              {currentVouchers.map(v => (
                <div key={v.voucherId} className="movie-card">
                  <div
                    className="movie-card__poster"
                    style={{ width: '100%', height: '160px', overflow: 'hidden', position: 'relative', padding: 0 }}
                  >
                    <img
                      src={v.image || 'https://via.placeholder.com/1000x430?text=Voucher'}
                      alt={v.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div className="movie-card__overlay">
                      <button className="movie-card__action" onClick={() => handleEdit(v)} title="Chỉnh sửa" disabled={loading}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="movie-card__action movie-card__action--delete" onClick={() => handleDelete(v.voucherId)} title="Xóa" disabled={loading}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                    <div className="movie-card__status" style={{ backgroundColor: getStatusInfo(v.status).color }}>
                      {getStatusInfo(v.status).text}
                    </div>
                    <div className="movie-card__badge" style={{ position: 'absolute', top: 8, left: 8, background: '#e83b41', color: '#fff', padding: '4px 8px', borderRadius: 6, fontWeight: 800 }}>
                      {discountBadge(v)}
                    </div>
                  </div>
                  <div className="movie-card__content">
                    <h3 className="movie-card__title">{v.name}</h3>
                    {v.isPublic === false && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#7b61ff' }}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <span style={{ fontSize: '12px', color: '#7b61ff', fontWeight: 500 }}>Riêng tư</span>
                      </div>
                    )}
                    <div className="movie-card__meta">
                      <span className="movie-card__genre">Mã: {v.code}</span>
                      <span className="movie-card__rating">{v.startDate ? new Date(v.startDate).toLocaleDateString('vi-VN') : ''} — {v.endDate ? new Date(v.endDate).toLocaleDateString('vi-VN') : ''}</span>
                    </div>
                    <div className="movie-card__director">{v.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filtered.length > 0 && totalPages > 1 && (() => {
            const getPageNumbers = () => {
              const pages = [];
              const maxVisible = 7;
              
              if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                pages.push(1);
                
                if (currentPage <= 4) {
                  for (let i = 2; i <= 5; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 3) {
                  pages.push('ellipsis-start');
                  for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  pages.push('ellipsis-start');
                  pages.push(currentPage - 1);
                  pages.push(currentPage);
                  pages.push(currentPage + 1);
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                }
              }
              
              return pages;
            };
            
            const pageNumbers = getPageNumbers();
            
            return (
              <div className="movie-reviews-pagination mt-8 justify-center" style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                <button
                  className="movie-reviews-pagination__btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                {pageNumbers.map((page, index) => {
                  if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        style={{
                          padding: '8px 4px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '14px',
                          userSelect: 'none'
                        }}
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={page}
                      className={`movie-reviews-pagination__btn movie-reviews-pagination__btn--number ${currentPage === page ? 'movie-reviews-pagination__btn--active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  className="movie-reviews-pagination__btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            );
          })()}
        </div>

        {showModal && (
          <div className="movie-modal-overlay" onClick={() => { if (!savingVoucher) { setShowModal(false); setImagePreview(''); setValidationErrors({}); setError(null); } }}>
            <div className="movie-modal" onClick={(e) => e.stopPropagation()}>
              <div className="movie-modal__header">
                <h2>{editingVoucher ? 'Chỉnh sửa voucher' : 'Tạo voucher'}</h2>
                <button className="movie-modal__close" onClick={() => { if (!savingVoucher) { setShowModal(false); setImagePreview(''); setValidationErrors({}); setError(null); } }} disabled={savingVoucher}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="movie-modal__content">
                {/* Error in modal */}
                {error && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(244, 67, 54, 0.1)',
                    color: '#f44336',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid rgba(244, 67, 54, 0.2)',
                    fontSize: '14px'
                  }}>
                    {error}
                  </div>
                )}

                {/* Validation errors */}
                {Object.keys(validationErrors).length > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(255, 152, 0, 0.1)',
                    color: '#ff9800',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid rgba(255, 152, 0, 0.2)',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>Vui lòng sửa các lỗi sau:</div>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {Object.entries(validationErrors).map(([field, message]) => (
                        <li key={field}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <form onSubmit={handleSave} className="movie-form">
                  <div className="movie-form__row">
                    <div className="movie-form__group">
                      <label>Tên voucher <span className="required">*</span></label>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={savingVoucher}
                        style={{ borderColor: validationErrors.name ? '#f44336' : undefined }}
                      />
                      {validationErrors.name && <span style={{ color: '#f44336', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.name}</span>}
                    </div>
                    <div className="movie-form__group">
                      <label>Mã <span className="required">*</span></label>
                      <input
                        name="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        disabled={savingVoucher || editingVoucher !== null}
                        style={{ borderColor: validationErrors.code ? '#f44336' : undefined }}
                      />
                      {validationErrors.code && <span style={{ color: '#f44336', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.code}</span>}
                    </div>
                  </div>
                  <div className="movie-form__group">
                    <label>Mô tả</label>
                    <input
                      name="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={savingVoucher}
                      style={{ borderColor: validationErrors.description ? '#f44336' : undefined }}
                    />
                    {validationErrors.description && <span style={{ color: '#f44336', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.description}</span>}
                  </div>
                  <div className="movie-form__row">
                    <div className="movie-form__group">
                      <label>Loại giảm <span className="required">*</span></label>
                      <select
                        name="discountType"
                        value={formData.discountType}
                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                        disabled={savingVoucher}
                        style={{ borderColor: validationErrors.discountType ? '#f44336' : undefined }}
                      >
                        {enums.discountTypes?.map(type => {
                          const displayType = type === 'VALUE' ? 'AMOUNT' : type;
                          const displayLabel = type === 'PERCENT' ? 'Phần trăm (%)' : 'Số tiền (đ)';
                          return (
                            <option key={type} value={displayType}>{displayLabel}</option>
                          );
                        })}
                      </select>
                      {validationErrors.discountType && <span style={{ color: '#f44336', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.discountType}</span>}
                    </div>
                    <div className="movie-form__group">
                      <label>Giá trị <span className="required">*</span></label>
                      <input
                        name="discountValue"
                        type="number"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        min="0"
                        step="0.01"
                        disabled={savingVoucher}
                        style={{ borderColor: validationErrors.discountValue ? '#f44336' : undefined }}
                      />
                      {validationErrors.discountValue && <span style={{ color: '#f44336', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.discountValue}</span>}
                    </div>
                    <div className="movie-form__group">
                      <label>Giảm tối đa</label>
                      <input
                        name="maxDiscount"
                        type="number"
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                        min="0"
                        step="0.01"
                        disabled={savingVoucher}
                        style={{ borderColor: validationErrors.maxDiscount ? '#f44336' : undefined }}
                      />
                      {validationErrors.maxDiscount && <span style={{ color: '#f44336', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.maxDiscount}</span>}
                    </div>
                  </div>
                  <div className="movie-form__row">
                    <div className="movie-form__group">
                      <label>Đơn tối thiểu</label>
                      <input
                        name="minOrder"
                        type="number"
                        value={formData.minOrder}
                        onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                        min="0"
                        step="0.01"
                        disabled={savingVoucher}
                        style={{ borderColor: validationErrors.minOrder ? '#f44336' : undefined }}
                      />
                      {validationErrors.minOrder && <span style={{ color: '#f44336', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.minOrder}</span>}
                    </div>
                    <div className="movie-form__group">
                      <label>Ngày bắt đầu <span className="required">*</span></label>
                      <input
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        disabled={savingVoucher}
                        min={`${new Date().getFullYear()}-01-01`}
                        max={`${new Date().getFullYear() + 10}-12-31`}
                        style={{ borderColor: validationErrors.startDate ? '#f44336' : undefined }}
                      />
                      {validationErrors.startDate && <span style={{ color: '#f44336', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.startDate}</span>}
                    </div>
                    <div className="movie-form__group">
                      <label>Ngày kết thúc <span className="required">*</span></label>
                      <input
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        disabled={savingVoucher}
                        min={formData.startDate || `${new Date().getFullYear()}-01-01`}
                        max={`${new Date().getFullYear() + 10}-12-31`}
                        style={{ borderColor: validationErrors.endDate ? '#f44336' : undefined }}
                      />
                      {validationErrors.endDate && <span style={{ color: '#f44336', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.endDate}</span>}
                    </div>
                  </div>
                  <div className="movie-form__group">
                    <label>Ảnh voucher</label>
                    <div className="movie-poster-upload">
                      <div className="movie-poster-upload__options">
                        <label className="movie-poster-upload__btn" style={{ opacity: savingVoucher ? 0.5 : 1, cursor: savingVoucher ? 'not-allowed' : 'pointer' }}>
                          <input type="file" accept="image/*" onChange={onUploadImage} style={{ display: 'none' }} disabled={savingVoucher} />
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          Upload ảnh từ máy
                        </label>
                      </div>
                      {(imagePreview || formData.image) && (
                        <div className="movie-poster-upload__preview" style={{ width: '100%', height: '180px', marginTop: '12px' }}>
                          <img
                            src={imagePreview || formData.image}
                            alt="Voucher preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="movie-form__group">
                    <label>Loại voucher <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: savingVoucher ? 'not-allowed' : 'pointer', opacity: savingVoucher ? 0.5 : 1 }}>
                        <input
                          type="radio"
                          name="voucherType"
                          checked={formData.isPublic}
                          onChange={() => setFormData({ ...formData, isPublic: true })}
                          disabled={savingVoucher}
                        />
                        Công khai
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: savingVoucher ? 'not-allowed' : 'pointer', opacity: savingVoucher ? 0.5 : 1 }}>
                        <input
                          type="radio"
                          name="voucherType"
                          checked={!formData.isPublic}
                          onChange={() => setFormData({ ...formData, isPublic: false })}
                          disabled={savingVoucher}
                        />
                        Riêng tư
                      </label>
                    </div>
                  </div>
                </form>
              </div>
              <div className="movie-modal__footer">
                <button className="btn btn--ghost" onClick={() => { if (!savingVoucher) { setShowModal(false); setImagePreview(''); setValidationErrors({}); setError(null); } }} disabled={savingVoucher}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleSave}
                  disabled={savingVoucher || enumsLoading}
                >
                  {savingVoucher ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                        <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
                          <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                          <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                        </circle>
                      </svg>
                      Đang lưu...
                    </>
                  ) : (
                    editingVoucher ? 'Cập nhật' : 'Tạo voucher'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={deleteConfirm !== null}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
          title={deleteConfirm?.name}
          message={deleteConfirm ? `Bạn có chắc chắn muốn xóa voucher "${deleteConfirm.name}"?` : ''}
          confirmText="Xóa voucher"
          isDeleting={loading}
        />
      </div>
    </>
  );
}

export default VoucherManagement;
