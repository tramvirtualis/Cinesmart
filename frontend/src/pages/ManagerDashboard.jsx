import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagerCinemaManagement from '../components/ManagerDashboard/ManagerCinemaManagement';
import ManagerMovieManagement from '../components/ManagerDashboard/ManagerMovieManagement';
import ManagerPriceView from '../components/ManagerDashboard/ManagerPriceView';
import ManagerBookingManagement from '../components/ManagerDashboard/ManagerBookingManagement';
import ManagerReports from '../components/ManagerDashboard/ManagerReports';
import ManagerMenuManagement from '../components/ManagerDashboard/ManagerMenuManagement';
import ManagerShowtimeManagement from '../components/ManagerDashboard/ManagerShowtimeManagement';
import ManagerActivityManagement from '../components/ManagerDashboard/ManagerActivityManagement';
import { SAMPLE_CINEMAS, initialMovies, initialBookingOrders, initialPrices } from '../components/ManagerDashboard/sampleData';

// Manager Dashboard focuses on cinemas within the manager's complexes only.
// It provides full-featured cinema management (rooms, interactive seat layout).

export default function ManagerDashboard() {
  const navigate = useNavigate();
  
  // Lấy cinemaComplexId từ user data trong localStorage
  const getUserData = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
    return null;
  };

  const userData = getUserData();
  const cinemaComplexId = userData?.cinemaComplexId || null;
  const managerComplexIds = cinemaComplexId ? [cinemaComplexId] : [];

  // State management
  const [activeSection, setActiveSection] = useState('movies');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  
  // Lấy complexId từ cinemas state nếu có (sau khi load từ API)
  const currentComplexId = cinemas.length > 0 ? cinemas[0].complexId : cinemaComplexId;
  const [movies] = useState(initialMovies);
  const [orders] = useState(initialBookingOrders);
  const [prices] = useState(initialPrices);

  // Kiểm tra role - chỉ MANAGER mới được phép truy cập
  useEffect(() => {
    const checkRole = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          navigate('/signin');
          return;
        }
        const user = JSON.parse(userStr);
        const role = (user.role || '').toString().toUpperCase().trim();
        
        if (role !== 'MANAGER') {
          // Nếu không phải MANAGER, redirect về dashboard tương ứng hoặc home
          if (role === 'ADMIN') {
            navigate('/admin');
          } else if (role === 'CUSTOMER') {
            navigate('/');
          } else {
            navigate('/signin');
          }
        }
      } catch (e) {
        console.error('Error checking role:', e);
        navigate('/signin');
      }
    };
    
    checkRole();
  }, [navigate]);

  // Load cinemas từ API khi component mount
  useEffect(() => {
    const loadCinemas = async () => {
      console.log('=== ManagerDashboard: Starting to load cinemas ===');
      console.log('cinemaComplexId from localStorage:', cinemaComplexId);
      console.log('Current cinemas state:', cinemas);
      
      // Luôn gọi API để lấy data, không cần kiểm tra cinemaComplexId
      // API sẽ tự lấy từ JWT token

      try {
        console.log('ManagerDashboard: Importing cinemaComplexService...');
        const { default: cinemaComplexService } = await import('../services/cinemaComplexService');
        console.log('ManagerDashboard: Calling getManagerCinemaComplex...');
        const result = await cinemaComplexService.getManagerCinemaComplex();
        console.log('ManagerDashboard: Received result from API');
        
        console.log('=== FRONTEND DEBUG: getManagerCinemaComplex ===');
        console.log('Full result:', JSON.stringify(result, null, 2));
        console.log('result.success:', result.success);
        console.log('result.data:', result.data);
        console.log('result.data type:', typeof result.data);
        console.log('result.data isArray:', Array.isArray(result.data));
        
        if (result.success) {
          let dataToProcess = result.data;
          
          // Xử lý data - đảm bảo luôn là array
          if (!dataToProcess) {
            console.log('DEBUG: result.data is null/undefined');
            setCinemas([]);
          } else if (Array.isArray(dataToProcess)) {
            if (dataToProcess.length > 0) {
              console.log('DEBUG: Data is array with length:', dataToProcess.length);
              // Map từ API response sang format mà component cần
              const mappedCinemas = dataToProcess.map(complex => ({
                complexId: complex.complexId,
                name: complex.name || 'Chưa có tên',
                address: complex.fullAddress || `${complex.addressDescription || ''}, ${complex.addressProvince || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Chưa có địa chỉ',
                addressDescription: complex.addressDescription || '',
                addressProvince: complex.addressProvince || '',
                rooms: [] // Rooms sẽ được load riêng nếu cần
              }));
              console.log('DEBUG: Mapped cinemas:', mappedCinemas);
              setCinemas(mappedCinemas);
            } else {
              console.log('DEBUG: Data is empty array');
              setCinemas([]);
            }
          } else if (dataToProcess && typeof dataToProcess === 'object') {
            // Kiểm tra nếu có complexId
            if (dataToProcess.complexId) {
              // Nếu data là object đơn, chuyển thành array
              console.log('DEBUG: Data is single object with complexId, converting to array');
              const complex = dataToProcess;
              const mappedCinemas = [{
                complexId: complex.complexId,
                name: complex.name || 'Chưa có tên',
                address: complex.fullAddress || `${complex.addressDescription || ''}, ${complex.addressProvince || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Chưa có địa chỉ',
                addressDescription: complex.addressDescription || '',
                addressProvince: complex.addressProvince || '',
                rooms: []
              }];
              console.log('DEBUG: Mapped single cinema:', mappedCinemas);
              console.log('DEBUG: Setting cinemas state to:', mappedCinemas);
              setCinemas(mappedCinemas);
            } else {
              console.log('DEBUG: Data is object but no complexId found');
              console.log('DEBUG: Object keys:', Object.keys(dataToProcess));
              setCinemas([]);
            }
          } else {
            // Nếu không có data hoặc data không hợp lệ
            console.log('DEBUG: No valid data returned, setting empty array');
            console.log('DEBUG: result.data value:', result.data);
            console.log('DEBUG: result.data type:', typeof result.data);
            setCinemas([]);
          }
        } else {
          console.error('DEBUG: Failed to load cinemas:', result.error || 'Unknown error');
          console.error('DEBUG: result object:', result);
          setCinemas([]);
        }
      } catch (error) {
        console.error('DEBUG: Exception loading cinemas:', error);
        console.error('DEBUG: Error stack:', error.stack);
        setCinemas([]);
      } finally {
        setLoading(false);
      }
    };

    loadCinemas();
  }, [cinemaComplexId]);

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : 'admin-sidebar--closed'}`}>
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__logo">
            <svg className="admin-logo__icon" width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="adminLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e83b41" stopOpacity="1" />
                  <stop offset="50%" stopColor="#ff5258" stopOpacity="1" />
                  <stop offset="100%" stopColor="#ff6b6b" stopOpacity="1" />
                </linearGradient>
                <filter id="adminLogoGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <circle cx="18" cy="18" r="17" fill="url(#adminLogoGradient)" filter="url(#adminLogoGlow)" opacity="0.9"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <circle cx="18" cy="18" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
              <rect x="8" y="8" width="20" height="20" rx="2" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M14 14L22 18L14 22V14Z" fill="rgba(255,255,255,0.95)"/>
              <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.6)"/>
              <circle cx="26" cy="10" r="1.5" fill="rgba(255,255,255,0.6)"/>
              <circle cx="10" cy="26" r="1.5" fill="rgba(255,255,255,0.6)"/>
              <circle cx="26" cy="26" r="1.5" fill="rgba(255,255,255,0.6)"/>
            </svg>
            <span className="admin-logo__text">cinesmart</span>
          </div>
          <button
            className="admin-sidebar__toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </>
              )}
            </svg>
          </button>
        </div>
        <nav className="admin-sidebar__nav">
          <button
            className={`admin-nav-item ${activeSection === 'movies' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('movies')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M7 4v16M17 4v16M2 8h20M2 12h20M2 16h20"/>
            </svg>
            <span>Danh sách phim</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'cinemas' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('cinemas')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Quản lý rạp</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'bookings' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('bookings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>Quản lý đặt vé</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'menu' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('menu')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span>Quản lý menu</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'showtimes' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('showtimes')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Quản lý lịch chiếu</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'reports' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('reports')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>Báo cáo</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'activities' ? 'admin-nav-item--active' : ''}`}
            onClick={() => {
              setActiveSection('activities');
              setHasNewActivity(false);
            }}
            style={{ position: 'relative' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span>Hoạt động</span>
            {hasNewActivity && activeSection !== 'activities' && (
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#4CAF50',
                  border: '2px solid #1a1415',
                  boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.3)',
                  animation: 'pulse 2s infinite',
                }}
                title="Có hoạt động mới"
              />
            )}
          </button>
        </nav>
        <div className="admin-sidebar__footer">
          <a href="#home" className="admin-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Về trang chủ</span>
          </a>
        </div>
      </aside>

      <div className={`admin-main ${!sidebarOpen ? 'admin-main--sidebar-closed' : ''}`}>
        <header className="admin-header">
          <div className="admin-header__left">
            <h1 className="admin-header__title">
              {activeSection === 'movies' && 'Danh sách phim'}
              {activeSection === 'cinemas' && 'Quản lý rạp'}
              {activeSection === 'bookings' && 'Quản lý đặt vé'}
              {activeSection === 'menu' && 'Quản lý menu'}
              {activeSection === 'showtimes' && 'Quản lý lịch chiếu'}
              {activeSection === 'activities' && 'Quản lý hoạt động'}
              {activeSection === 'reports' && 'Báo cáo doanh thu & hiệu suất'}
            </h1>
          </div>
          <div className="admin-header__right">
            <div className="admin-header__user">
              <div className="admin-header__user-info">
                <div className="admin-header__user-name">{userData?.username || 'Manager User'}</div>
                <div className="admin-header__user-role">
                  {cinemas.length > 0 ? cinemas[0].name : 'Chưa có cụm rạp'}
                </div>
              </div>
              <div className="admin-header__user-avatar">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" fill="#4a3f41"/>
                  <circle cx="20" cy="15" r="8" fill="#e6e1e2"/>
                  <path d="M10 30c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="#e6e1e2"/>
                </svg>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('jwt');
                window.location.href = '/signin';
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(232, 59, 65, 0.1)',
                border: '1px solid rgba(232, 59, 65, 0.3)',
                color: '#e83b41',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                marginLeft: '16px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(232, 59, 65, 0.2)';
                e.target.style.borderColor = 'rgba(232, 59, 65, 0.5)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(232, 59, 65, 0.1)';
                e.target.style.borderColor = 'rgba(232, 59, 65, 0.3)';
              }}
              title="Đăng xuất"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="admin-content">
          {activeSection === 'movies' && (
            <ManagerMovieManagement complexId={currentComplexId || cinemaComplexId} />
          )}

          {activeSection === 'cinemas' && (
            loading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                color: '#fff'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid rgba(232, 59, 65, 0.3)',
                    borderTop: '4px solid #e83b41',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }}></div>
                  <p>Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : (
              <ManagerCinemaManagement 
                cinemas={cinemas || []} 
                onCinemasChange={setCinemas}
                complexId={currentComplexId || cinemaComplexId}
              />
            )
          )}

          {activeSection === 'bookings' && (
            <ManagerBookingManagement 
              orders={orders}
              cinemas={cinemas}
              movies={movies}
              managerComplexIds={managerComplexIds}
            />
          )}

          {activeSection === 'menu' && (
            <ManagerMenuManagement 
              complexId={currentComplexId} 
            />
          )}

          {activeSection === 'showtimes' && (
            <ManagerShowtimeManagement 
              complexId={currentComplexId || cinemaComplexId}
            />
          )}

          {activeSection === 'activities' && (
            <ManagerActivityManagement
              managerUsername={userData?.username}
              onNewActivity={() => {
                if (activeSection !== 'activities') {
                  setHasNewActivity(true);
                }
              }}
            />
          )}

          {activeSection === 'reports' && (
            <ManagerReports
              orders={orders}
              movies={movies}
              cinemas={cinemas}
              managerComplexIds={managerComplexIds}
            />
          )}

        </main>
      </div>
    </div>
  );
}
