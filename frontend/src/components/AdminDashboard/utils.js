import { SEAT_TYPES } from './constants';
import { enumService } from '../../services/enumService';

// Generate seats for a room with realistic layout
export function generateSeats(rows, cols) {
  const seats = [];
  const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Calculate walkway positions (every 4-5 seats, and in the middle if cols > 10)
  const walkwayPositions = new Set();
  for (let col = 5; col <= cols; col += 5) {
    walkwayPositions.add(col);
  }
  // Add middle walkway if room is wide enough
  if (cols > 10) {
    const middle = Math.floor(cols / 2);
    walkwayPositions.add(middle);
    walkwayPositions.add(middle + 1);
  }
  
  for (let row = 0; row < rows; row++) {
    for (let col = 1; col <= cols; col++) {
      // Skip walkway columns
      if (walkwayPositions.has(col)) continue;
      
      // Determine seat type based on row position
      let seatType = 'NORMAL';
      if (row < Math.floor(rows * 0.15)) {
        // First ~15% rows are VIP
        seatType = 'VIP';
      } else if (row >= rows - 2 && cols > 12) {
        // ~20% ghế đôi, cố định theo ô (khớp backend)
        if ((row * 31 + col) % 5 === 0) {
          seatType = 'COUPLE';
        }
      }
      
      seats.push({
        seatId: `${rowLetters[row]}${col}`,
        row: rowLetters[row],
        column: col,
        type: seatType,
        status: true
      });
    }
  }
  
  return seats;
}

// Format genre for display - Map to Vietnamese
export const formatGenre = (genre) => {
  if (!genre) return '';
  return enumService.mapGenreToVietnamese(genre);
};

// Format status for display
export const formatStatus = (status) => {
  const statusMap = {
    'COMING_SOON': 'Sắp chiếu',
    'NOW_SHOWING': 'Đang chiếu',
    'ENDED': 'Đã kết thúc'
  };
  return statusMap[status] || status;
};

// Get status badge color
export const getStatusColor = (status) => {
  const colorMap = {
    'COMING_SOON': '#ff9800',
    'NOW_SHOWING': '#4caf50',
    'ENDED': '#9e9e9e'
  };
  return colorMap[status] || '#9e9e9e';
};

// Helper function to map ageRating from backend to frontend
export const mapAgeRatingFromBackend = (ageRating) => {
  const mapping = {
    'AGE_13_PLUS': '13+',
    'AGE_16_PLUS': '16+',
    'AGE_18_PLUS': '18+',
    'P': 'P',
    'K': 'K'
  };
  return mapping[ageRating] || ageRating;
};

// Helper function to map ageRating from frontend to backend
export const mapAgeRatingToBackend = (ageRating) => {
  const mapping = {
    '13+': 'AGE_13_PLUS',
    '16+': 'AGE_16_PLUS',
    '18+': 'AGE_18_PLUS',
    'P': 'P',
    'K': 'K'
  };
  return mapping[ageRating] || ageRating;
};

// Helper function to map RoomType from frontend to backend
export const mapRoomTypeToBackend = (roomType) => {
  const mapping = {
    '2D': 'TYPE_2D',
    '3D': 'TYPE_3D',
    'DELUXE': 'DELUXE'
  };
  return mapping[roomType] || roomType;
};

// Helper function to map RoomType from backend to frontend
export const mapRoomTypeFromBackend = (roomType) => {
  const mapping = {
    'TYPE_2D': '2D',
    'TYPE_3D': '3D',
    'DELUXE': 'DELUXE',
    '2D': '2D', // Fallback
    '3D': '3D'  // Fallback
  };
  return mapping[roomType] || roomType;
};

// Helper function to map formats array from backend to frontend
export const mapFormatsFromBackend = (formats) => {
  if (!formats || !Array.isArray(formats)) return [];
  return formats.map(f => mapRoomTypeFromBackend(f));
};

// Helper function to extract formats and languages from movie
export const extractFormatsAndLanguages = (movie) => {
  let formats = [];
  let languages = [];

  // Nếu movie có formats và languages trực tiếp từ backend (từ MovieResponseDTO)
  if (movie.formats || movie.languages) {
    formats = mapFormatsFromBackend(movie.formats);
    languages = movie.languages || [];
  }
  // Nếu movie có versions (fallback - từ entity trực tiếp)
  else if (movie.versions && Array.isArray(movie.versions) && movie.versions.length > 0) {
    formats = [...new Set(movie.versions.map(v => mapRoomTypeFromBackend(v.roomType)))];
    languages = [...new Set(movie.versions.map(v => v.language))];
  }

  return { formats, languages };
};

// Get seat color based on type
export const getSeatColor = (type) => {
  const colorMap = {
    'NORMAL': '#4a90e2',
    'VIP': '#ffd159',
    'COUPLE': '#e83b41'
  };
  return colorMap[type] || '#4a90e2';
};

