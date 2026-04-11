import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import paymentService from '../services/paymentService.js';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function MomoReturn() {
  const query = useQuery();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [orderInfo, setOrderInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const txnRef = query.get('orderId') || query.get('txnRef');
    if (!txnRef) {
      setError('Không tìm thấy thông tin giao dịch.');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const result = await paymentService.getOrderByTxnRef(txnRef);
        if (result.success && result.data) {
          setOrderInfo(result.data);
          if (result.data.status === 'PAID') {
            localStorage.removeItem('checkoutCart');
            localStorage.removeItem('pendingBooking');
          }
        } else {
          setError(result.message || 'Không thể lấy thông tin đơn hàng.');
        }
      } catch (err) {
        console.error('Error fetching order by txnRef:', err);
        setError(err.message || 'Không thể lấy thông tin đơn hàng.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [query]);

  const handleGoToOrders = () => {
    navigate('/orders');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const renderStatus = () => {
    if (!orderInfo) return null;
    const isSuccess = orderInfo.status === 'PAID';

    return (
      <div className="text-center mb-6">
        <div
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            isSuccess ? 'bg-green-600/20' : 'bg-red-600/20'
          }`}
        >
          <span className="text-4xl">{isSuccess ? '✅' : '❌'}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
          {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán không thành công'}
        </h1>
        <p className="text-[#c9c4c5]">
          Mã giao dịch: <span className="font-semibold text-white">{orderInfo.txnRef}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen cinema-mood">
      <Header />

      <main className="main">
        <section className="section">
          <div className="container max-w-xl mx-auto px-4 py-12">
            {loading && (
              <div className="text-center text-[#c9c4c5]">Đang xử lý kết quả thanh toán...</div>
            )}

            {!loading && error && (
              <div className="bg-gradient-to-br from-[#2d2627] to-[#1a1415] border border-red-500/40 rounded-xl p-6 text-center">
                <h1 className="text-2xl font-extrabold text-white mb-2">Có lỗi xảy ra</h1>
                <p className="text-[#c9c4c5] mb-6">{error}</p>
                <button
                  onClick={handleGoHome}
                  className="w-full bg-gradient-to-r from-[#e83b41] to-[#ff5258] text-white font-bold py-3 px-6 rounded-lg"
                >
                  Về trang chủ
                </button>
              </div>
            )}

            {!loading && !error && orderInfo && (
              <div className="bg-gradient-to-br from-[#2d2627] to-[#1a1415] border border-[#4a3f41] rounded-xl p-6">
                {renderStatus()}

                <div className="space-y-3 text-sm text-[#c9c4c5] mb-6">
                  <div className="flex justify-between">
                    <span>Mã đơn hàng</span>
                    <span className="font-semibold text-white">#{orderInfo.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phương thức</span>
                    <span className="font-semibold text-white">{orderInfo.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Số tiền</span>
                    <span className="font-semibold text-[#ffd159]">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(orderInfo.totalAmount || 0)}
                    </span>
                  </div>
                  {orderInfo.bankCode && (
                    <div className="flex justify-between">
                      <span>Loại thanh toán</span>
                      <span className="font-semibold text-white">{orderInfo.bankCode}</span>
                    </div>
                  )}
                  {orderInfo.payDate && (
                    <div className="flex justify-between">
                      <span>Thời gian xử lý</span>
                      <span className="font-semibold text-white">
                        {orderInfo.payDate.replace('T', ' ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleGoToOrders}
                    className="w-full bg-gradient-to-r from-[#e83b41] to-[#ff5258] hover:from-[#ff5258] hover:to-[#ff6b6b] text-white font-bold py-3 px-6 rounded-lg"
                  >
                    Xem đơn hàng của tôi
                  </button>
                  <button
                    onClick={handleGoHome}
                    className="w-full bg-[#1a1415] border border-[#4a3f41] text-white font-semibold py-3 px-6 rounded-lg"
                  >
                    Tiếp tục mua vé
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}


