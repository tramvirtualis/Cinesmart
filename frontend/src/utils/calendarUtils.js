/**
 * Utility functions for creating calendar events
 */

/**
 * Format date to ICS format (YYYYMMDDTHHmmssZ)
 */
const formatICSDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

/**
 * Escape text for ICS format
 */
const escapeICS = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Create ICS file content for a movie showtime
 * @param {Object} showtimeData - Showtime information
 * @param {string} showtimeData.movieTitle - Movie title
 * @param {string} showtimeData.startTime - Start time (ISO string)
 * @param {string} showtimeData.endTime - End time (ISO string)
 * @param {string} showtimeData.cinemaName - Cinema name
 * @param {string} showtimeData.cinemaAddress - Cinema address
 * @param {string} showtimeData.roomName - Room name
 * @param {string} showtimeData.format - Format (2D, 3D, etc.)
 * @returns {string} ICS file content
 */
export const createICSFile = (showtimeData) => {
  const {
    movieTitle = 'Xem phim',
    startTime,
    endTime,
    cinemaName = '',
    cinemaAddress = '',
    roomName = '',
    format = ''
  } = showtimeData;

  const start = formatICSDate(startTime);
  const end = formatICSDate(endTime);
  const now = formatICSDate(new Date());
  
  const location = [cinemaName, cinemaAddress].filter(Boolean).join(', ');
  const description = [
    `Phim: ${movieTitle}`,
    roomName && `Phòng: ${roomName}`,
    format && `Định dạng: ${format}`,
    cinemaName && `Rạp: ${cinemaName}`,
    cinemaAddress && `Địa chỉ: ${cinemaAddress}`
  ].filter(Boolean).join('\\n');

  const summary = `${movieTitle}${format ? ` (${format})` : ''}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cinesmart//Movie Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@cinesmart.vn`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    location ? `LOCATION:${escapeICS(location)}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Nhắc nhở: ${escapeICS(summary)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  return icsContent;
};

/**
 * Download ICS file
 * @param {string} icsContent - ICS file content
 * @param {string} filename - Filename (default: 'showtime.ics')
 */
export const downloadICSFile = (icsContent, filename = 'showtime.ics') => {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Create Google Calendar URL
 * @param {Object} showtimeData - Showtime information
 * @returns {string} Google Calendar URL
 */
export const createGoogleCalendarURL = (showtimeData) => {
  const {
    movieTitle = 'Xem phim',
    startTime,
    endTime,
    cinemaName = '',
    cinemaAddress = '',
    roomName = '',
    format = ''
  } = showtimeData;

  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Google Calendar uses format: YYYYMMDDTHHmmssZ
  const formatGoogleDate = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const startStr = formatGoogleDate(start);
  const endStr = formatGoogleDate(end);
  
  const location = [cinemaName, cinemaAddress].filter(Boolean).join(', ');
  const description = [
    `Phim: ${movieTitle}`,
    roomName && `Phòng: ${roomName}`,
    format && `Định dạng: ${format}`,
    cinemaName && `Rạp: ${cinemaName}`,
    cinemaAddress && `Địa chỉ: ${cinemaAddress}`
  ].filter(Boolean).join('%0A');
  
  const summary = `${movieTitle}${format ? ` (${format})` : ''}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary,
    dates: `${startStr}/${endStr}`,
    details: description,
    location: location,
    sf: 'true',
    output: 'xml'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Add event to calendar (opens appropriate calendar based on user's choice)
 * @param {Object} showtimeData - Showtime information
 * @param {string} method - 'google' or 'ics' (default: 'google')
 */
export const addToCalendar = (showtimeData, method = 'google') => {
  if (method === 'google') {
    const url = createGoogleCalendarURL(showtimeData);
    window.open(url, '_blank');
  } else {
    const icsContent = createICSFile(showtimeData);
    const filename = `${showtimeData.movieTitle?.replace(/[^a-z0-9]/gi, '_') || 'showtime'}_${new Date(showtimeData.startTime).toISOString().slice(0, 10)}.ics`;
    downloadICSFile(icsContent, filename);
  }
};






