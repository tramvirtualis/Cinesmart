// DEPRECATED: These constants are kept for backward compatibility only.
// All enum values should now be fetched from the backend API via useEnums hook.
// See: frontend/src/hooks/useEnums.js and backend/src/main/java/com/example/backend/controllers/EnumController.java
//
// To use enums in components:
// 1. Import: import { useEnums } from '../../hooks/useEnums';
// 2. Use: const { enums } = useEnums();
// 3. Access: enums.genres, enums.movieStatuses, enums.ageRatings, etc.

export const GENRES = ['ACTION', 'COMEDY', 'HORROR', 'DRAMA', 'ROMANCE', 'THRILLER', 'ANIMATION', 'FANTASY', 'SCI_FI', 'MUSICAL', 'FAMILY', 'DOCUMENTARY', 'ADVENTURE', 'SUPERHERO'];
export const MOVIE_STATUSES = ['COMING_SOON', 'NOW_SHOWING', 'ENDED'];
export const AGE_RATINGS = ['P', 'K', '13+', '16+', '18+'];
export const SEAT_TYPES = ['NORMAL', 'VIP', 'COUPLE'];
export const ROOM_TYPES = ['2D', '3D', 'DELUXE'];
export const LANGUAGES = ['VIETSUB', 'VIETNAMESE', 'VIETDUB'];
export const MOVIE_FORMATS = ['2D', '3D', 'DELUXE'];

// Provinces list (static data, not from database)
export const PROVINCES = [
  'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'An Giang', 'Bà Rịa - Vũng Tàu',
  'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương',
  'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên',
  'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương',
  'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình',
  'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh',
  'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];
