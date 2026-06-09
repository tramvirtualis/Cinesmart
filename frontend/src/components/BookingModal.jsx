import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from './ConfirmModal.jsx';
import {
  formatShowtimeDateLabel,
  groupShowtimesByDate,
  sortRoomFormats,
} from '../utils/showtimeGrouping';

export default function BookingModal({
  isOpen,
  onClose,
  movieTitle,
  options,
  onShowtimeClick,
  onLoadShowtimes,
  loadingShowtimes = false,
}) {
  const navigate = useNavigate();

  const [date, setDate] = useState('all');
  const [province, setProvince] = useState('');
  const [cinema, setCinema] = useState('');
  const [format, setFormat] = useState('Tất cả');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const masterShowtimes = options.showtimes || {};
  const masterFormats = options.formats || ['Tất cả'];
  const masterDates = options.dates || [];

  const provinces = useMemo(() => {
    const uniqueProvinces = new Set();
    (options.cinemas || []).forEach((c) => {
      if (!c.province || !masterShowtimes[c.id]) return;
      const hasShowtimes = Object.values(masterShowtimes[c.id]).some(
        (times) => Array.isArray(times) && times.length > 0
      );
      if (hasShowtimes) uniqueProvinces.add(c.province);
    });
    return Array.from(uniqueProvinces).sort();
  }, [options.cinemas, masterShowtimes]);

  const filteredCinemas = useMemo(() => {
    let cinemas = options.cinemas || [];

    if (province && province.trim() !== '') {
      cinemas = cinemas.filter((c) => c.province === province);
    }

    return cinemas.filter((c) => {
      const cinemaShowtimes = masterShowtimes[c.id];
      if (!cinemaShowtimes) return false;
      return Object.values(cinemaShowtimes).some(
        (times) => Array.isArray(times) && times.length > 0
      );
    });
  }, [options.cinemas, masterShowtimes, province]);

  const handleShowtimeClick = useCallback(
    (bookingUrl) => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        setShowLoginModal(true);
        return;
      }

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser.status === false) {
        setShowBlockedModal(true);
        return;
      }

      if (onShowtimeClick) {
        onShowtimeClick(bookingUrl);
      } else {
        window.location.href = bookingUrl;
      }
    },
    [onShowtimeClick]
  );

  const renderShowtimeButton = useCallback(
    (timeData, cinemaItem, roomFormat, dateKey) => {
      const timeStr = typeof timeData === 'string' ? timeData : timeData.time;
      const showtimeId =
        typeof timeData === 'object' && timeData.showtimeId ? timeData.showtimeId : null;
      const showtimeDate =
        typeof timeData === 'object' && timeData.date ? timeData.date : dateKey;
      const language =
        typeof timeData === 'object' && timeData.language ? timeData.language : '';

      const bookingParams = new URLSearchParams({
        movieId: options.movieId || '',
        cinemaId: cinemaItem.id,
        showtime: timeStr,
        date: showtimeDate,
        format: roomFormat,
        cinemaName: cinemaItem.name,
      });

      if (showtimeId) {
        bookingParams.append('showtimeId', showtimeId);
      }

      const bookingUrl = `/booking?${bookingParams.toString()}`;

      return (
        <button
          key={`${roomFormat}-${showtimeDate}-${timeStr}-${showtimeId || ''}`}
          onClick={() => handleShowtimeClick(bookingUrl)}
          className="btn"
          style={{
            padding: '8px 12px',
            background: '#2d2627',
            border: '1px solid #4a3f41',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {timeStr}
          {language ? ` ${language}` : ''}
        </button>
      );
    },
    [handleShowtimeClick, options.movieId]
  );

  useEffect(() => {
    if (isOpen) {
      setProvince('');
      setCinema('');
      setDate('all');
      setFormat('Tất cả');
      if (onLoadShowtimes && options.movieId) {
        onLoadShowtimes(options.movieId);
      }
    } else {
      setShowLoginModal(false);
    }
  }, [isOpen, onLoadShowtimes, options.movieId]);

  if (!isOpen) return null;

  const visibleCinemas = filteredCinemas.filter(
    (c) => !cinema || cinema.trim() === '' || c.id === cinema
  );

  return (
    <div className="modal cinema-mood" role="dialog" aria-modal="true">
      <div className="modal__panel">
        <div className="modal__header">
          <h3 className="section__title m-0">Chọn suất - {movieTitle}</h3>
          <button className="close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal__filters">
          <div className="mt-3.5">
            <span className="field__label block mb-2">Tỉnh/Thành phố</span>
            <div className="chip-row--wrap">
              <button
                className={`chip ${province === '' ? 'chip--active' : ''}`}
                onClick={() => setProvince('')}
              >
                Tất cả
              </button>
              {provinces.map((p) => (
                <button
                  key={p}
                  className={`chip ${province === p ? 'chip--active' : ''}`}
                  onClick={() => setProvince(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-3 mt-3.5">
            <label className="field">
              <span className="field__label">Rạp</span>
              <select
                className="field__input"
                value={cinema}
                onChange={(e) => setCinema(e.target.value)}
              >
                <option value="">Tất cả</option>
                {filteredCinemas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Định dạng</span>
              <select
                className="field__input"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {masterFormats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Ngày</span>
              <select
                className="field__input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              >
                <option value="all">Tất cả</option>
                {masterDates.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="modal__body">
          {loadingShowtimes ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#c9c4c5' }}>
              <p>Đang tải lịch chiếu...</p>
            </div>
          ) : (
            <div className="cinema-list">
              {visibleCinemas.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#c9c4c5' }}>
                  <p>Chưa có rạp nào trong tỉnh/thành phố này</p>
                </div>
              ) : (
                visibleCinemas.map((cinemaItem) => {
                  const cinemaData = masterShowtimes[cinemaItem.id] || {};
                  const allFormats = sortRoomFormats(Object.keys(cinemaData));
                  const formatsToRender =
                    format === 'Tất cả' ? allFormats : allFormats.filter((f) => f === format);

                  if (formatsToRender.length === 0) return null;

                  const formatSections = formatsToRender
                    .map((roomFormat) => {
                      let showtimes = cinemaData[roomFormat] || [];

                      if (date !== 'all') {
                        showtimes = showtimes.filter((st) => st.date === date);
                      }

                      if (showtimes.length === 0) return null;

                      const showtimesByDate = groupShowtimesByDate(showtimes);
                      const dateKeys = Object.keys(showtimesByDate).sort();

                      return (
                        <div key={roomFormat} style={{ marginBottom: '20px' }}>
                          <div
                            className="cinema-item__format"
                            style={{ marginBottom: '10px', fontSize: '15px', fontWeight: 700 }}
                          >
                            {roomFormat}
                          </div>

                          {date === 'all' ? (
                            dateKeys.map((dateKey) => (
                              <div key={dateKey} style={{ marginBottom: '14px' }}>
                                <div
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#ffd159',
                                    marginBottom: '8px',
                                    paddingBottom: '4px',
                                    borderBottom: '1px solid rgba(255, 209, 89, 0.3)',
                                  }}
                                >
                                  {formatShowtimeDateLabel(dateKey)}
                                </div>
                                <div className="cinema-item__times">
                                  {showtimesByDate[dateKey].map((timeData) =>
                                    renderShowtimeButton(timeData, cinemaItem, roomFormat, dateKey)
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="cinema-item__times">
                              {showtimes.map((timeData) =>
                                renderShowtimeButton(
                                  timeData,
                                  cinemaItem,
                                  roomFormat,
                                  date
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                    .filter(Boolean);

                  if (formatSections.length === 0) return null;

                  return (
                    <div key={cinemaItem.id} className="cinema-item">
                      <div className="cinema-item__head">
                        <div className="cinema-item__name">{cinemaItem.name}</div>
                      </div>
                      {formatSections}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {showLoginModal && (
        <div
          className="modal cinema-mood"
          role="dialog"
          aria-modal="true"
          style={{ zIndex: 10001 }}
        >
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
              <p
                style={{
                  marginBottom: '24px',
                  color: '#c9c4c5',
                  fontSize: '16px',
                  lineHeight: '1.6',
                }}
              >
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
