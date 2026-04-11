import React from 'react';

/**
 * Component để chọn phương thức thanh toán (MoMo, ZaloPay, Ví Cinesmart)
 */
export default function PaymentMethodSelector({
  paymentMethod,
  onPaymentMethodChange,
  walletBalance,
  loadingWallet = false,
  totalAmount,
  formatPrice
}) {
  const isWalletDisabled = walletBalance !== null && walletBalance < totalAmount;

  return (
    <div className="bg-gradient-to-br from-[#2d2627] to-[#1a1415] border border-[#4a3f41] rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#ffd159]">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
        Phương thức thanh toán
      </h2>
      <div className="checkout-payment-methods">
        {/* MoMo */}
        <label className="checkout-payment-method">
          <input
            type="radio"
            name="payment"
            value="MOMO"
            checked={paymentMethod === 'MOMO'}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
          />
          <div className="checkout-payment-method__content">
            <img 
              src="/momo.png" 
              alt="MoMo" 
              style={{ 
                width: '32px', 
                height: '32px', 
                marginRight: '12px', 
                flexShrink: 0, 
                objectFit: 'contain' 
              }} 
            />
            <span>MoMo</span>
          </div>
        </label>

        {/* ZaloPay */}
        <label className="checkout-payment-method">
          <input
            type="radio"
            name="payment"
            value="ZALOPAY"
            checked={paymentMethod === 'ZALOPAY'}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
          />
          <div className="checkout-payment-method__content">
            <img 
              src="/zalopay.png" 
              alt="ZaloPay" 
              style={{ 
                width: '32px', 
                height: '32px', 
                marginRight: '12px', 
                flexShrink: 0, 
                objectFit: 'contain' 
              }} 
            />
            <span>ZaloPay</span>
          </div>
        </label>

        {/* Ví Cinesmart */}
        <label className="checkout-payment-method">
          <input
            type="radio"
            name="payment"
            value="WALLET"
            checked={paymentMethod === 'WALLET'}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            disabled={isWalletDisabled}
          />
          <div className="checkout-payment-method__content">
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              style={{ 
                marginRight: '12px', 
                flexShrink: 0, 
                color: '#ffd159' 
              }}
            >
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span>Ví Cinesmart</span>
                {loadingWallet ? (
                  <span className="text-xs text-[#c9c4c5]">Đang tải...</span>
                ) : walletBalance !== null ? (
                  <span className="text-xs text-[#c9c4c5]">
                    Số dư: {formatPrice(walletBalance)}
                  </span>
                ) : null}
              </div>
              {isWalletDisabled && (
                <div className="text-xs text-[#ff5258] mt-1">
                  Số dư không đủ. Vui lòng nạp thêm {formatPrice(totalAmount - walletBalance)}
                </div>
              )}
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}

