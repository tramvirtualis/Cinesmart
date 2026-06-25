import React from 'react';
import { CENTER_PANORAMA_KEY } from '../constants/panoramaConstants';
import { getSeatsForRow } from '../../../components/AdminDashboard/utils';
import '../styles/seat360-seat-map.css';

export default function SeatMapPanel({
  room,
  selectedSeats,
  bookedSeats,
  temporarilySelectedSeats,
  previewSeatId,
  onSeatClick,
  getSeatColor,
}) {
  if (!room) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Chưa có dữ liệu phòng chiếu
      </div>
    );
  }

  const rowChars = [];
  for (let i = 0; i < room.rows; i++) {
    rowChars.push(String.fromCharCode(65 + i));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 shrink-0">
        <h4 className="text-sm font-semibold text-white">Sơ đồ ghế</h4>
        {previewSeatId && previewSeatId !== CENTER_PANORAMA_KEY && (
          <p className="mt-1 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
            Đang xem: <strong>{previewSeatId}</strong>
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <div className="seat-layout seat360-seat-map">
          <div className="seat-layout__screen">
            <div className="seat-layout__screen-label">🎬 Màn hình 🎬</div>
          </div>

          <div className="seat-layout__grid">
            {rowChars.map((row) => (
              <div key={row} className="seat-layout__row">
                <div className="seat-layout__row-label">{row}</div>
                <div className="seat-layout__seats seat-layout__seats--compact">
                  {getSeatsForRow(room, row).map((seat) => {
                    const isBooked = bookedSeats.has(seat.seatId);
                    const isSelected = selectedSeats.includes(seat.seatId);
                    const isTemporarilySelected =
                      temporarilySelectedSeats.has(seat.seatId) && !isSelected;
                    const isPreviewing = previewSeatId === seat.seatId;
                    const isDisabled = isBooked || isTemporarilySelected;

                    return (
                      <button
                        key={seat.seatId}
                        type="button"
                        className={`seat-button ${isBooked ? 'seat-button--booked' : ''} ${isSelected ? 'seat-button--selected' : ''} ${isTemporarilySelected ? 'seat-button--temporarily-selected' : ''} ${isPreviewing ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-gray-900' : ''}`}
                        style={{
                          backgroundColor: getSeatColor(
                            seat.type,
                            isBooked,
                            isSelected,
                            isTemporarilySelected
                          ),
                          borderColor: isBooked
                            ? '#666'
                            : isSelected
                              ? '#4caf50'
                              : isTemporarilySelected
                                ? '#ff9800'
                                : getSeatColor(seat.type, false, false, false),
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isBooked ? 0.5 : isTemporarilySelected ? 0.7 : 1,
                        }}
                        onClick={() => onSeatClick(seat.seatId)}
                        disabled={isDisabled}
                        title={`${seat.seatId} - ${seat.type === 'NORMAL' ? 'Thường' : seat.type === 'VIP' ? 'VIP' : 'Đôi'}${isBooked ? ' (Đã đặt)' : isTemporarilySelected ? ' (Đang được chọn)' : ''}`}
                      >
                        <span className="seat-button__number">{seat.column}</span>
                        <span className="seat-button__type">
                          {seat.type === 'COUPLE' ? '💑' : seat.type === 'VIP' ? '⭐' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="seat-layout__legend">
            <div className="seat-legend">
              <div className="seat-legend__item">
                <div className="seat-legend__color" style={{ backgroundColor: '#4a90e2' }} />
                <span>Thường</span>
              </div>
              <div className="seat-legend__item">
                <div className="seat-legend__color" style={{ backgroundColor: '#ffd159' }}>⭐</div>
                <span>VIP</span>
              </div>
              <div className="seat-legend__item">
                <div className="seat-legend__color" style={{ backgroundColor: '#e83b41', width: '48px' }}>💑</div>
                <span>Đôi</span>
              </div>
              <div className="seat-legend__item">
                <div className="seat-legend__color" style={{ backgroundColor: '#666666' }}>X</div>
                <span>Đã đặt</span>
              </div>
              <div className="seat-legend__item">
                <div className="seat-legend__color" style={{ backgroundColor: '#4caf50', border: '2px solid #fff' }}>✓</div>
                <span>Đã chọn</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
