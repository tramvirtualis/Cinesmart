import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from './ConfirmModal.jsx';

export default function BookingModal({ isOpen, onClose, movieTitle, options, onShowtimeClick, onFiltersChange }) {
  const navigate = useNavigate();

  // Get unique provinces from showtimes (chỉ hiển thị provinces có showtimes)
  const provinces = useMemo(() => {
    const uniqueProvinces = new Set();
    // Lấy provinces từ showtimes thực tế
    if (options.showtimes && Object.keys(options.showtimes).length > 0) {
      (options.cinemas || []).forEach(c => {
        // Chỉ thêm province nếu cinema này có showtimes
        if (c.province && options.showtimes[c.id]) {
          const hasShowtimes = Object.values(options.showtimes[c.id] || {}).some(
            times => Array.isArray(times) && times.length > 0
          );
          if (hasShowtimes) {
            uniqueProvinces.add(c.province);
          }
        }
      });
    }
    return Array.from(uniqueProvinces).sort();
  }, [options.cinemas, options.showtimes]);

  // Get unique dates from showtimes (chỉ hiển thị ngày có showtimes)
  const availableDates = useMemo(() => {
    const uniqueDates = new Set();
    
    // Lấy tất cả các ngày từ showtimes
    if (options.showtimes && Object.keys(options.showtimes).length > 0) {
      Object.keys(options.showtimes).forEach(cinemaId => {
        const cinemaShowtimes = options.showtimes[cinemaId];
        if (cinemaShowtimes) {
          Object.keys(cinemaShowtimes).forEach(format => {
            const showtimes = cinemaShowtimes[format];
            if (Array.isArray(showtimes)) {
              showtimes.forEach(timeData => {
                // Lấy date từ showtime object
                if (typeof timeData === 'object' && timeData.date) {
                  uniqueDates.add(timeData.date);
                }
              });
            }
          });
        }
      });
    }
    
    // Convert to array, sort, and format
    return Array.from(uniqueDates)
      .sort() // Sort by date string (YYYY-MM-DD format)
      .map(dateStr => {
        const d = new Date(dateStr);
        return {
          key: dateStr,
          label: d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
        };
      });
  }, [options.showtimes]);

  const [date, setDate] = useState('all'); // Default: Tất cả ('all' = all dates, YYYY-MM-DD = specific date)
  const [province, setProvince] = useState(''); // Default: Tất cả (empty = all provinces)
  const [cinema, setCinema] = useState(''); // Default: Tất cả (empty = all cinemas)
  const [format, setFormat] = useState('Tất cả');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  
  
  // Update format when options.formats changes
  useEffect(() => {
    if (options.formats && options.formats.length > 0) {
      // Always set to first format (should be "Tất cả" or first available format)
      setFormat(options.formats[0]);
    } else {
      setFormat('Tất cả');
    }
  }, [options.formats]);
  
  // Reset filters when modal opens - set to "Tất cả" (empty)
  useEffect(() => {
    if (isOpen) {
      // Reset to "Tất cả" (empty = all)
      setProvince('');
      setCinema('');
      setDate('all'); // Reset to "Tất cả" dates
      setFormat('Tất cả');
    } else {
      // Close login modal when main modal closes
      setShowLoginModal(false);
    }
  }, [isOpen]);
  
  // Load showtimes when modal opens - load all dates if "all" is selected
  useEffect(() => {
    if (isOpen && onFiltersChange && options.movieId) {
      // If date is "all", pass null to get all dates
      // Otherwise pass the selected date
      const dateToUse = date === 'all' ? null : date;
      onFiltersChange(options.movieId, null, dateToUse);
    }
  }, [isOpen, options.movieId]);
  
  // Notify parent when filters change (province or date changes)
  useEffect(() => {
    // Ensure we have all required values before calling onFiltersChange
    if (isOpen && onFiltersChange && options.movieId) {
      // If province is empty, pass null to get all provinces
      const provinceToUse = (province && province.trim() !== '') ? province : null;
      
      // If date is "all", pass null to get all dates
      // Otherwise pass the selected date
      const dateToUse = date === 'all' ? null : date;
      
      // Call with current date and province filter
      onFiltersChange(options.movieId, provinceToUse, dateToUse);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province, date, options.movieId, isOpen]);

  // Filter cinemas: chỉ hiển thị cinemas có showtimes
  const filteredCinemas = useMemo(() => {
    let cinemas = options.cinemas || [];
    
    // Filter by province nếu có chọn
    if (province && province.trim() !== '') {
      cinemas = cinemas.filter(c => c.province === province);
    }
    
    // Chỉ hiển thị cinemas có showtimes thực tế
    return cinemas.filter(c => {
      const cinemaShowtimes = options.showtimes?.[c.id];
      if (!cinemaShowtimes) return false;
      
      // Kiểm tra xem có showtime nào không
      const hasShowtimes = Object.values(cinemaShowtimes).some(
        times => Array.isArray(times) && times.length > 0
      );
      return hasShowtimes;
    });
  }, [options.cinemas, options.showtimes, province]);

  // Không tự động set cinema - để user chọn "Tất cả" hoặc chọn rạp cụ thể
  // useEffect này đã được xóa vì default là "Tất cả" (empty)

  if (!isOpen) return null;

  return (
    <div className="modal cinema-mood" role="dialog" aria-modal="true">
      <div className="modal__panel">
        <div className="modal__header">
          <h3 className="section__title m-0">Chọn suất - {movieTitle}</h3>
          <button className="close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="modal__filters">
          <div className="mt-3.5">
            <span className="field__label block mb-2">Tỉnh/Thành phố</span>
            <div className="chip-row--wrap">
              <button 
                key="all" 
                className={`chip ${province === '' ? 'chip--active' : ''}`} 
                onClick={() => setProvince('')}
              >
                Tất cả
              </button>
              {provinces.map((p) => (
                <button key={p} className={`chip ${province===p? 'chip--active': ''}`} onClick={() => setProvince(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-3 mt-3.5">
            <label className="field">
              <span className="field__label">Rạp</span>
              <select className="field__input" value={cinema} onChange={(e)=>setCinema(e.target.value)}>
                <option value="">Tất cả</option>
                {filteredCinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Định dạng</span>
              <select className="field__input" value={format} onChange={(e)=>setFormat(e.target.value)}>
                {options.formats?.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Ngày</span>
              <select 
                className="field__input" 
                value={date} 
                onChange={(e)=>setDate(e.target.value)}
              >
                <option value="all">Tất cả</option>
                {availableDates.map(d => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="modal__body">
          <div className="cinema-list">
            {filteredCinemas.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#c9c4c5' }}>
                <p>Chưa có rạp nào trong tỉnh/thành phố này</p>
              </div>
            ) : filteredCinemas.map((c) => {
              // Filter by cinema nếu có chọn
              if (cinema && cinema.trim() !== '' && c.id !== cinema) {
                return null;
              }
              
              // If format is "Tất cả", show all showtimes from all formats
              // Otherwise, show only showtimes for the selected format
              let show = [];
              if (format === 'Tất cả') {
                // Get all showtimes from all formats for this cinema
                const allShowtimes = options.showtimes?.[c.id] || {};
                const allTimes = [];
                Object.keys(allShowtimes).forEach(fmt => {
                  if (allShowtimes[fmt] && Array.isArray(allShowtimes[fmt])) {
                    allShowtimes[fmt].forEach(timeData => {
                      // Keep the full object with time and showtimeId
                      if (typeof timeData === 'string') {
                        allTimes.push({ time: timeData, showtimeId: null });
                      } else {
                        allTimes.push(timeData);
                      }
                    });
                  }
                });
                // Remove duplicates by time and sort
                const uniqueMap = new Map();
                allTimes.forEach(item => {
                  const timeStr = item.time;
                  if (!uniqueMap.has(timeStr)) {
                    uniqueMap.set(timeStr, item);
                  }
                });
                show = Array.from(uniqueMap.values()).sort((a, b) => a.time.localeCompare(b.time));
              } else {
                const formatShowtimes = options.showtimes?.[c.id]?.[format] || [];
                // Keep the full object structure
                show = formatShowtimes;
              }
              
              // Filter by date nếu có chọn (không phải "Tất cả")
              let filteredShow = show;
              if (date && date !== 'all' && date.trim() !== '') {
                // Filter showtimes by selected date
                filteredShow = show.filter(timeData => {
                  const showtimeDate = typeof timeData === 'object' && timeData.date 
                    ? timeData.date 
                    : null;
                  return showtimeDate === date;
                });
              }
              
              // Group showtimes by date if "Tất cả" is selected
              const showtimesByDate = {};
              if (date === 'all') {
                filteredShow.forEach(timeData => {
                  const showtimeDate = typeof timeData === 'object' && timeData.date 
                    ? timeData.date 
                    : null;
                  if (showtimeDate) {
                    if (!showtimesByDate[showtimeDate]) {
                      showtimesByDate[showtimeDate] = [];
                    }
                    showtimesByDate[showtimeDate].push(timeData);
                  } else {
                    // If no date info, add to a default group
                    if (!showtimesByDate['unknown']) {
                      showtimesByDate['unknown'] = [];
                    }
                    showtimesByDate['unknown'].push(timeData);
                  }
                });
              }
              
              if (filteredShow.length === 0) {
                return null; // Don't render cinema if no showtimes
              }
              
              // Format date for display
              const formatDateDisplay = (dateStr) => {
                if (!dateStr || dateStr === 'unknown') return '';
                const d = new Date(dateStr);
                return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
              };
              
              return (
                <div key={c.id} className="cinema-item" style={{ display: filteredShow.length === 0 ? 'none' : 'block' }}>
                  <div className="cinema-item__head">
                    <div className="cinema-item__name">{c.name}</div>
                    <div className="cinema-item__format">{format === 'Tất cả' ? 'Tất cả định dạng' : format}</div>
                  </div>
                  
                  {date === 'all' && Object.keys(showtimesByDate).length > 0 ? (
                    // Show grouped by date when "Tất cả" is selected
                    Object.keys(showtimesByDate).sort().map(dateKey => (
                      <div key={dateKey} style={{ marginBottom: '20px' }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: '#ffd159', 
                          marginBottom: '8px',
                          paddingBottom: '4px',
                          borderBottom: '1px solid rgba(255, 209, 89, 0.3)'
                        }}>
                          {formatDateDisplay(dateKey) || 'Ngày khác'}
                        </div>
                        <div className="cinema-item__times">
                          {showtimesByDate[dateKey].map((timeData) => {
                            const timeStr = typeof timeData === 'string' ? timeData : timeData.time;
                            const showtimeId = typeof timeData === 'object' && timeData.showtimeId ? timeData.showtimeId : null;
                            const showtimeDate = typeof timeData === 'object' && timeData.date ? timeData.date : dateKey;
                            const language = typeof timeData === 'object' && timeData.language ? timeData.language : '';
                            
                            // Build booking URL with parameters
                            const bookingParams = new URLSearchParams({
                              movieId: options.movieId || '',
                              cinemaId: c.id,
                              showtime: timeStr,
                              date: showtimeDate,
                              format: format,
                              cinemaName: c.name
                            });
                            
                            // Add showtimeId if available
                            if (showtimeId) {
                              bookingParams.append('showtimeId', showtimeId);
                            }
                            
                            const bookingUrl = `/booking?${bookingParams.toString()}`;
                            return (
                              <button
                                key={`${dateKey}-${timeStr}`}
                                onClick={() => {
                                  // Check if user is logged in
                                  const token = localStorage.getItem('jwt');
                                  if (!token) {
                                    // Show login modal if not logged in
                                    setShowLoginModal(true);
                                    return;
                                  }
                                  
                                  // Check if user is blocked
                                  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                                  if (storedUser.status === false) {
                                    setShowBlockedModal(true);
                                    return;
                                  }
                                  
                                  // If logged in, proceed with booking
                                  if (onShowtimeClick) {
                                    onShowtimeClick(bookingUrl);
                                  } else {
                                    window.location.href = bookingUrl;
                                  }
                                }}
                                className="btn" 
                                style={{ padding: '8px 12px', background: '#2d2627', border: '1px solid #4a3f41', color: '#fff', cursor: 'pointer' }}
                              >
                                {timeStr}{language ? ` ${language}` : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    // Show normally when specific date is selected
                    <div className="cinema-item__times">
                      {filteredShow.length === 0 ? (
                        <span className="card__meta">Chưa có suất</span>
                      ) : (
                        filteredShow.map((timeData) => {
                          const timeStr = typeof timeData === 'string' ? timeData : timeData.time;
                          const showtimeId = typeof timeData === 'object' && timeData.showtimeId ? timeData.showtimeId : null;
                          const showtimeDate = typeof timeData === 'object' && timeData.date ? timeData.date : date;
                          const language = typeof timeData === 'object' && timeData.language ? timeData.language : '';
                          
                          // Build booking URL with parameters
                          const bookingParams = new URLSearchParams({
                            movieId: options.movieId || '',
                            cinemaId: c.id,
                            showtime: timeStr,
                            date: showtimeDate,
                            format: format,
                            cinemaName: c.name
                          });
                          
                          // Add showtimeId if available
                          if (showtimeId) {
                            bookingParams.append('showtimeId', showtimeId);
                          }
                          
                          const bookingUrl = `/booking?${bookingParams.toString()}`;
                          return (
                            <button
                              key={timeStr}
                              onClick={() => {
                                // Check if user is logged in
                                const token = localStorage.getItem('jwt');
                                if (!token) {
                                  // Show login modal if not logged in
                                  setShowLoginModal(true);
                                  return;
                                }
                                
                                // Check if user is blocked
                                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                                if (storedUser.status === false) {
                                  setShowBlockedModal(true);
                                  return;
                                }
                                
                                // If logged in, proceed with booking
                                if (onShowtimeClick) {
                                  onShowtimeClick(bookingUrl);
                                } else {
                                  window.location.href = bookingUrl;
                                }
                              }}
                              className="btn" 
                              style={{ padding: '8px 12px', background: '#2d2627', border: '1px solid #4a3f41', color: '#fff', cursor: 'pointer' }}
                            >
                              {timeStr}{language ? ` ${language}` : ''}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Login Required Modal */}
      {showLoginModal && (
        <div className="modal cinema-mood" role="dialog" aria-modal="true" style={{ zIndex: 10001 }}>
          <div className="modal__panel" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal__header">
              <h3 className="section__title m-0">Yêu cầu đăng nhập</h3>
              <button 
                className="close" 
                aria-label="Close" 
                onClick={() => setShowLoginModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal__body" style={{ padding: '24px' }}>
              <p style={{ marginBottom: '24px', color: '#c9c4c5', fontSize: '16px', lineHeight: '1.6' }}>
                Bạn cần đăng nhập để đặt vé xem phim. Vui lòng đăng nhập để tiếp tục.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn--ghost"
                  onClick={() => setShowLoginModal(false)}
                  style={{ padding: '10px 20px' }}
                >
                  Hủy
                </button>
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    setShowLoginModal(false);
                    navigate('/signin');
                  }}
                  style={{ padding: '10px 20px', background: '#e83b41', color: '#fff' }}
                >
                  Đăng nhập
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        onConfirm={() => setShowBlockedModal(false)}
        title="Tài khoản bị chặn"
        message="Tài khoản của bạn đã bị chặn. Bạn không thể đặt vé. Vui lòng liên hệ quản trị viên để được hỗ trợ."
        confirmText="Đã hiểu"
        type="alert"
        confirmButtonStyle="primary"
      />
    </div>
  );
}


