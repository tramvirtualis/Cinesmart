import { create } from 'zustand';
import { CENTER_PANORAMA_KEY } from '../constants/panoramaConstants';

export const useSeat360Store = create((set) => ({
  isOpen: false,
  previewSeatId: CENTER_PANORAMA_KEY,

  open: () =>
    set({
      isOpen: true,
      previewSeatId: CENTER_PANORAMA_KEY,
    }),

  close: () =>
    set({
      isOpen: false,
    }),

  setPreviewSeat: (seatId) =>
    set({
      previewSeatId: seatId,
    }),

  goToCenter: () =>
    set({
      previewSeatId: CENTER_PANORAMA_KEY,
    }),
}));
