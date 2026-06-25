import React, { useCallback, useEffect } from 'react';
import { isPanoramaEnabled } from '../../../services/cinemaRoomService';
import { useSeatSelection } from '../hooks/useSeatSelection';
import { useSeat360Store } from '../store/seat360Store';
import PanoramaViewer from './PanoramaViewer';
import SeatMapPanel from './SeatMapPanel';

export default function Seat360Modal({
  room,
  selectedSeats,
  bookedSeats,
  temporarilySelectedSeats,
  onSeatClick,
  getSeatColor,
  cinemaName,
}) {
  const isOpen = useSeat360Store((s) => s.isOpen);
  const previewSeatId = useSeat360Store((s) => s.previewSeatId);
  const close = useSeat360Store((s) => s.close);
  const goToCenter = useSeat360Store((s) => s.goToCenter);

  const showPanorama = isPanoramaEnabled(room);
  const { handleSeatSelect } = useSeatSelection({
    onSeatClick,
    enablePanorama: showPanorama,
    roomType: room?.roomType,
  });

  const handleClose = useCallback(() => {
    close();
  }, [close]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-0 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xem góc nhìn ghế 360 độ"
    >
      <div className="flex h-full w-full max-w-[1400px] flex-col overflow-hidden bg-gray-950 shadow-2xl sm:h-[92vh] sm:rounded-2xl sm:border sm:border-white/10">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <svg className="h-5 w-5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-white sm:text-lg">
                {showPanorama ? 'Xem góc nhìn ghế 360°' : 'Sơ đồ ghế'}
              </h2>
              {cinemaName && (
                <p className="truncate text-xs text-gray-400">{cinemaName}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Đóng"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: panorama + seat map (hoặc chỉ sơ đồ ghế khi NONE) */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {showPanorama && (
            <div className="h-[45vh] min-h-[240px] shrink-0 lg:h-auto lg:min-h-0 lg:min-w-0 lg:flex-1">
              <PanoramaViewer
                previewSeatId={previewSeatId}
                enabled={isOpen}
                roomType={room.roomType}
                onGoToCenter={goToCenter}
              />
            </div>
          )}

          <div className={`flex min-h-0 flex-1 flex-col bg-gray-900/50 p-3 sm:p-4 ${showPanorama ? 'border-t border-white/10 lg:w-[32%] lg:min-w-[280px] lg:max-w-[400px] lg:border-l lg:border-t-0' : ''}`}>
            <SeatMapPanel
              room={room}
              selectedSeats={selectedSeats}
              bookedSeats={bookedSeats}
              temporarilySelectedSeats={temporarilySelectedSeats}
              previewSeatId={previewSeatId}
              onSeatClick={handleSeatSelect}
              getSeatColor={getSeatColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
