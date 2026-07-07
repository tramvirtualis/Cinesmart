import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const recommendationService = {
  getRecommendedMovies: async () => {
    try {
      const response = await axiosInstance.get('/public/recommendations/movies');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: 'Không thể tải đề xuất phim' };
    }
  },

  getRecommendedCinemas: async (latitude = null, longitude = null) => {
    try {
      let params = {};
      if (latitude !== null && longitude !== null) {
        params = { latitude, longitude };
      }
      const response = await axiosInstance.get('/public/recommendations/cinemas', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: 'Không thể tải đề xuất rạp' };
    }
  }
};

export default recommendationService;
