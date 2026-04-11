import React, { useState, useRef, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { websocketService } from '../services/websocketService';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef(null);
  const userIdRef = useRef(null);
  const audioContextRef = useRef(null);

  // Tạo âm thanh chill khi có thông báo mới
  const playNotificationSound = async () => {
    try {
      // Tạo AudioContext nếu chưa có
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Resume audio context nếu bị suspended (do browser policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Tạo oscillator với tần số nhẹ nhàng (C5 = 523.25 Hz)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Kết nối oscillator với gain node và output
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Cấu hình âm thanh chill (sine wave, tần số thấp)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      
      // Envelope mềm mại (fade in và fade out)
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05); // Fade in nhanh
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.15); // Giữ volume
      gainNode.gain.linearRampToValueAtTime(0, now + 0.4); // Fade out mềm
      
      // Phát âm thanh
      oscillator.start(now);
      oscillator.stop(now + 0.4);
      
      // Tạo thêm một nốt nhẹ nhàng sau đó (tạo hiệu ứng chuông)
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
        
        const now2 = audioContext.currentTime;
        gainNode2.gain.setValueAtTime(0, now2);
        gainNode2.gain.linearRampToValueAtTime(0.25, now2 + 0.03);
        gainNode2.gain.linearRampToValueAtTime(0, now2 + 0.3);
        
        oscillator2.start(now2);
        oscillator2.stop(now2 + 0.3);
      }, 100);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Vừa xong';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Vừa xong';
    
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

  // Load notifications from API
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await notificationService.getNotifications();
      if (result.success && result.data) {
        setNotifications(result.data);
      } else {
        console.error('Failed to load notifications:', result.error);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const result = await notificationService.getUnreadCount();
      // Count will be updated from notifications state
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  // Get userId from localStorage
  const getUserId = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        return user.userId || user.id;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return null;
  };

  // Load notifications on mount
  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      userIdRef.current = userId;
      loadNotifications();
      
      // Connect WebSocket
      websocketService.connect(userId, (notification) => {
        console.log('New notification received:', notification);
        
        // Phát âm thanh khi có thông báo mới
        playNotificationSound();
        
        // Add notification to the list
        setNotifications(prev => {
          // Check if notification already exists (by notificationId)
          const exists = prev.some(n => n.notificationId === notification.notificationId);
          if (exists) return prev;
          
          // Add new notification at the beginning
          return [notification, ...prev];
        });
      });
      
      // Listen for payment success event to reload notifications
      const handlePaymentSuccess = (event) => {
        const orderId = event?.detail?.orderId;
        console.log('Payment success event received, orderId:', orderId, 'reloading notifications...');
        
        // Reload ngay lập tức (có thể notification đã được tạo qua WebSocket)
        loadNotifications();
        playNotificationSound();
        
        // Reload lại sau 2 giây để đảm bảo notification đã được tạo (nếu IPN/callback chậm)
        setTimeout(() => {
          console.log('Reloading notifications again after delay...');
          loadNotifications();
          playNotificationSound();
        }, 2000);
        
        // Reload lại sau 5 giây nữa để chắc chắn (nếu backend chậm)
        setTimeout(() => {
          console.log('Final reload of notifications...');
          loadNotifications();
        }, 5000);
      };
      
      // Listen for order cancelled event to reload notifications
      const handleOrderCancelled = () => {
        console.log('Order cancelled event received, reloading notifications...');
        
        // Reload ngay lập tức (có thể notification đã được tạo qua WebSocket)
        loadNotifications();
        playNotificationSound();
        
        // Reload lại sau 1 giây để đảm bảo notification đã được tạo
        setTimeout(() => {
          console.log('Reloading notifications after order cancellation...');
          loadNotifications();
        }, 1000);
      };
      
      window.addEventListener('paymentSuccess', handlePaymentSuccess);
      window.addEventListener('orderCancelled', handleOrderCancelled);
      
      return () => {
        window.removeEventListener('paymentSuccess', handlePaymentSuccess);
        window.removeEventListener('orderCancelled', handleOrderCancelled);
        websocketService.disconnect();
        // Cleanup audio context
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }
      };
    }

    return () => {
      websocketService.disconnect();
      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Chỉ lấy những thông báo chưa đọc
  const unreadNotifications = notifications.filter(n => !n.isRead);
  const unreadCount = unreadNotifications.length;
  const displayedNotifications = showAll ? unreadNotifications : unreadNotifications.slice(0, 3);

  const markAsRead = async (notificationId) => {
    try {
      const result = await notificationService.markAsRead(notificationId);
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.notificationId === notificationId 
              ? { ...n, isRead: true }
              : n
          )
        );
      } else {
        console.error('Failed to mark as read:', result.error);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const result = await notificationService.markAllAsRead();
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true }))
        );
        setShowAll(false);
      } else {
        console.error('Failed to mark all as read:', result.error);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const result = await notificationService.deleteNotification(notificationId);
      if (result.success) {
        // Remove from local state
        setNotifications(prev => 
          prev.filter(n => n.notificationId !== notificationId)
        );
      } else {
        console.error('Failed to delete notification:', result.error);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            loadNotifications(); // Refresh when opening
          }
        }}
        className="relative p-2 text-[#e6e1e2] hover:text-white transition-colors"
        aria-label="Thông báo"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span 
            className="absolute top-0 right-0 bg-[#e83b41] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
            style={{
              minWidth: '20px',
              padding: '0 4px',
              fontSize: '10px',
              lineHeight: '1',
              boxShadow: '0 2px 8px rgba(232, 59, 65, 0.5)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 bg-[#2d2627] border border-[#4a3f41] rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col"
          style={{
            top: '100%',
            marginTop: '8px',
            zIndex: 200
          }}
        >
          <div className="p-4 border-b border-[#4a3f41] flex items-center justify-between">
            <h3 className="text-white font-semibold">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#ffd159] hover:text-[#ffeb9e] transition-colors"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-[#c9c4c5]">
                <div style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#ffd159',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></div>
                <p style={{ marginTop: '12px' }}>Đang tải...</p>
              </div>
            ) : unreadNotifications.length === 0 ? (
              <div className="p-8 text-center text-[#c9c4c5]">
                <svg className="mx-auto mb-3 w-12 h-12 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>Không có thông báo mới</p>
              </div>
            ) : (
              <>
                {displayedNotifications.map((notification) => (
                  <div
                    key={notification.notificationId || notification.id}
                    className="p-4 border-b border-[#4a3f41] hover:bg-[#1a1415] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-[#4caf50] rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[#c9c4c5] text-xs mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <span className="text-[#9e9e9e] text-xs">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          markAsRead(notification.notificationId || notification.id);
                          // Remove notification after marking as read
                          setTimeout(() => {
                            deleteNotification(notification.notificationId || notification.id);
                          }, 500);
                        }}
                        className="text-[#9e9e9e] hover:text-white transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        aria-label="Đánh dấu đã đọc"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {unreadNotifications.length > 3 && (
            <div className="p-3 border-t border-[#4a3f41]">
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-center text-sm text-[#ffd159] hover:text-[#ffeb9e] transition-colors"
              >
                {showAll ? 'Thu gọn' : `Xem thêm (${unreadNotifications.length - 3})`}
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
