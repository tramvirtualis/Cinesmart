import React from 'react';

/**
 * Modal xác nhận đẹp thay thế cho confirm() và alert()
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message = '',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'confirm', // 'confirm' hoặc 'alert'
  confirmButtonStyle = 'primary' // 'primary' hoặc 'danger'
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-gradient-to-br from-[#2d2627] to-[#1a1415] border border-[#4a3f41] rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {type === 'alert' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#ffd159]">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#ffd159]">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            {title}
          </h3>
          <button
            onClick={handleClose}
            className="text-[#c9c4c5] hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="text-[#c9c4c5] text-sm mb-6 whitespace-pre-line">
          {message}
        </p>

        <div className={`flex gap-3 ${type === 'alert' ? 'justify-end' : 'justify-between'}`}>
          {type === 'confirm' && (
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-[#4a3f41] hover:bg-[#5a4f51] text-white font-semibold rounded-lg transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-6 py-3 font-semibold rounded-lg transition-all ${
              confirmButtonStyle === 'danger'
                ? 'bg-gradient-to-r from-[#e83b41] to-[#ff5258] hover:from-[#ff5258] hover:to-[#ff6b6b] text-white'
                : 'bg-gradient-to-r from-[#ffd159] to-[#ffc107] hover:from-[#ffc107] hover:to-[#ffb300] text-[#1a1415]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

