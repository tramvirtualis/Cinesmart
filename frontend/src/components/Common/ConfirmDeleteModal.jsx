import React from 'react';

/**
 * Reusable confirmation delete modal component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when closing the modal
 * @param {Function} props.onConfirm - Function to call when confirming deletion
 * @param {string} props.title - Title of the item being deleted
 * @param {string} props.message - Custom message (optional, will use default if not provided)
 * @param {string} props.confirmText - Text for confirm button (default: "Xóa")
 * @param {boolean} props.isDeleting - Whether deletion is in progress (to show loading state)
 */
export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xóa',
  isDeleting = false
}) {
  if (!isOpen) return null;

  const defaultMessage = title 
    ? `Bạn có chắc chắn muốn xóa ${title}?`
    : 'Bạn có chắc chắn muốn xóa mục này?';

  return (
    <div className="movie-modal-overlay" onClick={onClose}>
      <div className="movie-modal movie-modal--confirm" onClick={(e) => e.stopPropagation()}>
        <div className="movie-modal__header">
          <h2>Xác nhận xóa</h2>
          <button 
            className="movie-modal__close" 
            onClick={onClose}
            disabled={isDeleting}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="movie-modal__content">
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 20px',
              borderRadius: '50%',
              background: 'rgba(232, 59, 65, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e83b41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p style={{ fontSize: '16px', color: '#fff', marginBottom: '8px', fontWeight: 500 }}>
              {message || defaultMessage}
            </p>
            {title && (
              <p style={{ fontSize: '14px', color: '#c9c4c5', marginBottom: '16px' }}>
                <strong style={{ color: '#ffd159' }}>{title}</strong>
              </p>
            )}
            <p className="movie-modal__warning" style={{ 
              fontSize: '13px', 
              color: '#ff9800', 
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(255, 152, 0, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 152, 0, 0.2)'
            }}>
              ⚠️ Hành động này không thể hoàn tác.
            </p>
          </div>
        </div>
        <div className="movie-modal__footer">
          <button 
            className="btn btn--ghost" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Hủy
          </button>
          <button
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
                    <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Đang xóa...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

