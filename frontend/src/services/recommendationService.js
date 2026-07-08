import { authApi, publicApi, parseApiList } from './apiClient';

const axiosInstance = authApi;

export const recommendationService = {
  getRecommendedMovies: async () => {
    try {
      const response = await publicApi.get('/public/recommendations/movies');
      return { success: true, data: parseApiList(response.data) };
    } catch (error) {
      return { success: false, error: 'Không thể tải đề xuất phim', data: [] };
    }
  },

  getRecommendedCinemas: async (latitude = null, longitude = null) => {
    try {
      let params = {};
      if (latitude !== null && longitude !== null) {
        params = { latitude, longitude };
      }
      const response = await publicApi.get('/public/recommendations/cinemas', { params });
      return { success: true, data: parseApiList(response.data) };
    } catch (error) {
      return { success: false, error: 'Không thể tải đề xuất rạp' };
    }
  }
};

export default recommendationService;
