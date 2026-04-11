import React, { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { customerVoucherService } from '../services/customerVoucherService';
import { voucherService } from '../services/voucherService';

// Helper to get public vouchers from API
const getPublicVouchers = async () => {
  try {
    const result = await voucherService.getPublicVouchers();
    if (result.success && result.data) {
      // Map vouchers from backend format
      const mappedVouchers = (result.data || []).map(v => ({
        voucherId: v.voucherId,
        code: v.code,
        name: v.name,
        description: v.description || '',
        discountType: v.discountType === 'VALUE' ? 'AMOUNT' : v.discountType,
        discountValue: v.discountValue,
        minOrder: v.minOrderAmount || 0,
        minOrderAmount: v.minOrderAmount || 0,
        maxDiscount: v.maxDiscountAmount || 0,
        maxDiscountAmount: v.maxDiscountAmount || 0,
        startDate: v.startDate ? v.startDate.split('T')[0] : '',
        endDate: v.endDate ? v.endDate.split('T')[0] : '',
        isPublic: v.scope === 'PUBLIC',
        image: v.image || '',
      }));
      // All vouchers from public endpoint are already PUBLIC, but filter just in case
      return mappedVouchers.filter(v => v.isPublic);
    }
  } catch (e) {
    console.error('Failed to load vouchers from API', e);
  }
  return [];
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const formatDiscountBadge = (voucher) =>
  voucher.discountType === 'PERCENT'
    ? `-${voucher.discountValue}%`
    : `-${formatCurrency(voucher.discountValue)}`;

const formatDiscountDetail = (voucher) => {
  if (voucher.discountType === 'PERCENT') {
    return voucher.maxDiscount || voucher.maxDiscountAmount
      ? `Giảm ${voucher.discountValue}% (tối đa ${formatCurrency(voucher.maxDiscount || voucher.maxDiscountAmount)})`
      : `Giảm ${voucher.discountValue}%`;
  }
  return `Giảm trực tiếp ${formatCurrency(voucher.discountValue)}`;
};

const formatDiscountType = (type) => {
  if (type === 'PERCENT') return 'Giảm theo %';
  if (type === 'AMOUNT') return 'Giảm theo số tiền';
  return type;
};

const getVoucherStatus = (voucher) => {
  const now = Date.now();
  const start = new Date(voucher.startDate + 'T00:00:00').getTime();
  const end = new Date(voucher.endDate + 'T23:59:59').getTime();
  
  if (now < start) {
    return 'upcoming'; // Chưa bắt đầu
  } else if (now >= start && now <= end) {
    return 'active'; // Đang hoạt động
  } else {
    return 'expired'; // Đã hết hạn
  }
};

const isVoucherActive = (voucher) => {
  return getVoucherStatus(voucher) === 'active';
};

const getDaysLeft = (voucher) => {
  const end = new Date(voucher.endDate + 'T23:59:59').getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
};

const getDaysUntilStart = (voucher) => {
  const start = new Date(voucher.startDate + 'T00:00:00').getTime();
  return Math.max(0, Math.ceil((start - Date.now()) / (1000 * 60 * 60 * 24)));
};

export default function Events() {
  const [vouchers, setVouchers] = useState([]);
  const [voucherStatus, setVoucherStatus] = useState(new Map()); // Map<voucherId, {hasVoucher: boolean, isUsed: boolean}>
  const [loading, setLoading] = useState(true);
  const [savingVoucherId, setSavingVoucherId] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load public vouchers and user's saved vouchers
  const loadData = async () => {
    setLoading(true);
    try {
      // Load public vouchers
      const publicVouchers = await getPublicVouchers();
      
      // Load user's saved vouchers and check used vouchers if logged in
      const token = localStorage.getItem('jwt');
      const statusMap = new Map();
      if (token) {
        try {
          // Check status for each voucher directly from API
          for (const voucher of publicVouchers) {
            try {
              const checkResult = await customerVoucherService.checkVoucher(voucher.voucherId);
              if (checkResult.success) {
                const voucherId = Number(voucher.voucherId);
                statusMap.set(voucherId, {
                  hasVoucher: checkResult.hasVoucher || false,
                  isUsed: checkResult.isUsed || false
                });
              } else if (checkResult.status === 401) {
                // Token hết hạn, clear localStorage và dừng load (không reload trang ở đây)
                localStorage.removeItem('jwt');
                localStorage.removeItem('user');
                break; // Dừng vòng lặp
              }
            } catch (error) {
              // Kiểm tra nếu là lỗi 401
              if (error.response?.status === 401) {
                localStorage.removeItem('jwt');
                localStorage.removeItem('user');
                break; // Dừng vòng lặp, không reload trang ở đây
              }
              // Set default values if check fails
              const voucherId = Number(voucher.voucherId);
              statusMap.set(voucherId, {
                hasVoucher: false,
                isUsed: false
              });
            }
          }
        } catch (error) {
          // Kiểm tra nếu là lỗi 401
          if (error.response?.status === 401) {
            localStorage.removeItem('jwt');
            localStorage.removeItem('user');
            // Không reload trang ở đây, chỉ clear localStorage
          }
        }
      }

      setVoucherStatus(statusMap);

      // Map vouchers with status and filter out expired ones
      const mappedVouchers = publicVouchers
        .map((voucher) => {
          const status = getVoucherStatus(voucher);
          const active = status === 'active';
          return {
            ...voucher,
            active,
            status, // 'upcoming', 'active', 'expired'
            daysLeft: getDaysLeft(voucher),
            daysUntilStart: getDaysUntilStart(voucher)
          };
        })
        .filter((voucher) => voucher.status !== 'expired'); // Ẩn các voucher đã hết hạn

      setVouchers(mappedVouchers);
    } catch (error) {
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Reload voucher status when window gains focus (e.g., after canceling order)
    const handleFocus = () => {
      loadData();
    };
    
    // Listen for custom event when order is cancelled
    const handleOrderCancelled = () => {
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('orderCancelled', handleOrderCancelled);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('orderCancelled', handleOrderCancelled);
    };
  }, []);

  const handleSave = async (voucherId) => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    // Check current status
    const currentStatus = voucherStatus.get(Number(voucherId));
    if (currentStatus && currentStatus.hasVoucher) {
      return; // Already saved
    }

    setSavingVoucherId(voucherId);
    try {
      const result = await customerVoucherService.saveVoucher(voucherId);
      
      // Reload voucher status to ensure consistency
      try {
        const checkResult = await customerVoucherService.checkVoucher(voucherId);
        if (checkResult.success) {
          setVoucherStatus(prev => {
            const newMap = new Map(prev);
            newMap.set(Number(voucherId), {
              hasVoucher: checkResult.hasVoucher || false,
              isUsed: checkResult.isUsed || false
            });
            return newMap;
          });
        }
      } catch (reloadError) {
        // Ignore reload error
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Không thể lưu voucher';
      const status = error.response?.status;
      
      // CHỈ reload khi thực sự là lỗi 401 (token hết hạn)
      // Các lỗi khác (400, 403, etc.) chỉ hiển thị error message
      if (status === 401) {
        // Chỉ reload khi thực sự là 401, không phải các lỗi khác
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        window.location.reload();
        return;
      } else {
        // Tất cả các lỗi khác (400, 403, 500, etc.) chỉ hiển thị error message
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } finally {
      setSavingVoucherId(null);
    }
  };

  return (
    <div className="events-page">
      <Header />
      <div className="container">
        <header className="events-hero">
          <div>
            <p className="events-hero__eyebrow">Ưu đãi dành riêng cho bạn</p>
            <h1 className="events-hero__title">Danh sách voucher hiện có</h1>
            <p className="events-hero__subtitle">
              Chọn và lưu các voucher phù hợp để sử dụng nhanh khi đặt vé và nhận ưu đãi ngay lập tức.
            </p>
          </div>
          <a href="/profile?tab=vouchers" className="events-hero__cta">
            <span className="events-hero__cta-text">Voucher của tôi</span>
          </a>
        </header>

        <section className="voucher-showcase">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#e83b41] mb-4"></div>
              <p className="text-[#c9c4c5]">Đang tải voucher...</p>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#c9c4c5] text-lg">Không có voucher nào</p>
            </div>
          ) : (
            vouchers.map((voucher) => {
              const voucherId = Number(voucher.voucherId);
              const status = voucherStatus.get(voucherId) || { hasVoucher: false, isUsed: false };
              const isSaved = status.hasVoucher;
              const isUsed = status.isUsed;
              const isSaving = savingVoucherId === voucher.voucherId;
              
              return (
                <article key={voucher.voucherId} className="voucher-panel">
                  <div className="voucher-panel__media">
                    <img src={voucher.image} alt={voucher.name} />
                    <span className="voucher-panel__badge">{formatDiscountBadge(voucher)}</span>
                  </div>

                  <div className="voucher-panel__content">
                    <div className="voucher-panel__header">
                      <h2 className="voucher-panel__title">{voucher.name}</h2>
                      <p className="voucher-panel__description">{voucher.description}</p>
                    </div>

                    <div className="voucher-panel__meta">
                      <div className="voucher-meta-chip">
                        <span>Mã voucher</span>
                        <strong>{voucher.code}</strong>
                      </div>
                      <div className="voucher-meta-chip">
                        <span>Giá trị</span>
                        <strong>{formatDiscountDetail(voucher)}</strong>
                      </div>
                      <div className="voucher-meta-chip">
                        <span>Đơn tối thiểu</span>
                        <strong>{formatCurrency(voucher.minOrder || voucher.minOrderAmount || 0)}</strong>
                      </div>
                      <div className="voucher-meta-chip">
                        <span>Thời gian</span>
                        <strong>
                          {new Date(voucher.startDate).toLocaleDateString('vi-VN')} -{' '}
                          {new Date(voucher.endDate).toLocaleDateString('vi-VN')}
                        </strong>
                      </div>
                    </div>

                    <footer className="voucher-panel__footer">
                      <div className="voucher-panel__footer-info">
                        <span className="voucher-panel__code">{voucher.code}</span>
                        <span className="voucher-panel__days">
                          {voucher.status === 'upcoming' 
                            ? `Bắt đầu sau ${voucher.daysUntilStart} ngày`
                            : voucher.status === 'active'
                            ? `${voucher.daysLeft} ngày còn lại`
                            : 'Đã hết hạn'}
                        </span>
                      </div>
                      <button
                        className={`btn ${isSaved || isUsed ? 'btn--ghost' : 'btn--primary'}`}
                        disabled={isSaved || isUsed || isSaving || !voucher.active}
                        onClick={(e) => {
                          if (isSaved || isUsed || !voucher.active) {
                            e.preventDefault();
                            return;
                          }
                          handleSave(voucher.voucherId);
                        }}
                        style={(isSaved || isUsed || !voucher.active) ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                      >
                        {isSaving ? 'Đang lưu...' : isSaved ? 'Đã lưu voucher' : isUsed ? 'Đã sử dụng' : 'Lưu voucher'}
                      </button>
                    </footer>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>

      {/* Login Modal */}
      <ConfirmModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          // Reload trang để cập nhật header
          window.location.reload();
        }}
        onConfirm={() => {
          setShowLoginModal(false);
          window.location.href = '/signin';
        }}
        title="Yêu cầu đăng nhập"
        message="Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục."
        confirmText="Đăng nhập"
        cancelText="Hủy"
        type="alert"
      />

      {/* Error Modal */}
      <ConfirmModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title="Lỗi"
        message={errorMessage}
        confirmText="Đã hiểu"
        type="alert"
        confirmButtonStyle="primary"
      />
    </div>
  );
}
