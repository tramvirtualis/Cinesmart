import React, { useState, useEffect, useRef } from 'react';
import { bannerService } from '../../services/bannerService';
import cloudinaryService from '../../services/cloudinaryService';
import ConfirmDeleteModal from '../Common/ConfirmDeleteModal';
import '../../styles/admin/banner-management.css';

// Banner Management Component
function BannerManagement({ banners: initialBannersList, onBannersChange }) {
  const [banners, setBanners] = useState(initialBannersList || []);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    imageFile: null,
    displayOrder: null
  });
  const [imagePreview, setImagePreview] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [savingBanner, setSavingBanner] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [filterActive, setFilterActive] = useState('ALL'); // ALL, ACTIVE, INACTIVE
  const [togglingBannerId, setTogglingBannerId] = useState(null);
  const [draggedBannerId, setDraggedBannerId] = useState(null);
  const [dragOverBannerId, setDragOverBannerId] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const modalBodyRef = useRef(null);

  // Notification component
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Scroll to form when editing banner
  useEffect(() => {
    if (showModal && editingBanner && modalBodyRef.current) {
      setTimeout(() => {
        modalBodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [showModal, editingBanner]);

  // Load banners from API on mount
  useEffect(() => {
    const loadBanners = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        setError('Vui lòng đăng nhập để tiếp tục');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await bannerService.getAllBanners();
        if (result.success) {
          const mappedBanners = (result.data || []).map(banner => ({
            id: banner.id,
            name: banner.name || '',
            image: banner.image || '',
            isActive: banner.isActive !== undefined ? banner.isActive : true,
            displayOrder: banner.displayOrder !== undefined ? banner.displayOrder : 0
          }));
          setBanners(mappedBanners);
          if (onBannersChange) {
            onBannersChange(mappedBanners);
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
        setError(err.message || 'Không thể tải danh sách banner');
      } finally {
        setLoading(false);
      }
    };
    loadBanners();
  }, []);

  // Sync with parent banners when they change
  useEffect(() => {
    if (initialBannersList && initialBannersList.length >= 0) {
      if (banners.length === 0 && initialBannersList.length > 0) {
        setBanners(initialBannersList);
      }
    }
  }, [initialBannersList]);

  // Handle image file upload
  const onUploadImage = async (file) => {
    if (!file) {
      setImagePreview('');
      setFormData({ ...formData, imageFile: null, image: '' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setValidationErrors({ ...validationErrors, image: 'Vui lòng chọn file ảnh hợp lệ' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors({ ...validationErrors, image: 'Kích thước ảnh không được vượt quá 5MB' });
      return;
    }

    setUploadingImage(true);
    setValidationErrors({ ...validationErrors, image: null });

    try {
      // Upload to Cloudinary
      const uploadResult = await cloudinaryService.uploadSingle(file);
      
      if (uploadResult.success && uploadResult.url) {
        setFormData({
          ...formData,
          image: uploadResult.url,
          imageFile: file
        });
        setImagePreview(uploadResult.url);
        setValidationErrors({ ...validationErrors, image: null });
      } else {
        setValidationErrors({ ...validationErrors, image: uploadResult.error || 'Không thể upload ảnh' });
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setValidationErrors({ ...validationErrors, image: err.message || 'Không thể upload ảnh' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle form input change
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'imageFile' && files && files.length > 0) {
      onUploadImage(files[0]);
    } else {
      setFormData({ ...formData, [name]: value });
      // Clear validation error when user types
      if (validationErrors[name]) {
        setValidationErrors({ ...validationErrors, [name]: null });
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Vui lòng nhập tên banner';
    }
    
    if (!formData.image || formData.image.trim() === '') {
      errors.image = 'Vui lòng upload ảnh banner';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save (create or update)
  const handleSave = async () => {
    if (!validateForm()) {
      showNotification('Vui lòng điền đầy đủ thông tin', 'error');
      return;
    }

    setSavingBanner(true);
    setError(null);

    try {
      const bannerData = {
        name: formData.name.trim(),
        image: formData.image.trim(),
        displayOrder: null // Tự động gán khi lưu
      };

      let result;
      if (editingBanner) {
        // Update existing banner
        result = await bannerService.updateBanner(editingBanner.id, bannerData);
      } else {
        // Create new banner
        result = await bannerService.createBanner(bannerData);
      }

      if (result.success) {
        // Reload banners
        const reloadResult = await bannerService.getAllBanners();
        if (reloadResult.success) {
          const mappedBanners = (reloadResult.data || []).map(banner => ({
            id: banner.id,
            name: banner.name || '',
            image: banner.image || '',
            isActive: banner.isActive !== undefined ? banner.isActive : true,
            displayOrder: banner.displayOrder !== undefined ? banner.displayOrder : 0
          }));
          setBanners(mappedBanners);
          if (onBannersChange) {
            onBannersChange(mappedBanners);
          }
        }

        showNotification(
          editingBanner ? 'Cập nhật banner thành công' : 'Tạo banner thành công',
          'success'
        );
        handleCloseModal();
      } else {
        setError(result.error || 'Không thể lưu banner');
        showNotification(result.error || 'Không thể lưu banner', 'error');
      }
    } catch (err) {
      console.error('Error saving banner:', err);
      setError(err.message || 'Không thể lưu banner');
      showNotification(err.message || 'Không thể lưu banner', 'error');
    } finally {
      setSavingBanner(false);
    }
  };

  // Handle edit
  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      name: banner.name || '',
      image: banner.image || '',
      imageFile: null,
      displayOrder: banner.displayOrder !== undefined ? banner.displayOrder : null
    });
    setImagePreview(banner.image || '');
    setValidationErrors({});
    setShowModal(true);
    
    // Scroll xuống form sau khi modal mở
    setTimeout(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Handle delete
  const handleDelete = async (bannerId) => {
    setLoading(true);
    setError(null);

    try {
      const result = await bannerService.deleteBanner(bannerId);
      if (result.success) {
        // Reload banners
        const reloadResult = await bannerService.getAllBanners();
        if (reloadResult.success) {
          const mappedBanners = (reloadResult.data || []).map(banner => ({
            id: banner.id,
            name: banner.name || '',
            image: banner.image || '',
            isActive: banner.isActive !== undefined ? banner.isActive : true,
            displayOrder: banner.displayOrder !== undefined ? banner.displayOrder : 0
          }));
          setBanners(mappedBanners);
          if (onBannersChange) {
            onBannersChange(mappedBanners);
          }
        }

        setDeleteConfirm(null); // Đóng modal sau khi xóa thành công
        showNotification('Xóa banner thành công', 'success');
      } else {
        setDeleteConfirm(null); // Đóng modal khi xóa thất bại
        setError(result.error || 'Không thể xóa banner');
        showNotification(result.error || 'Không thể xóa banner', 'error');
      }
    } catch (err) {
      console.error('Error deleting banner:', err);
      setDeleteConfirm(null); // Đóng modal khi có lỗi
      setError(err.message || 'Không thể xóa banner');
      showNotification(err.message || 'Không thể xóa banner', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBanner(null);
    setFormData({
      name: '',
      image: '',
      imageFile: null,
      displayOrder: null
    });
    setImagePreview('');
    setValidationErrors({});
    setError(null);
  };

  // Handle add new
  const handleAddNew = () => {
    setEditingBanner(null);
    setFormData({
      name: '',
      image: '',
      imageFile: null,
      displayOrder: null
    });
    setImagePreview('');
    setValidationErrors({});
    setError(null);
    setShowModal(true);
  };

  // Handle drag start
  const handleDragStart = (e, bannerId) => {
    setDraggedBannerId(bannerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  // Handle drag over
  const handleDragOver = (e, bannerId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (bannerId !== draggedBannerId) {
      setDragOverBannerId(bannerId);
    }
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverBannerId(null);
  };

  // Sort banners by displayOrder before filtering
  const sortedBanners = [...banners].sort((a, b) => {
    const orderA = a.displayOrder !== undefined ? a.displayOrder : 999;
    const orderB = b.displayOrder !== undefined ? b.displayOrder : 999;
    return orderA - orderB;
  });

  // Filter banners
  const filteredBanners = sortedBanners.filter(banner => {
    if (filterActive === 'ACTIVE') return banner.isActive === true;
    if (filterActive === 'INACTIVE') return banner.isActive === false;
    return true; // ALL
  });

  // Handle drop
  const handleDrop = async (e, targetBannerId) => {
    e.preventDefault();
    setDragOverBannerId(null);
    
    if (!draggedBannerId || draggedBannerId === targetBannerId) {
      setDraggedBannerId(null);
      return;
    }

    const draggedBanner = banners.find(b => b.id === draggedBannerId);
    const targetBanner = banners.find(b => b.id === targetBannerId);
    
    if (!draggedBanner || !targetBanner) {
      setDraggedBannerId(null);
      return;
    }

    // Tìm index của banner được kéo và banner đích trong filteredBanners
    const draggedIndex = filteredBanners.findIndex(b => b.id === draggedBannerId);
    const targetIndex = filteredBanners.findIndex(b => b.id === targetBannerId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedBannerId(null);
      return;
    }

    // Tạo mảng mới với thứ tự đã thay đổi (dựa trên filteredBanners)
    const newFilteredBanners = [...filteredBanners];
    const [removed] = newFilteredBanners.splice(draggedIndex, 1);
    newFilteredBanners.splice(targetIndex, 0, removed);

    // Tạo map để cập nhật displayOrder cho các banners đã được sắp xếp lại
    // Sử dụng index trong filteredBanners làm displayOrder mới
    const orderMap = new Map();
    newFilteredBanners.forEach((banner, index) => {
      orderMap.set(banner.id, index);
    });

    // Cập nhật displayOrder cho tất cả banners
    // Các banners trong filteredBanners sẽ có displayOrder mới theo index
    // Các banners không trong filter sẽ giữ nguyên displayOrder cũ
    setUpdatingOrder(true);
    try {
      const updatePromises = [];
      
      // Cập nhật displayOrder cho các banners trong filteredBanners
      newFilteredBanners.forEach((banner, index) => {
        const newOrder = index;
        const oldBanner = sortedBanners.find(b => b.id === banner.id);
        if (oldBanner && oldBanner.displayOrder !== newOrder) {
          updatePromises.push(
            bannerService.updateBanner(banner.id, {
              name: banner.name,
              image: banner.image,
              isActive: banner.isActive,
              displayOrder: newOrder
            })
          );
        }
      });

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      // Reload banners
      const reloadResult = await bannerService.getAllBanners();
      if (reloadResult.success) {
        const mappedBanners = (reloadResult.data || []).map(banner => ({
          id: banner.id,
          name: banner.name || '',
          image: banner.image || '',
          isActive: banner.isActive !== undefined ? banner.isActive : true,
          displayOrder: banner.displayOrder !== undefined ? banner.displayOrder : 0
        }));
        setBanners(mappedBanners);
        if (onBannersChange) {
          onBannersChange(mappedBanners);
        }
        showNotification('Cập nhật thứ tự banner thành công', 'success');
      }
    } catch (err) {
      console.error('Error updating banner order:', err);
      showNotification(err.message || 'Không thể cập nhật thứ tự banner', 'error');
    } finally {
      setUpdatingOrder(false);
      setDraggedBannerId(null);
    }
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedBannerId(null);
    setDragOverBannerId(null);
  };

  // Handle toggle active
  const handleToggleActive = async (bannerId) => {
    setTogglingBannerId(bannerId);
    try {
      const result = await bannerService.toggleBannerActive(bannerId);
      if (result.success) {
        // Reload banners
        const reloadResult = await bannerService.getAllBanners();
        if (reloadResult.success) {
          const mappedBanners = (reloadResult.data || []).map(banner => ({
            id: banner.id,
            name: banner.name || '',
            image: banner.image || '',
            isActive: banner.isActive !== undefined ? banner.isActive : true,
            displayOrder: banner.displayOrder !== undefined ? banner.displayOrder : 0
          }));
          setBanners(mappedBanners);
          if (onBannersChange) {
            onBannersChange(mappedBanners);
          }
        }
        showNotification(result.message || 'Cập nhật trạng thái banner thành công', 'success');
      } else {
        showNotification(result.error || 'Không thể cập nhật trạng thái banner', 'error');
      }
    } catch (err) {
      console.error('Error toggling banner active:', err);
      showNotification(err.message || 'Không thể cập nhật trạng thái banner', 'error');
    } finally {
      setTogglingBannerId(null);
    }
  };

  return (
    <div className="banner-management">
      {/* Notification */}
      {notification && (
        <div className={`banner-notification banner-notification--${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="banner-management__header">
        <div className="banner-management__title-section">
          <h2 className="banner-management__title">Quản lý Banner</h2>
          <p className="banner-management__subtitle">
            Quản lý các banner hiển thị trên trang chủ
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={handleAddNew}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Thêm Banner</span>
        </button>
      </div>

      {/* Filter */}
      {banners.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '24px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <span style={{ color: '#e6e1e2', fontSize: '14px', fontWeight: 500 }}>Lọc theo trạng thái:</span>
          <button
            onClick={() => setFilterActive('ALL')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filterActive === 'ALL' ? '#e83b41' : 'rgba(255,255,255,0.2)',
              background: filterActive === 'ALL' ? 'rgba(232, 59, 65, 0.2)' : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: filterActive === 'ALL' ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            Tất cả ({banners.length})
          </button>
          <button
            onClick={() => setFilterActive('ACTIVE')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filterActive === 'ACTIVE' ? '#4caf50' : 'rgba(255,255,255,0.2)',
              background: filterActive === 'ACTIVE' ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: filterActive === 'ACTIVE' ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            Đang hiển thị ({banners.filter(b => b.isActive).length})
          </button>
          <button
            onClick={() => setFilterActive('INACTIVE')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filterActive === 'INACTIVE' ? '#ff9800' : 'rgba(255,255,255,0.2)',
              background: filterActive === 'INACTIVE' ? 'rgba(255, 152, 0, 0.2)' : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: filterActive === 'INACTIVE' ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            Đã ẩn ({banners.filter(b => !b.isActive).length})
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="banner-management__error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="banner-management__loading">
          <div className="spinner"></div>
          <p>Đang tải danh sách banner...</p>
        </div>
      ) : (
        <>
          {/* Banners Grid */}
          {banners.length === 0 ? (
            <div className="banner-management__empty">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
              <h3>Chưa có banner nào</h3>
              <p>Thêm banner mới để hiển thị trên trang chủ</p>
              <button className="btn btn--primary" onClick={handleAddNew}>
                Thêm Banner Đầu Tiên
              </button>
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="banner-management__empty">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
              <h3>Không có banner nào</h3>
              <p>Không tìm thấy banner với bộ lọc đã chọn</p>
            </div>
          ) : (
            <div className="banner-grid">
              {filteredBanners.map((banner) => (
                <div 
                  key={banner.id} 
                  className="banner-card" 
                  draggable={!updatingOrder}
                  onDragStart={(e) => handleDragStart(e, banner.id)}
                  onDragOver={(e) => handleDragOver(e, banner.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, banner.id)}
                  onDragEnd={handleDragEnd}
                  style={{
                    opacity: banner.isActive ? (draggedBannerId === banner.id ? 0.5 : 1) : 0.6,
                    position: 'relative',
                    cursor: updatingOrder ? 'wait' : 'move',
                    border: dragOverBannerId === banner.id ? '2px solid #ffd159' : '1px solid transparent',
                    transition: 'border 0.2s ease, opacity 0.2s ease',
                    transform: dragOverBannerId === banner.id ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  {!banner.isActive && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: '#ff9800',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                      Đã ẩn
                    </div>
                  )}
                  <div className="banner-card__image-wrapper">
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: '#ffd159',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      zIndex: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      pointerEvents: 'none'
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12h18M12 3v18"/>
                      </svg>
                      Kéo để sắp xếp
                    </div>
                    <img 
                      src={banner.image || '/placeholder-banner.jpg'} 
                      alt={`Banner ${banner.id}`}
                      className="banner-card__image"
                      onError={(e) => { e.target.src = '/placeholder-banner.jpg'; }}
                      draggable={false}
                    />
                    <div className="banner-card__overlay">
                      <button
                        className="banner-card__btn banner-card__btn--edit"
                        onClick={() => handleEdit(banner)}
                        title="Chỉnh sửa"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        className="banner-card__btn banner-card__btn--delete"
                        onClick={() => setDeleteConfirm(banner.id)}
                        title="Xóa"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="banner-card__info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="banner-card__name">{banner.name || `Banner #${banner.id}`}</span>
                      <span style={{ fontSize: '12px', color: '#999', fontWeight: 500 }}>
                        Thứ tự: {banner.displayOrder !== undefined ? banner.displayOrder : 0}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '12px',
                        color: banner.isActive ? '#4caf50' : '#999',
                        fontWeight: 500,
                        minWidth: '60px',
                        textAlign: 'right'
                      }}>
                        {togglingBannerId === banner.id ? 'Đang xử lý...' : (banner.isActive ? 'Hiển thị' : 'Ẩn')}
                      </span>
                      <label style={{
                        display: 'inline-block',
                        position: 'relative',
                        width: '48px',
                        height: '26px',
                        cursor: togglingBannerId === banner.id ? 'wait' : 'pointer',
                        userSelect: 'none'
                      }}>
                        <input
                          type="checkbox"
                          checked={banner.isActive || false}
                          onChange={() => handleToggleActive(banner.id)}
                          disabled={togglingBannerId === banner.id}
                          style={{
                            opacity: 0,
                            width: 0,
                            height: 0
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: banner.isActive ? '#4caf50' : '#666',
                          borderRadius: '13px',
                          transition: 'background 0.3s',
                          pointerEvents: 'none'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '""',
                            height: '20px',
                            width: '20px',
                            left: banner.isActive ? 'calc(100% - 22px)' : '3px',
                            bottom: '3px',
                            background: '#fff',
                            borderRadius: '50%',
                            transition: 'left 0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content banner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="banner-modal__header">
              <h3 className="banner-modal__title">
                {editingBanner ? 'Chỉnh sửa Banner' : 'Thêm Banner Mới'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="banner-modal__body" ref={modalBodyRef}>
              {/* Name Input */}
              <div className="banner-form-group">
                <label className="banner-form-label">
                  Tên Banner <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nhập tên banner"
                  className="banner-form-input"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${validationErrors.name ? '#ff5757' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(20, 15, 16, 0.5)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                />
                {validationErrors.name && (
                  <div className="banner-form-error">{validationErrors.name}</div>
                )}
              </div>

              {/* Image Upload */}
              <div className="banner-form-group">
                <label className="banner-form-label">
                  Ảnh Banner <span className="required">*</span>
                </label>
                <div className="banner-upload-area">
                  {imagePreview ? (
                    <div className="banner-preview">
                      <img src={imagePreview} alt="Banner preview" className="banner-preview__image" />
                      <button
                        type="button"
                        className="banner-preview__remove"
                        onClick={() => {
                          setImagePreview('');
                          setFormData({ ...formData, image: '', imageFile: null });
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="banner-upload-label">
                      <input
                        type="file"
                        name="imageFile"
                        accept="image/*"
                        onChange={handleChange}
                        className="banner-upload-input"
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <div className="banner-upload-loading">
                          <div className="spinner"></div>
                          <span>Đang upload...</span>
                        </div>
                      ) : (
                        <>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          <span className="banner-upload-text">
                            Nhấn để chọn ảnh hoặc kéo thả ảnh vào đây
                          </span>
                          <span className="banner-upload-hint">JPG, PNG hoặc GIF (tối đa 5MB)</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                {validationErrors.image && (
                  <div className="banner-form-error">{validationErrors.image}</div>
                )}
              </div>
            </div>

            <div className="banner-modal__footer">
              <button
                className="btn btn--secondary"
                onClick={handleCloseModal}
                disabled={savingBanner}
              >
                Hủy
              </button>
              <button
                className="btn btn--primary"
                onClick={handleSave}
                disabled={savingBanner || uploadingImage || !formData.name || !formData.image}
              >
                {savingBanner ? (
                  <>
                    <div className="spinner spinner--small"></div>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>{editingBanner ? 'Cập nhật' : 'Tạo mới'}</span>
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
        onConfirm={() => handleDelete(deleteConfirm)}
        title="Xóa Banner"
        message="Bạn có chắc chắn muốn xóa banner này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        isDeleting={loading}
      />
    </div>
  );
}

export default BannerManagement;

