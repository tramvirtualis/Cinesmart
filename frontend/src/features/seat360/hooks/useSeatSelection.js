import { useCallback } from 'react';
import { hasPanoramaForSeat, loadPanoramaManifest } from '../services/panoramaLoader';
import { useSeat360Store } from '../store/seat360Store';

export function useSeatSelection({ onSeatClick }) {
  const setPreviewSeat = useSeat360Store((s) => s.setPreviewSeat);

  const handleSeatSelect = useCallback(
    async (seatId) => {
      onSeatClick(seatId);

      try {
        await loadPanoramaManifest();
        if (hasPanoramaForSeat(seatId)) {
          setPreviewSeat(seatId);
        }
      } catch {
        // Manifest load failed — seat selection still works
      }
    },
    [onSeatClick, setPreviewSeat]
  );

  return { handleSeatSelect };
}
