import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import './PaymentSuccess.css';
import { paymentService } from '../services/paymentService';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentInfo, setPaymentInfo] = useState({
    paymentMethod: '',
    transactionId: '',
    amount: '',
    status: '',
    orderId: '',
    txnRef: '',
    message: '',
    isTopUp: false
  });
  const [loading, setLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Xác định payment method từ URL params
    const apptransid = searchParams.get('apptransid'); // ZaloPay
    const orderId = searchParams.get('orderId'); // MoMo hoặc WALLET
    const vnp_TxnRef = searchParams.get('vnp_TxnRef'); // VNPay
    const status = searchParams.get('status'); // ZaloPay status hoặc WALLET status
    const resultCode = searchParams.get('resultCode'); // MoMo resultCode
    const vnp_ResponseCode = searchParams.get('vnp_ResponseCode'); // VNPay response code
    const paymentMethodParam = searchParams.get('paymentMethod'); // WALLET
    const amount = searchParams.get('amount') || searchParams.get('vnp_Amount'); // Amount
    const txnRef = orderId || vnp_TxnRef || apptransid;

    console.log('=== PaymentSuccess Debug ===');
    console.log('URL Search Params:', {
      apptransid,
      orderId,
      vnp_TxnRef,
      status,
      resultCode,
      vnp_ResponseCode,
      paymentMethodParam,
      amount,
      txnRef,
      allParams: Object.fromEntries(searchParams.entries())
    });

    // Xác định payment method
    let paymentMethod = 'UNKNOWN';
    let transactionId = '';
    let paymentStatus = '';
    let isPaymentSuccess = false;

    // Kiểm tra WALLET payment trước
    if (paymentMethodParam === 'WALLET' && orderId && status === 'PAID') {
      // WALLET payment - đã thanh toán thành công
      paymentMethod = 'WALLET';
      transactionId = orderId;
      console.log('Detected WALLET payment, orderId:', orderId);
      paymentStatus = 'Thành công';
      isPaymentSuccess = true;
      
      // Set success info ngay lập tức, không cần fetch order
      setIsSuccess(true);
      setPaymentInfo({
        paymentMethod: 'WALLET',
        transactionId: orderId,
        amount: amount ? (parseInt(amount) / 100).toLocaleString('vi-VN') + ' đ' : '',
        status: 'Thành công',
        orderId: orderId,
        txnRef: orderId,
        message: 'Thanh toán thành công bằng ví Cinesmart!'
      });
      
      // Xóa cart và booking data
      localStorage.removeItem('checkoutCart');
      localStorage.removeItem('pendingBooking');
      
      // Dispatch event để NotificationBell reload notifications
      window.dispatchEvent(new CustomEvent('paymentSuccess'));
      
      setLoading(false);
      return;
    } else if (apptransid) {
      // ZaloPay
      paymentMethod = 'ZaloPay';
      transactionId = apptransid;
      console.log('Detected ZaloPay payment, txnRef:', apptransid);
      // Nếu có status trong URL, dùng nó, nhưng vẫn sẽ kiểm tra order để chắc chắn
      if (status !== null && status !== undefined) {
        paymentStatus = status === '1' ? 'Thành công' : 'Thất bại';
        isPaymentSuccess = status === '1';
      } else {
        // Không có status, sẽ kiểm tra order
        paymentStatus = 'Đang kiểm tra...';
        isPaymentSuccess = false; // Tạm thời false, sẽ update sau khi fetch order
      }
    } else if (orderId) {
      // MoMo
      paymentMethod = 'MoMo';
      transactionId = orderId;
      console.log('Detected MoMo payment, txnRef:', orderId);
      // Nếu có resultCode trong URL, dùng nó, nhưng vẫn sẽ kiểm tra order để chắc chắn
      if (resultCode !== null && resultCode !== undefined) {
        paymentStatus = resultCode === '0' ? 'Thành công' : 'Thất bại';
        isPaymentSuccess = resultCode === '0';
      } else {
        // Không có resultCode, sẽ kiểm tra order
        paymentStatus = 'Đang kiểm tra...';
        isPaymentSuccess = false; // Tạm thời false, sẽ update sau khi fetch order
      }
    } else if (vnp_TxnRef) {
      // VNPay
      paymentMethod = 'VNPay';
      transactionId = vnp_TxnRef;
      console.log('Detected VNPay payment, txnRef:', vnp_TxnRef);
      // Nếu có vnp_ResponseCode trong URL, dùng nó
      if (vnp_ResponseCode !== null && vnp_ResponseCode !== undefined) {
        paymentStatus = vnp_ResponseCode === '00' ? 'Thành công' : 'Thất bại';
        isPaymentSuccess = vnp_ResponseCode === '00';
      } else {
        paymentStatus = 'Đang kiểm tra...';
        isPaymentSuccess = false;
      }
    } else {
      // Không có params nào, không thể xác định
      console.error('No payment params found in URL');
      setLoading(false);
      return;
    }

    console.log('Payment method detected:', paymentMethod, 'txnRef:', txnRef);

    // Set initial info
    setPaymentInfo({
      paymentMethod,
      transactionId,
      amount: amount ? (parseInt(amount) / 100).toLocaleString('vi-VN') + ' đ' : '',
      status: paymentStatus,
      orderId: '',
      txnRef: txnRef || '',
      message: isPaymentSuccess ? 'Thanh toán thành công!' : 'Đang kiểm tra...'
    });
    setIsSuccess(isPaymentSuccess);

    // LUÔN LUÔN thử fetch order info dựa trên txnRef để xác định thực sự thành công hay không
    // Vì chỉ lưu đơn thành công, nếu tìm thấy order = thanh toán thành công
    if (txnRef) {
      console.log('Fetching order info for txnRef:', txnRef, 'method:', paymentMethod);
      fetchOrderInfo(txnRef, paymentMethod);
    } else {
      // Không có txnRef = không thể kiểm tra
      console.error('No txnRef found, cannot check order status');
      setLoading(false);
    }
  }, [searchParams]);

  const fetchOrderInfo = async (txnRef, method) => {
    console.log('fetchOrderInfo called with:', txnRef, method);
    try {
      // Thử fetch order nhiều lần với delay để đợi order được lưu (tránh race condition)
      let retryCount = 0;
      const maxRetries = 5;
      let orderData = null;

      while (retryCount < maxRetries) {
        console.log(`Attempt ${retryCount + 1}/${maxRetries} to fetch order...`);
        let result;
        if (method === 'ZaloPay') {
          console.log('Calling checkPaymentStatus for ZaloPay...');
          result = await paymentService.checkPaymentStatus(txnRef);
        } else {
          console.log('Calling getOrderByTxnRef for', method);
          result = await paymentService.getOrderByTxnRef(txnRef);
        }

        console.log('API result:', result);

        if (result.success && result.data) {
          orderData = result.data;
          console.log('Order found:', orderData);
          break;
        }

        // Nếu không tìm thấy, đợi 1000ms rồi thử lại (tăng từ 500ms lên 1000ms)
        if (retryCount < maxRetries - 1) {
          console.log('Order not found, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        retryCount++;
      }

      if (orderData) {
        // Nếu tìm thấy order thì thanh toán thành công (vì chỉ lưu đơn thành công)
        console.log('Payment successful, order found:', orderData.orderId);
        setIsSuccess(true);
        setPaymentInfo(prev => ({
          ...prev,
          orderId: orderData.orderId,
          amount: new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(orderData.totalAmount || 0),
          status: 'Thành công',
          message: 'Thanh toán thành công!',
          isTopUp: orderData.isTopUp === true || orderData.isTopUp === 'true' || false
        }));

        // Xóa cart và booking data
        localStorage.removeItem('checkoutCart');
        localStorage.removeItem('pendingBooking');

        // Dispatch event ngay để NotificationBell reload notifications
        // Backend sẽ tự động tạo notification qua IPN/callback, nhưng có thể mất thời gian
        const orderId = orderData?.orderId;
        const isTopUp = orderData.isTopUp === true || orderData.isTopUp === 'true';
        
        if (orderId) {
          // Dispatch event ngay lập tức để NotificationBell biết có order mới
          window.dispatchEvent(new CustomEvent('paymentSuccess', {
            detail: { orderId: orderId }
          }));
          console.log('Payment success event dispatched for order:', orderId);
          
          // Nếu là top-up, dispatch event để Header cập nhật wallet balance
          if (isTopUp) {
            window.dispatchEvent(new CustomEvent('walletUpdated'));
            console.log('Wallet updated event dispatched for top-up order:', orderId);
          }
        }

        // Backend đã xử lý notification và email qua:
        // - MoMo IPN callback (production) 
        // - checkMomoStatusAndUpdateOrder (localhost testing)
        // - ZaloPay callback
        // Nên KHÔNG cần trigger từ frontend nữa để tránh duplicate
        console.log('Order found, backend handles notification/email. OrderId:', orderId, 'isTopUp:', orderData.isTopUp);
      } else {
        // Không tìm thấy order sau nhiều lần thử = thanh toán thất bại hoặc đang xử lý
        console.error('Order not found after', maxRetries, 'attempts');
        setIsSuccess(false);
        setPaymentInfo(prev => ({
          ...prev,
          status: 'Thất bại',
          message: 'Không tìm thấy đơn hàng. Thanh toán có thể đã thất bại hoặc đang được xử lý. Vui lòng kiểm tra lại sau.'
        }));

        // Xóa cart và booking data để user có thể đặt lại
        localStorage.removeItem('checkoutCart');
        localStorage.removeItem('pendingBooking');
      }
    } catch (error) {
      console.error('Error fetching order info:', error);
      setIsSuccess(false);
      setPaymentInfo(prev => ({
        ...prev,
        status: 'Lỗi',
        message: 'Không thể xác nhận trạng thái thanh toán. Vui lòng kiểm tra lại trong trang đơn hàng.'
      }));
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return '0 đ';
    if (typeof amount === 'string') return amount;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen cinema-mood">
        <Header />
        <main className="main">
          <section className="section">
            <div className="container">
              <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                <p className="text-base m-0">Đang xử lý kết quả thanh toán...</p>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen cinema-mood">
      <Header />
      <main className="main">
        <section className="section">
          <div className="container">
            <div className="payment-success__container">
        <div className={`payment-success__icon ${isSuccess ? 'success' : 'failure'}`}>
          {isSuccess ? (
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="40" cy="40" r="40" fill="#4CAF50" />
              <path
                d="M25 40L35 50L55 30"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="40" cy="40" r="40" fill="#f44336" />
              <path
                d="M30 30L50 50M50 30L30 50"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        <h1 className="payment-success__title">
          {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
        </h1>
        <p className="payment-success__message">
          {paymentInfo.message || (isSuccess
            ? 'Cảm ơn bạn đã đặt vé. Đơn hàng của bạn đã được xác nhận.'
            : 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.')}
        </p>

        <div className="payment-success__details">
          {paymentInfo.paymentMethod && (
            <div className="payment-success__detail-item">
              <span className="payment-success__detail-label">Phương thức:</span>
              <span className="payment-success__detail-value">
                {paymentInfo.paymentMethod}
              </span>
            </div>
          )}
          {paymentInfo.transactionId && (
            <div className="payment-success__detail-item">
              <span className="payment-success__detail-label">Mã giao dịch:</span>
              <span className="payment-success__detail-value">
                {paymentInfo.transactionId}
              </span>
            </div>
          )}
          {paymentInfo.orderId && (
            <div className="payment-success__detail-item">
              <span className="payment-success__detail-label">Mã đơn hàng:</span>
              <span className="payment-success__detail-value">
                #{paymentInfo.orderId}
              </span>
            </div>
          )}
          {paymentInfo.amount && (
            <div className="payment-success__detail-item">
              <span className="payment-success__detail-label">Số tiền:</span>
              <span className="payment-success__detail-value payment-success__amount">
                {formatAmount(paymentInfo.amount)}
              </span>
            </div>
          )}
          {paymentInfo.status && (
            <div className="payment-success__detail-item">
              <span className="payment-success__detail-label">Trạng thái:</span>
              <span className="payment-success__detail-value">
                {paymentInfo.status}
              </span>
            </div>
          )}
        </div>

        <div className="payment-success__actions">
          {isSuccess && paymentInfo.orderId && !paymentInfo.isTopUp && (
            <button
              className="payment-success__button payment-success__button--primary"
              onClick={() => navigate('/orders')}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 5h14M5 5v12a2 2 0 002 2h6a2 2 0 002-2V5M8 5V3a2 2 0 012-2h0a2 2 0 012 2v2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Xem đơn hàng
            </button>
          )}
          {isSuccess && paymentInfo.isTopUp && (
            <button
              className="payment-success__button payment-success__button--primary"
              onClick={() => navigate('/profile?tab=wallet')}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Xem ví Cinesmart
            </button>
          )}
          {!isSuccess && (
            <button
              className="payment-success__button payment-success__button--primary"
              onClick={() => navigate('/checkout')}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 10v6M7 13h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Thử lại
            </button>
          )}
          <button
            className="payment-success__button payment-success__button--secondary"
            onClick={() => navigate('/')}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 10h14M3 10l6-6M3 10l6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Về trang chủ
          </button>
        </div>

        {isSuccess && (
          <div className="payment-success__note">
            <p>
              <strong>Lưu ý:</strong> Vé điện tử đã được gửi đến email của bạn.
              Vui lòng kiểm tra hộp thư đến hoặc thư rác.
            </p>
          </div>
        )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
