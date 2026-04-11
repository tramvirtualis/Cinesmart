import React, { useState, useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocketService';
import NotificationToast from './NotificationToast';

export default function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const handleNotification = useCallback((notification) => {
    setNotifications((prev) => [...prev, notification]);
  }, []);

  useEffect(() => {
    // Get user ID from localStorage
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.userId;

    if (userId) {
      // Connect to WebSocket
      websocketService.connect(userId, handleNotification);
    }

    // Cleanup on unmount
    return () => {
      if (userId) {
        websocketService.disconnect();
      }
    };
  }, [handleNotification]);

  // Monitor user changes (login/logout)
  useEffect(() => {
    const handleStorageChange = () => {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userId = user?.userId;

      if (userId) {
        // User logged in - connect
        if (!websocketService.getConnectionStatus()) {
          websocketService.connect(userId, handleNotification);
        }
      } else {
        // User logged out - disconnect
        if (websocketService.getConnectionStatus()) {
          websocketService.disconnect();
        }
        setNotifications([]);
      }
    };

    // Listen for storage changes (login/logout)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for user changes
    const interval = setInterval(() => {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userId = user?.userId;

      if (userId && !websocketService.getConnectionStatus()) {
        websocketService.connect(userId, handleNotification);
      } else if (!userId && websocketService.getConnectionStatus()) {
        websocketService.disconnect();
        setNotifications([]);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [handleNotification]);

  const removeNotification = useCallback((index) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <>
      {children}
      {notifications.map((notification, index) => (
        <NotificationToast
          key={index}
          notification={notification}
          onClose={() => removeNotification(index)}
        />
      ))}
    </>
  );
}

