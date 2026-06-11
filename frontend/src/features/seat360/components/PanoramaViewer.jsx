import React, { useCallback, useRef } from 'react';
import { CENTER_PANORAMA_KEY } from '../constants/panoramaConstants';
import { usePanorama } from '../hooks/usePanorama';

export default function PanoramaViewer({
  previewSeatId,
  enabled,
  roomType,
  onGoToCenter,
}) {
  const wrapperRef = useRef(null);
  const {
    containerRef,
    isLoading,
    error,
    currentLabel,
    goToCenter,
    retry,
  } = usePanorama({ previewSeatId, enabled, roomType });

  const handleGoToCenter = useCallback(async () => {
    await goToCenter();
    onGoToCenter?.();
  }, [goToCenter, onGoToCenter]);

  const handleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  }, []);

  const displayLabel =
    currentLabel === CENTER_PANORAMA_KEY
      ? 'Góc nhìn tổng quan'
      : `Góc nhìn ghế ${currentLabel}`;

  return (
    <div ref={wrapperRef} className="relative flex h-full w-full flex-col bg-black">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-gray-900/80 px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{displayLabel}</p>
          <p className="text-xs text-gray-400">Kéo để xoay · Cuộn để zoom</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleGoToCenter}
            className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/30 sm:text-sm"
          >
            Xem toàn bộ rạp
          </button>
          <button
            type="button"
            onClick={handleFullscreen}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-white/5 sm:text-sm"
            title="Toàn màn hình"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          className="absolute inset-0 h-full w-full touch-none"
        />

        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <span className="text-sm text-gray-300">Đang tải panorama...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="max-w-sm text-center">
              <p className="mb-2 text-sm font-medium text-red-400">Không thể tải panorama</p>
              <p className="mb-4 text-xs text-gray-400">{error}</p>
              <p className="mb-4 text-xs text-gray-500">
                Đảm bảo thư mục tiles đã được đặt tại{' '}
                <code className="text-gray-400">public/cinemaroom/app-files/tiles/</code>
                {' '}hoặc{' '}
                <code className="text-gray-400">public/cinemaroom_deluxe/app-files/tiles/</code>
              </p>
              <button
                type="button"
                onClick={retry}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
