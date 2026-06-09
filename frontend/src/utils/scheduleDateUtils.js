export function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDateKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function formatScheduleDateLabel(dateStr, todayKey = getTodayKey()) {
  const date = new Date(`${dateStr}T12:00:00`);
  const today = new Date(`${todayKey}T12:00:00`);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const dayNames = [
    'Chủ nhật',
    'Thứ hai',
    'Thứ ba',
    'Thứ tư',
    'Thứ năm',
    'Thứ sáu',
    'Thứ bảy',
  ];

  const tomorrowKey = toDateKey(tomorrow);
  if (dateStr === todayKey) return `Hôm nay - ${day}/${month}`;
  if (dateStr === tomorrowKey) return `Ngày mai - ${day}/${month}`;
  return `${dayNames[date.getDay()]} ${day}/${month}`;
}

export function buildDateTab(dateStr, todayKey = getTodayKey()) {
  const date = new Date(`${dateStr}T12:00:00`);
  return {
    date: dateStr,
    value: dateStr,
    label: formatScheduleDateLabel(dateStr, todayKey),
    dayNumber: date.getDate(),
    month: date.getMonth() + 1,
  };
}

/**
 * Build date dropdown/tabs chỉ từ ngày có suất chiếu (từ hôm nay trở đi).
 */
export function buildDateOptionsFromListings(listings, filters = {}) {
  const { cinemaId, movieId } = filters;
  const todayKey = getTodayKey();
  const dates = new Set();

  (listings || []).forEach((item) => {
    if (cinemaId && Number(item.cinemaId) !== Number(cinemaId)) return;
    if (movieId && Number(item.movieId) !== Number(movieId)) return;

    const dateStr = toDateKey(item.startTime);
    if (dateStr && dateStr >= todayKey) {
      dates.add(dateStr);
    }
  });

  return Array.from(dates)
    .sort()
    .map((dateStr) => buildDateTab(dateStr, todayKey));
}
