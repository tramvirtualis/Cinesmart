import React from 'react';
import { enumService } from '../../services/enumService';

// Manager Movie View Component (read-only)
function ManagerMovieView({ movies }) {
  return (
    <div className="admin-card">
      <div className="admin-card__header">
        <h2 className="admin-card__title">Danh sách phim</h2>
      </div>
      <div className="admin-card__content">
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Poster</th>
                <th>Tên phim</th>
                <th>Thể loại</th>
                <th>Thời lượng</th>
                <th>Độ tuổi</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {(movies || []).map((movie) => (
                <tr key={movie.movieId}>
                  <td>
                    <img src={movie.poster} alt={movie.title} style={{ width: '60px', height: '90px', objectFit: 'cover', borderRadius: '4px' }} />
                  </td>
                  <td>{movie.title}</td>
                  <td>
                    {movie.genre 
                      ? (Array.isArray(movie.genre) 
                          ? movie.genre.map(g => enumService.mapGenreToVietnamese(g)).join(', ')
                          : enumService.mapGenresToVietnamese(movie.genre))
                      : 'N/A'}
                  </td>
                  <td>{movie.duration} phút</td>
                  <td>{movie.ageRating}</td>
                  <td>
                    <span className="movie-status-badge" style={{ 
                      backgroundColor: movie.status === 'NOW_SHOWING' ? '#4caf50' : movie.status === 'COMING_SOON' ? '#ff9800' : '#9e9e9e'
                    }}>
                      {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : movie.status === 'COMING_SOON' ? 'Sắp chiếu' : 'Đã kết thúc'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ManagerMovieView;


