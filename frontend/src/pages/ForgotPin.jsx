import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { walletPinService } from '../services/walletService';

export default function ForgotPin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(1); // 1: nhập email, 2: nhập OTP, 3: nhập PIN mới
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (countdown === 0 && isResendDisabled) {
      setIsResendDisabled(false);
    }
  }, [countdown, isResendDisabled]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setIsSending(true);

    if (!email) {
      setError('Vui lòng nhập email');
      setIsSending(false);
      return;
    }

    try {
      await walletPinService.sendForgotPinOtp(email);
      setStep(2);
      setCountdown(30);
      setIsResendDisabled(true);
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
    
    setIsSending(false);
  };

  const handleResendOTP = async () => {
    setError('');
    setIsResendDisabled(true);
    setCountdown(30);

    try {
      await walletPinService.sendForgotPinOtp(email);
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
      setIsResendDisabled(false);
      setCountdown(0);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    if (!otp || otp.length !== 6) {
      setError('Vui lòng nhập mã OTP 6 chữ số');
      setIsVerifying(false);
      return;
    }

    // Chuyển sang bước nhập PIN mới
    setStep(3);
    setIsVerifying(false);
  };

  const handleResetPin = async (e) => {
    e.preventDefault();
    setError('');
    setIsResetting(true);

    if (!newPin || newPin.length !== 6) {
      setError('Mã PIN phải có đúng 6 chữ số');
      setIsResetting(false);
      return;
    }

    if (!confirmPin || confirmPin.length !== 6) {
      setError('Xác nhận mã PIN phải có đúng 6 chữ số');
      setIsResetting(false);
      return;
    }

    if (newPin !== confirmPin) {
      setError('Mã PIN và xác nhận mã PIN không khớp');
      setIsResetting(false);
      return;
    }

    try {
      const result = await walletPinService.resetPinWithOtp({
        email,
        otp,
        newPin,
        confirmPin
      });
      
      // Reset thành công, hiển thị modal
      setShowSuccessModal(true);
    } catch (err) {
      console.error('[ForgotPin] Error resetting PIN:', err);
      setError(err.message || 'Đặt lại mã PIN thất bại');
    }
    
    setIsResetting(false);
  };

  // Step 3: Nhập PIN mới
  if (step === 3) {
    return (
      <div className="min-h-screen cinema-mood">
        <div className="split">
          <section className="intro">
            <div className="intro__content">
              <h1 className="intro__title">ĐẶT LẠI<br/>MÃ PIN</h1>
              <p className="intro__subtitle">Nhập mã PIN mới cho ví Cinesmart của bạn</p>
            </div>
            <div className="intro__popcorn" aria-hidden="true"></div>
          </section>

          <section className="auth">
            <div className="auth__panel">
              <button className="close" aria-label="Đóng" onClick={() => navigate('/')}>×</button>
              <h2 className="auth__title">ĐẶT LẠI MÃ PIN</h2>
              <p className="auth__subtitle">
                Nhập mã PIN mới gồm 6 chữ số
              </p>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(232, 59, 65, 0.1)',
                  border: '1px solid rgba(232, 59, 65, 0.3)',
                  borderRadius: '8px',
                  color: '#e83b41',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <form className="auth__form" action="#" method="post" autoComplete="off" onSubmit={handleResetPin}>
                <label className="field">
                  <span className="field__label">Mã PIN mới</span>
                  <input
                    className="field__input"
                    type="password"
                    name="newPin"
                    placeholder="Nhập mã PIN 6 chữ số"
                    value={newPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setNewPin(value);
                      if (error) setError('');
                    }}
                    required
                    maxLength={6}
                    style={{ 
                      textAlign: 'center',
                      fontSize: '20px',
                      letterSpacing: '4px',
                      fontWeight: '600'
                    }}
                    autoFocus
                  />
                </label>

                <label className="field">
                  <span className="field__label">Xác nhận mã PIN</span>
                  <input
                    className="field__input"
                    type="password"
                    name="confirmPin"
                    placeholder="Nhập lại mã PIN 6 chữ số"
                    value={confirmPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setConfirmPin(value);
                      if (error) setError('');
                    }}
                    required
                    maxLength={6}
                    style={{ 
                      textAlign: 'center',
                      fontSize: '20px',
                      letterSpacing: '4px',
                      fontWeight: '600'
                    }}
                  />
                </label>

                <button 
                  className="btn btn--primary" 
                  type="submit"
                  disabled={isResetting || newPin.length !== 6 || confirmPin.length !== 6}
                  style={{ 
                    opacity: (isResetting || newPin.length !== 6 || confirmPin.length !== 6) ? 0.6 : 1,
                    cursor: (isResetting || newPin.length !== 6 || confirmPin.length !== 6) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isResetting ? 'Đang đặt lại...' : 'Đặt lại mã PIN'}
                </button>
              </form>

              <div className="auth__signup" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setNewPin('');
                    setConfirmPin('');
                    setError('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#c9c4c5',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  ← Quay lại nhập OTP
                </button>
              </div>
            </div>
          </section>
        </div>
        <Footer />

        {/* Success Modal */}
        <ConfirmModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            navigate('/profile?tab=pin');
          }}
          onConfirm={() => {
            setShowSuccessModal(false);
            navigate('/profile?tab=pin');
          }}
          title="Thành công"
          message="Đặt lại mã PIN thành công!"
          confirmText="Đã hiểu"
          type="alert"
        />
      </div>
    );
  }

  // Step 2: Nhập OTP
  if (step === 2) {
    return (
      <div className="min-h-screen cinema-mood">
        <div className="split">
          <section className="intro">
            <div className="intro__content">
              <h1 className="intro__title">NHẬP MÃ<br/>XÁC THỰC</h1>
              <p className="intro__subtitle">Vui lòng nhập mã OTP đã được gửi đến email của bạn</p>
            </div>
            <div className="intro__popcorn" aria-hidden="true"></div>
          </section>

          <section className="auth">
            <div className="auth__panel">
              <button className="close" aria-label="Đóng" onClick={() => navigate('/')}>×</button>
              <h2 className="auth__title">XÁC THỰC OTP</h2>
              <p className="auth__subtitle">
                Chúng tôi đã gửi mã OTP đến email <strong>{email}</strong>. 
                Vui lòng kiểm tra và nhập mã 6 chữ số.
              </p>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(232, 59, 65, 0.1)',
                  border: '1px solid rgba(232, 59, 65, 0.3)',
                  borderRadius: '8px',
                  color: '#e83b41',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <form className="auth__form" action="#" method="post" autoComplete="off" onSubmit={handleVerifyOTP}>
                <label className="field">
                  <span className="field__label">Mã OTP</span>
                  <style>{`.otp-input::placeholder { font-size: 14px; opacity: 0.85; }`}</style>
                  <input
                    className="field__input otp-input"
                    type="text"
                    name="otp"
                    placeholder="Nhập mã OTP 6 chữ số"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(value);
                      if (error) setError('');
                    }}
                    required
                    maxLength={6}
                    style={{ 
                      textAlign: 'center',
                      fontSize: '24px',
                      letterSpacing: '8px',
                      fontWeight: '600'
                    }}
                    autoFocus
                  />
                </label>

                <button 
                  className="btn btn--primary" 
                  type="submit"
                  disabled={isVerifying || otp.length !== 6}
                  style={{ 
                    opacity: (isVerifying || otp.length !== 6) ? 0.6 : 1,
                    cursor: (isVerifying || otp.length !== 6) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isVerifying ? 'Đang xác thực...' : 'Xác thực OTP'}
                </button>
              </form>

              <div style={{ 
                marginTop: '20px', 
                padding: '16px', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#c9c4c5', fontSize: '14px', marginBottom: '12px' }}>
                  Không nhận được mã OTP?
                </p>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isResendDisabled}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: isResendDisabled ? '#666' : '#fff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: isResendDisabled ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    width: '100%',
                    transition: 'all 0.3s'
                  }}
                >
                  {isResendDisabled 
                    ? `Gửi lại mã sau ${countdown}s` 
                    : 'Gửi lại mã OTP'
                  }
                </button>
              </div>

              <div className="auth__signup" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                    setError('');
                    setCountdown(0);
                    setIsResendDisabled(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#c9c4c5',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  ← Quay lại nhập email
                </button>
              </div>
            </div>
          </section>
        </div>
        <Footer />

        {/* Success Modal */}
        <ConfirmModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            navigate('/profile?tab=pin');
          }}
          onConfirm={() => {
            setShowSuccessModal(false);
            navigate('/profile?tab=pin');
          }}
          title="Thành công"
          message="Đặt lại mã PIN thành công!"
          confirmText="Đã hiểu"
          type="alert"
        />
      </div>
    );
  }

  // Step 1: Nhập email
  return (
    <div className="min-h-screen cinema-mood">
      <div className="split">
        <section className="intro">
          <div className="intro__content">
            <h1 className="intro__title">QUÊN MÃ<br/>PIN</h1>
            <p className="intro__subtitle">Nhập email của bạn và chúng tôi sẽ gửi mã OTP để đặt lại mã PIN</p>
          </div>
          <div className="intro__popcorn" aria-hidden="true"></div>
        </section>

        <section className="auth">
          <div className="auth__panel">
            <button className="close" aria-label="Đóng" onClick={() => { window.location.hash = ''; }}>×</button>
            <h2 className="auth__title">QUÊN MÃ PIN</h2>
            <p className="auth__subtitle">Chúng tôi sẽ gửi mã OTP đến email của bạn để xác thực</p>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(232, 59, 65, 0.1)',
                border: '1px solid rgba(232, 59, 65, 0.3)',
                borderRadius: '8px',
                color: '#e83b41',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <form className="auth__form" action="#" method="post" autoComplete="on" onSubmit={handleSendOTP}>
              <label className="field">
                <span className="field__label">Email</span>
                <input
                  className="field__input"
                  type="email"
                  name="email"
                  placeholder="Nhập email của bạn"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  required
                />
              </label>

              <button 
                className="btn btn--primary" 
                type="submit"
                disabled={isSending}
                style={{
                  opacity: isSending ? 0.6 : 1,
                  cursor: isSending ? 'not-allowed' : 'pointer'
                }}
              >
                {isSending ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>
            </form>

            <div className="auth__signup">
              <span>Nhớ lại mã PIN? </span><Link to="/signin">QUAY LẠI ĐĂNG NHẬP</Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />

      {/* Success Modal */}
      <ConfirmModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate('/signin');
        }}
        onConfirm={() => {
          setShowSuccessModal(false);
          navigate('/signin');
        }}
        title="Thành công"
        message="Đặt lại mã PIN thành công!"
        confirmText="Đăng nhập"
        type="alert"
      />
    </div>
  );
}