/** Mã ô lưới theo backend: hàng (A–Z) + số cột, ví dụ A6 */
export function seatCellKey(rowChar, col) {
  return `${String(rowChar).toUpperCase()}${col}`;
}

export function parseSeatCellKey(key) {
  if (!key || typeof key !== 'string') return null;
  const m = /^([A-Za-z])(\d+)$/.exec(key.trim());
  if (!m) return null;
  return { row: m[1].toUpperCase(), col: parseInt(m[2], 10) };
}

/** Các ô trong lưới rows×cols không có ghế trong dữ liệu phòng */
export function computeEmptyCellsFromGrid(room) {
  if (!room || !room.rows || !room.cols) return [];
  const present = new Set(
    (room.seats || []).map(s => seatCellKey(s.row, s.column))
  );
  const empty = [];
  for (let i = 0; i < room.rows; i++) {
    const rowChar = String.fromCharCode(65 + i);
    for (let col = 1; col <= room.cols; col++) {
      const k = seatCellKey(rowChar, col);
      if (!present.has(k)) empty.push(k);
    }
  }
  return empty;
}

/** Cột lối đi mặc định (giống generateSeats / backend) */
export function getWalkwayColumns(cols) {
  const s = new Set();
  for (let col = 5; col <= cols; col += 5) {
    s.add(col);
  }
  if (cols > 10) {
    const middle = Math.floor(cols / 2);
    s.add(middle);
    s.add(middle + 1);
  }
  return s;
}

/** Chỉ ô trống do người dùng thêm (không tính lối đi mặc định) — dùng khi mở sửa phòng */
export function computeUserExtraEmptyFromRoom(room) {
  if (!room || !room.rows || !room.cols) return [];
  const wc = getWalkwayColumns(room.cols);
  return computeEmptyCellsFromGrid(room).filter(k => {
    const p = parseSeatCellKey(k);
    return p && !wc.has(p.col);
  });
}

export function filterEmptyCellsForDimensions(emptyCells, rows, cols) {
  const maxRowIdx = rows - 1;
  return (emptyCells || []).filter(k => {
    const p = parseSeatCellKey(k);
    if (!p) return false;
    const ri = p.row.charCodeAt(0) - 65;
    return ri >= 0 && ri <= maxRowIdx && p.col >= 1 && p.col <= cols;
  });
}

/** Số ghế sau layout: trừ lối đi mặc định và ô trống thêm (emptyCells) */
export function countSeatsAfterLayout(rows, cols, userExtraEmptyCells) {
  const wc = getWalkwayColumns(cols);
  const perRow = cols - wc.size;
  const userExtras = filterEmptyCellsForDimensions(userExtraEmptyCells || [], rows, cols).filter(k => {
    const p = parseSeatCellKey(k);
    return p && !wc.has(p.col);
  });
  return rows * perRow - userExtras.length;
}

export function countSeatsInGrid(rows, cols, emptyCells) {
  return countSeatsAfterLayout(rows, cols, emptyCells);
}

/**
 * Một ô trong form tạo/sửa phòng — đồng bộ với sơ đồ xem layout (màu VIP/Đôi, lối đi, ô trống thêm).
 * Khi sửa phòng và khớp kích thước: ưu tiên loại ghế thật từ DB; không thì preview như backend lúc tạo ghế.
 */
export function getRoomFormGridCellDisplay(rowIdx, col, gridRows, gridCols, userEmptyCells, editingRoom) {
  const rowChar = String.fromCharCode(65 + rowIdx);
  const key = seatCellKey(rowChar, col);
  const userSet = new Set(filterEmptyCellsForDimensions(userEmptyCells || [], gridRows, gridCols));
  const wc = getWalkwayColumns(gridCols);
  const dimsMatch =
    editingRoom &&
    editingRoom.rows === gridRows &&
    editingRoom.cols === gridCols;
  const dbSeat =
    dimsMatch &&
    (editingRoom.seats || []).find(
      s => String(s.row).toUpperCase() === rowChar && Number(s.column) === col
    );
  if (dbSeat && dbSeat.seatId != null) {
    return { key, rowChar, col, mode: 'seat', seatType: dbSeat.type, fromDb: true };
  }
  if (wc.has(col)) {
    return { key, rowChar, col, mode: 'walkway' };
  }
  if (userSet.has(key)) {
    return { key, rowChar, col, mode: 'userEmpty' };
  }
  let seatType = 'NORMAL';
  if (rowIdx < Math.floor(gridRows * 0.15)) {
    seatType = 'VIP';
  } else if (rowIdx >= gridRows - 2 && gridCols > 12 && (rowIdx * 31 + col) % 5 === 0) {
    seatType = 'COUPLE';
  }
  return { key, rowChar, col, mode: 'seat', seatType, fromDb: false };
}

