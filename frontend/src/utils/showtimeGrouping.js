export const ROOM_FORMAT_ORDER = ['2D', '3D', 'DELUXE'];

export function sortRoomFormats(formats) {
  return ROOM_FORMAT_ORDER.filter((f) => formats.includes(f));
}

export function groupShowtimesByDate(showtimes) {
  const byDate = {};
  showtimes.forEach((st) => {
    const key = st.date || 'unknown';
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(st);
  });
  Object.keys(byDate).forEach((key) => {
    byDate[key].sort((a, b) => a.time.localeCompare(b.time));
  });
  return byDate;
}

export function formatShowtimeDateLabel(dateStr) {
  if (!dateStr || dateStr === 'unknown') return 'Ngày khác';
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export function buildDateOptionsFromShowtimes(showtimesByCinema) {
  const uniqueDates = new Set();
  Object.values(showtimesByCinema || {}).forEach((cinemaFormats) => {
    Object.values(cinemaFormats || {}).forEach((showtimes) => {
      if (!Array.isArray(showtimes)) return;
      showtimes.forEach((st) => {
        if (st?.date) uniqueDates.add(st.date);
      });
    });
  });
  return Array.from(uniqueDates)
    .sort()
    .map((dateStr) => ({
      key: dateStr,
      label: formatShowtimeDateLabel(dateStr),
    }));
}

export function buildFormatOptionsFromShowtimes(showtimesByCinema) {
  const formatsSet = new Set();
  Object.values(showtimesByCinema || {}).forEach((cinemaFormats) => {
    Object.keys(cinemaFormats || {}).forEach((fmt) => formatsSet.add(fmt));
  });
  const sorted = sortRoomFormats(Array.from(formatsSet));
  return sorted.length > 0 ? ['Tất cả', ...sorted] : ['Tất cả'];
}
