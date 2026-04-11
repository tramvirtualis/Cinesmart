import React, { useState, useEffect, useMemo, useRef } from 'react';
import { activityService } from '../../services/activityService';
import { websocketService } from '../../services/websocketService';
import ConfirmDeleteModal from '../Common/ConfirmDeleteModal';

// Sample activities data - fallback khi API không có data
const initialActivities = [
  {
    activityId: 1,
    actor: 'admin',
    actorName: 'Quản trị viên',
    actorRole: 'ADMIN',
    action: 'CREATE',
    actionLabel: 'Thêm',
    objectType: 'MOVIE',
    objectLabel: 'Phim',
    objectName: 'Inception',
    objectId: 1,
    timestamp: new Date('2024-01-15T10:30:00').toISOString(),
    description: 'Thêm phim mới: Inception'
  },
  {
    activityId: 2,
    actor: 'manager_qt',
    actorName: 'Quản lý Quốc Thanh',
    actorRole: 'MANAGER',
    action: 'UPDATE',
    actionLabel: 'Sửa',
    objectType: 'CINEMA',
    objectLabel: 'Rạp',
    objectName: 'Cinestar Quốc Thanh',
    objectId: 1,
    timestamp: new Date('2024-01-15T14:20:00').toISOString(),
    description: 'Cập nhật thông tin rạp: Cinestar Quốc Thanh'
  },
  {
    activityId: 3,
    actor: 'admin',
    actorName: 'Quản trị viên',
    actorRole: 'ADMIN',
    action: 'DELETE',
    actionLabel: 'Xóa',
    objectType: 'VOUCHER',
    objectLabel: 'Voucher',
    objectName: 'Voucher Tết 100K',
    objectId: 3,
    timestamp: new Date('2024-01-16T09:15:00').toISOString(),
    description: 'Xóa voucher: Voucher Tết 100K'
  },
  {
    activityId: 4,
    actor: 'manager_qt',
    actorName: 'Quản lý Quốc Thanh',
    actorRole: 'MANAGER',
    action: 'CREATE',
    actionLabel: 'Thêm',
    objectType: 'ROOM',
    objectLabel: 'Phòng chiếu',
    objectName: 'Phòng 3',
    objectId: 5,
    timestamp: new Date('2024-01-16T11:45:00').toISOString(),
    description: 'Thêm phòng chiếu mới: Phòng 3'
  },
  {
    activityId: 5,
    actor: 'admin',
    actorName: 'Quản trị viên',
    actorRole: 'ADMIN',
    action: 'UPDATE',
    actionLabel: 'Sửa',
    objectType: 'USER',
    objectLabel: 'Người dùng',
    objectName: 'user_a',
    objectId: 3,
    timestamp: new Date('2024-01-17T08:30:00').toISOString(),
    description: 'Cập nhật thông tin người dùng: user_a'
  },
  {
    activityId: 6,
    actor: 'manager_hbt',
    actorName: 'Quản lý Hai Bà Trưng',
    actorRole: 'MANAGER',
    action: 'UPDATE',
    actionLabel: 'Sửa',
    objectType: 'SHOWTIME',
    objectLabel: 'Lịch chiếu',
    objectName: 'Lịch chiếu phim Interstellar',
    objectId: 12,
    timestamp: new Date('2024-01-17T15:20:00').toISOString(),
    description: 'Cập nhật lịch chiếu: Interstellar'
  },
  {
    activityId: 7,
    actor: 'admin',
    actorName: 'Quản trị viên',
    actorRole: 'ADMIN',
    action: 'CREATE',
    actionLabel: 'Thêm',
    objectType: 'BANNER',
    objectLabel: 'Banner',
    objectName: 'Banner Tết 2024',
    objectId: 4,
    timestamp: new Date('2024-01-18T10:00:00').toISOString(),
    description: 'Thêm banner mới: Banner Tết 2024'
  },
  {
    activityId: 8,
    actor: 'manager_qt',
    actorName: 'Quản lý Quốc Thanh',
    actorRole: 'MANAGER',
    action: 'DELETE',
    actionLabel: 'Xóa',
    objectType: 'FOOD',
    objectLabel: 'Đồ ăn',
    objectName: 'Bắp rang bơ cũ',
    objectId: 8,
    timestamp: new Date('2024-01-18T16:45:00').toISOString(),
    description: 'Xóa món ăn: Bắp rang bơ cũ'
  }
];

