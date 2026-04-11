import React, { useState, useEffect } from 'react';
import '../../styles/admin/food-beverage-management.css';
import cloudinaryService from '../../services/cloudinaryService';
import foodComboService from '../../services/foodComboService';

// Food & Beverage Management Component
function FoodBeverageManagement({ items: initialItems, onItemsChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    imageFile: null
  });
  const [imagePreview, setImagePreview] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Load food combos from API
  useEffect(() => {
    const loadFoodCombos = async () => {
      setLoading(true);
      try {
        const result = await foodComboService.getAllFoodCombos();
        if (result.success) {
          // Map backend data to frontend format
          const mappedItems = result.data.map(item => ({
            id: item.foodComboId,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            image: item.image || ''
          }));
          setItems(mappedItems);
          if (onItemsChange) {
            onItemsChange(mappedItems);
          }
        } else {
          showNotification(result.error || 'Không thể tải danh sách sản phẩm', 'error');
        }
      } catch (error) {
        showNotification('Có lỗi xảy ra khi tải danh sách sản phẩm', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadFoodCombos();
  }, [onItemsChange]);

  // Notification component
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showNotification('Vui lòng chọn file hình ảnh', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showNotification('Kích thước file không được vượt quá 10MB', 'error');
        return;
      }
      
      try {
        // Upload to Cloudinary
        const result = await cloudinaryService.uploadSingle(file);
        
        if (result.success) {
          setFormData({ ...formData, imageFile: file, image: result.url });
          setImagePreview(result.url);
          showNotification('Upload hình ảnh thành công', 'success');
        } else {
          showNotification(result.error || 'Upload hình ảnh thất bại', 'error');
        }
      } catch (error) {
        showNotification('Có lỗi xảy ra khi upload hình ảnh', 'error');
      }
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setFormData({ ...formData, imageFile: null, image: '' });
    setImagePreview('');
  };

  // Open add item modal
  const handleAddItem = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      image: '',
      imageFile: null
    });
    setImagePreview('');
    setValidationErrors({});
    setShowModal(true);
  };

  // Open edit item modal
  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      image: item.image || '',
      imageFile: null
    });
    setImagePreview(item.image || '');
    setValidationErrors({});
    setShowModal(true);
  };

  // Save item
  const handleSaveItem = async () => {
    const errors = {};
    
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Tên sản phẩm không được để trống';
    }
    if (!formData.price || formData.price === '' || parseFloat(formData.price) <= 0) {
      errors.price = 'Giá không được để trống và phải lớn hơn 0';
    }
    if (!formData.image || formData.image.trim() === '') {
      errors.image = 'Vui lòng upload hình ảnh';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const modalContent = document.querySelector('.movie-modal__content');
      if (modalContent) {
        modalContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    setValidationErrors({});
    setLoading(true);

    try {
      const foodComboData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        description: formData.description.trim() || '',
        image: formData.image
      };

      if (editingItem) {
        // Update existing item
        const result = await foodComboService.updateFoodCombo(editingItem.id, foodComboData);
        
        if (result.success) {
          // Reload items from API
          const loadResult = await foodComboService.getAllFoodCombos();
          if (loadResult.success) {
            const mappedItems = loadResult.data.map(item => ({
              id: item.foodComboId,
              name: item.name,
              description: item.description || '',
              price: parseFloat(item.price),
              image: item.image || ''
            }));
            setItems(mappedItems);
            if (onItemsChange) {
              onItemsChange(mappedItems);
            }
          }
          showNotification('Cập nhật sản phẩm thành công', 'success');
          setShowModal(false);
          setEditingItem(null);
          setImagePreview('');
        } else {
          showNotification(result.error || 'Cập nhật sản phẩm thất bại', 'error');
          // Không đóng modal nếu có lỗi để người dùng có thể sửa lại
        }
      } else {
        // Create new item
        const result = await foodComboService.createFoodCombo(foodComboData);
        
        if (result.success) {
          // Reload items from API
          const loadResult = await foodComboService.getAllFoodCombos();
          if (loadResult.success) {
            const mappedItems = loadResult.data.map(item => ({
              id: item.foodComboId,
              name: item.name,
              description: item.description || '',
              price: parseFloat(item.price),
              image: item.image || ''
            }));
            setItems(mappedItems);
            if (onItemsChange) {
              onItemsChange(mappedItems);
            }
          }
          showNotification('Thêm sản phẩm thành công', 'success');
          setShowModal(false);
          setEditingItem(null);
          setImagePreview('');
        } else {
          showNotification(result.error || 'Thêm sản phẩm thất bại', 'error');
        }
      }
    } catch (error) {
      showNotification('Có lỗi xảy ra khi lưu sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (id) => {
    setLoading(true);
    try {
      const result = await foodComboService.deleteFoodCombo(id);
      
      if (result.success) {
        // Reload items from API
        const loadResult = await foodComboService.getAllFoodCombos();
        if (loadResult.success) {
          const mappedItems = loadResult.data.map(item => ({
            id: item.foodComboId,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            image: item.image || ''
          }));
          setItems(mappedItems);
          if (onItemsChange) {
            onItemsChange(mappedItems);
          }
        }
        setDeleteConfirm(null);
        showNotification('Xóa sản phẩm thành công', 'success');
      } else {
        setDeleteConfirm(null); // Đóng modal khi xóa thất bại
        showNotification(result.error || 'Xóa sản phẩm thất bại', 'error');
      }
    } catch (error) {
      setDeleteConfirm(null); // Đóng modal khi có lỗi
      showNotification(error.message || 'Có lỗi xảy ra khi xóa sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  };


  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading && items.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(232, 59, 65, 0.3)',
            borderTop: '4px solid #e83b41',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

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
          <span>{notification.message}</span>
        </div>
      )}

      <div className="food-beverage-management">
        {/* Header */}
        <div className="food-beverage-header">
          <div className="food-beverage-header__left">
            <div className="food-beverage-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="food-beverage-header__right">
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Xem dạng lưới"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Xem dạng bảng"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
                </svg>
              </button>
            </div>
            <button 
              className="btn btn--primary" 
              onClick={handleAddItem}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Thêm sản phẩm
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="food-stats-bar">
          Tìm thấy <strong>{filteredItems.length}</strong> sản phẩm
        </div>

        {/* Items list */}
        {viewMode === 'grid' ? (
          <div className="food-item-grid">
            {currentItems.map(item => (
              <div key={item.id} className="food-item-card">
                <div className="food-item-card__image-wrapper">
                  <img 
                    src={item.image || 'https://via.placeholder.com/280x210'} 
                    alt={item.name}
                    className="food-item-card__image"
                  />
                  <div className="food-item-card__overlay">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItem(item);
                      }}
                      className="food-item-card__action"
                      title="Chỉnh sửa"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(item);
                      }}
                      className="food-item-card__action food-item-card__action--delete"
                      title="Xóa"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="food-item-card__content">
                  <h3 className="food-item-card__title">{item.name}</h3>
                  <div className="food-item-card__meta">
                    <span className="food-item-card__price">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                  {item.description && (
                    <div className="food-item-card__description">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Hình ảnh</th>
                  <th>Tên sản phẩm</th>
                  <th>Giá</th>
                  <th>Mô tả</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map(item => (
                  <tr key={item.id}>
                    <td>
                      <img src={item.image || 'https://via.placeholder.com/60x90'} alt={item.name} className="movie-table-poster" />
                    </td>
                    <td>
                      <div className="movie-table-title">{item.name}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffd700' }}>{formatPrice(item.price)}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || '-'}
                    </td>
                    <td>
                      <div className="movie-table-actions">
                        <button
                          className="movie-action-btn"
                          onClick={() => handleEditItem(item)}
                          title="Chỉnh sửa"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="movie-action-btn movie-action-btn--delete"
                          onClick={() => setDeleteConfirm(item)}
                          title="Xóa"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredItems.length > 0 && totalPages > 1 && (() => {
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

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="food-empty-state">
            <svg 
              width="80" 
              height="80" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <h3 className="food-empty-state__title">
              {searchTerm 
                ? 'Không tìm thấy sản phẩm nào phù hợp với từ khóa tìm kiếm' 
                : 'Chưa có sản phẩm nào trong hệ thống'}
            </h3>
            <p className="food-empty-state__message">
              {searchTerm 
                ? 'Hãy thử thay đổi từ khóa tìm kiếm' 
                : 'Bắt đầu bằng cách thêm sản phẩm đầu tiên vào hệ thống'}
            </p>
            {!searchTerm && (
              <button 
                className="btn btn--primary" 
                onClick={handleAddItem}
                style={{ marginTop: '16px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Thêm sản phẩm đầu tiên
              </button>
            )}
          </div>
        )}

        {/* Add/Edit Item Modal */}
        {showModal && (
          <div className="movie-modal-overlay" onClick={() => {
            setShowModal(false);
            setImagePreview('');
          }}>
            <div className="food-modal" onClick={(e) => e.stopPropagation()}>
              <div className="food-modal__header">
                <h2>{editingItem ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
                <button className="food-modal__close" onClick={() => {
                  setShowModal(false);
                  setImagePreview('');
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="food-modal__content">
                <div className="food-form">
                  {Object.keys(validationErrors).length > 0 && (
                    <div style={{
                      padding: '12px 16px',
                      marginBottom: '20px',
                      backgroundColor: 'rgba(255, 87, 87, 0.1)',
                      border: '1px solid rgba(255, 87, 87, 0.3)',
                      borderRadius: '8px',
                      color: '#ff5757',
                      fontSize: '14px'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Vui lòng kiểm tra các trường sau:</div>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {Object.values(validationErrors).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="food-form__row">
                    <div className="food-form__group">
                      <label>Tên sản phẩm <span className="required">*</span></label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (validationErrors.name) {
                            setValidationErrors({ ...validationErrors, name: null });
                          }
                        }}
                        placeholder="Nhập tên sản phẩm"
                        style={{
                          borderColor: validationErrors.name ? '#ff5757' : undefined
                        }}
                      />
                      {validationErrors.name && (
                        <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '4px' }}>
                          {validationErrors.name}
                        </div>
                      )}
                    </div>
                    <div className="food-form__group">
                      <label>Giá (VNĐ) <span className="required">*</span></label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => {
                          setFormData({ ...formData, price: e.target.value });
                          if (validationErrors.price) {
                            setValidationErrors({ ...validationErrors, price: null });
                          }
                        }}
                        placeholder="Nhập giá"
                        min="0"
                        step="1000"
                        style={{
                          borderColor: validationErrors.price ? '#ff5757' : undefined
                        }}
                      />
                      {validationErrors.price && (
                        <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '4px' }}>
                          {validationErrors.price}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="food-form__group">
                    <label>Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Nhập mô tả sản phẩm"
                      rows="3"
                    />
                  </div>
                  <div className="food-form__group">
                    <label>Hình ảnh <span className="required">*</span></label>
                    {formData.image ? (
                      <div className="food-form__image-preview">
                        <img 
                          src={formData.image} 
                          alt="Preview"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="food-form__image-remove"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ marginBottom: '8px' }}
                        />
                      </div>
                    )}
                    {validationErrors.image && (
                      <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '4px' }}>
                        {validationErrors.image}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="food-modal__footer">
                <button className="btn btn--ghost" onClick={() => {
                  setShowModal(false);
                  setImagePreview('');
                }}>
                  Hủy
                </button>
                <button className="btn btn--primary" onClick={handleSaveItem}>
                  {editingItem ? 'Cập nhật' : 'Thêm sản phẩm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="movie-modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="movie-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="movie-modal__header">
                <h2>Xác nhận xóa</h2>
                <button className="movie-modal__close" onClick={() => setDeleteConfirm(null)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="movie-modal__content">
                <p>Bạn có chắc chắn muốn xóa sản phẩm <strong>{deleteConfirm.name}</strong>?</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                  Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="movie-modal__footer">
                <button className="btn btn--ghost" onClick={() => setDeleteConfirm(null)}>
                  Hủy
                </button>
                <button 
                  className="btn btn--primary" 
                  onClick={() => {
                    handleDeleteItem(deleteConfirm.id);
                  }}
                  style={{ background: '#e83b41', borderColor: '#e83b41' }}
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default FoodBeverageManagement;

