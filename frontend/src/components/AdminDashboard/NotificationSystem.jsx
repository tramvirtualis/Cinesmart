import React, { useState, useEffect } from 'react';

// Toast Notification Component
export function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: '#4caf50',
    error: '#e83b41',
    warning: '#ff9800',
    info: '#2196f3'
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: bgColors[type] || bgColors.info,
      color: 'white',
      padding: '16px 24px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 99999,
      minWidth: '300px',
      maxWidth: '500px',
      animation: 'slideInRight 0.3s ease-out',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <style>
        {`
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
        `}
      </style>
      {type === 'success' && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
      {type === 'error' && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      )}
      {type === 'warning' && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      )}
      {type === 'info' && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      )}
      <div style={{ flex: 1 }}>{message}</div>
      <button 
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

// Confirm Dialog Component
export function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = 'Xác nhận', cancelText = 'Hủy', type = 'danger' }) {
  return (
    <div className="movie-modal-overlay" onClick={onCancel}>
      <div 
        className="movie-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '450px' }}
      >
        <div className="movie-modal__header">
          <h2>{title}</h2>
          <button className="movie-modal__close" onClick={onCancel}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="movie-modal__content" style={{ padding: '24px' }}>
          <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#333' }}>{message}</p>
        </div>
        <div className="movie-modal__footer">
          <button className="btn btn--ghost" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className="btn btn--primary" 
            onClick={onConfirm}
            style={type === 'danger' ? { backgroundColor: '#e83b41' } : {}}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Notification Provider with Hook
export function useNotification() {
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const showConfirm = (options) => {
    return new Promise((resolve) => {
      setConfirm({
        ...options,
        onConfirm: () => {
          setConfirm(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirm(null);
          resolve(false);
        }
      });
    });
  };

  const NotificationContainer = () => (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {confirm && <ConfirmDialog {...confirm} />}
    </>
  );

  return {
    showToast,
    showConfirm,
    NotificationContainer
  };
}