// Activity Management Component
function ActivityManagement({ onNewActivity }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterObjectType, setFilterObjectType] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const activitiesPerPage = 10;
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState(null);

  const activitiesSubscriptionRef = useRef(null);
  const lastActivityIdRef = useRef(null);

  // Load activities
  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      try {
        const filters = {
          action: filterAction || undefined,
          objectType: filterObjectType || undefined,
          days: filterDateRange !== 'all' ? parseInt(filterDateRange) : undefined
        };
        
        const result = await activityService.getAllActivities(filters);
        if (result.success && result.data) {
          if (result.data.length > 0) {
            // Map data từ API sang format component cần
            const mappedActivities = result.data.map(activity => ({
              ...activity,
              actor: activity.actorUsername || activity.actor // Map actorUsername thành actor
            }));
            setActivities(mappedActivities);
            // Lưu activityId đầu tiên (mới nhất) để so sánh với activity mới
            if (mappedActivities.length > 0 && lastActivityIdRef.current === null) {
              lastActivityIdRef.current = mappedActivities[0].activityId;
            }
          } else {
            // Không có data từ API, set empty array
            setActivities([]);
          }
        } else {
          // Lỗi hoặc không success, set empty array để hiển thị empty state
          setActivities([]);
        }
      } catch (error) {
        console.error('Error loading activities:', error);
        // Set empty array khi có lỗi để hiển thị empty state
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [filterAction, filterObjectType, filterDateRange]);

  // Subscribe to WebSocket for real-time updates
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    
    // Check if WebSocket is connected, if not wait a bit
    const setupWebSocket = () => {
      if (websocketService.getConnectionStatus()) {
        console.log('WebSocket connected, subscribing to admin activities...');
        // Subscribe to admin activities topic
        const subscription = websocketService.subscribeToActivities('ADMIN', null, (newActivity) => {
          console.log('New activity received via WebSocket:', newActivity);
          
          // Kiểm tra nếu là activity mới (khác với activityId đã biết)
          const isNewActivity = lastActivityIdRef.current === null || 
                                newActivity.activityId !== lastActivityIdRef.current;
          
          if (isNewActivity) {
            // Cập nhật lastActivityId
            lastActivityIdRef.current = newActivity.activityId;
            
            // Thông báo có activity mới (luôn thông báo, AdminDashboard sẽ xử lý việc ẩn/hiện)
            if (onNewActivity) {
              onNewActivity();
            }
          }
          
          setActivities(prev => {
            // Add new activity at the beginning (most recent first)
            const updated = [newActivity, ...prev];
            // Keep only unique activities by activityId
            const unique = updated.filter((activity, index, self) =>
              index === self.findIndex(a => a.activityId === activity.activityId)
            );
            return unique;
          });
        });
        if (subscription) {
          activitiesSubscriptionRef.current = subscription;
          console.log('Successfully subscribed to /topic/activities/admin');
        } else {
          console.error('Failed to subscribe to activities topic');
        }
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`WebSocket not connected yet, retrying... (${retryCount}/${maxRetries})`);
          // Retry after a short delay
          setTimeout(setupWebSocket, 1000);
        } else {
          console.error('Max retries reached, WebSocket still not connected');
        }
      }
    };

    // Start setup immediately and also check periodically
    setupWebSocket();
    
    // Also set up interval to check WebSocket connection
    const checkInterval = setInterval(() => {
      if (websocketService.getConnectionStatus() && !activitiesSubscriptionRef.current) {
        console.log('WebSocket connected, setting up subscription...');
        setupWebSocket();
      }
    }, 2000);

    // Cleanup: unsubscribe when component unmounts
    return () => {
      clearInterval(checkInterval);
      if (activitiesSubscriptionRef.current) {
        const destination = '/topic/activities/admin';
        websocketService.unsubscribeFromActivities(destination);
        activitiesSubscriptionRef.current = null;
        console.log('Unsubscribed from activities topic');
      }
    };
  }, []);

  // Filter activities - chỉ filter search ở client, các filter khác đã được xử lý ở backend
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Search filter (chỉ filter ở client-side)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          (activity.actorName && activity.actorName.toLowerCase().includes(searchLower)) ||
          (activity.objectName && activity.objectName.toLowerCase().includes(searchLower)) ||
          (activity.description && activity.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [activities, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredActivities.length / activitiesPerPage);
  const startIndex = (currentPage - 1) * activitiesPerPage;
  const endIndex = startIndex + activitiesPerPage;
  const currentActivities = filteredActivities.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAction, filterObjectType, filterDateRange]);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Handle delete activity
  const handleDeleteActivity = async () => {
    if (!deleteConfirm) return;
    
    setIsDeleting(true);
    const activityId = deleteConfirm.activityId;
    
    try {
      const result = await activityService.deleteActivity(activityId);
      if (result.success) {
        // Remove activity from state
        setActivities(prev => {
          const updated = prev.filter(activity => activity.activityId !== activityId);
          // If current page becomes empty and not on page 1, go to previous page
          const newFiltered = updated.filter(activity => {
            if (searchTerm) {
              const searchLower = searchTerm.toLowerCase();
              const matchesSearch = 
                (activity.actorName && activity.actorName.toLowerCase().includes(searchLower)) ||
                (activity.objectName && activity.objectName.toLowerCase().includes(searchLower)) ||
                (activity.description && activity.description.toLowerCase().includes(searchLower));
              if (!matchesSearch) return false;
            }
            return true;
          });
          const newTotalPages = Math.ceil(newFiltered.length / activitiesPerPage);
          if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
          }
          return updated;
        });
        setDeleteConfirm(null);
        showNotification('Xóa hoạt động thành công', 'success');
      } else {
        setDeleteConfirm(null); // Đóng modal khi xóa thất bại
        showNotification(result.error || 'Không thể xóa hoạt động', 'error');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      setDeleteConfirm(null); // Đóng modal khi có lỗi
      showNotification(error.message || 'Có lỗi xảy ra khi xóa hoạt động', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    // Xử lý cả string và Date object
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // Kiểm tra nếu date không hợp lệ
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format timestamp đầy đủ
  const formatFullTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get action color
  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE':
        return '#4caf50'; // Green
      case 'UPDATE':
        return '#ff9800'; // Orange
      case 'DELETE':
        return '#f44336'; // Red
      default:
        return '#2196f3'; // Blue
    }
  };

  // Get action icon
  const getActionIcon = (action) => {
    switch (action) {
      case 'CREATE':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        );
      case 'UPDATE':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        );
      case 'DELETE':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        );
      default:
        return null;
    }
  };

  // Get unique actors for filter
  const uniqueActors = useMemo(() => {
    const actors = new Set();
    activities.forEach(activity => {
      actors.add(activity.actorRole);
    });
    return Array.from(actors);
  }, [activities]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid rgba(123, 97, 255, 0.3)',
          borderTopColor: '#7b61ff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div className="admin-card">
      {/* Filters */}
      <div className="admin-card__header">
        <h2 className="admin-card__title">Quản lý hoạt động</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="movie-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input 
              className="movie-search__input" 
              placeholder="Tìm kiếm theo tên, mô tả..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="movie-filter"
          >
            <option value="">Tất cả hành động</option>
            <option value="CREATE">Thêm</option>
            <option value="UPDATE">Sửa</option>
            <option value="DELETE">Xóa</option>
          </select>

          <select
            value={filterObjectType}
            onChange={(e) => setFilterObjectType(e.target.value)}
            className="movie-filter"
          >
            <option value="">Tất cả đối tượng</option>
            <option value="MOVIE">Phim</option>
            <option value="CINEMA">Rạp</option>
            <option value="ROOM">Phòng chiếu</option>
            <option value="SHOWTIME">Lịch chiếu</option>
            <option value="USER">Người dùng</option>
            <option value="VOUCHER">Voucher</option>
            <option value="BANNER">Banner</option>
            <option value="FOOD">Đồ ăn</option>
            <option value="PRICE">Bảng giá</option>
          </select>

          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            className="movie-filter"
          >
            <option value="all">Tất cả thời gian</option>
            <option value="1">Hôm nay</option>
            <option value="7">7 ngày qua</option>
            <option value="30">30 ngày qua</option>
            <option value="90">90 ngày qua</option>
          </select>
        </div>
      </div>

      {/* Activities List */}
      <div className="admin-card__content">
        {filteredActivities.length === 0 ? (
          <div className="movie-empty">
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <p>
              {searchTerm || filterAction || filterObjectType || filterDateRange !== 'all'
                ? 'Không tìm thấy hoạt động nào phù hợp với bộ lọc'
                : 'Chưa có hoạt động nào'}
            </p>
          </div>
        ) : (
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Thời gian</th>
                  <th style={{ width: '120px' }}>Hành động</th>
                  <th style={{ width: '120px' }}>Đối tượng</th>
                  <th style={{ width: '180px' }}>Tên đối tượng</th>
                  <th>Mô tả</th>
                  <th style={{ width: '100px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {currentActivities.map((activity) => (
                  <tr key={activity.activityId} className="admin-table-row">
                    <td>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: 600,
                          color: '#fff'
                        }}>
                          {formatTimestamp(activity.timestamp)}
                        </span>
                        <span style={{ 
                          fontSize: '12px', 
                          color: 'rgba(255, 255, 255, 0.5)'
                        }}>
                          {formatFullTimestamp(activity.timestamp)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: `${getActionColor(activity.action)}20`,
                        border: `1px solid ${getActionColor(activity.action)}40`,
                        color: getActionColor(activity.action),
                        fontSize: '13px',
                        fontWeight: 600
                      }}>
                        {getActionIcon(activity.action)}
                        {activity.actionLabel}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: 'rgba(123, 97, 255, 0.1)',
                        border: '1px solid rgba(123, 97, 255, 0.2)',
                        color: '#7b61ff',
                        fontSize: '13px',
                        fontWeight: 500
                      }}>
                        {activity.objectLabel}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '14px', 
                        color: '#fff',
                        fontWeight: 500,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '180px'
                      }} title={activity.objectName}>
                        {activity.objectName}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '13px', 
                        color: 'rgba(255, 255, 255, 0.7)',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%'
                      }} title={activity.description}>
                        {activity.description}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setDeleteConfirm({ 
                          activityId: activity.activityId, 
                          description: activity.description || 'hoạt động này' 
                        })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(244, 67, 54, 0.1)',
                          border: '1px solid rgba(244, 67, 54, 0.3)',
                          color: '#f44336',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(244, 67, 54, 0.2)';
                          e.target.style.borderColor = 'rgba(244, 67, 54, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(244, 67, 54, 0.1)';
                          e.target.style.borderColor = 'rgba(244, 67, 54, 0.3)';
                        }}
                        title="Xóa hoạt động"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {filteredActivities.length > 0 && totalPages > 1 && (() => {
          // Tính toán các trang cần hiển thị
          const getPageNumbers = () => {
            const pages = [];
            const maxVisible = 7; // Số trang tối đa hiển thị
            
            if (totalPages <= maxVisible) {
              // Nếu tổng số trang <= 7, hiển thị tất cả
              for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
              }
            } else {
              // Luôn hiển thị trang đầu
              pages.push(1);
              
              if (currentPage <= 4) {
                // Gần đầu: 1, 2, 3, 4, 5, ..., totalPages
                for (let i = 2; i <= 5; i++) {
                  pages.push(i);
                }
                pages.push('ellipsis-end');
                pages.push(totalPages);
              } else if (currentPage >= totalPages - 3) {
                // Gần cuối: 1, ..., totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
                pages.push('ellipsis-start');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Ở giữa: 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
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

      {/* Notification */}
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{notification.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteActivity}
        title={deleteConfirm?.description}
        message={deleteConfirm ? `Bạn có chắc chắn muốn xóa hoạt động "${deleteConfirm.description}"?` : ''}
        confirmText="Xóa hoạt động"
        isDeleting={isDeleting}
      />

      {/* Summary */}
      {filteredActivities.length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: 'rgba(123, 97, 255, 0.05)',
          border: '1px solid rgba(123, 97, 255, 0.1)',
          borderRadius: '12px',
          display: 'flex',
          gap: '32px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ 
              fontSize: '12px', 
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '4px'
            }}>
              Tổng số hoạt động
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 700,
              color: '#fff'
            }}>
              {filteredActivities.length}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '12px', 
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '4px'
            }}>
              Hoạt động thêm
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 700,
              color: '#4caf50'
            }}>
              {filteredActivities.filter(a => a.action === 'CREATE').length}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '12px', 
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '4px'
            }}>
              Hoạt động sửa
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 700,
              color: '#ff9800'
            }}>
              {filteredActivities.filter(a => a.action === 'UPDATE').length}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '12px', 
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '4px'
            }}>
              Hoạt động xóa
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 700,
              color: '#f44336'
            }}>
              {filteredActivities.filter(a => a.action === 'DELETE').length}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default ActivityManagement;

