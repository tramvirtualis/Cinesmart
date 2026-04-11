import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/public/schedule';

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
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message = error.response.data?.message || error.response.data?.error || 'Có lỗi xảy ra';
      return Promise.reject(new Error(message));
    }
    if (error.request) {
      return Promise.reject(new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'));
    }
    return Promise.reject(new Error(error.message || 'Có lỗi xảy ra'));
  }
);

const normalizeParams = ({ date, movieId, cinemaId }) => {
  const params = {};
  if (date) params.date = date;
  if (movieId) params.movieId = movieId;
  if (cinemaId) params.cinemaId = cinemaId;
  return params;
};

const scheduleService = {
  async getOptions({ date, movieId, cinemaId }) {
    const response = await axiosInstance.get('/options', {
      params: normalizeParams({ date, movieId, cinemaId }),
    });
    return response.data;
  },

  async getListings({ date, movieId, cinemaId }) {
    const response = await axiosInstance.get('/listings', {
      params: normalizeParams({ date, movieId, cinemaId }),
    });
    return response.data;
  },
};

export default scheduleService;


