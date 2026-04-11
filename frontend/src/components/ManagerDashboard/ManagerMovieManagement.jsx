import React, { useState, useEffect } from 'react';
import { enumService } from '../../services/enumService';
import movieService from '../../services/movieService';
import ConfirmDeleteModal from '../Common/ConfirmDeleteModal';

// Manager Movie Management Component
function ManagerMovieManagement({ complexId }) {
  const [allMovies, setAllMovies] = useState([]);
  const [complexMovies, setComplexMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, movieId: null, movieTitle: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification component
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Load all movies from system
  const loadAllMovies = async () => {
    setLoadingMovies(true);
    try {
      // Use manager endpoint instead of admin endpoint
      const result = await movieService.getAllMoviesManager();
      if (result.success) {
        // Load all movies, no filter by status
        let movies = result.data || [];
        
        // Map movies to frontend format
        movies = movies.map(movie => ({
          movieId: movie.movieId,
          title: movie.title,
          genre: movie.genre || [],
          duration: movie.duration,
          ageRating: enumService.mapAgeRatingToDisplay(movie.ageRating),
          poster: movie.poster,
          status: movie.status,
          releaseDate: movie.releaseDate,
          description: movie.description,
          actor: movie.actor,
          director: movie.director
        }));
        
        // Filter out movies that are already in complex and movies that are ENDED
        const complexMovieIds = new Set(complexMovies.map(m => m.movieId));
        movies = movies.filter(m => 
          !complexMovieIds.has(m.movieId) && m.status !== 'ENDED'
        );
        
        setAllMovies(movies);
      } else {
        showNotification(result.error || 'Không thể tải danh sách phim', 'error');
      }
    } catch (error) {
      console.error('Error loading movies:', error);
      showNotification('Có lỗi xảy ra khi tải danh sách phim', 'error');
    } finally {
      setLoadingMovies(false);
    }
  };

  // Load movies for this complex
  const loadComplexMovies = async () => {
    if (!complexId) return;

    setLoading(true);
    try {
      const { default: cinemaComplexService } = await import('../../services/cinemaComplexService');
      const result = await cinemaComplexService.getComplexMoviesManager(complexId);
      
      if (result.success && result.data) {
        // Map movies from backend format to frontend format
        const mappedMovies = result.data.map(movie => ({
          movieId: movie.movieId,
          title: movie.title,
          genre: movie.genre || [],
          duration: movie.duration,
          ageRating: enumService.mapAgeRatingToDisplay(movie.ageRating),
          poster: movie.poster,
          status: movie.status,
          releaseDate: movie.releaseDate,
          description: movie.description,
          actor: movie.actor,
          director: movie.director
        }));
        setComplexMovies(mappedMovies);
      } else {
        setComplexMovies([]);
      }
    } catch (error) {
      console.error('Error loading complex movies:', error);
      setComplexMovies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complexId) {
      loadComplexMovies();
    }
  }, [complexId]);

  useEffect(() => {
    if (showAddModal) {
      loadAllMovies();
    }
  }, [showAddModal, complexMovies]);

  const handleAddMovie = async (movie) => {
    if (!complexId) {
      showNotification('Không tìm thấy cụm rạp', 'error');
      return;
    }

    try {
      const { default: cinemaComplexService } = await import('../../services/cinemaComplexService');
      const result = await cinemaComplexService.addMovieToComplexManager(complexId, movie.movieId);
      
      if (result.success) {
        // Reload complex movies after adding
        await loadComplexMovies();
        
        showNotification(`Đã thêm phim "${movie.title}" vào danh sách cụm rạp thành công. Bạn cần tạo suất chiếu cho phim này để khách hàng có thể đặt vé.`, 'success');
        setShowAddModal(false);
      } else {
        showNotification(result.error || 'Không thể thêm phim vào cụm rạp', 'error');
      }
    } catch (error) {
      console.error('Error adding movie:', error);
      showNotification(error.message || 'Có lỗi xảy ra khi thêm phim', 'error');
    }
  };

  const handleRemoveMovieClick = (movieId, movieTitle) => {
    setDeleteModal({ isOpen: true, movieId, movieTitle });
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModal({ isOpen: false, movieId: null, movieTitle: null });
    }
  };

  const handleConfirmDelete = async () => {
    const { movieId } = deleteModal;
    if (!complexId || !movieId) {
      showNotification('Không tìm thấy cụm rạp hoặc phim', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      const { default: cinemaComplexService } = await import('../../services/cinemaComplexService');
      const result = await cinemaComplexService.removeMovieFromComplexManager(complexId, movieId);
      
      if (result.success) {
        // Reload complex movies after removing
        await loadComplexMovies();
        
        showNotification('Đã xóa phim khỏi danh sách cụm rạp thành công', 'success');
        setDeleteModal({ isOpen: false, movieId: null, movieTitle: null });
      } else {
        showNotification(result.error || 'Không thể xóa phim khỏi cụm rạp', 'error');
      }
    } catch (error) {
      console.error('Error removing movie:', error);
      showNotification(error.message || 'Có lỗi xảy ra khi xóa phim', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!complexId) {
    return (
      <div className="admin-card">
        <div className="admin-card__content" style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>
          <p>Chưa có cụm rạp được chọn. Vui lòng chọn cụm rạp để quản lý phim.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '16px 20px',
          borderRadius: '12px',
          background: notification.type === 'success' 
            ? 'rgba(76, 175, 80, 0.95)' 
            : 'rgba(244, 67, 54, 0.95)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '300px',
          maxWidth: '500px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {notification.type === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </div>
          <span>{notification.message}</span>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="admin-card__title">Danh sách phim của cụm rạp</h2>
          <button 
            className="btn btn--primary"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Thêm phim
          </button>
        </div>
        <div className="admin-card__content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(232, 59, 65, 0.3)',
                borderTop: '4px solid #e83b41',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : complexMovies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M7 4v16M17 4v16M2 8h20M2 12h20M2 16h20"/>
              </svg>
              <p>Chưa có phim nào trong cụm rạp này.</p>
              <p style={{ opacity: 0.7, marginTop: '8px' }}>Nhấn "Thêm phim" để chọn phim từ danh sách hệ thống.</p>
            </div>
          ) : (
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
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {complexMovies.map((movie) => (
                    <tr key={movie.movieId}>
                      <td>
                        <img 
                          src={movie.poster} 
                          alt={movie.title} 
                          style={{ width: '60px', height: '90px', objectFit: 'cover', borderRadius: '4px' }} 
                        />
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
                          backgroundColor: movie.status === 'NOW_SHOWING' ? '#4caf50' : movie.status === 'COMING_SOON' ? '#ff9800' : '#9e9e9e',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500
                        }}>
                          {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : movie.status === 'COMING_SOON' ? 'Sắp chiếu' : 'Đã kết thúc'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn--ghost btn--small"
                          onClick={() => handleRemoveMovieClick(movie.movieId, movie.title)}
                          style={{ color: '#e83b41' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Movie Modal */}
      {showAddModal && (
        <div className="movie-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="movie-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%' }}>
            <div className="movie-modal__header">
              <h2>Chọn phim từ danh sách hệ thống</h2>
              <button className="movie-modal__close" onClick={() => setShowAddModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="movie-modal__content">

              {loadingMovies ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid rgba(232, 59, 65, 0.3)',
                    borderTop: '4px solid #e83b41',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }}></div>
                  <p>Đang tải danh sách phim...</p>
                </div>
              ) : allMovies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>
                  <p>Không có phim nào để thêm.</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '20px',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  padding: '10px'
                }}>
                  {allMovies.map((movie) => {
                    const isEnded = movie.status === 'ENDED';
                    return (
                    <div
                      key={movie.movieId}
                      onClick={() => !isEnded && handleAddMovie(movie)}
                      style={{
                        cursor: isEnded ? 'not-allowed' : 'pointer',
                        background: '#2d2627',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '2px solid #4a3f41',
                        transition: 'all 0.2s',
                        opacity: isEnded ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isEnded) {
                          e.currentTarget.style.borderColor = '#e83b41';
                          e.currentTarget.style.transform = 'translateY(-4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#4a3f41';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <img 
                        src={movie.poster} 
                        alt={movie.title}
                        style={{ 
                          width: '100%', 
                          height: '300px', 
                          objectFit: 'cover' 
                        }}
                      />
                      <div style={{ padding: '12px' }}>
                        <h4 style={{ 
                          color: '#fff', 
                          margin: '0 0 8px 0', 
                          fontSize: '14px',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {movie.title}
                        </h4>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          fontSize: '12px',
                          color: '#999'
                        }}>
                          <span>{movie.duration} phút</span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '8px',
                            backgroundColor: movie.status === 'NOW_SHOWING' ? '#4caf50' : 
                                           movie.status === 'COMING_SOON' ? '#ff9800' : 
                                           '#9e9e9e',
                            color: '#fff',
                            fontSize: '11px'
                          }}>
                            {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 
                             movie.status === 'COMING_SOON' ? 'Sắp chiếu' : 
                             'Đã kết thúc'}
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="movie-modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowAddModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title={deleteModal.movieTitle || 'phim này'}
        message="Bạn có chắc chắn muốn xóa phim này khỏi cụm rạp? Phim sẽ bị xóa khỏi danh sách cụm rạp."
        confirmText="Xóa"
        isDeleting={isDeleting}
      />
    </>
  );
}

export default ManagerMovieManagement;

