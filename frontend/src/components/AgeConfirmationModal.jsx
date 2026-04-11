import React, { useState, useEffect } from 'react';
import { enumService } from '../services/enumService';

/**
 * Modal xác nhận độ tuổi - Component tái sử dụng
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when closing the modal
 * @param {Function} props.onConfirm - Function to call when confirming (will be called when user clicks "Tiếp tục")
 * @param {string} props.movieTitle - Title of the movie
 * @param {string|Object} props.ageRating - Age rating (can be backend format or display format)
 * @param {boolean} props.loading - Whether to show loading state (optional)
 */
export default function AgeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  movieTitle,
  ageRating,
  loading = false
}) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAgeConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format age rating to display format
  const formatAgeRating = (rating) => {
    if (!rating) return 'P';
    const ratingStr = typeof rating === 'string' ? rating : rating.toString();
    return enumService.mapAgeRatingToDisplay(ratingStr) || 'P';
  };

  const rating = formatAgeRating(ageRating);
  const ageNumber = rating.replace(/[^0-9]/g, '');
  const isK = rating === 'K';
  const isP = rating === 'P';

  const getRatingDescription = () => {
    if (isP) {
      return 'Phim dành cho mọi lứa tuổi';
    } else if (isK) {
      return 'Phim dành cho khán giả dưới 13 tuổi, cần có ba mẹ đi cùng';
    } else if (ageNumber) {
      return `Phim dành cho khán giả từ đủ ${ageNumber} tuổi trở lên (${ageNumber}+)`;
    } else {
      return 'N/A';
    }
  };

  const getConfirmationText = () => {
    if (isP) {
      return 'Tôi xác nhận rằng tôi đủ điều kiện để xem phim này.';
    } else if (isK) {
      return 'Tôi đã hiểu và đồng ý.';
    } else if (ageNumber) {
      return `Tôi xác nhận rằng tôi đã đủ ${ageNumber} tuổi trở lên và đủ điều kiện để xem phim này.`;
    } else {
      return 'Tôi xác nhận rằng tôi đủ điều kiện để xem phim này.';
    }
  };

  const handleConfirm = () => {
    if (!ageConfirmed) {
      return;
    }
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setAgeConfirmed(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="modal-content"
        style={{
          backgroundColor: '#2d2627',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          border: '1px solid #4a3f41'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          margin: '0 0 24px', 
          fontSize: '24px', 
          fontWeight: 800, 
          color: '#fff',
          textAlign: 'center'
        }}>
          Xác nhận độ tuổi
        </h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#c9c4c5' }}>
            Đang tải thông tin phim...
          </div>
        ) : (
          <>
            <div style={{ 
              marginBottom: '24px',
              padding: '20px',
              backgroundColor: '#1a1415',
              borderRadius: '8px',
              border: '1px solid #4a3f41'
            }}>
              <div style={{ 
                fontSize: '16px', 
                color: '#fff', 
                marginBottom: '12px',
                fontWeight: 600
              }}>
                Phim: {movieTitle || 'N/A'}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#c9c4c5',
                lineHeight: '1.6'
              }}>
                <strong style={{ color: '#ffd159' }}>{rating}:</strong> {getRatingDescription()}
              </div>
            </div>

            <div style={{ 
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <input
                type="checkbox"
                id="age-confirm-checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  marginTop: '2px',
                  cursor: 'pointer',
                  accentColor: '#e83b41'
                }}
              />
              <label 
                htmlFor="age-confirm-checkbox"
                style={{
                  fontSize: '14px',
                  color: '#c9c4c5',
                  lineHeight: '1.6',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                {getConfirmationText()}
              </label>
            </div>

            <div style={{ 
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                className="btn btn--ghost"
                onClick={handleClose}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Hủy
              </button>
              <button
                className="btn btn--primary"
                onClick={handleConfirm}
                disabled={!ageConfirmed}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: ageConfirmed ? 1 : 0.5,
                  cursor: ageConfirmed ? 'pointer' : 'not-allowed',
                  border: 'none'
                }}
              >
                Tiếp tục
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

