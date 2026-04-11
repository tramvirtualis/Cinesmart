import React, { useState, useEffect } from 'react';

/**
 * Modal để xác thực mã PIN khi thanh toán bằng ví Cinesmart
 */
export default function PinVerificationModal({ 
  isOpen, 
  onClose, 
  onVerify, 
  error = '',
  loading = false 
}) {
  const [pinInput, setPinInput] = useState('');
  const [localError, setLocalError] = useState('');

  // Reset khi modal mở/đóng
  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setLocalError('');
    }
  }, [isOpen]);

  // Update local error khi prop error thay đổi
  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPinInput(value);
    setLocalError(''); // Clear error when typing
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && pinInput.length === 6) {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!pinInput || pinInput.length !== 6) {
      setLocalError('Mã PIN phải có đúng 6 chữ số');
      return;
    }

    if (onVerify) {
      onVerify(pinInput);
    }
  };

  const handleClose = () => {
    if (!loading && onClose) {
      setPinInput('');
      setLocalError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  const displayError = localError || error;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-gradient-to-br from-[#2d2627] to-[#1a1415] border border-[#4a3f41] rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#ffd159]">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Xác thực mã PIN
          </h3>
          {!loading && (
            <button
              onClick={handleClose}
              className="text-[#c9c4c5] hover:text-white transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <p className="text-[#c9c4c5] text-sm mb-6">
          Vui lòng nhập mã PIN để xác nhận thanh toán bằng ví Cinesmart
        </p>

        {displayError && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {displayError}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#c9c4c5] mb-2">
            Mã PIN (6 chữ số)
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pinInput}
            onChange={handlePinChange}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 bg-[#1f191a] border border-[#4a3f41] rounded-lg text-white placeholder-[#6b6264] focus:outline-none focus:border-[#e83b41] transition-colors text-center text-2xl tracking-widest font-mono"
            placeholder="000000"
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-[#4a3f41] hover:bg-[#5a4f51] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || pinInput.length !== 6}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#e83b41] to-[#ff5258] hover:from-[#ff5258] hover:to-[#ff6b6b] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Đang xác thực...
              </>
            ) : (
              'Xác nhận'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

