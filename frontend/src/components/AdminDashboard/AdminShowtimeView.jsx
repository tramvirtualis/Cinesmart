import React, { useState, useEffect, useMemo } from 'react';
import showtimeService from '../../services/showtimeService';
import { cinemaRoomService } from '../../services/cinemaRoomService';
import { cinemaComplexService } from '../../services/cinemaComplexService';
import '../../styles/components/showtime-timeline.css';
import ExcelJS from 'exceljs';

// Helper function to get Monday of the week for a given date
const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const truncateMovieTitle = (title, maxLength = 15) => {
  if (!title) return '';
  const trimmed = title.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trim()}...`;
};

export default function AdminShowtimeView() {
  const [cinemaComplexes, setCinemaComplexes] = useState([]);
  const [selectedComplexId, setSelectedComplexId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [visibleRooms, setVisibleRooms] = useState(new Set());
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => getMondayOfWeek(new Date()));
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Load all cinema complexes
  useEffect(() => {
    const loadCinemaComplexes = async () => {
      try {
        setLoading(true);
        const result = await cinemaComplexService.getAllCinemaComplexes();
        if (result.success && result.data) {
          setCinemaComplexes(result.data);
          if (result.data.length > 0) {
            setSelectedComplexId(result.data[0].complexId);
          }
        } else {
          showNotification(result.error || 'Không thể tải danh sách cụm rạp', 'error');
        }
      } catch (error) {
        console.error('Error loading cinema complexes:', error);
        showNotification('Không thể tải danh sách cụm rạp', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadCinemaComplexes();
  }, []);

  // Load rooms when complex is selected
  useEffect(() => {
    const loadRooms = async () => {
      if (!selectedComplexId) {
        setRooms([]);
        setSelectedRooms([]);
        setVisibleRooms(new Set());
        return;
      }
      try {
        setLoading(true);
        const result = await cinemaRoomService.getRoomsByComplexId(selectedComplexId);
        if (result.success && result.data) {
          setRooms(result.data);
          if (result.data.length > 0) {
            const roomIds = result.data.map(r => r.roomId);
            setSelectedRooms(roomIds);
            setVisibleRooms(new Set(roomIds));
          }
        } else {
          showNotification(result.error || 'Không thể tải danh sách phòng', 'error');
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
        showNotification('Không thể tải danh sách phòng', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadRooms();
  }, [selectedComplexId]);

  // Load showtimes for selected rooms
  useEffect(() => {
    const loadShowtimes = async () => {
      if (selectedRooms.length === 0) {
        setShowtimes([]);
        return;
      }
      try {
        setLoadingShowtimes(true);
        const allShowtimes = [];
        const monday = getMondayOfWeek(currentDate);
        // Get date strings for the week range
        const startDateStr = formatDateLocal(monday);
        const endDateObj = new Date(monday);
        endDateObj.setDate(endDateObj.getDate() + 6);
        const endDateStr = formatDateLocal(endDateObj);

        for (const roomId of selectedRooms) {
          const result = await showtimeService.getShowtimesByRoomIdAdmin(roomId);
          if (result.success && result.data) {
            const mappedShowtimes = result.data.map(st => {
              const startDateTime = new Date(st.startTime);
              const endDateTime = new Date(st.endTime);
              const date = formatDateLocal(startDateTime);
              
              // Compare using date strings to avoid timezone issues
              if (date < startDateStr || date > endDateStr) {
                return null;
              }
              
              const startTime = startDateTime.toTimeString().slice(0, 5);
              const endTime = endDateTime.toTimeString().slice(0, 5);
              const movieId = st.movieVersion?.movie?.movieId || st.movieId;
              const language = showtimeService.mapLanguageFromBackend(st.language || st.movieVersion?.language);
              const format = showtimeService.mapRoomTypeFromBackend(st.roomType || st.movieVersion?.roomType || st.format);
              
              return {
                showtimeId: st.showtimeId,
                roomId: st.cinemaRoom?.roomId || roomId,
                roomName: st.cinemaRoom?.roomName || rooms.find(r => r.roomId === roomId)?.roomName || 'Phòng',
                movieId: movieId,
                movieTitle: st.movieVersion?.movie?.title || st.movieTitle,
                date: date,
                startTime: startTime,
                endTime: endTime,
                startDateTime: st.startTime,
                endDateTime: st.endTime,
                startHour: parseInt(startTime.split(':')[0]),
                startMinute: parseInt(startTime.split(':')[1]),
                endHour: parseInt(endTime.split(':')[0]),
                endMinute: parseInt(endTime.split(':')[1]),
                duration: (new Date(st.endTime) - new Date(st.startTime)) / (1000 * 60),
                language: language,
                format: format,
                cinemaName: st.cinemaRoom?.cinemaComplex?.name || '',
                cinemaAddress: st.cinemaRoom?.cinemaComplex?.fullAddress || ''
              };
            }).filter(Boolean);
            allShowtimes.push(...mappedShowtimes);
          }
        }
        setShowtimes(allShowtimes);
      } catch (error) {
        console.error('Error loading showtimes:', error);
        showNotification('Không thể tải lịch chiếu', 'error');
        setShowtimes([]);
      } finally {
        setLoadingShowtimes(false);
      }
    };
    loadShowtimes();
  }, [selectedRooms, rooms, currentDate]);

  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateLabel = (date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${dayName}, ${day}/${month}`;
  };

  const navigateDate = (weeks) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (weeks * 7));
    setCurrentDate(getMondayOfWeek(newDate));
  };

  const dateColumns = useMemo(() => {
    const dates = [];
    const monday = getMondayOfWeek(currentDate);
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  // Generate time slots (8:00 to 23:00)
  const timeSlots = useMemo(() => {
    const slots = [];
    // 8:00 to 23:00
    for (let hour = 8; hour <= 23; hour++) {
      slots.push({ hour, minute: 0, label: `${String(hour).padStart(2, '0')}:00` });
    }
    return slots;
  }, []);

  // Group showtimes by date
  const showtimesByDate = useMemo(() => {
    const grouped = {};
    dateColumns.forEach(date => {
      const dateStr = formatDateLocal(date);
      grouped[dateStr] = showtimes.filter(st => st.date === dateStr);
    });
    return grouped;
  }, [showtimes, dateColumns]);

  const getMovieColor = (movieId) => {
    const colors = [
      '#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d00',
      '#9c27b0', '#00bcd4', '#ff9800', '#4caf50', '#e91e63',
      '#3f51b5', '#009688', '#ff5722', '#795548', '#607d8b'
    ];
    return colors[Math.abs(movieId) % colors.length];
  };

  const getExportRangeLabel = () => {
    if (!dateColumns || !dateColumns.length) {
      return new Date().toISOString().split('T')[0];
    }
    const start = formatDateLocal(dateColumns[0]);
    const end = formatDateLocal(dateColumns[dateColumns.length - 1]);
    return `${start}_${end}`;
  };

  const handleExportToExcel = async () => {
    if (!showtimes.length) {
      showNotification('Không có lịch chiếu để xuất', 'error');
      return;
    }
    
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Lịch chiếu');
      
      worksheet.columns = [
        { header: '#', key: 'index', width: 6 },
        { header: 'Ngày', key: 'date', width: 11 },
        { header: 'Giờ bắt đầu', key: 'startTime', width: 13 },
        { header: 'Giờ kết thúc', key: 'endTime', width: 13 },
        { header: 'Phim', key: 'movieTitle', width: 25 },
        { header: 'Phòng chiếu', key: 'roomName', width: 13 },
        { header: 'Định dạng', key: 'format', width: 11 },
        { header: 'Ngôn ngữ', key: 'language', width: 12 }
      ];
      
      worksheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 20;
      
      showtimes.forEach((st, index) => {
        const row = worksheet.addRow({
          index: index + 1,
          date: st.date,
          startTime: st.startTime,
          endTime: st.endTime,
          movieTitle: st.movieTitle || '',
          roomName: st.roomName || '',
          format: st.format || '',
          language: st.language || ''
        });
        
        row.alignment = { vertical: 'middle', horizontal: 'left' };
        row.height = 18;
        
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        }
        
        row.getCell('index').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('date').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('startTime').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('endTime').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('format').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('language').alignment = { vertical: 'middle', horizontal: 'center' };
      });
      
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
          };
        });
      });
      
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `showtimes_${getExportRangeLabel()}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      
      showNotification('Xuất file Excel thành công', 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showNotification('Có lỗi xảy ra khi xuất file Excel', 'error');
    }
  };

  if (loading && !selectedComplexId) {
    return (
      <div className="showtime-timeline-loading">
        <div className="showtime-timeline-spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  const displayedRooms = rooms;

  return (
    <div className="showtime-timeline-container">
      {/* Notification */}
      {notification && (
        <div className={`showtime-timeline-notification showtime-timeline-notification--${notification.type}`}>
          {notification.type === 'success' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
          {notification.message}
        </div>
      )}

      {/* Sidebar */}
      <div className={`showtime-timeline-sidebar ${sidebarOpen ? 'showtime-timeline-sidebar--open' : 'showtime-timeline-sidebar--closed'}`}>
        <div className="showtime-timeline-sidebar-header">
          <button 
            className="showtime-timeline-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          {sidebarOpen && (
            <h3 className="showtime-timeline-sidebar-title">Chọn cụm rạp</h3>
          )}
        </div>

        {sidebarOpen && (
          <div className="showtime-timeline-sidebar-content">
            {/* Cinema Complex Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#fff' }}>
                Cụm rạp
              </label>
              <select
                value={selectedComplexId || ''}
                onChange={(e) => setSelectedComplexId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(30, 24, 25, 0.8)',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 200ms ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(232, 59, 65, 0.5)';
                  e.target.style.background = 'rgba(30, 24, 25, 0.95)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.background = 'rgba(30, 24, 25, 0.8)';
                }}
              >
                <option value="" style={{ background: '#1e1819', color: '#c9c4c5' }}>-- Chọn cụm rạp --</option>
                {cinemaComplexes.map(complex => (
                  <option key={complex.complexId} value={complex.complexId} style={{ background: '#1e1819', color: '#fff' }}>
                    {complex.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rooms List */}
            {rooms.length > 0 && (
              <div className="showtime-timeline-rooms-list">
                {displayedRooms.map(room => {
                  const roomShowtimes = showtimes.filter(st => st.roomId === room.roomId);
                  const isVisible = visibleRooms.has(room.roomId);
                  return (
                    <div
                      key={room.roomId}
                      className={`showtime-timeline-room-item ${isVisible ? 'showtime-timeline-room-item--visible' : 'showtime-timeline-room-item--hidden'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const newVisibleRooms = new Set(visibleRooms);
                        if (isVisible) {
                          newVisibleRooms.delete(room.roomId);
                        } else {
                          newVisibleRooms.add(room.roomId);
                        }
                        setVisibleRooms(newVisibleRooms);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent, #e11b22)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div className="showtime-timeline-room-name">
                            {room.roomName}
                          </div>
                          <div className="showtime-timeline-room-type">
                            {cinemaRoomService.mapRoomTypeFromBackend(room.roomType)}
                          </div>
                          <div className="showtime-timeline-room-count">
                            {roomShowtimes.length} suất
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="showtime-timeline-main">
        {/* Top Bar */}
        <div className="showtime-timeline-topbar">
          <div className="showtime-timeline-date-controls">
            <button onClick={() => navigateDate(-1)} className="showtime-timeline-nav-btn" title="Tuần trước">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div className="showtime-timeline-date-label">
              <div className="showtime-timeline-date-text">Tuần</div>
              <div className="showtime-timeline-date-value">
                {formatDateLabel(dateColumns[0])} - {formatDateLabel(dateColumns[6])}
              </div>
            </div>
            <button onClick={() => navigateDate(1)} className="showtime-timeline-nav-btn" title="Tuần sau">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <div className="showtime-timeline-topbar-right">
            <div className="showtime-timeline-export-group">
              <button
                className="showtime-timeline-export-btn"
                onClick={handleExportToExcel}
                disabled={!showtimes.length}
                title="Xuất lịch ra file Excel"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="showtime-timeline-grid-container">
          <div className="showtime-timeline-grid showtime-timeline-grid-columns">
            {/* Date header row */}
            <div 
              className="showtime-timeline-date-header-row"
              style={{ '--date-columns': dateColumns.length }}
            >
              <div className="showtime-timeline-date-header-spacer"></div>
              {dateColumns.map((date, dateIndex) => (
                <div key={dateIndex} className="showtime-timeline-date-header-cell">
                  <div className="showtime-timeline-date-column-day">{formatDateLabel(date)}</div>
                </div>
              ))}
            </div>
            
            {/* Time rows (horizontal) with date columns (vertical) */}
            {timeSlots.map((slot, slotIndex) => {
              const dateColumnsCount = dateColumns.length;
              return (
                <div 
                  key={slotIndex} 
                  className="showtime-timeline-time-row"
                  style={{ '--date-columns': dateColumnsCount }}
                >
                  {/* Time label */}
                  <div className="showtime-timeline-time-label">
                    {slot.label}
                  </div>
                  
                  {/* Date columns (cells for each day) */}
                  {dateColumns.map((date, dateIndex) => {
                    const dateStr = formatDateLocal(date);
                    const slotStartMinutes = slot.hour * 60 + slot.minute;
                    const slotEndMinutes = slotStartMinutes + 60;
                    
                    // Get showtimes that fall within this time slot and date
                    const cellShowtimes = (showtimesByDate[dateStr] || []).filter(st => {
                      if (!visibleRooms.has(st.roomId)) return false;
                      const stStartMinutes = st.startHour * 60 + st.startMinute;
                      return stStartMinutes >= slotStartMinutes && stStartMinutes < slotEndMinutes;
                    });
                    
                    return (
                      <div 
                        key={dateIndex} 
                        className="showtime-timeline-date-cell"
                        style={{ cursor: 'default' }}
                      >
                        {cellShowtimes.map(showtime => (
                          <div
                            key={showtime.showtimeId}
                            className="showtime-timeline-block-small"
                            style={{
                              backgroundColor: getMovieColor(showtime.movieId)
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedShowtime(showtime);
                            }}
                            title={`${showtime.movieTitle} - ${showtime.roomName} - ${showtime.startTime}-${showtime.endTime}`}
                          >
                            <div className="showtime-timeline-block-small-title">
                              {truncateMovieTitle(showtime.movieTitle, 15)}
                            </div>
                            <div className="showtime-timeline-block-small-time">
                              {showtime.startTime} - {showtime.endTime}
                            </div>
                            <div className="showtime-timeline-block-small-room">
                              {showtime.roomName}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Showtime Detail Modal (Read-only) */}
      {selectedShowtime && (
        <div className="showtime-timeline-modal" onClick={() => setSelectedShowtime(null)}>
          <div className="showtime-timeline-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="showtime-timeline-modal-header">
              <h3>{selectedShowtime.movieTitle}</h3>
              <button onClick={() => setSelectedShowtime(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="showtime-timeline-modal-body">
              <div className="showtime-timeline-modal-info">
                <div className="showtime-timeline-modal-row">
                  <span>Ngày:</span>
                  <span>{formatDateLabel(new Date(selectedShowtime.date))}</span>
                </div>
                <div className="showtime-timeline-modal-row">
                  <span>Giờ:</span>
                  <span>{selectedShowtime.startTime} - {selectedShowtime.endTime}</span>
                </div>
                <div className="showtime-timeline-modal-row">
                  <span>Phòng:</span>
                  <span>{selectedShowtime.roomName}</span>
                </div>
                <div className="showtime-timeline-modal-row">
                  <span>Định dạng:</span>
                  <span>{selectedShowtime.format || 'N/A'}</span>
                </div>
                <div className="showtime-timeline-modal-row">
                  <span>Ngôn ngữ:</span>
                  <span>{selectedShowtime.language || 'N/A'}</span>
                </div>
                {selectedShowtime.cinemaName && (
                  <div className="showtime-timeline-modal-row">
                    <span>Cụm rạp:</span>
                    <span>{selectedShowtime.cinemaName}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="showtime-timeline-modal-footer">
              <button className="btn btn--ghost" onClick={() => setSelectedShowtime(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
