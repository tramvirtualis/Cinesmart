import { useCallback } from 'react';
import { hasPanoramaForSeat, loadPanoramaManifest } from '../services/panoramaLoader';
import { useSeat360Store } from '../store/seat360Store';

export function useSeatSelection({ onSeatClick, enablePanorama = true, roomType = '2D' }) {
  const setPreviewSeat = useSeat360Store((s) => s.setPreviewSeat);

  const handleSeatSelect = useCallback(
    async (seatId) => {
      onSeatClick(seatId);

      if (!enablePanorama) return;

      try {
        await loadPanoramaManifest(roomType);
        if (hasPanoramaForSeat(seatId)) {
          setPreviewSeat(seatId);
        }
      } catch {
        // Manifest load failed — seat selection still works
      }
    },
    [onSeatClick, setPreviewSeat, enablePanorama, roomType]
  );

  return { handleSeatSelect };
}
