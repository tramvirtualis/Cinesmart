import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { favoriteService } from '../services/favoriteService';
import { movieService } from '../services/movieService';
import { enumService } from '../services/enumService';
import { reviewService } from '../services/reviewService';

export default function Library() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('favorites');
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  const [favorites, setFavorites] = useState([]);
  const [ratedMovies, setRatedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRated, setLoadingRated] = useState(false);
  const [error, setError] = useState(null);
  const [removingMovieId, setRemovingMovieId] = useState(null);

  // Load favorite movies from API
  useEffect(() => {
    const loadFavorites = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        setLoading(false);
        setFavorites([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await favoriteService.getFavoriteMovies();
        console.log('Library: getFavoriteMovies result:', result);
        
        if (result.success) {
          // Map movies from backend format to frontend format
          const mappedMovies = (result.data || []).map(movie => {
            try {
              if (!movie) {
                console.warn('Library: Null movie found in favorites list');
                return null;
              }
              
              const mapped = movieService.mapMovieFromBackend(movie);
              if (!mapped) {
                console.warn('Library: Failed to map movie:', movie);
                return null;
              }
              
              // Map genre to Vietnamese
              let genreDisplay = '';
              if (mapped.genre) {
                if (Array.isArray(mapped.genre)) {
                  genreDisplay = mapped.genre.map(g => enumService.mapGenreToVietnamese(g)).join(', ');
                } else if (mapped.genres && Array.isArray(mapped.genres)) {
                  genreDisplay = mapped.genres.map(g => enumService.mapGenreToVietnamese(g)).join(', ');
                } else {
                  genreDisplay = enumService.mapGenresToVietnamese(mapped.genre);
                }
              }
              
              return {
                id: mapped.movieId,
                movieId: mapped.movieId,
                title: mapped.title || mapped.originalTitle || '',
                poster: mapped.poster || '',
                genre: genreDisplay,
                year: mapped.releaseDate ? new Date(mapped.releaseDate).getFullYear() : null,
                addedDate: new Date().toISOString().split('T')[0], // Since we don't store added date, use current date
                rating: null
              };
            } catch (mapErr) {
              console.error('Library: Error mapping movie:', mapErr, movie);
              return null;
            }
          }).filter(movie => movie !== null); // Filter out null values
          
          console.log('Library: Mapped favorites:', mappedMovies);
          setFavorites(mappedMovies);
        } else {
          console.error('Library: Failed to load favorites:', result.error);
          setError(result.error || 'Không thể tải danh sách phim yêu thích');
          setFavorites([]);
        }
      } catch (err) {
        console.error('Library: Error loading favorites:', err);
        console.error('Library: Error details:', err.stack);
        setError(err.message || 'Có lỗi xảy ra khi tải danh sách phim yêu thích');
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, []);

  // Load rated movies (reviews) from API
  useEffect(() => {
    const loadRatedMovies = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        setLoadingRated(false);
        setRatedMovies([]);
        return;
      }

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setLoadingRated(false);
        setRatedMovies([]);
        return;
      }

      try {
        const user = JSON.parse(userStr);
        const userId = user.userId;
        
        if (!userId) {
          setLoadingRated(false);
          setRatedMovies([]);
          return;
        }

        setLoadingRated(true);
        const reviews = await reviewService.getReviewsByUser(userId);
        
        // Map reviews to rated movies format
        const mappedRatedMovies = await Promise.all(
          reviews.map(async (review) => {
            try {
              // Get movie details
              const movieResult = await movieService.getPublicMovieById(review.movieId);
              if (!movieResult.success || !movieResult.data) {
                return null;
              }

              const movie = movieResult.data;
              
              // Map genre to Vietnamese
              let genreDisplay = '';
              if (movie.genre && Array.isArray(movie.genre)) {
                genreDisplay = movie.genre.map(g => enumService.mapGenreToVietnamese(g)).join(', ');
              }

              return {
                id: review.reviewId,
                movieId: review.movieId,
                title: movie.title || review.movieTitle || '',
                poster: movie.poster || '',
                genre: genreDisplay,
                year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
                rating: review.rating || 0,
                reviewText: review.context || '',
                reviewDate: review.createdAt || review.updatedAt || new Date().toISOString().split('T')[0],
                addedDate: review.createdAt || new Date().toISOString().split('T')[0]
              };
            } catch (err) {
              console.error('Error mapping review:', err);
              return null;
            }
          })
        );

        // Filter out null values
        const validRatedMovies = mappedRatedMovies.filter(movie => movie !== null);
        setRatedMovies(validRatedMovies);
      } catch (err) {
        console.error('Error loading rated movies:', err);
        setRatedMovies([]);
      } finally {
        setLoadingRated(false);
      }
    };

    loadRatedMovies();
  }, []);

  const handleRemoveFavorite = async (movieId) => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      alert('Vui lòng đăng nhập để xóa phim yêu thích');
      navigate('/login');
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn xóa phim này khỏi danh sách yêu thích?')) {
      return;
    }

    setRemovingMovieId(movieId);
    try {
      const result = await favoriteService.removeFavorite(movieId);
      if (result.success) {
        // Remove from local state
        setFavorites(prev => prev.filter(m => m.movieId !== movieId && m.id !== movieId));
      } else {
        alert(result.error || 'Không thể xóa phim khỏi yêu thích');
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
      alert(err.message || 'Có lỗi xảy ra khi xóa phim yêu thích');
    } finally {
      setRemovingMovieId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const toggleReview = (movieId) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(movieId)) {
        newSet.delete(movieId);
      } else {
        newSet.add(movieId);
      }
      return newSet;
    });
  };

  const isReviewExpanded = (movieId) => {
    return expandedReviews.has(movieId);
  };

  const shouldTruncate = (text, maxLength = 200) => {
    return text && text.length > maxLength;
  };

  const truncateText = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={i < rating ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: i < rating ? '#ffd159' : 'rgba(255, 255, 255, 0.3)' }}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ));
  };

  return (
    <div className="library-page">
      <Header />
      
      <div className="library-hero">
        <div className="container">
          <div className="library-hero__content">
            <h1 className="library-hero__title">Thư viện của tôi</h1>
            <p className="library-hero__subtitle">
              Nơi lưu trữ những bộ phim bạn yêu thích và đã đánh giá
            </p>
          </div>
        </div>
      </div>

      <div className="library-content">
        <div className="container">
          <div className="library-tabs">
            <button
              className={`library-tab ${activeTab === 'favorites' ? 'library-tab--active' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>Phim yêu thích ({favorites.length})</span>
            </button>
            <button
              className={`library-tab ${activeTab === 'rated' ? 'library-tab--active' : ''}`}
              onClick={() => setActiveTab('rated')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Đã đánh giá ({ratedMovies.length})</span>
            </button>
          </div>

          {activeTab === 'favorites' && (
            <div className="library-section">
              {loading ? (
                <div className="library-empty">
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 20px', width: '40px', height: '40px', border: '4px solid rgba(255, 255, 255, 0.1)', borderTopColor: '#ffd159', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <p>Đang tải danh sách phim yêu thích...</p>
                  </div>
                  <style>{`
                    @keyframes spin {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              ) : error ? (
                <div className="library-empty">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <h3>Có lỗi xảy ra</h3>
                  <p>{error}</p>
                  <button onClick={() => window.location.reload()} className="btn btn--primary">Thử lại</button>
                </div>
              ) : favorites.length === 0 ? (
                <div className="library-empty">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <h3>Chưa có phim yêu thích</h3>
                  <p>Khám phá và thêm những bộ phim bạn yêu thích vào thư viện</p>
                  <a href="/" className="btn btn--primary">Khám phá phim</a>
                </div>
              ) : (
                <div className="library-grid">
                  {favorites.map((movie) => (
                    <div key={movie.movieId || movie.id} className="library-card library-card--favorite">
                      <Link to={`/movie/${movie.movieId || movie.id}`} className="library-card__link">
                        <div className="library-card__poster">
                          <img src={movie.poster || '/placeholder-movie.jpg'} alt={movie.title} onError={(e) => { e.target.src = '/placeholder-movie.jpg'; }} />
                          <div className="library-card__overlay">
                           
                          </div>
                          <div className="library-card__badge library-card__badge--favorite">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="library-card__content">
                          <h3 className="library-card__title">{movie.title}</h3>
                          <div className="library-card__meta">
                            {movie.year && <span>{movie.year}</span>}
                            {movie.year && movie.genre && <span>•</span>}
                            {movie.genre && <span>{movie.genre}</span>}
                          </div>
                        </div>
                      </Link>
                      <button
                        className="library-card__remove"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveFavorite(movie.movieId || movie.id);
                        }}
                        disabled={removingMovieId === (movie.movieId || movie.id)}
                        title="Xóa khỏi yêu thích"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rated' && (
            <div className="library-section">
              {loadingRated ? (
                <div className="library-empty">
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 20px', width: '40px', height: '40px', border: '4px solid rgba(255, 255, 255, 0.1)', borderTopColor: '#ffd159', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <p>Đang tải danh sách phim đã đánh giá...</p>
                  </div>
                  <style>{`
                    @keyframes spin {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              ) : ratedMovies.length === 0 ? (
                <div className="library-empty">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <h3>Chưa có phim đã đánh giá</h3>
                  <p>Xem phim và đánh giá để xây dựng bộ sưu tập của bạn</p>
                  <a href="/" className="btn btn--primary">Khám phá phim</a>
                </div>
              ) : (
                <div className="library-reviews">
                  {ratedMovies.map((movie) => {
                    const isExpanded = isReviewExpanded(movie.id);
                    const hasLongReview = shouldTruncate(movie.reviewText);
                    const displayText = isExpanded || !hasLongReview 
                      ? movie.reviewText 
                      : truncateText(movie.reviewText);
                    
                    return (
                      <div key={movie.id} className="library-review-card">
                        <Link to={`/movie/${movie.movieId || movie.id}`} className="library-review-card__poster-link">
                          <div className="library-review-card__poster">
                            <img 
                              src={movie.poster || '/placeholder-movie.jpg'} 
                              alt={movie.title}
                              onError={(e) => { e.target.src = '/placeholder-movie.jpg'; }}
                            />
                          </div>
                        </Link>
                        <div className="library-review-card__content">
                          <div className="library-review-card__header">
                            <div className="library-review-card__title-section">
                              <Link to={`/movie/${movie.movieId || movie.id}`} className="library-review-card__title-link">
                                <h3 className="library-review-card__title">{movie.title}</h3>
                              </Link>
                              <div className="library-review-card__meta">
                                <span>{movie.year}</span>
                                <span>•</span>
                                <span>{movie.genre}</span>
                              </div>
                            </div>
                            <div className="library-review-card__date">
                              {movie.reviewDate ? formatShortDate(movie.reviewDate) : formatShortDate(movie.addedDate)}
                            </div>
                          </div>
                          <div className="library-review-card__rating-section">
                            <div className="library-review-card__stars">
                              {renderStars(movie.rating)}
                            </div>
                            <span className="library-review-card__rating-badge">Đã xem</span>
                          </div>
                          {movie.reviewText && (
                            <div className="library-review-card__review">
                              <p className="library-review-card__review-text">
                                {displayText}
                              </p>
                              {hasLongReview && (
                                <button
                                  className="library-review-card__expand"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toggleReview(movie.id);
                                  }}
                                >
                                  <span>{isExpanded ? 'THU GỌN' : 'MỞ RỘNG'}</span>
                                  <svg 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 300ms ease' }}
                                  >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}



