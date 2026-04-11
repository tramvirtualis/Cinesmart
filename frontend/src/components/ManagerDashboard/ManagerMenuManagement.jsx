import React, { useState, useEffect } from 'react';
import '../../styles/admin/food-beverage-management.css';
import managerMenuService from '../../services/managerMenuService';
import ConfirmDeleteModal from '../Common/ConfirmDeleteModal';

export default function ManagerMenuManagement({ complexId }) {
  const [availableItems, setAvailableItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (complexId) {
      loadData();
    } else {
      setLoading(false);
      setMenuItems([]);
      setAvailableItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complexId]);

  const loadData = async () => {
    if (!complexId) {
      console.log('ManagerMenuManagement: No complexId provided');
      setLoading(false);
      setMenuItems([]);
      setAvailableItems([]);
      return;
    }

    console.log('ManagerMenuManagement: Loading data for complexId:', complexId);
    setLoading(true);
    try {
      // Load menu items của cinema complex
      const menuResult = await managerMenuService.getMenuByComplexId(complexId);
      console.log('ManagerMenuManagement: Menu result:', menuResult);
      if (menuResult.success) {
        setMenuItems(menuResult.data || []);
      } else {
        console.error('ManagerMenuManagement: Failed to load menu:', menuResult.error);
        setMenuItems([]);
        if (menuResult.error && !menuResult.error.includes('không có quyền')) {
          showNotification(menuResult.error || 'Không thể tải menu', 'error');
        }
      }

      // Load available items (do admin tạo, chưa có trong menu)
      const availableResult = await managerMenuService.getAvailableFoodCombos(complexId);
      console.log('ManagerMenuManagement: Available items result:', availableResult);
      if (availableResult.success) {
        setAvailableItems(availableResult.data || []);
      } else {
        console.error('ManagerMenuManagement: Failed to load available items:', availableResult.error);
        setAvailableItems([]);
        if (availableResult.error && !availableResult.error.includes('không có quyền')) {
          showNotification(availableResult.error || 'Không thể tải danh sách sản phẩm', 'error');
        }
      }
    } catch (error) {
      console.error('ManagerMenuManagement: Exception loading data:', error);
      setMenuItems([]);
      setAvailableItems([]);
      showNotification('Có lỗi xảy ra khi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const handleAddToMenu = async (foodComboId) => {
    if (!complexId) {
      showNotification('Không tìm thấy thông tin cụm rạp', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await managerMenuService.addFoodComboToMenu(complexId, foodComboId);
      
      if (result.success) {
        showNotification('Thêm sản phẩm vào menu thành công', 'success');
        loadData();
      } else {
        showNotification(result.error || 'Không thể thêm sản phẩm vào menu', 'error');
      }
    } catch (error) {
      showNotification('Có lỗi xảy ra khi thêm sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromMenu = (foodComboId) => {
    const item = menuItems.find(i => i.id === foodComboId);
    setDeleteConfirm({ 
      id: foodComboId, 
      name: item?.name || 'sản phẩm này'
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    if (!complexId) {
      showNotification('Không tìm thấy thông tin cụm rạp', 'error');
      setDeleteConfirm(null);
      return;
    }

    setLoading(true);
    const foodComboId = deleteConfirm.id;
    try {
      const result = await managerMenuService.removeFoodComboFromMenu(complexId, foodComboId);
      
      // Đóng modal ngay sau khi có kết quả (trước khi hiển thị notification)
      setDeleteConfirm(null);
      
      if (result.success) {
        // Delay một chút để modal đóng xong trước khi hiển thị notification
        setTimeout(() => {
          showNotification('Xóa sản phẩm khỏi menu thành công', 'success');
        }, 300);
        loadData();
      } else {
        setTimeout(() => {
          showNotification(result.error || 'Không thể xóa sản phẩm khỏi menu', 'error');
        }, 300);
      }
    } catch (error) {
      // Đóng modal ngay cả khi có lỗi
      setDeleteConfirm(null);
      setTimeout(() => {
        showNotification('Có lỗi xảy ra khi xóa sản phẩm', 'error');
      }, 300);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const isInMenu = (foodComboId) => {
    return menuItems.some(item => item.foodComboId === foodComboId);
  };

  const filteredAvailableItems = availableItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  if (loading && menuItems.length === 0 && availableItems.length === 0) {
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

  if (!complexId) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#fff'
      }}>
        <p style={{ fontSize: '18px' }}>Không tìm thấy thông tin cụm rạp</p>
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
          zIndex: 10001,
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
        </div>

        {/* Stats Bar */}
        <div className="food-stats-bar">
          <div>
            <strong>{menuItems.length}</strong> sản phẩm trong menu của cụm rạp
          </div>
          <div>
            <strong>{filteredAvailableItems.length}</strong> sản phẩm có sẵn để thêm
          </div>
        </div>

        {/* Current Menu Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Menu hiện tại của cụm rạp ({menuItems.length} sản phẩm)
          </h2>
          {menuItems.length === 0 ? (
            <div className="food-empty-state">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <h3 className="food-empty-state__title">Chưa có sản phẩm nào trong menu</h3>
              <p className="food-empty-state__message">Thêm sản phẩm từ danh sách bên dưới</p>
            </div>
          ) : (
            <div className="food-item-grid">
              {menuItems.map(item => (
                <div key={item.foodComboId} className="food-item-card">
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
                          handleRemoveFromMenu(item.foodComboId);
                        }}
                        className="food-item-card__action food-item-card__action--delete"
                        title="Xóa khỏi menu"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                    <div className="food-item-card__status food-item-card__status--available">
                      Trong menu
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
          )}
        </div>

        {/* Available Items Section */}
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Sản phẩm có sẵn để thêm vào menu ({filteredAvailableItems.length} sản phẩm)
          </h2>
          {filteredAvailableItems.length === 0 ? (
            <div className="food-empty-state">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            <h3 className="food-empty-state__title">
              {searchTerm 
                ? 'Không tìm thấy sản phẩm nào phù hợp' 
                : 'Không có sản phẩm nào có sẵn'}
            </h3>
            <p className="food-empty-state__message">
              {searchTerm 
                ? 'Hãy thử thay đổi từ khóa tìm kiếm' 
                : 'Vui lòng liên hệ admin để thêm sản phẩm mới'}
            </p>
            </div>
          ) : (
            <div className="food-item-grid">
              {filteredAvailableItems.map(item => {
                const inMenu = isInMenu(item.foodComboId);
                return (
                  <div key={item.foodComboId} className="food-item-card">
                    <div className="food-item-card__image-wrapper">
                      <img 
                        src={item.image || 'https://via.placeholder.com/280x210'} 
                        alt={item.name}
                        className="food-item-card__image"
                      />
                      <div className="food-item-card__overlay">
                        {!inMenu ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToMenu(item.foodComboId);
                            }}
                            className="food-item-card__action"
                            title="Thêm vào menu"
                            style={{ background: 'rgba(76, 175, 80, 0.95)' }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="5" x2="12" y2="19"/>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          </button>
                        ) : (
                          <div style={{
                            background: 'rgba(123, 97, 255, 0.95)',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600
                          }}>
                            Đã có trong menu
                          </div>
                        )}
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
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={deleteConfirm !== null}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
          title={deleteConfirm?.name}
          message={deleteConfirm ? `Bạn có chắc chắn muốn xóa sản phẩm "${deleteConfirm.name}" khỏi menu?` : ''}
          confirmText="Xóa khỏi menu"
          isDeleting={loading}
        />
      </div>
    </>
  );
}

