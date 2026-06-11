import { useCallback } from 'react';
import { hasPanoramaForSeat, loadPanoramaManifest } from '../services/panoramaLoader';
import { useSeat360Store } from '../store/seat360Store';

export function useSeatSelection({ onSeatClick, enablePanorama = true }) {
  const setPreviewSeat = useSeat360Store((s) => s.setPreviewSeat);

  const handleSeatSelect = useCallback(
    async (seatId) => {
      onSeatClick(seatId);

      if (!enablePanorama) return;

      try {
        await loadPanoramaManifest();
        if (hasPanoramaForSeat(seatId)) {
          setPreviewSeat(seatId);
        }
      } catch {
        // Manifest load failed — seat selection still works
      }
    },
    [onSeatClick, setPreviewSeat, enablePanorama]
  );

  return { handleSeatSelect };
}
