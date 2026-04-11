import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import VoiceSearchBar from './VoiceSearchBar';
import { cinemaComplexService } from '../services/cinemaComplexService';
import { walletService } from '../services/walletService';

export default function Header({ children }) {
  const navigate = useNavigate();
  const [showCinemaDropdown, setShowCinemaDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [user, setUser] = useState(null); // lưu thông tin user
  const [cinemas, setCinemas] = useState([]); // danh sách cụm rạp từ API
  const [loadingCinemas, setLoadingCinemas] = useState(true);
  const [walletBalance, setWalletBalance] = useState(null); // số dư ví
  const [loadingWallet, setLoadingWallet] = useState(false);
  const dropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Load danh sách cụm rạp từ API
  useEffect(() => {
    const loadCinemas = async () => {
      setLoadingCinemas(true);
      try {
        const result = await cinemaComplexService.getAllCinemaComplexes();
        if (result.success && result.data) {
          // Map dữ liệu từ API về format cần thiết
          const mappedCinemas = result.data.map(cinema => ({
            complexId: cinema.complexId,
            name: cinema.name,
            province: cinema.addressProvince || cinema.fullAddress?.split(',').pop()?.trim() || '',
            fullAddress: cinema.fullAddress || `${cinema.addressDescription || ''}, ${cinema.addressProvince || ''}`.trim()
          }));
          setCinemas(mappedCinemas);
        } else {
          console.error('Failed to load cinemas:', result.error);
          setCinemas([]);
        }
      } catch (error) {
        console.error('Error loading cinemas:', error);
        setCinemas([]);
      } finally {
        setLoadingCinemas(false);
      }
    };

    loadCinemas();
  }, []);

  // Load user from localStorage
  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    };

    loadUser();

    // Listen for storage changes to update avatar
    const handleStorageChange = () => {
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdated', handleStorageChange);

    // Poll for changes (in case same window updates localStorage)
    const interval = setInterval(() => {
      loadUser();
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Load wallet balance
  useEffect(() => {
    const loadWalletBalance = async () => {
      if (!user) {
        setWalletBalance(null);
        return;
      }

      try {
        setLoadingWallet(true);
        const wallet = await walletService.getWallet();
        setWalletBalance(wallet.balance || 0);
      } catch (error) {
        console.error('Error loading wallet balance:', error);
        setWalletBalance(null);
      } finally {
        setLoadingWallet(false);
      }
    };

    loadWalletBalance();

    // Listen for wallet updates (payment success, top-up, etc.)
    const handleWalletUpdate = () => {
      loadWalletBalance();
    };

    window.addEventListener('paymentSuccess', handleWalletUpdate);
    window.addEventListener('walletUpdated', handleWalletUpdate);

    // Poll for wallet updates every 5 seconds
    const interval = setInterval(() => {
      if (user) {
        loadWalletBalance();
      }
    }, 5000);

    return () => {
      window.removeEventListener('paymentSuccess', handleWalletUpdate);
      window.removeEventListener('walletUpdated', handleWalletUpdate);
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCinemaDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    if (showCinemaDropdown || showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCinemaDropdown, showUserDropdown]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('jwt');
    setUser(null);
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="container nav">
        <Link className="logo" to="/">
          <svg className="logo__icon" width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e83b41" stopOpacity="1" />
                <stop offset="50%" stopColor="#ff5258" stopOpacity="1" />
                <stop offset="100%" stopColor="#ff6b6b" stopOpacity="1" />
              </linearGradient>
              <filter id="logoGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle cx="18" cy="18" r="17" fill="url(#logoGradient)" filter="url(#logoGlow)" opacity="0.9" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <rect x="8" y="8" width="20" height="20" rx="2" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <path d="M14 14L22 18L14 22V14Z" fill="rgba(255,255,255,0.95)" />
            <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.6)" />
            <circle cx="26" cy="10" r="1.5" fill="rgba(255,255,255,0.6)" />
            <circle cx="10" cy="26" r="1.5" fill="rgba(255,255,255,0.6)" />
            <circle cx="26" cy="26" r="1.5" fill="rgba(255,255,255,0.6)" />
          </svg>
          <span className="logo__text">cinesmart</span>
        </Link>
        <nav className="menu">
          <Link to="/schedule">Lịch chiếu phim</Link>
          <div className="menu-dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="menu-link"
              onClick={() => setShowCinemaDropdown(!showCinemaDropdown)}
              style={{
                background: 'transparent',
                border: 'none',
                color: showCinemaDropdown ? '#ffd159' : '#e6e1e2',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0
              }}
            >
              Rạp
            </button>
            {showCinemaDropdown && (
              <div className="cinema-dropdown">
                {loadingCinemas ? (
                  <div className="cinema-dropdown__item" style={{
                    textAlign: 'center',
                    padding: '12px',
                    color: '#c9c4c5',
                    cursor: 'default'
                  }}>
                    Đang tải...
                  </div>
                ) : cinemas.length === 0 ? (
                  <div className="cinema-dropdown__item" style={{
                    textAlign: 'center',
                    padding: '12px',
                    color: '#c9c4c5',
                    cursor: 'default'
                  }}>
                    Không có cụm rạp nào
                  </div>
                ) : (
                  cinemas.map((cinema) => (
                    <Link
                      key={cinema.complexId}
                      to={`/cinema/${encodeURIComponent(cinema.name)}?province=${encodeURIComponent(cinema.province)}`}
                      className="cinema-dropdown__item"
                      onClick={() => setShowCinemaDropdown(false)}
                    >
                      {cinema.name} {cinema.province && `(${cinema.province})`}
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
          <Link to="/food-drinks">Đồ ăn nước uống</Link>
          <Link to="/events">Sự kiện và khuyến mãi</Link>
        </nav>

        {/* Search Bar */}
        <div className="header-search">
          <VoiceSearchBar
            placeholder="Tìm phim..."
          />
        </div>

        <div className="actions">
          {/* render optional header children */}
          {children}

          {/* Notification Bell - Always visible when user is logged in */}
          {user && <NotificationBell />}

          {user ? (
            <div className="user-menu" ref={userDropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Hiển thị username */}
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{user.username}</span>

              {/* Hiển thị số dư ví */}
              {walletBalance !== null && (
                <span style={{ 
                  color: '#c9c4c5', 
                  fontSize: '14px',
                  fontWeight: 400
                }}>
                  {walletBalance.toLocaleString('vi-VN')}₫
                </span>
              )}

              {/* Avatar với thông báo bị chặn bên dưới */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <button
                  className="user-avatar"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  aria-label="User menu"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 200ms ease'
                  }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username || 'Avatar'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                      border: '2px solid rgba(232, 59, 65, 0.5)'
                    }}
                  />
                ) : (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="16" fill="#4a3f41" />
                    <circle cx="16" cy="12" r="5" fill="#e6e1e2" />
                    <path d="M8 26c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="#e6e1e2" />
                  </svg>
                )}
                </button>
                
                {/* Thông báo tài khoản bị chặn */}
                {user.status === false && (
                  <span style={{
                    color: '#ff5757',
                    fontSize: '10px',
                    fontWeight: 500,
                    fontStyle: 'italic',
                    whiteSpace: 'nowrap'
                  }}>
                    (Đã bị chặn)
                  </span>
                )}
              </div>

              {/* Dropdown menu */}
              {showUserDropdown && (
                <div className="user-dropdown">
                  <Link to="/profile" className="user-dropdown__item" onClick={() => setShowUserDropdown(false)}>
                    Trang cá nhân
                  </Link>
                  <Link to="/orders" className="user-dropdown__item" onClick={() => setShowUserDropdown(false)}>
                    Đơn hàng
                  </Link>
                  <div className="user-dropdown__divider"></div>
                  <Link to="/library" className="user-dropdown__item" onClick={() => setShowUserDropdown(false)}>
                    Thư viện phim
                  </Link>
                  <Link to="/booking-history" className="user-dropdown__item" onClick={() => setShowUserDropdown(false)}>
                    Vé của tôi
                  </Link>
                  <Link to="/transaction-history" className="user-dropdown__item" onClick={() => setShowUserDropdown(false)}>
                    Lịch sử giao dịch
                  </Link>
                  <div className="user-dropdown__divider"></div>
                  <button
                    className="user-dropdown__item user-dropdown__item--logout"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link className="btn btn--ghost" to="/register">Đăng ký</Link>
              <Link className="btn btn--primary" to="/signin">Đăng nhập</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}