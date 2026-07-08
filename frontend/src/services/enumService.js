import { publicApi } from './apiClient';

let cachedEnums = null;

export const enumService = {
  getAllEnums: async () => {
    if (cachedEnums) {
      return {
        success: true,
        data: cachedEnums,
      };
    }

    try {
      const response = await publicApi.get('/enums');
      cachedEnums = response.data;
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách enum',
      };
    }
  },

  mapAgeRatingToDisplay: (ageRating) => {
    const mapping = {
      'AGE_13_PLUS': '13+',
      'AGE_16_PLUS': '16+',
      'AGE_18_PLUS': '18+',
      'P': 'P',
      'K': 'K'
    };
    return mapping[ageRating] || ageRating;
  },

  mapAgeRatingFromDisplay: (display) => {
    const mapping = {
      '13+': 'AGE_13_PLUS',
      '16+': 'AGE_16_PLUS',
      '18+': 'AGE_18_PLUS',
      'P': 'P',
      'K': 'K'
    };
    return mapping[display] || display;
  },

  mapRoomTypeToDisplay: (roomType) => {
    const mapping = {
      'TYPE_2D': '2D',
      'TYPE_3D': '3D',
      'TYPE_DELUXE': 'DELUXE',
      'DELUXE': 'DELUXE'
    };
    return mapping[roomType] || roomType;
  },

  mapRoomTypeFromDisplay: (display) => {
    const mapping = {
      '2D': 'TYPE_2D',
      '3D': 'TYPE_3D',
      'DELUXE': 'DELUXE'
    };
    return mapping[display] || display;
  },

  mapGenreToVietnamese: (genre) => {
    const mapping = {
      'ACTION': 'Hành động',
      'COMEDY': 'Hài',
      'HORROR': 'Kinh dị',
      'DRAMA': 'Chính kịch',
      'ROMANCE': 'Lãng mạn',
      'THRILLER': 'Giật gân',
      'ANIMATION': 'Hoạt hình',
      'FANTASY': 'Giả tưởng',
      'SCI_FI': 'Khoa học viễn tưởng',
      'MUSICAL': 'Nhạc kịch',
      'FAMILY': 'Gia đình',
      'DOCUMENTARY': 'Tài liệu',
      'ADVENTURE': 'Phiêu lưu',
      'SUPERHERO': 'Siêu anh hùng'
    };
    return mapping[genre] || genre;
  },

  mapGenresToVietnamese: (genres) => {
    if (!genres) return '';
    if (Array.isArray(genres)) {
      return genres.map(genre => enumService.mapGenreToVietnamese(genre)).join(', ');
    }
    if (typeof genres === 'string') {
      return genres.split(',').map(g => enumService.mapGenreToVietnamese(g.trim())).join(', ');
    }
    return enumService.mapGenreToVietnamese(genres);
  },

  clearCache: () => {
    cachedEnums = null;
  },
};

export default enumService;
