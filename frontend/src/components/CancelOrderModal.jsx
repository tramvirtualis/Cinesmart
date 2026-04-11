import React, { useState } from 'react';

/**
 * Modal xác nhận hủy đơn hàng
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when closing the modal
 * @param {Function} props.onConfirm - Function to call when confirming cancellation (receives reason as parameter)
 * @param {string} props.orderId - Order ID to display
 * @param {boolean} props.isCancelling - Whether cancellation is in progress
 */
export default function CancelOrderModal({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  isCancelling = false
}) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason);
    setReason(''); // Reset reason after confirming
  };

  const handleClose = () => {
    if (!isCancelling) {
      setReason('');
      onClose();
    }
  };

  return (
    <div className="movie-modal-overlay" onClick={handleClose}>
      <div className="movie-modal movie-modal--confirm" onClick={(e) => e.stopPropagation()}>
        <div className="movie-modal__header">
          <h2>Xác nhận hủy đơn hàng</h2>
          <button 
            className="movie-modal__close" 
            onClick={handleClose}
            disabled={isCancelling}
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
              background: 'rgba(255, 193, 7, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p style={{ fontSize: '16px', color: '#fff', marginBottom: '8px', fontWeight: 500 }}>
              Bạn có chắc chắn muốn hủy đơn <strong style={{ color: '#ffd159' }}>{orderId}</strong>?
            </p>
            <p style={{ fontSize: '14px', color: '#c9c4c5', marginBottom: '20px' }}>
              Toàn bộ số tiền sẽ được hoàn về Ví Cinesmart.
            </p>
            
            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#fff', 
                marginBottom: '8px',
                fontWeight: 500
              }}>
                Lý do hủy (không bắt buộc):
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do hủy đơn hàng..."
                disabled={isCancelling}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#fff',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ffd159'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              />
            </div>

            <p className="movie-modal__warning" style={{ 
              fontSize: '13px', 
              color: '#ff9800', 
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(255, 152, 0, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 152, 0, 0.2)',
              textAlign: 'left'
            }}>
              ⚠️ Sau khi hủy, bạn sẽ không thể hoàn tác hành động này.
            </p>
          </div>
        </div>
        <div className="movie-modal__footer">
          <button 
            className="btn btn--ghost" 
            onClick={handleClose}
            disabled={isCancelling}
          >
            Hủy
          </button>
          <button
            className="btn btn--danger"
            onClick={handleConfirm}
            disabled={isCancelling}
            style={{ backgroundColor: '#e83b41' }}
          >
            {isCancelling ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
                    <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Đang hủy...
              </>
            ) : (
              'Xác nhận hủy'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

