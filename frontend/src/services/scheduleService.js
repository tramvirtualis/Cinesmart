import { publicApi } from './apiClient';

const SCHEDULE_BASE = '/public/schedule';

const normalizeParams = ({ date, movieId, cinemaId }) => {
  const params = {};
  if (date) params.date = date;
  if (movieId) params.movieId = movieId;
  if (cinemaId) params.cinemaId = cinemaId;
  return params;
};

const scheduleService = {
  async getOptions({ date, movieId, cinemaId }) {
    const response = await publicApi.get(`${SCHEDULE_BASE}/options`, {
      params: normalizeParams({ date, movieId, cinemaId }),
    });
    return response.data;
  },

  async getListings({ date, movieId, cinemaId }) {
    const response = await publicApi.get(`${SCHEDULE_BASE}/listings`, {
      params: normalizeParams({ date, movieId, cinemaId }),
    });
    return response.data;
  },
};

export default scheduleService;
